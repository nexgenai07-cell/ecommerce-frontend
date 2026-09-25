import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineEye, AiOutlineShoppingCart } from "react-icons/ai";
// react-icons — the icons used by the table's own row actions and the
// page header. The search/filter/export/status-tab icons live inside
// the shared toolbar components used by OrderFilters below.

import {
  getAdminOrders,
  filterAdminOrders,
  bulkUpdateOrderStatus,
} from "../../api/orders.api";
// getAdminOrders       — GET /api/v1/admin/orders/ (no filters active)
// filterAdminOrders    — GET /api/v1/admin/orders/filter/ (status/date/search/ordering/page)
// Both forward `page`, and `ordering` works on the filter endpoint.
// bulkUpdateOrderStatus — POST /api/v1/admin/orders/bulk-status/, drives
// the bulk status-update action bar below.

import { exportReport } from "../../api/analytics.api";
// exportReport — `type: "orders"` is an accepted value

import { ROUTES } from "../../constants/routes";
import { ORDER_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import chunkArray from "../../utils/chunkArray";
import downloadExportCsv from "../../utils/downloadExportCsv";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Select from "../../components/ui/Select";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the shared gradient icon + title header used on every
// admin screen (Products, Categories, Dashboard, etc).
import OrderStatsCards from "../../components/admin-orders/OrderStatsCards";
import OrderFilters from "../../components/admin-orders/OrderFilters";

// --------------------------------------------------
// STATUS TABS — one pill per real ORDER_STATUS value, plus "All".
// "Returned" is intentionally excluded — it isn't a real ORDER_STATUS
// value; return requests are their own entity with their own page
// (ReturnsManagement.jsx).
// --------------------------------------------------
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: ORDER_STATUS.PENDING, label: "Pending" },
  // "On Hold" is a legacy status that some existing orders still carry
  // (the backend does not assign it to new orders), so it keeps its own
  // tab to keep those orders reachable.
  { key: ORDER_STATUS.ON_HOLD, label: "On Hold" },
  { key: ORDER_STATUS.CONFIRMED, label: "Confirmed" },
  { key: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { key: ORDER_STATUS.DELIVERED, label: "Delivered" },
  { key: ORDER_STATUS.CANCELLED, label: "Cancelled" },
];

// The sort option list (Newest/Oldest/Amount/Order Number) lives inside
// OrderFilters.jsx, next to the Sort dropdown chip that renders it.

