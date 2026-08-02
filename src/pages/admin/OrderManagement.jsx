import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineDownload,
  AiOutlineEye,
  AiOutlineShoppingCart,
  AiOutlineClose,
  AiOutlineSortAscending,
  AiOutlinePhone,
} from "react-icons/ai";
// AiOutlinePhone — used on the new "Phone Number" advanced filter field
// react-icons — every small icon used across the redesigned header,
// filter card, and table actions comes from this single icon set so
// the whole page keeps one consistent visual language.

import { getAdminOrders, filterAdminOrders } from "../../api/orders.api";
// getAdminOrders    — API 47: GET /api/v1/admin/orders/ (no filters active)
// filterAdminOrders — API 48: GET /api/v1/admin/orders/filter/ (status/date/search/page)

import { exportReport } from "../../api/analytics.api";
// exportReport — API 77. FLAG: doc only confirms "sales"/"revenue" as
// example `type` values — "orders" is used here as a reasonable guess
// for a generic reporting endpoint; confirm the exact accepted type
// string with the backend team before relying on this in production.

import { ROUTES } from "../../constants/routes";
import { ORDER_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already used
// on every other admin screen (Products, Categories, Dashboard, etc).
// Added here so the Orders page finally matches the rest of the panel
// instead of using its own plain <h1>.
import OrderStatsCards from "../../components/admin-orders/OrderStatsCards";

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

// --------------------------------------------------
// SORT OPTIONS — purely a CLIENT-SIDE re-ordering of whatever page of
// orders is currently loaded. There is no documented "ordering" query
// param on API 47/48, so this does NOT re-query the backend — it just
// re-sorts the rows already on screen by date, amount, or order number,
// which is exactly the "date pr / number pr" filtering richness that
// was asked for, without inventing a backend parameter that doesn't
// exist in the API docs.
// --------------------------------------------------
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "-total_amount", label: "Amount: High to Low" },
  { value: "total_amount", label: "Amount: Low to High" },
  { value: "order_number", label: "Order Number: A-Z" },
  { value: "-order_number", label: "Order Number: Z-A" },
];

// Maps each SORT_OPTIONS value to an actual comparator function used by
// Array.prototype.sort() below.
const SORTERS = {
  "-created_at": (a, b) => new Date(b.created_at) - new Date(a.created_at),
  created_at: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  "-total_amount": (a, b) =>
    (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0),
  total_amount: (a, b) =>
    (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0),
  order_number: (a, b) =>
    (a.order_number || "").localeCompare(b.order_number || ""),
  "-order_number": (a, b) =>
    (b.order_number || "").localeCompare(a.order_number || ""),
};

const PAGE_SIZE = 10;

