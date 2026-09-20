import { useState, useEffect } from "react";
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
  bulkDeleteProducts,
} from "../../api/products.api";

import { getCategories } from "../../api/categories.api";
import { exportReport } from "../../api/analytics.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import downloadExportCsv from "../../utils/downloadExportCsv";
import chunkArray from "../../utils/chunkArray";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
import ProductStatsCards from "../../components/admin-products/ProductStatsCards";
import ProductFilters from "../../components/admin-products/ProductFilters";

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many products are shown per page, controlled by the
  // "Rows per page" dropdown in the table footer. Sent to the backend
  // as `page_size` for the normal search view, and used as the
  // client-side slice size for the Low Stock exception view.

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    queryFn: ({ signal }) => getCategories(undefined, signal),
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
    error: searchQueryError,
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
      pageSize,
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
          page_size: pageSize,
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

  // NEW (Sep 2026, API 29 backend fix): the search endpoint now 400s
  // on an invalid price range (negative min/max, or min greater than
  // max) — something the admin-side price filter (RangeFilterChip, a
  // plain number input) can actually produce, unlike the customer
  // storefront's slider which already clamps itself. Surface that
  // specific reason as a toast instead of letting the table silently
  // render an empty state with no explanation.
  useEffect(() => {
    if (isErrorSearch && searchQueryError) {
      showError(
        searchQueryError?.response?.data?.error ||
          searchQueryError?.response?.data?.message ||
          "Failed to load products. Please check your filters and try again.",
      );
    }
  }, [isErrorSearch, searchQueryError]);

  // --------------------------------------------------
  // LOW STOCK COUNT — always fetched (unpaginated), feeds the "Low
  // Stock" stat card regardless of which status filter is currently
  // selected. No params are sent, so per API 38's opt-in pagination
  // rule the response stays the complete plain array it always was.
  // --------------------------------------------------
  const { data: lowStockCountResponse, isLoading: isLoadingLowStockCount } =
    useQuery({
      queryKey: QUERY_KEYS.LOW_STOCK_PRODUCTS,
      queryFn: ({ signal }) => getLowStockProducts(undefined, signal),
      staleTime: 1000 * 60 * 2,
    });
  const lowStockCount = extractListData(lowStockCountResponse).length;

  // --------------------------------------------------
  // LOW STOCK TABLE QUERY — real server-side search, category
  // filtering, and pagination (API 38, 16 Sep 2026 Filtering Fix
  // pass), used as the actual table data source whenever the "Low
  // Stock" status filter is selected. `page` is explicitly sent here,
  // so the backend switches into its paginated
  // { count, next, previous, results } shape for this request only —
  // the count query above never sends `page`, so it is unaffected.
  // --------------------------------------------------
  const {
    data: lowStockTableResponse,
    isLoading: isLoadingLowStockTable,
    isError: isErrorLowStockTable,
    refetch: refetchLowStockTable,
  } = useQuery({
    queryKey: [
      "adminProducts",
      "lowStockTable",
      debouncedSearch,
      filters.categoryId,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getLowStockProducts(
        {
          q: debouncedSearch || undefined,
          category_id: filters.categoryId || undefined,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    enabled: isLowStockView,
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });
  const lowStockTableProducts = extractListData(lowStockTableResponse);
  const lowStockTableTotalCount = lowStockTableResponse?.data?.count ?? 0;

  // --------------------------------------------------
  // Which data source actually feeds the table right now
  // --------------------------------------------------
  const activeProducts = isLowStockView ? lowStockTableProducts : searchResults;
  const activeTotalCount = isLowStockView
    ? lowStockTableTotalCount
    : searchTotalCount;
  const activeTotalPages = Math.ceil(activeTotalCount / pageSize) || 1;
  const isLoading = isLowStockView
    ? isLoadingLowStockTable
    : isLoadingSearch || isLoadingLowStockCount;
  // (isLoadingLowStockCount is included even in the normal view because
  // the "Low Stock" stat card below always depends on it, regardless of
  // which status filter is currently active)
  const isError = isLowStockView ? isErrorLowStockTable : isErrorSearch;
  const refetch = () => {
    refetchSearch();
    refetchLowStockTable();
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

  // --------------------------------------------------
  // BULK DELETE — API 34.1. A single row selected through the row-level
  // delete button still goes through this same function, so there is
  // only one delete code path in this file.
  //
  // The backend performs a real soft delete internally (an is_delete
  // flag on each product's row, never exposed to the frontend), which
  // is why a deleted product simply stops appearing in the search/
  // low-stock queries once this succeeds.
  //
  // The endpoint accepts at most 100 ids per call, so a selection
  // larger than that is split into batches and sent one after another.
  // Each batch's response is read for its own deleted_ids, missing_ids
  // and failed arrays rather than trusted purely on HTTP status, since
  // a 200 response can still contain a mix of successes and failures.
  // --------------------------------------------------
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const batches = chunkArray(selectedIds, 100);
      let deletedCount = 0;
      const failures = [];

      for (const batch of batches) {
        const response = await bulkDeleteProducts(batch);
        deletedCount += response.data.deleted_ids?.length ?? 0;
        // missing_ids means the row was already gone before this call
        // ran (deleted by someone else, or stale in the local
        // selection) — that is not a failure, so nothing is shown for
        // it and the row is simply left out of the refreshed table.
        if (response.data.failed?.length) {
          failures.push(...response.data.failed);
        }
      }

      if (failures.length > 0) {
        showError(
          `${deletedCount} product${deletedCount === 1 ? "" : "s"} deleted. ${failures.length} could not be deleted: ${failures
            .map((item) => item.error)
            .join(" ")}`,
        );
      } else {
        showSuccess(
          `${deletedCount} product${deletedCount === 1 ? "" : "s"} deleted.`,
        );
      }

      setSelectedIds([]);
      setConfirmDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      refetch();
    } catch (error) {
      showError(
        error?.response?.data?.detail ||
          "Some products couldn't be deleted. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // --------------------------------------------------
  // EXPORT — API 99, type=products. The backend now builds and returns
  // the CSV file directly for whatever filters are currently applied,
  // so this is a single request instead of looping every page of
  // results and building the file in the browser. The Low Stock view
  // no longer needs its own separate branch either: this export
  // endpoint accepts "low_stock" as a direct status value (unlike the
  // search endpoint above, which only understands a plain in_stock
  // boolean), so filters.status is passed straight through as-is and
  // one call covers every status tab, including Low Stock.
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { success, message } = await downloadExportCsv(
        exportReport,
        {
          type: "products",
          q: debouncedSearch || undefined,
          category_id: filters.categoryId || undefined,
          status: filters.status || undefined,
          min_price: filters.minPrice || undefined,
          max_price: filters.maxPrice || undefined,
          ordering: filters.ordering,
        },
        "products",
      );

      if (success) {
        showSuccess("Products exported.");
      } else {
        showError(message || "Failed to export products. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* gap-3 -> gap-2: tightened to match the smaller image + text next to it */}
          <img
            src={row.primary_image || "/placeholder-product.svg"}
            alt={row.name}
            className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0"
            // w-10 h-10 (40px) was BIGGER than the DataTable's new fixed 36px row height,
            // so this thumbnail alone was forcing every product row to grow past the fixed
            // height no matter what the DataTable component did. w-7 h-7 (28px) now
            // comfortably fits inside the 36px row with room for the cell's own padding.
          />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-medium text-gray-900 truncate leading-tight">
              {/* text-sm (14px) -> text-[10px] sm:text-[11px]: matches the compact size
                  used everywhere else in the reference image; leading-tight keeps this
                  line and the SKU line below it both fitting inside the fixed row height */}
              {row.name}
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">
              SKU: {row.sku || "—"}
            </p>
            {/* text-xs (12px) -> text-[9px]: the SKU sub-line, shrunk to match */}
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
          <p className="text-[10px] sm:text-[11px] font-medium text-gray-900 leading-tight">
            {/* text-sm (14px) -> text-[10px] sm:text-[11px] leading-tight: this is the
                exact "price on top, discount line underneath" stacked-cell pattern from
                Rimsha's reference image — at the old text-sm size, two of these stacked
                lines didn't fit inside the DataTable's fixed 36px row, so this shrink
                (matched with the DataTable's own overflow-hidden fix) is what actually
                gets it fitting without clipping */}
            {formatPrice(row.price)}
          </p>
          {/* Number(): row.original_price and row.price arrive as decimal
              strings (e.g. "10000.00") — comparing raw strings with > does
              a lexicographic comparison instead of a numeric one, which
              silently breaks whenever the original price's leading digit
              is smaller than the sale price's leading digit. */}
          {Number(row.original_price) > Number(row.price) && (
            <p className="text-[9px] text-gray-400 line-through leading-tight">
              {/* text-xs (12px) -> text-[9px] leading-tight: the second stacked line */}
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
            // text-sm (14px) -> text-[10px] sm:text-[11px] on all three branches below:
            // same compact size as the rest of the table's cells, and small enough that
            // this column never needs its own two-line wrap inside the fixed row height
            className={
              available === 0
                ? "text-danger text-[10px] sm:text-[11px]"
                : available <= 5
                  ? "text-warning text-[10px] sm:text-[11px]"
                  : "text-gray-700 text-[10px] sm:text-[11px]"
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
    // Vertical rhythm tightened further (gap-2 -> gap-1.5) so the stats
    // cards, the filters/export toolbar, and the products table below it
    // all sit even closer together -- addresses continued feedback that
    // the distance above/below the buttons row was still too large.
    // Purely spacing, no structural change.
    <div className="flex flex-col gap-1.5 flex-1 min-h-0">
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
          isLoadingTotalCount || isLoadingOutOfStock || isLoadingLowStockCount
        }
      />

      <ProductFilters
        categoryOptions={categoryOptions}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Bulk action bar — only shown once at least one row is selected */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<AiOutlineDelete className="w-3.5 h-3.5" />}
            onClick={() => setConfirmDeleteOpen(true)}
            className="px-2.5 py-1 text-xs whitespace-nowrap"
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
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
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