// --------------------------------------------------
// BULK STATUS OPTIONS — the subset of ORDER_STATUS values that are
// safe to apply in bulk with a single click. PENDING is excluded
// because it isn't a forward transition, and CANCELLED is excluded
// because updateOrderStatus() requires a cancellation_reason (and, for
// QR-paid orders, manual refund details) that only makes sense
// collected per order, not applied identically to a mixed batch.
// --------------------------------------------------
const BULK_STATUS_OPTIONS = [
  { value: ORDER_STATUS.CONFIRMED, label: "Confirmed" },
  { value: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { value: ORDER_STATUS.OUT_FOR_DELIVERY, label: "Out for Delivery" },
  { value: ORDER_STATUS.DELIVERED, label: "Delivered" },
];

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// Set of every status value the tab bar actually recognizes, used to
// validate an incoming "status" URL parameter so an unrecognized or
// malformed value falls back to "All" instead of leaving the page in a
// pill state that doesn't match any tab.
const VALID_STATUS_KEYS = new Set(STATUS_TABS.map((tab) => tab.key));

const OrderManagement = () => {
  const navigate = useNavigate();
  // navigate — used by the "eye" action button on each row to push the
  // admin to that order's detail page.

  const [searchParams] = useSearchParams();
  // searchParams — read once on mount to support deep links such as
  // /admin/orders?status=pending_payment, which the Dashboard's
  // "Pending Orders" card uses to land directly on a pre-filtered view.

  const [activeStatus, setActiveStatus] = useState(() => {
    const statusFromUrl = searchParams.get("status");
    return VALID_STATUS_KEYS.has(statusFromUrl) ? statusFromUrl : "";
  });
  // activeStatus — which status pill is currently selected ("" = All).
  // Initialized from the URL when a valid status is present, otherwise
  // defaults to "All".

  const [search, setSearch] = useState("");
  // search — raw text typed into the main search box before debouncing.
  // Matches against order number and customer name — server-side, via
  // Admin — Filter Orders (API 62). It does NOT match phone number;
  // there is no phone-matching filter on this endpoint. A dedicated
  // "Phone Number" field used to sit next to this box sending its value
  // through this same param, but it never actually filtered by phone —
  // it was removed for that reason (Sep 2026). Add it back only once
  // the backend adds real phone matching to this endpoint.

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // startDate / endDate — sent straight through to the filter endpoint as
  // start_date / end_date query params. The end date can never be earlier
  // than the start date.

  // Two additional advanced filters accepted by the filter endpoint —
  // partial, case-insensitive matches against a product's name / its
  // category's name across any line item in the order. Same
  // debounce-then-send pattern as search above.
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — sent straight to the backend as `ordering` (see SORT_OPTIONS
  // comment above). Defaults to "Newest First".

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many orders the backend returns per page, controlled
  // by the "Rows per page" dropdown in the table footer. Sent to the
  // backend as `page_size` alongside `page` on every request.
  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection — array of order_number values currently checked in
  // the table, driven by DataTable's built-in selection support.
  const [selectedOrderNumbers, setSelectedOrderNumbers] = useState([]);
  // Which status the bulk action bar's dropdown currently has chosen —
  // sent as the target status when the admin confirms the bulk update.
  const [bulkTargetStatus, setBulkTargetStatus] = useState(
    ORDER_STATUS.SHIPPED,
  );
  const [confirmBulkStatusOpen, setConfirmBulkStatusOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  // Waits 400ms after the admin stops typing before actually firing a
  // network request — prevents a new API call on every keystroke.
  const debouncedProductFilter = useDebounce(productFilter, 400);
  const debouncedCategoryFilter = useDebounce(categoryFilter, 400);

  const hasActiveFilters =
    !!activeStatus ||
    !!debouncedSearch ||
    !!startDate ||
    !!endDate ||
    !!debouncedProductFilter ||
    !!debouncedCategoryFilter;
  // hasActiveFilters — true the moment ANY filter is active. Decides
  // which endpoint gets called (filter endpoint vs plain list) — the
  // plain list endpoint is only used when browsing with zero filters.

  // --------------------------------------------------
  // ORDERS LIST — server-side filtering, search (including phone),
  // sorting, and pagination. Only ONE already-filtered, already-sorted
  // page of orders is ever fetched.
  // --------------------------------------------------
  const {
    data: ordersResponse,
    isLoading,
    isError,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: [
      "adminOrders",
      "list",
      {
        activeStatus,
        search: debouncedSearch,
        startDate,
        endDate,
        sortBy,
        page: currentPage,
        pageSize,
        productFilter: debouncedProductFilter,
        categoryFilter: debouncedCategoryFilter,
      },
    ],
    queryFn: ({ signal }) => {
      if (!hasActiveFilters) {
        return getAdminOrders(
          { ordering: sortBy, page: currentPage, page_size: pageSize },
          signal,
        );
      }
      return filterAdminOrders(
        {
          status: activeStatus || undefined,
          search: debouncedSearch || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          // Partial, case-insensitive product/category name matching,
          // combinable with every other filter above.
          product: debouncedProductFilter || undefined,
          category: debouncedCategoryFilter || undefined,
          ordering: sortBy,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      );
    },
    keepPreviousData: true,
  });

  const visibleOrders = extractListData(ordersResponse);
  const totalCount = ordersResponse?.data?.count ?? visibleOrders.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  // `visibleOrders` is always exactly one already-filtered, already-sorted
  // page straight from the backend, sized according to the currently
  // selected `pageSize` — no client-side re-filtering, re-sorting, or
  // re-slicing on top of it.

  // If the backend rejects the request (for example an invalid date
  // range), show the reason it gives instead of only the generic table
  // error.
  useEffect(() => {
    const message = listError?.response?.data?.error;
    if (message) showError(message);
  }, [listError]);

  const hasAnyFilterActive = hasActiveFilters;

  // Whenever any filter, sort, or page size changes, jump back to
  // page 1 — staying on, say, page 3 of a smaller result set would
  // otherwise show an empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeStatus,
    debouncedSearch,
    startDate,
    endDate,
    sortBy,
    pageSize,
    debouncedProductFilter,
    debouncedCategoryFilter,
  ]);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
  };

  const handleClearFilters = () => {
    setActiveStatus("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setProductFilter("");
    setCategoryFilter("");
    setSortBy("-created_at");
    // Resets every filter AND the sort back to its default in one click
  };

  // --------------------------------------------------
  // EXPORT — API 99, type=orders. downloadExportCsv() downloads the
  // returned blob as a real .csv file, and — on a validation failure —
  // reads the JSON error back out of the blob so the real reason
  // reaches this toast instead of a generic message.
  //
  // Every filter currently applied to the on-screen table is forwarded
  // to the export, so the downloaded file always matches what the
  // admin is looking at: status, search, the date range, the product
  // and category filters, and the sort order.
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { success, message } = await downloadExportCsv(
        exportReport,
        {
          type: "orders",
          status: activeStatus || undefined,
          search: debouncedSearch || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          product: debouncedProductFilter || undefined,
          category: debouncedCategoryFilter || undefined,
          ordering: sortBy,
        },
        `orders-export-${new Date().toISOString().slice(0, 10)}`,
      );

      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to export orders. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------
  // BULK STATUS UPDATE — API 63.2. Every selected order is sent in one
  // request per batch of up to 100 order numbers instead of one request
  // per order. Each order is still evaluated independently on the
  // backend, so an order that isn't eligible for this transition (for
  // example already delivered, or unpaid) is reported in that batch's
  // "failed" array without stopping the rest of the batch.
  //
  // "Cancelled" is intentionally not offered in BULK_STATUS_OPTIONS
  // above — cancelling requires a cancellation reason, and for a QR-paid
  // order also manual refund details, which only make sense collected
  // per order. Cancelling stays a per-order action on the Order Detail
  // page (updateOrderStatus in orders.api.js).
  // --------------------------------------------------
  const handleBulkStatusUpdate = async () => {
    setIsBulkUpdating(true);
    try {
      const batches = chunkArray(selectedOrderNumbers, 100);
      let updatedCount = 0;
      const failures = [];

      for (const batch of batches) {
        const response = await bulkUpdateOrderStatus(batch, bulkTargetStatus);
        updatedCount += response.data.updated_ids?.length ?? 0;
        // missing_ids means the order no longer matches this selection
        // (for example it was deep-linked from a stale page) — that is
        // not a failure, so it needs no message of its own.
        if (response.data.failed?.length) {
          failures.push(...response.data.failed);
        }
      }

      if (updatedCount > 0) {
        showSuccess(
          `${updatedCount} order${updatedCount === 1 ? "" : "s"} updated to "${bulkTargetStatus}".${failures.length > 0 ? ` ${failures.length} failed.` : ""}`,
        );
      }
      if (updatedCount === 0) {
        showError("Failed to update the selected orders.");
      }

      refetch();
      setSelectedOrderNumbers([]);
      setConfirmBulkStatusOpen(false);
    } catch (error) {
      showError(
        error?.response?.data?.detail ||
          "Failed to update the selected orders.",
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const columns = [
    {
      key: "order_number",
      label: "Order ID",
      render: (row) => (
        <span className="font-semibold text-gray-900">{row.order_number}</span>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="text-[10px] sm:text-[11px] text-gray-900 leading-tight">
            {/* Compact stacked cell (10-11px, tight leading) so this two-line
                Customer cell fits the DataTable's fixed 36px row without clipping */}
            {row.customer?.name || "—"}
          </p>
          <p className="text-[9px] text-gray-400 leading-tight">
            {row.customer?.phone || ""}
          </p>
        </div>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] font-semibold text-gray-900">
          {/* text-sm (14px) -> text-[10px] sm:text-[11px]: matches the rest of the table */}
          {formatPrice(row.total_amount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} status={row.status} size="sm" rounded />
      ),
    },
    {
      // Payment Status — API 60/62 (24 Sep 2026). The linked Payment's
      // status (pending / under_review / paid / rejected / refunded),
      // previously visible only in the CSV export, now available on
      // this table endpoint too. null when the order has no payment
      // record yet, shown as a plain dash rather than an empty badge.
      key: "payment_status",
      label: "Payment Status",
      render: (row) =>
        row.payment_status ? (
          <Badge
            label={row.payment_status}
            status={row.payment_status}
            size="sm"
            rounded
          />
        ) : (
          <span className="text-[10px] sm:text-[11px] text-gray-400">—</span>
        ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500">
          {/* text-sm (14px) -> text-[10px] sm:text-[11px]: matches the rest of the table */}
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Stops this click from also bubbling up to the row's own
            // onClick, which opens the same order detail page — without
            // this, clicking the icon would trigger navigation twice
            navigate(
              ROUTES.ADMIN_ORDER_DETAIL.replace(":id", row.order_number),
            );
          }}
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          aria-label={`View order ${row.order_number}`}
        >
          <AiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // Opens the same order detail page as the row's eye icon — passed to
  // DataTable so clicking anywhere on a row (outside the checkbox column)
  // navigates there too, not just the small icon
  const handleRowClick = (row) =>
    navigate(ROUTES.ADMIN_ORDER_DETAIL.replace(":id", row.order_number));

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-6 to gap-2 so the page matches the tighter rhythm
    // already used on Product Management, instead of leaving large empty
    // bands between each section.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, same component used
          on every other admin page.
          ================================================================ */}
      <PageHeader icon={<AiOutlineShoppingCart />} title="Orders" />
      {/* There is deliberately no "+ Create Order" button: no endpoint lets
          an admin create an order on a customer's behalf, since checkout is
          a customer-only, cart-based flow. */}

      {/* ================================================================
          STATS CARDS
          ================================================================ */}
      <OrderStatsCards />

      {/* ================================================================
          TOOLBAR — status tabs, search, Filters, Export, and (once
          opened) the Date Range / Product / Category / Sort dropdown
          chips. Same shared toolbar pattern used on every other admin
          list page (see src/components/shared/list-toolbar).
          ================================================================ */}
      <OrderFilters
        statusTabs={STATUS_TABS}
        activeStatus={activeStatus}
        onStatusChange={handleTabChange}
        search={search}
        onSearchChange={setSearch}
        productFilter={productFilter}
        onProductFilterChange={setProductFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasAnyFilterActive}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* ================================================================
          BULK ACTION BAR — appears only while one or more rows are
          checked. Lets the admin move every selected order to the same
          target status in one action. Stacks vertically on narrow
          screens, sits on one line from the small breakpoint upward.
          ================================================================ */}
      {selectedOrderNumbers.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-medium text-gray-700">
            {selectedOrderNumbers.length} order
            {selectedOrderNumbers.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
            <Select
              options={BULK_STATUS_OPTIONS}
              value={bulkTargetStatus}
              onChange={(e) => setBulkTargetStatus(e.target.value)}
              className="sm:w-40 py-1 pl-3 pr-8 text-xs"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmBulkStatusOpen(true)}
              className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
            >
              Update Status
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================
          ORDERS TABLE
          ================================================================ */}
      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)] flex flex-col flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={visibleOrders}
          keyField="order_number"
          onRowClick={handleRowClick}
          selectable
          onSelectionChange={setSelectedOrderNumbers}
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ================================================================
          BULK STATUS UPDATE CONFIRMATION
          ================================================================ */}
      <ConfirmModal
        isOpen={confirmBulkStatusOpen}
        onClose={() => setConfirmBulkStatusOpen(false)}
        onConfirm={handleBulkStatusUpdate}
        title="Update Order Status?"
        message={`This will move ${selectedOrderNumbers.length} order${selectedOrderNumbers.length === 1 ? "" : "s"} to "${bulkTargetStatus}" and notify each customer. Orders that aren't eligible for this transition will be skipped and reported individually.`}
        confirmLabel="Update Status"
        variant="primary"
        isLoading={isBulkUpdating}
      />
    </div>
  );
};

export default OrderManagement;