const OrderManagement = () => {
  const navigate = useNavigate();
  // navigate — used by the "eye" action button on each row to push the
  // admin to that order's detail page.

  const [activeStatus, setActiveStatus] = useState("");
  // activeStatus — which status pill is currently selected ("" = All).

  const [search, setSearch] = useState("");
  // search — raw text typed into the search box BEFORE debouncing.
  // Matches against order number OR customer name, per API 48's docs
  // ("search: search by customer name, order number, etc.").

  const [phoneSearch, setPhoneSearch] = useState("");
  // phoneSearch — filters by the customer's phone number. There is NO
  // documented "phone" query param on API 47/48 (only status, search,
  // start_date, end_date, page), and the docs never confirm that the
  // generic "search" param actually matches against phone. So — same
  // pattern as the CLIENT-SIDE sort below — this is applied locally on
  // whatever page of orders is currently loaded, matching against
  // row.customer.phone. It does NOT trigger a new network request.

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // showAdvancedFilters — toggles the Date Range + Sort By row open/closed
  // so the filter card stays compact until the admin actually needs it.

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // startDate / endDate — sent straight through to API 48 as
  // start_date / end_date query params.

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — CLIENT-SIDE only (see SORT_OPTIONS comment above).
  // Defaults to "Newest First" so the page's default order never changes.

  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  // Waits 400ms after the admin stops typing before actually firing a
  // network request — prevents a new API call on every keystroke.

  const hasActiveFilters =
    !!activeStatus || !!debouncedSearch || !!startDate || !!endDate;
  // hasActiveFilters — true the moment ANY BACKEND filter is active
  // (status/search/dates). This ONLY decides which endpoint gets called
  // (API 47 vs API 48) — phone is intentionally excluded since it's
  // never sent to the server.

  const hasAnyFilterActive = hasActiveFilters || !!phoneSearch;
  // hasAnyFilterActive — same as above PLUS the client-side phone filter.
  // Used only for UI purposes (showing the "Clear all" button) so it
  // still appears even when phone is the only thing the admin typed.

  const activeFilterCount = [
    activeStatus,
    debouncedSearch,
    startDate,
    endDate,
    phoneSearch,
  ].filter(Boolean).length;
  // activeFilterCount — same real filters (now including phone), counted
  // for the little numbered badge next to the "Filters" heading (matches
  // the pattern already used on the Categories page's filter card).

  // --------------------------------------------------
  // ORDERS LIST — uses the plain list endpoint when nothing is
  // filtered, and the dedicated filter endpoint the moment ANY filter
  // (status tab, search, or date range) is active — matching exactly
  // how API 47 vs API 48 are documented to be used.
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
        search: debouncedSearch,
        startDate,
        endDate,
        page: currentPage,
      },
    ],
    queryFn: () => {
      if (!hasActiveFilters) {
        return getAdminOrders();
      }
      return filterAdminOrders({
        status: activeStatus || undefined,
        search: debouncedSearch || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: currentPage,
      });
    },
  });

  const orders = extractListData(ordersResponse);
  const totalCount = ordersResponse?.data?.count ?? orders.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // visibleOrders — the CURRENT page's rows after applying THREE
  // client-side-only refinements: order-number/customer-name search,
  // phone number filtering, then sorting. None of these ever fire a new
  // network request — they only re-filter/re-order whatever page of
  // orders is already sitting in memory. useMemo avoids redoing this
  // work on every render — only when the underlying orders array, the
  // search/phone text, or the chosen sort actually changes.
  //
  // WHY THE SEARCH BOX ALSO FILTERS HERE (not just via the backend):
  // debouncedSearch is still sent to the server as the "search" query
  // param on API 48 (filterAdminOrders), exactly as before. But this
  // same API doc flags elsewhere (see API 27/Search Products) that this
  // backend has a real, confirmed history of query params being
  // silently ignored server-side. Filtering AGAIN here, client-side,
  // on the same order_number/customer.name fields the backend is
  // supposed to match, means the search box now visibly works for the
  // admin the instant they type — the current page narrows down right
  // away — regardless of whether the backend's own "search" filtering
  // is actually implemented correctly. If the backend already filtered
  // correctly, this second pass is redundant but harmless (matches the
  // same rows again); if it didn't, this is what actually fixes it.
  const visibleOrders = useMemo(() => {
    // Step 1 — order number / customer name search (client-side safety
    // net described above).
    const normalizedSearchQuery = debouncedSearch.trim().toLowerCase();
    const searched = normalizedSearchQuery
      ? orders.filter((row) => {
          const orderNumberMatch = (row.order_number || "")
            .toLowerCase()
            .includes(normalizedSearchQuery);
          const customerNameMatch = (row.customer?.name || "")
            .toLowerCase()
            .includes(normalizedSearchQuery);
          return orderNumberMatch || customerNameMatch;
        })
      : orders;

    // Step 2 — phone filter. Normalizes both sides (strips spaces/dashes,
    // lowercases) so "0300-1234567" still matches a typed "03001234567".
    const normalizedPhoneQuery = phoneSearch
      .replace(/[\s-]/g, "")
      .toLowerCase();
    const phoneFiltered = normalizedPhoneQuery
      ? searched.filter((row) => {
          const rowPhone = (row.customer?.phone || "")
            .replace(/[\s-]/g, "")
            .toLowerCase();
          return rowPhone.includes(normalizedPhoneQuery);
        })
      : searched;

    // Step 3 — client-side sort, applied on top of the (possibly
    // search/phone-filtered) list from Steps 1-2.
    const sorter = SORTERS[sortBy];
    if (!sorter) return phoneFiltered;
    return [...phoneFiltered].sort(sorter);
    // Spreads into a new array first — never mutates the array React
    // Query owns, which could cause subtle re-render bugs.
  }, [orders, debouncedSearch, phoneSearch, sortBy]);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
    setCurrentPage(1);
    // Any time the status filter changes, jump back to page 1 — staying
    // on e.g. page 3 of a now-much-smaller filtered result set would
    // otherwise show an empty page.
  };

  const handleClearFilters = () => {
    setActiveStatus("");
    setSearch("");
    setPhoneSearch("");
    setStartDate("");
    setEndDate("");
    setSortBy("-created_at");
    setCurrentPage(1);
    // Resets every filter AND the sort back to its default in one click
    // — mirrors the "Clear all" behaviour already used on the Categories
    // admin page.
  };

  // --------------------------------------------------
  // EXPORT — API 77, downloads the returned blob as a real .csv file
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

  // columns — DataTable column config, unchanged in structure from
  // before; only the visual styling inside each render() got small
  // polish touches (e.g. slightly bolder order id) to match the more
  // premium look of the rest of the redesigned page.
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
          {/* Phone shown instead of email — API 47's customer object
              only includes name + phone, not email (see flag notes) */}
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
          onClick={() =>
            navigate(ROUTES.ADMIN_ORDER_DETAIL.replace(":id", row.order_number))
          }
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          aria-label={`View order ${row.order_number}`}
        >
          <AiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, same component used
          on every other admin page. Rendered FIRST, exactly as asked,
          before the stats cards below it.
          ================================================================ */}
      <PageHeader icon={<AiOutlineShoppingCart />} title="Orders" />
      {/* Note: the mockup's "+ Create Order" button is NOT included —
          there is no documented API for an admin to manually create an
          order on a customer's behalf; Checkout (API 52) is a
          customer-only, cart-based flow. See flag notes above. */}

      {/* ================================================================
          STATS CARDS — rendered right under the header, second on the
          page. OrderStatsCards already ships with a permanent resting
          shadow + hover lift (see StatsCard.jsx), so the cards already
          read as "raised" off the gray page background.
          ================================================================ */}
      <OrderStatsCards />

      {/* ================================================================
          FILTERS CARD — completely redesigned. Same visual language as
          the Categories admin page's filter card (rounded-2xl, soft
          shadow, gray header strip with icon + live count + Clear all),
          but built specifically for Orders: status pills, a combined
          order-number/customer-name search, a date range, and a
          client-side sort — everything needed to slice the order list
          from multiple angles at once.
          ================================================================ */}
      <div className="bg-white rounded-2xl border border-white shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)] overflow-hidden">
        {/* Header strip — icon badge + "Filters" label + live active count
            on the left, "Clear all" on the right (only when something is
            actually active). */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
              <AiOutlineFilter className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-gray-800">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-danger transition-colors"
              >
                <AiOutlineClose className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<AiOutlineDownload className="w-4 h-4" />}
              onClick={handleExport}
              isLoading={isExporting}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Body — status pills on their own scrollable row, then the
            search box, then the collapsible advanced (date + sort) row. */}
        <div className="p-5 flex flex-col gap-4">
          {/* Status pills — horizontally scrollable on narrow screens.
              "scrollbar-hide" (already defined project-wide in index.css)
              hides the scrollbar itself while keeping scrolling fully
              working, which is exactly the "scroll bar nichay a rahi thi
              usay hide karo" fix requested — the row can still be swiped
              on mobile, it just no longer shows a visible scrollbar
              underneath it. */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key || "all"}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-150 shrink-0 ${
                  activeStatus === tab.key
                    ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Primary search + advanced-filters toggle — sits on its own
              row so it stays comfortably usable even on small screens. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by order number or customer name..."
                leftIcon={<AiOutlineSearch className="w-4 h-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "primary" : "secondary"}
              size="sm"
              leftIcon={<AiOutlineSortAscending className="w-4 h-4" />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="shrink-0"
            >
              Date &amp; Sort
            </Button>
          </div>

          {/* Advanced row — date range (hits the backend via API 48),
              a phone number field (client-side, see visibleOrders above),
              and a client-side sort dropdown. Toggled by the button above
              so the filter card stays compact by default. */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Input
                label="Phone Number"
                placeholder="03XX-XXXXXXX"
                leftIcon={<AiOutlinePhone className="w-4 h-4" />}
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
              <Select
                label="Sort By"
                options={SORT_OPTIONS}
                placeholder="Sort orders"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          ORDERS TABLE — wrapped in its own soft-shadow card so it reads
          as an elevated surface too, matching the rest of the redesigned
          page instead of sitting flat against the gray background.
          ================================================================ */}
      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
        <DataTable
          columns={columns}
          data={visibleOrders}
          keyField="order_number"
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default OrderManagement;
