import { useState, useEffect, useRef } from "react";
// useState — local state for the active tab, filters, search, and page
// useEffect — resets the current page back to 1 whenever a filter changes
// useRef — points at the tabs/table section so "Review All" can
// smooth-scroll down to it

import { useNavigate } from "react-router-dom";
// useNavigate — client-side navigation for "Restock"

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches, caches, and re-fetches server data automatically

import {
  AiOutlineWarning,
  // PageHeader icon for this page — same icon already used for
  // "Inventory Alerts" in the admin sidebar
} from "react-icons/ai";

import { searchProducts } from "../../api/products.api";
// searchProducts — the backend now correctly filters `in_stock`
// server-side and matches `q` against both name and sku, so the
// default ("All") view and every status tab combination use this with
// real pagination — no more downloading the entire catalog.
//
// UPDATED (16 Sep 2026, Filtering Fix pass, API 29): `status` now
// accepts MULTIPLE values in one request — comma-separated
// ("out_of_stock,low_stock") or repeated — so every selected status
// tab is sent together as ONE server-paginated request. This replaces
// the earlier per-status fetch-and-merge workaround entirely (see the
// git history for that approach), which is no longer needed now that
// multi-status filtering is confirmed to work server-side.

import { getInventoryAlerts } from "../../api/analytics.api";
// getInventoryAlerts — the dedicated "products needing attention"
// endpoint. This is intentionally a small, bounded exception list by
// design (the backend's own comment confirms it takes no params and
// "just returns whatever is currently flagged"), so using its result
// directly — without pagination — is correct here, not a repeat of
// the old "fetch everything" problem. It's the data source for the
// "Low Stock" tab, and for cross-referencing which products are
// flagged at all.

import { getCategories } from "../../api/categories.api";
import { exportReport } from "../../api/analytics.api";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";

