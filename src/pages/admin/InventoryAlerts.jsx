import { useState, useEffect } from "react";
// useState — local state for the active tab, filters, search, and page
// useEffect — resets the current page back to 1 whenever a filter changes

import { useNavigate } from "react-router-dom";
// useNavigate — client-side navigation for "Restock" and "Create New"

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches, caches, and re-fetches server data automatically

import {
  AiOutlinePlus,
  // "Create New" button icon
  AiOutlineDownload,
  // "Export Report" button icon
  AiOutlineSearch,
  // Search input icon
  AiOutlineWarning,
  // PageHeader icon for this page — same icon already used for
  // "Inventory Alerts" in the admin sidebar
} from "react-icons/ai";

import { fetchAllProducts } from "../../api/products.api";
// fetchAllProducts — NEW helper that loops through every page of
// API 16 and returns one complete, flat array of every product in the
// catalog. This is what makes the fix below possible: filtering and
// pagination now happen against the REAL, complete list instead of
// just whatever single server page happened to be loaded.

import { getInventoryAlerts } from "../../api/analytics.api";
// getInventoryAlerts — API 74, the source for exactly which products
// are flagged and what their real threshold is

import { getCategories } from "../../api/categories.api";
import { exportReport } from "../../api/analytics.api";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";

import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen (Dashboard, Orders, Products,
// Customer Growth...). Matches this page to the rest of the panel
// instead of a plain <h1>.

import InventoryStatsCards from "../../components/admin-inventory/InventoryStatsCards";
import InventoryAlertBanner from "../../components/admin-inventory/InventoryAlertBanner";

// --------------------------------------------------
// STATUS TABS — filtering is now done ENTIRELY on the frontend, over
// the complete product list (see fetchAllProducts above), so every
// tab's result set and count is always the real, correct total —
// never just whatever happened to be on the currently loaded server page.
// --------------------------------------------------
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "out_of_stock", label: "Out of Stock" },
  { key: "low_stock", label: "Low Stock" },
  { key: "healthy", label: "Healthy" },
];

const PAGE_SIZE = 12;
// PAGE_SIZE — how many products are shown per page. Pagination is now
// done entirely on the frontend (see pageProducts below), since we
// hold the complete, already-filtered list in memory.

