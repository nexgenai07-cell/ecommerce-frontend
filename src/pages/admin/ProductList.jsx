// ============================================================
// ProductList — ADMIN PRODUCT MANAGEMENT TABLE
// ============================================================
// Lists every product in the catalog with search, category/status/price
// filters, bulk delete, and quick edit/delete actions per row.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePlus,
  AiOutlineAppstore,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
} from "react-icons/ai";
// AiOutlineCheckCircle / AiOutlineCloseCircle — small icons used inside
// the new "On Website" Yes/No badge, purely visual reinforcement

import {
  fetchAllProducts,
  getLowStockProducts,
  deleteProduct,
} from "../../api/products.api";

import { getCategories } from "../../api/categories.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
import ProductStatsCards from "../../components/admin-products/ProductStatsCards";
import ProductFilters from "../../components/admin-products/ProductFilters";

const PAGE_SIZE = 10;

const SORTERS = {
  // No `created_at` field is present on the list payload (API 26 only
  // returns id, name, price, stock, sku, category, primary_image,
  // is_active, in_stock — no timestamp), so `id` order is used as a
  // reasonable stand-in for "newest first" (higher id = created later).
  "-created_at": (a, b) => b.id - a.id,
  created_at: (a, b) => a.id - b.id,
  price: (a, b) => Number(a.price) - Number(b.price),
  "-price": (a, b) => Number(b.price) - Number(a.price),
  name: (a, b) => (a.name || "").localeCompare(b.name || ""),
};

