import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineEye, AiOutlineShoppingCart } from "react-icons/ai";
// react-icons — the icons used by the table's own row actions and the
// page header. The search/filter/export/status-tab icons now live
// inside the shared toolbar components used by OrderFilters below.

import {
  getAdminOrders,
  filterAdminOrders,
  updateOrderStatus,
} from "../../api/orders.api";
// getAdminOrders    — API 47: GET /api/v1/admin/orders/ (no filters active)
// filterAdminOrders — API 48: GET /api/v1/admin/orders/filter/ (status/date/search/ordering/page)
// Both now correctly forward `page`, and `ordering` is confirmed
// working on the filter endpoint (see the backend fix notes below).
// updateOrderStatus — API 49: PUT /api/v1/admin/orders/{id}/status/, used
// below to drive the bulk status-update action bar.

import { exportReport } from "../../api/analytics.api";
// exportReport — `type: "orders"` is now a confirmed accepted value

import { ROUTES } from "../../constants/routes";
import { ORDER_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Select from "../../components/ui/Select";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already used
// on every other admin screen (Products, Categories, Dashboard, etc).
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
  { key: ORDER_STATUS.CONFIRMED, label: "Confirmed" },
  { key: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { key: ORDER_STATUS.DELIVERED, label: "Delivered" },
  { key: ORDER_STATUS.CANCELLED, label: "Cancelled" },
];

// Note: the sort option list (Newest/Oldest/Amount/Order Number) now
// lives inside OrderFilters.jsx, right next to the Sort dropdown chip
// that renders it, since nothing in this file needs the list directly
// any more.

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
  // defaults to "All" exactly as before.

  const [search, setSearch] = useState("");
  // search — raw text typed into the main search box BEFORE debouncing.
  // Matches against order number, customer name, AND phone number —
  // all three are now confirmed to be matched server-side by this one
  // field.

  const [phoneSearch, setPhoneSearch] = useState("");
  // phoneSearch — the dedicated "Phone Number" advanced-filter field.
  // The backend confirmed that its ONE generic `search` param now
  // matches phone number too (there's no separate `phone` param) — so
  // this field's value is sent through AS the `search` param whenever
  // it has a value, taking priority over whatever's typed in the main
  // search box above. The two fields are kept visually separate (this
  // wasn't asked to change), they both just feed the same backend
  // parameter under the hood.

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // startDate / endDate — sent straight through to API 48 as
  // start_date / end_date query params.

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
  const debouncedPhoneSearch = useDebounce(phoneSearch, 400);
  // Waits 400ms after the admin stops typing before actually firing a
  // network request — prevents a new API call on every keystroke.

  // The dedicated phone field takes priority over the main search box
  // when both happen to have a value, since it's the more specific,
  // intentional filter.
  const effectiveSearch = debouncedPhoneSearch || debouncedSearch;

  const hasActiveFilters =
    !!activeStatus || !!effectiveSearch || !!startDate || !!endDate;
  // hasActiveFilters — true the moment ANY filter is active. Decides
  // which endpoint gets called (API 47 vs API 48) — the plain list
  // endpoint is only used when browsing with zero filters.

  // --------------------------------------------------
  // ORDERS LIST — real server-side filtering, search (including phone),
  // sorting, and pagination. Only ONE already-filtered, already-sorted
  // page of orders is ever fetched.
  // --------------------------------------------------
  const {
    data: ordersResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "adminOrders",
      "list",
      {
        activeStatus,
        search: effectiveSearch,
        startDate,
        endDate,
        sortBy,
        page: currentPage,
        pageSize,
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
          search: effectiveSearch || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
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
  // `visibleOrders` is always exactly one real, already-filtered,
  // already-sorted page straight from the backend, sized according to
  // the currently selected `pageSize` — no client-side re-filtering,
  // re-sorting, or re-slicing on top of it.

  const hasAnyFilterActive = hasActiveFilters;

  // Whenever any filter, sort, or page size changes, jump back to
  // page 1 — staying on, say, page 3 of a now-smaller result set would
  // otherwise show an empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, effectiveSearch, startDate, endDate, sortBy, pageSize]);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
  };

  const handleClearFilters = () => {
    setActiveStatus("");
    setSearch("");
    setPhoneSearch("");
    setStartDate("");
    setEndDate("");
    setSortBy("-created_at");
    // Resets every filter AND the sort back to its default in one click
  };

  // --------------------------------------------------
  // EXPORT — downloads the returned blob as a real .csv file
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({
        type: "orders",
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Export downloaded.");
    } catch {
      // catch with no binding — we don't need the error object itself,
      // only need to know the export failed so we can show a message.
      showError("Failed to export orders. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------
  // BULK STATUS UPDATE — API 49, called once per selected order (there
  // is no bulk endpoint on the backend). Uses Promise.allSettled so one
  // failing order doesn't stop the rest of the batch from going
  // through, then reports how many succeeded and how many failed.
  // --------------------------------------------------
  const handleBulkStatusUpdate = async () => {
    setIsBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        selectedOrderNumbers.map((orderNumber) =>
          updateOrderStatus(orderNumber, { status: bulkTargetStatus }),
        ),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        showSuccess(
          `${succeeded} order${succeeded === 1 ? "" : "s"} updated to "${bulkTargetStatus}".${failed > 0 ? ` ${failed} failed.` : ""}`,
        );
      }
      if (succeeded === 0) {
        showError("Failed to update the selected orders.");
      }

      refetch();
      setSelectedOrderNumbers([]);
      setConfirmBulkStatusOpen(false);
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
          <p className="text-sm text-gray-900">{row.customer?.name || "—"}</p>
          <p className="text-xs text-gray-400">{row.customer?.phone || ""}</p>
        </div>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900">
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
      key: "created_at",
      label: "Date",
      render: (row) => (
        <span className="text-sm text-gray-500">
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
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, same component used
          on every other admin page.
          ================================================================ */}
      <PageHeader icon={<AiOutlineShoppingCart />} title="Orders" />
      {/* Note: the mockup's "+ Create Order" button is NOT included —
          there is no documented API for an admin to manually create an
          order on a customer's behalf; Checkout (API 52) is a
          customer-only, cart-based flow. */}

      {/* ================================================================
          STATS CARDS
          ================================================================ */}
      <OrderStatsCards />

      {/* ================================================================
          TOOLBAR — status tabs, search, Filters, Export, and (once
          opened) the Date Range / Phone Number / Sort dropdown chips.
          Same shared toolbar pattern used on every other admin list
          page (see src/components/shared/list-toolbar).
          ================================================================ */}
      <OrderFilters
        statusTabs={STATUS_TABS}
        activeStatus={activeStatus}
        onStatusChange={handleTabChange}
        search={search}
        onSearchChange={setSearch}
        phoneSearch={phoneSearch}
        onPhoneSearchChange={setPhoneSearch}
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
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedOrderNumbers.length} order
            {selectedOrderNumbers.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select
              options={BULK_STATUS_OPTIONS}
              value={bulkTargetStatus}
              onChange={(e) => setBulkTargetStatus(e.target.value)}
              className="sm:w-48"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmBulkStatusOpen(true)}
              className="w-full sm:w-auto"
            >
              Update Status
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================
          ORDERS TABLE
          ================================================================ */}
      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
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