const InventoryAlerts = () => {
  const navigate = useNavigate();
  // navigate — used by the Restock and Create New buttons

  const [activeTab, setActiveTab] = useState("");
  // activeTab — which STATUS_TABS key is currently selected ("" = All)

  const [categoryId, setCategoryId] = useState("");
  // categoryId — currently selected category filter ("" = All Categories)

  const [search, setSearch] = useState("");
  // search — raw text typed into the filter box BEFORE debouncing

  const [currentPage, setCurrentPage] = useState(1);
  // currentPage — which page of the (already filtered) list is being viewed

  const [isExporting, setIsExporting] = useState(false);
  // isExporting — true while the CSV export download is in progress

  const debouncedSearch = useDebounce(search, 400);
  // Waits 400ms after the admin stops typing before actually filtering
  // — avoids re-filtering the whole list on every single keystroke

  // --------------------------------------------------
  // INVENTORY ALERTS — API 74. This is the ONLY source that tells us
  // exactly which products are flagged and their real threshold.
  // Built once into a lookup map keyed by product_id, so every row in
  // the table below can cheaply check "is THIS specific product
  // flagged, and if so what's its real min-stock threshold?"
  // --------------------------------------------------
  const { data: alertsResponse } = useQuery({
    queryKey: ["inventoryAlerts", "map"],
    queryFn: getInventoryAlerts,
    staleTime: 1000 * 60 * 2,
    // staleTime — keeps this cached for 2 minutes before refetching
  });
  const alerts = extractListData(alertsResponse);
  const alertsByProductId = {};
  alerts.forEach((alert) => {
    alertsByProductId[alert.product_id] = alert;
    // Keys the lookup map by product_id for O(1) access per row
  });

  const outOfStockCount = alerts.filter((a) => a.stock === 0).length;
  const lowStockCount = alerts.filter((a) => a.stock > 0).length;

  // --------------------------------------------------
  // CATEGORIES — for the filter dropdown
  // --------------------------------------------------
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
    // staleTime — categories rarely change, cached for 10 minutes
  });
  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...extractListData(categoriesResponse).map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ];

  // --------------------------------------------------
  // FULL PRODUCT CATALOG — fetched ONCE, completely, using the new
  // fetchAllProducts helper. Every filter below (search, category,
  // status tab) and the pagination further down operate on this
  // complete list, entirely on the frontend — this is the actual fix
  // for the broken tab/pagination interaction.
  // --------------------------------------------------
  const {
    data: allProducts = [],
    // Defaults to an empty array so .filter()/.slice() never crash
    // before the first response arrives
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["inventoryAlerts", "allProducts"],
    // A single, stable cache key — the complete catalog is fetched
    // once and then filtered locally, so no filter change should ever
    // trigger a new network request
    queryFn: fetchAllProducts,
  });

  // --------------------------------------------------
  // CLIENT-SIDE FILTERING — search, category, AND status tab are all
  // applied together, in one pass, over the COMPLETE product list.
  // This is what fixes the reported bug: whichever tab is active now
  // always reflects the real, full set of matching products across
  // the ENTIRE catalog, not just whatever page happened to be loaded.
  // --------------------------------------------------
  const filteredProducts = allProducts.filter((product) => {
    // Search filter — matches against product name or SKU,
    // case-insensitively, only once the debounce delay has settled
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      const nameMatch = (product.name || "").toLowerCase().includes(query);
      const skuMatch = (product.sku || "").toLowerCase().includes(query);
      if (!nameMatch && !skuMatch) return false;
    }

    // Category filter — compares the product's real nested category
    // id against the selected dropdown value
    if (categoryId && String(product.category?.id) !== categoryId) {
      return false;
    }

    // Status tab filter — uses the REAL alertsByProductId map built
    // above to determine each product's true stock status
    if (activeTab === "out_of_stock") {
      return alertsByProductId[product.id]?.stock === 0;
    }
    if (activeTab === "low_stock") {
      return (
        !!alertsByProductId[product.id] &&
        alertsByProductId[product.id].stock > 0
      );
    }
    if (activeTab === "healthy") {
      return !alertsByProductId[product.id];
    }

    // "All" tab (activeTab === "") — no status filtering, only
    // whatever search/category filters above already applied
    return true;
  });

  const totalCount = filteredProducts.length;
  // totalCount — the REAL total of products matching the current
  // search + category + tab combination, across the whole catalog

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // At least 1 page even when totalCount is 0, so pagination never
  // shows "page 0 of 0"

  // Slices out just the current page's worth of rows from the fully
  // filtered list — this is the frontend equivalent of backend
  // pagination, but now correctly scoped to the REAL filtered total
  const pageProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Whenever the search term, category, or status tab changes, jump
  // back to page 1 — staying on, say, page 3 of a brand-new filtered
  // list would either show nothing or the wrong rows
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryId, activeTab]);

  const handleExport = async () => {
    setIsExporting(true);
    // Shows the loading spinner on the Export button immediately
    try {
      const response = await exportReport({ type: "inventory" });
      // FLAG: "inventory" as the `type` value is an assumption, same
      // pattern as every other export button in this admin panel
      const blobUrl = URL.createObjectURL(response.data);
      // Creates a temporary in-browser URL pointing to the downloaded file
      const link = document.createElement("a");
      // Builds a hidden <a> tag purely to trigger a file download
      link.href = blobUrl;
      link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
      // Filename includes today's date
      document.body.appendChild(link);
      link.click();
      // Programmatically "clicks" the link to start the download
      link.remove();
      // Cleans up the temporary <a> tag from the DOM
      URL.revokeObjectURL(blobUrl);
      // Frees the browser memory used by the temporary blob URL
      showSuccess("Export downloaded.");
    } catch (error) {
      showError("Failed to export inventory. Please try again.");
    } finally {
      setIsExporting(false);
      // Always turns off the loading spinner, whether it succeeded or failed
    }
  };

  // Table column config — "Min Stock" column REMOVED per request
  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row) => (
        <div className="flex items-center gap-3">
          {/* Product thumbnail — falls back to a placeholder when no
              primary_image is set */}
          <img
            src={row.primary_image || "/placeholder-product.svg"}
            alt={row.name}
            className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
          />
          <div className="min-w-0">
            {/* min-w-0 allows the truncate classes below to actually
                work inside a flex container */}
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
      key: "stock",
      label: "Current Stock",
      render: (row) => (
        <span
          className={
            row.stock === 0
              ? "text-danger font-medium text-sm"
              : alertsByProductId[row.id]
                ? "text-warning font-medium text-sm"
                : "text-gray-900 text-sm"
          }
        >
          {row.stock}
        </span>
      ),
    },
    // "Min Stock" column REMOVED — was previously here, showing
    // alert.low_stock_threshold only for flagged products and a dash
    // for everything else
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const alert = alertsByProductId[row.id];
        if (!alert) {
          return <Badge label="Healthy" variant="success" size="sm" rounded />;
        }
        if (alert.stock === 0) {
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
          onClick={() =>
            navigate(ROUTES.ADMIN_PRODUCT_EDIT.replace(":id", row.id))
          }
        >
          Restock
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Shared gradient PageHeader — matches every other admin screen.
          Export + Create New buttons live inside the header's `actions`
          slot, stacking responsively on narrow screens. */}
      <PageHeader
        icon={<AiOutlineWarning />}
        // Same icon already used for "Inventory Alerts" in the sidebar
        title="Inventory Alerts"
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              leftIcon={<AiOutlineDownload className="w-4 h-4" />}
              onClick={handleExport}
              isLoading={isExporting}
              className="w-full sm:w-auto"
            >
              Export Report
            </Button>
            <Button
              variant="primary"
              leftIcon={<AiOutlinePlus className="w-4 h-4" />}
              onClick={() => navigate(ROUTES.ADMIN_PRODUCT_ADD)}
              className="w-full sm:w-auto"
            >
              Create New
            </Button>
          </div>
        }
      />

      <InventoryAlertBanner
        outOfStockCount={outOfStockCount}
        lowStockCount={lowStockCount}
        onReviewAll={() => setActiveTab("out_of_stock")}
      />

      <InventoryStatsCards />

      {/* Tabs + search + category filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* overflow-x-auto + scrollbar-hide — lets the tab row
              scroll horizontally on narrow phone screens instead of
              wrapping awkwardly or overflowing the card */}
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                activeTab === tab.key
                  ? "bg-primary-50 text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* flex-col on mobile (stacked), sm:flex-row from the small
              breakpoint up (search box and category dropdown sit
              side by side) */}
          <Input
            placeholder="Filter products..."
            leftIcon={<AiOutlineSearch className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Page-reset now happens centrally in the useEffect above,
            // triggered off debouncedSearch — no need to reset it here
          />
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            // Page-reset now happens centrally in the useEffect above
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pageProducts}
        // pageProducts — the correctly filtered AND paginated slice
        keyField="id"
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        // totalResults — now the REAL total matching the active
        // filters, so the "Showing X of Y" footer text is accurate
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default InventoryAlerts;
// Default export — this is the actual page component routed at
// /admin/analytics/inventory