const ProductList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    status: "",
    minPrice: "",
    maxPrice: "",
    ordering: "-created_at",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 400);

  const hasActiveFilters =
    !!filters.search ||
    !!filters.categoryId ||
    !!filters.status ||
    !!filters.minPrice ||
    !!filters.maxPrice;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // any filter change resets back to page 1
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      categoryId: "",
      status: "",
      minPrice: "",
      maxPrice: "",
      ordering: "-created_at",
    });
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // CATEGORIES — for the filter dropdown
  // --------------------------------------------------
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
  const categoryOptions = extractListData(categoriesResponse).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  // --------------------------------------------------
  // FULL CATALOG QUERY — fetched once, filtered on the client
  // --------------------------------------------------
  // WHY client-side filtering instead of calling the search endpoint
  // (API 27) fresh on every filter change, the way this page used to:
  //
  //  1. THE REPORTED BUG — the backend's `in_stock=false` filter does
  //     not actually filter server-side: calling it returns the full,
  //     unfiltered product list (its `count` came back equal to the
  //     total product count, 88). Trusting that value made the "Out of
  //     Stock" summary card show the entire catalog instead of the
  //     real out-of-stock count.
  //  2. The backend's `q` search param only matches product NAME, so
  //     searching by an exact SKU returned zero results even when a
  //     product with that SKU existed.
  //  3. Combining several filters at once (search + category + status
  //     + price, all together) needs to behave predictably, which is
  //     simplest to guarantee with one consistent client-side pass
  //     instead of juggling which backend query params can safely be
  //     combined.
  //
  // The catalog is small enough right now (well under a thousand
  // products) that fetching it once and filtering/sorting/paginating
  // in the browser is fast and gives correct, predictable results. If
  // the catalog grows much larger, this should move back to real
  // server-side filtering once the backend's search endpoint is fixed
  // to actually honor `in_stock` and to match against `sku` too.
  //
  // Uses fetchAllProducts (small pages, followed via `next`) instead of
  // one getProducts({ page_size: 500 }) call — the single giant request
  // was regularly taking longer than axiosInstance's 10s timeout and
  // getting aborted mid-flight (DevTools showed it stuck on "pending"
  // then flipping to "(canceled)"), which is why this page kept failing
  // to load while every other admin page loaded fine.
  const {
    data: allProducts = [],
    // Defaults to an empty array so .filter()/.length never crash before
    // the first page comes back — fetchAllProducts already returns a
    // plain flat array, so no extractListData() call is needed here.
    isLoading: isLoadingAll,
    isError: isErrorAll,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ["adminProducts", "allProducts"],
    // A single, stable cache key — the complete catalog is fetched once
    // and every filter/sort/page change below operates on it locally,
    // so no filter change should ever trigger a new network request.
    queryFn: fetchAllProducts,
    staleTime: 1000 * 60 * 2,
  });

  // Low Stock has its own dedicated, real endpoint (API 35). Its
  // response shape only carries { id, name, stock, low_stock_threshold }
  // — no sku/category/price/in_stock — so instead of swapping the
  // ENTIRE table to this endpoint's data (which used to silently drop
  // any already-selected Category/Search/Price filter, since this
  // response has none of those fields to filter by), it's used purely
  // as a lookup set of "which product ids are currently low on stock".
  // That set gets folded into the single filter pass below, so Low
  // Stock now combines correctly with every other filter.
  const {
    data: lowStockResponse,
    isLoading: isLoadingLowStock,
    isError: isErrorLowStock,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: QUERY_KEYS.LOW_STOCK_PRODUCTS,
    queryFn: getLowStockProducts,
    staleTime: 1000 * 60 * 2,
  });
  const lowStockProducts = extractListData(lowStockResponse);

  // Real set of product ids that are currently low on stock, per the
  // dedicated backend endpoint (API 35) — used as a lookup below so
  // "Low Stock" behaves like any other status filter instead of
  // replacing the entire dataset.
  const lowStockIds = useMemo(
    () => new Set(lowStockProducts.map((p) => p.id)),
    [lowStockProducts],
  );

  // --------------------------------------------------
  // STATS — derived from the real data already fetched above, not
  // separate network calls (see ProductStatsCards.jsx for the full
  // explanation of the bug this fixes)
  // --------------------------------------------------
  const outOfStockCount = allProducts.filter((p) => !p.in_stock).length;
  const lowStockCount = lowStockProducts.length;

  // --------------------------------------------------
  // CLIENT-SIDE FILTER + SORT
  // --------------------------------------------------
  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    const filtered = allProducts.filter((product) => {
      const matchesSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term);
      // Matches against BOTH name and SKU — this is the actual fix for
      // "search should also work by SKU", since the backend's own `q`
      // param only matches name.

      const matchesCategory =
        !filters.categoryId ||
        String(product.category?.id) === String(filters.categoryId);

      const matchesStatus =
        filters.status === "out_of_stock"
          ? !product.in_stock
          : filters.status === "in_stock"
            ? product.in_stock
            : filters.status === "low_stock"
              ? lowStockIds.has(product.id)
              : true;
      // "low_stock" is checked against the real low-stock id set (from
      // API 35) in the SAME pass as every other filter — this is what
      // makes Category + Low Stock (or Search + Low Stock, etc.)
      // actually combine correctly, instead of Low Stock silently
      // wiping out whatever else was selected.

      const price = Number(product.price) || 0;
      const matchesMinPrice =
        filters.minPrice === "" || price >= Number(filters.minPrice);
      const matchesMaxPrice =
        filters.maxPrice === "" || price <= Number(filters.maxPrice);

      // All active filters must match together — this is what makes
      // combining, say, Category + Status + a price range work
      // correctly at the same time, instead of only the last-applied
      // filter taking effect.
      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });

    const sortFn = SORTERS[filters.ordering] || SORTERS["-created_at"];
    return [...filtered].sort(sortFn);
  }, [
    allProducts,
    debouncedSearch,
    filters.categoryId,
    filters.status,
    filters.minPrice,
    filters.maxPrice,
    filters.ordering,
    lowStockIds,
  ]);

  // --------------------------------------------------
  // PAGINATION — client-side, over the single unified filteredProducts list
  // --------------------------------------------------
  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Both queries feed the table now (the full catalog for everything,
  // plus the low-stock id set whenever Low Stock is selected), so wait
  // on both rather than swapping which one the UI tracks.
  const isLoading = isLoadingAll || isLoadingLowStock;
  const isError = isErrorAll || isErrorLowStock;
  const refetch = () => {
    refetchAll();
    refetchLowStock();
  };

  // --------------------------------------------------
  // BULK DELETE — API 21, called once per selected id (no bulk endpoint
  // exists). UPDATED: the backend now performs a real soft delete
  // internally (an is_delete flag on each product's row, never exposed
  // to the frontend), which is why a deleted product simply stops
  // appearing in adminProducts/low-stock queries after this succeeds —
  // there's no separate "hide" step to reconcile here, invalidating
  // the queries below is enough.
  // --------------------------------------------------
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((productId) => deleteProduct(productId)),
      );
      showSuccess(
        `${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"} deleted.`,
      );
      setSelectedIds([]);
      setConfirmDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      refetch();
    } catch (error) {
      showError("Some products couldn't be deleted. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.primary_image || "/placeholder-product.svg"}
            alt={row.name}
            className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {row.name}
            </p>
            <p className="text-xs text-gray-400">SKU: {row.sku || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <Badge
          label={row.category?.name || "—"}
          variant="gray"
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {formatPrice(row.price)}
          </p>
          {row.original_price > row.price && (
            <p className="text-xs text-gray-400 line-through">
              {formatPrice(row.original_price)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      render: (row) => (
        <span
          className={
            row.stock === 0
              ? "text-danger text-sm"
              : row.stock <= 5
                ? "text-warning text-sm"
                : "text-gray-700 text-sm"
          }
        >
          {row.stock} in stock
        </span>
      ),
    },
    {
      // Renamed from "status" → "stockHealth" and its label from
      // "Status" → "Stock Health", to avoid being confused with the
      // brand-new "On Website" column below. This column has ALWAYS
      // been about stock levels (in stock / running low / out of
      // stock) — it never reflected the is_active publish flag, it
      // was just ambiguously named "Status" before.
      key: "stockHealth",
      label: "Stock Health",
      render: (row) => {
        const label = !row.in_stock
          ? "Out of Stock"
          : row.stock <= 5
            ? "Low Stock"
            : "In Stock";
        const variant = !row.in_stock
          ? "gray"
          : row.stock <= 5
            ? "danger"
            : "success";
        return <Badge label={label} variant={variant} size="sm" rounded />;
      },
    },
    {
      // Reflects the real is_active field from the product object
      // (present on API 26/27/28's product payload). This is the ONLY
      // column that answers "is this product actually visible to
      // customers on the storefront right now?" — a product can be
      // fully in stock and still be hidden (is_active: false, e.g.
      // saved as a draft), which is exactly the case this column
      // exists to surface at a glance. This is a genuine, independent
      // publish/draft toggle, completely separate from deletion — see
      // products.api.js for the full is_active vs is_delete explanation.
      key: "visibility",
      label: "On Website",
      render: (row) => (
        <Badge
          label={row.is_active ? "Yes" : "No"}
          variant={row.is_active ? "success" : "danger"}
          size="sm"
          rounded
          icon={
            row.is_active ? (
              <AiOutlineCheckCircle className="w-3.5 h-3.5" />
            ) : (
              <AiOutlineCloseCircle className="w-3.5 h-3.5" />
            )
          }
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              navigate(ROUTES.ADMIN_PRODUCT_EDIT.replace(":id", row.id))
            }
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
            aria-label={`Edit ${row.name}`}
          >
            <AiOutlineEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIds([row.id]);
              setConfirmDeleteOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-danger rounded-lg hover:bg-danger-light transition-colors"
            aria-label={`Delete ${row.name}`}
          >
            <AiOutlineDelete className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header — uses the shared PageHeader component so this
          page matches every other admin screen's title styling. */}
      <PageHeader
        icon={<AiOutlineAppstore />}
        title="Product Management"
        actions={
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={() => navigate(ROUTES.ADMIN_PRODUCT_ADD)}
          >
            Add Product
          </Button>
        }
      />

      <ProductStatsCards
        totalCount={totalCount}
        outOfStockCount={outOfStockCount}
        lowStockCount={lowStockCount}
        isLoading={isLoadingAll || isLoadingLowStock}
      />

      <ProductFilters
        categoryOptions={categoryOptions}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Bulk action bar — only shown once at least one row is selected */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<AiOutlineDelete className="w-4 h-4" />}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={pagedProducts}
        keyField="id"
        selectable
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
      />

      {/* UPDATED COPY: the previous message claimed "this action can be
          reversed by an admin later" — that was never actually true in
          this UI (there was never a Restore button for products here),
          and it's now confirmed false at the backend level too: delete
          sets an internal is_delete flag with no restore endpoint, so
          the product(s) disappear from every list for good once this
          is confirmed. Past orders that already reference this product
          keep showing its name/image normally — only the catalog
          listing/search/detail pages stop returning it. */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Product(s)?"
        message={`This will permanently remove ${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"} from your store's catalog, search, and product pages. This action cannot be undone from here — past orders that already include ${selectedIds.length === 1 ? "this product" : "these products"} will still show their name and image normally.`}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ProductList;
