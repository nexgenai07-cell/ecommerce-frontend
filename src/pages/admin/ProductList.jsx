import { useState } from "react";
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
// the "On Website" Yes/No badge, purely visual reinforcement

import {
  searchProducts,
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
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 1000 * 60 * 10,
  });
  const categoryOptions = extractListData(categoriesResponse).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  // --------------------------------------------------
  // MAIN PRODUCT QUERY — real server-side filtering + pagination
  // --------------------------------------------------
  // The backend's search endpoint (/api/v1/products/search/) now
  // correctly filters `in_stock`, matches `q` against both name and
  // sku, and filters `category_id` server-side — so every filter here
  // is sent straight to the backend and only ONE page of already
  // -filtered, already-sorted results comes back. Nothing is fetched
  // or filtered in the browser anymore.
  //
  // "Low Stock" is the one exception — the backend has no dedicated
  // low-stock filter on this endpoint (only a plain in_stock boolean),
  // so selecting it swaps the data source to the dedicated Low Stock
  // endpoint below instead of calling this query. See the Low Stock
  // query and `activeProducts`/`activeIsLoading` derivation further
  // down for how the two data sources are combined into one table.
  const isLowStockView = filters.status === "low_stock";

  const {
    data: searchResponse,
    isLoading: isLoadingSearch,
    isError: isErrorSearch,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: [
      "adminProducts",
      "search",
      debouncedSearch,
      filters.categoryId,
      filters.status,
      filters.minPrice,
      filters.maxPrice,
      filters.ordering,
      currentPage,
    ],
    queryFn: ({ signal }) =>
      searchProducts(
        {
          q: debouncedSearch || undefined,
          category_id: filters.categoryId || undefined,
          in_stock:
            filters.status === "in_stock"
              ? true
              : filters.status === "out_of_stock"
                ? false
                : undefined,
          min_price: filters.minPrice || undefined,
          max_price: filters.maxPrice || undefined,
          ordering: filters.ordering,
          page: currentPage,
          page_size: PAGE_SIZE,
        },
        signal,
      ),
    // Skipped entirely while viewing the Low Stock status — that view
    // uses its own dedicated query below instead.
    enabled: !isLowStockView,
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });

  const searchResults = extractListData(searchResponse);
  const searchTotalCount = searchResponse?.data?.count ?? 0;

  // --------------------------------------------------
  // LOW STOCK QUERY — dedicated endpoint (API 38), always fetched (its
  // count feeds the "Low Stock" stat card regardless of which status
  // filter is currently selected), and used as the actual table data
  // source whenever the "Low Stock" status filter is selected.
  // --------------------------------------------------
  // This endpoint is intentionally NOT paginated by the backend — it
  // returns the complete list of currently low-stock products in one
  // response, which is expected to stay a short, bounded list (it's an
  // exception report, not the full catalog). Search/category/price are
  // applied to this small list in the browser when combined with the
  // Low Stock filter, which is safe here precisely because the list is
  // always small — this is NOT the same "fetch everything" pattern
  // used before, since the backend itself defines this as a small,
  // complete result set by design.
  const {
    data: lowStockResponse,
    isLoading: isLoadingLowStock,
    isError: isErrorLowStock,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: QUERY_KEYS.LOW_STOCK_PRODUCTS,
    queryFn: ({ signal }) => getLowStockProducts(signal),
    staleTime: 1000 * 60 * 2,
  });
  const lowStockProducts = extractListData(lowStockResponse);

  const lowStockFiltered = lowStockProducts.filter((product) => {
    const term = debouncedSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      product.name?.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term);
    const matchesCategory =
      !filters.categoryId ||
      String(product.category?.id) === String(filters.categoryId);
    return matchesSearch && matchesCategory;
  });
  const lowStockPaged = lowStockFiltered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // --------------------------------------------------
  // Which data source actually feeds the table right now
  // --------------------------------------------------
  const activeProducts = isLowStockView ? lowStockPaged : searchResults;
  const activeTotalCount = isLowStockView
    ? lowStockFiltered.length
    : searchTotalCount;
  const activeTotalPages = Math.ceil(activeTotalCount / PAGE_SIZE) || 1;
  const isLoading = isLowStockView
    ? isLoadingLowStock
    : isLoadingSearch || isLoadingLowStock;
  // (isLoadingLowStock is included even in the normal view because the
  // "Low Stock" stat card below always depends on it, regardless of
  // which status filter is currently active)
  const isError = isLowStockView ? isErrorLowStock : isErrorSearch;
  const refetch = () => {
    refetchSearch();
    refetchLowStock();
  };

  // --------------------------------------------------
  // STATS — total/out-of-stock counts come straight from the backend's
  // real `count` field for each filter; Low Stock's count is simply
  // the length of the dedicated endpoint's (unpaginated) result list.
  // --------------------------------------------------
  const { data: outOfStockCountResponse, isLoading: isLoadingOutOfStock } =
    useQuery({
      queryKey: ["adminProducts", "outOfStockCount"],
      queryFn: ({ signal }) =>
        searchProducts({ in_stock: false, page: 1, page_size: 1 }, signal),
      // page_size: 1 — this request only exists to read the real
      // `count` field for the stat card, so the actual result rows
      // aren't needed, just the total.
      staleTime: 1000 * 30,
    });
  const outOfStockCount = outOfStockCountResponse?.data?.count ?? 0;

  const { data: totalCountResponse, isLoading: isLoadingTotalCount } = useQuery(
    {
      queryKey: ["adminProducts", "totalCount"],
      queryFn: ({ signal }) =>
        searchProducts({ page: 1, page_size: 1 }, signal),
      staleTime: 1000 * 30,
    },
  );
  const totalCount = totalCountResponse?.data?.count ?? 0;
  const lowStockCount = lowStockProducts.length;

  // --------------------------------------------------
  // BULK DELETE — API 21, called once per selected id (no bulk endpoint
  // exists). The backend performs a real soft delete internally (an
  // is_delete flag on each product's row, never exposed to the
  // frontend), which is why a deleted product simply stops appearing
  // in the search/low-stock queries after this succeeds.
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
          {/* Number(): row.original_price and row.price arrive as decimal
              strings (e.g. "10000.00") — comparing raw strings with > does
              a lexicographic comparison instead of a numeric one, which
              silently breaks whenever the original price's leading digit
              is smaller than the sale price's leading digit. */}
          {Number(row.original_price) > Number(row.price) && (
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
      render: (row) => {
        const total = row.total_stock ?? 0;
        const available = row.available_stock ?? total;
        const reserved = row.reserved_stock ?? 0;
        return (
          <span
            className={
              available === 0
                ? "text-danger text-sm"
                : available <= 5
                  ? "text-warning text-sm"
                  : "text-gray-700 text-sm"
            }
          >
            {total} in stock
            {reserved > 0 && (
              <span className="text-gray-400"> ({available} available)</span>
            )}
          </span>
        );
      },
    },
    {
      // Renamed from "status" → "stockHealth" and its label from
      // "Status" → "Stock Health", to avoid being confused with the
      // "On Website" column below. This column has ALWAYS been about
      // stock levels (in stock / running low / out of stock) — it
      // never reflected the is_active publish flag, it was just
      // ambiguously named "Status" before.
      key: "stockHealth",
      label: "Stock Health",
      render: (row) => {
        // Stock health always reflects what's actually left to SELL
        // (available_stock), not the raw total, since units already
        // reserved by pending orders aren't sellable to a new customer.
        const available = row.available_stock ?? row.total_stock ?? 0;
        const label =
          available === 0
            ? "Out of Stock"
            : available <= 5
              ? "Low Stock"
              : "In Stock";
        const variant =
          available === 0 ? "gray" : available <= 5 ? "danger" : "success";
        return <Badge label={label} variant={variant} size="sm" rounded />;
      },
    },
    {
      // Reflects the real is_active field from the product object.
      // This is the ONLY column that answers "is this product actually
      // visible to customers on the storefront right now?" — a product
      // can be fully in stock and still be hidden (is_active: false,
      // e.g. saved as a draft), which is exactly the case this column
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
        isLoading={
          isLoadingTotalCount || isLoadingOutOfStock || isLoadingLowStock
        }
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
        data={activeProducts}
        keyField="id"
        selectable
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={activeTotalPages}
        totalResults={activeTotalCount}
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