import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen (Dashboard, Orders, Products,
// Customer Growth...). Matches this page to the rest of the panel
// instead of a plain <h1>.

import InventoryStatsCards from "../../components/admin-inventory/InventoryStatsCards";
import InventoryAlertBanner from "../../components/admin-inventory/InventoryAlertBanner";
import InventoryFilters from "../../components/admin-inventory/InventoryFilters";
// InventoryFilters — the shared-style toolbar above the table (search,
// Filters toggle, Export, Category chip, and the multi-select status
// tabs specific to this page).

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "out_of_stock", label: "Out of Stock" },
  { key: "low_stock", label: "Low Stock" },
  { key: "healthy", label: "Healthy" },
];

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100 and every other admin
// list page in the project.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const InventoryAlerts = () => {
  const navigate = useNavigate();
  // navigate — used by the Restock button

  const [activeTabs, setActiveTabs] = useState([]);
  // activeTabs — an ARRAY of currently selected status filters
  // (out_of_stock / low_stock / healthy). Multiple can be selected at
  // once — e.g. selecting BOTH "Out of Stock" and "Low Stock" shows
  // products matching EITHER one, combined together. An empty array
  // means "All" — no status filtering at all.

  const [categoryId, setCategoryId] = useState("");
  // categoryId — currently selected category filter ("" = All Categories)

  const [search, setSearch] = useState("");
  // search — raw text typed into the filter box BEFORE debouncing

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many products are shown per page, controlled by the
  // "Rows per page" dropdown in the table footer. Used both as the
  // `page_size` sent to the backend for the single-status view, and as
  // the client-side slice size for the merged multi-status view.

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };
  // currentPage — which page of the current view is being shown

  const [isExporting, setIsExporting] = useState(false);
  // isExporting — true while the CSV export download is in progress

  const tableSectionRef = useRef(null);
  // tableSectionRef — points at the tabs/filter/table section below;
  // "Review All" in the alert banner scrolls down to this element

  const debouncedSearch = useDebounce(search, 400);
  // Waits 400ms after the admin stops typing before actually filtering
  // — avoids re-filtering/re-fetching on every single keystroke

  const hasActiveFilters = activeTabs.length > 0 || !!search || !!categoryId;
  // Drives the "Clear all" link's visibility in the toolbar.

  const handleToggleStatus = (key) => {
    setActiveTabs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleClearStatus = () => setActiveTabs([]);

  const handleClearFilters = () => {
    setActiveTabs([]);
    setSearch("");
    setCategoryId("");
  };

  // --------------------------------------------------
  // INVENTORY ALERTS — the small, bounded "needs attention" list.
  // Built into a lookup map keyed by product_id (for the "Healthy"
  // cross-reference below), and used directly as the table's data
  // source whenever "Out of Stock" and/or "Low Stock" is selected.
  // --------------------------------------------------
  const { data: alertsResponse } = useQuery({
    queryKey: ["inventoryAlerts", "map"],
    queryFn: ({ signal }) => getInventoryAlerts(signal),
    staleTime: 1000 * 60 * 2,
  });
  const alerts = extractListData(alertsResponse);
  const alertsByProductId = {};
  alerts.forEach((alert) => {
    alertsByProductId[alert.product_id] = alert;
  });

  const outOfStockCount = alerts.filter(
    (a) => (a.available_stock ?? 0) === 0,
  ).length;
  const lowStockCount = alerts.filter(
    (a) => (a.available_stock ?? 0) > 0,
  ).length;

  // --------------------------------------------------
  // CATEGORIES — for the filter dropdown
  // --------------------------------------------------
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(undefined, signal),
    staleTime: 1000 * 60 * 10,
  });
  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...extractListData(categoriesResponse).map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ];

  // --------------------------------------------------
  // MAIN PRODUCT QUERY — one real, server-paginated request no matter
  // how many status tabs are selected.
  // --------------------------------------------------
  // UPDATED (16 Sep 2026, Filtering Fix pass, API 29): `status` is now
  // confirmed to accept multiple values in a single request — sent
  // here as a comma-separated list built from every checked tab — so
  // selecting BOTH "Out of Stock" and "Low Stock" (for example) is one
  // request that returns products matching EITHER status, already
  // combined and correctly counted server-side. An empty `activeTabs`
  // array (the "All" view) simply omits `status` entirely.
  // --------------------------------------------------
  const statusParam = activeTabs.length > 0 ? activeTabs.join(",") : undefined;

  const {
    data: activeResponse,
    isLoading: activeIsLoading,
    isError: activeIsError,
    refetch,
  } = useQuery({
    queryKey: [
      "inventoryAlerts",
      "server",
      debouncedSearch,
      categoryId,
      statusParam,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      searchProducts(
        {
          q: debouncedSearch || undefined,
          category_id: categoryId || undefined,
          status: statusParam,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });

  const activeProducts = extractListData(activeResponse);
  const activeTotalCount = activeResponse?.data?.count ?? 0;
  const activeTotalPages = Math.max(1, Math.ceil(activeTotalCount / pageSize));

  // Whenever the search term, category, status tabs, or rows-per-page
  // selection change, jump back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryId, activeTabs, pageSize]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({ type: "inventory" });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Export downloaded.");
    } catch (error) {
      showError("Failed to export inventory. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Table column config
  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* gap-3 -> gap-2, w-10 h-10 -> w-7 h-7: same fix as ProductList's Product
              column — the 40px thumbnail was taller than the DataTable's fixed 36px
              row and was forcing this row to grow past it */}
          <img
            src={row.primary_image || "/placeholder-product.svg"}
            alt={row.name}
            className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-medium text-gray-900 truncate leading-tight">
              {row.name}
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">
              SKU: {row.sku || "—"}
            </p>
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
      key: "stock",
      label: "Current Stock",
      render: (row) => (
        <span
          className={
            (row.available_stock ?? 0) === 0
              ? "text-danger font-medium text-[10px] sm:text-[11px]"
              : alertsByProductId[row.id]
                ? "text-warning font-medium text-[10px] sm:text-[11px]"
                : "text-gray-900 text-[10px] sm:text-[11px]"
          }
        >
          {row.available_stock ?? 0}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const alert = alertsByProductId[row.id];
        if (!alert) {
          return <Badge label="Healthy" variant="success" size="sm" rounded />;
        }
        if ((alert.available_stock ?? 0) === 0) {
          return (
            <Badge label="Out of Stock" variant="danger" size="sm" rounded />
          );
        }
        return <Badge label="Low Stock" variant="warning" size="sm" rounded />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            // Stops this click from also bubbling up to the row's own
            // onClick, which navigates to the same page — avoids a
            // redundant double navigation when the button itself is clicked
            navigate(ROUTES.ADMIN_PRODUCT_EDIT.replace(":id", row.id));
          }}
        >
          Restock
        </Button>
      ),
    },
  ];

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-6 to gap-2 so the page matches the tighter rhythm
    // already used on Product Management, instead of leaving large empty
    // bands between each section.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Shared gradient PageHeader — matches every other admin screen.
          Export Report button lives inside the header's `actions` slot. */}
      <PageHeader icon={<AiOutlineWarning />} title="Inventory Alerts" />

      <InventoryAlertBanner
        outOfStockCount={outOfStockCount}
        lowStockCount={lowStockCount}
        onReviewAll={() => {
          setActiveTabs(["out_of_stock", "low_stock"]);
          tableSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      />

      <InventoryStatsCards />

      {/* Toolbar — search, Filters, Export, Category chip, and the
          multi-select status tabs — ref target for the "Review All"
          smooth-scroll above. Same shared toolbar pattern used on
          every other admin list page. */}
      <div ref={tableSectionRef}>
        <InventoryFilters
          statusOptions={STATUS_TABS}
          activeTabs={activeTabs}
          onToggleStatus={handleToggleStatus}
          onClearStatus={handleClearStatus}
          search={search}
          onSearchChange={setSearch}
          categoryOptions={categoryOptions}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </div>

      <DataTable
        columns={columns}
        data={activeProducts}
        keyField="id"
        onRowClick={(row) =>
          navigate(ROUTES.ADMIN_PRODUCT_EDIT.replace(":id", row.id))
        }
        // Opens the same product edit page as the Restock button when any
        // part of the row is clicked
        isLoading={activeIsLoading}
        error={activeIsError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={activeTotalPages}
        totalResults={activeTotalCount}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default InventoryAlerts;
// Default export — this is the actual page component routed at
// /admin/analytics/inventory
