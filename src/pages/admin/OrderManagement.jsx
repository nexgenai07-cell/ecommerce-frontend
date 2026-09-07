import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
// AiOutlinePhone — used on the "Phone Number" advanced filter field
// react-icons — every small icon used across the redesigned header,
// filter card, and table actions comes from this single icon set so
// the whole page keeps one consistent visual language.

import { getAdminOrders, filterAdminOrders } from "../../api/orders.api";
// getAdminOrders    — API 47: GET /api/v1/admin/orders/ (no filters active)
// filterAdminOrders — API 48: GET /api/v1/admin/orders/filter/ (status/date/search/ordering/page)
// Both now correctly forward `page`, and `ordering` is confirmed
// working on the filter endpoint (see the backend fix notes below).

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
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already used
// on every other admin screen (Products, Categories, Dashboard, etc).
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
// SORT OPTIONS — sent straight to the backend as the `ordering` query
// param. "-created_at" / "created_at" and "-total_amount" /
// "total_amount" are CONFIRMED working server-side. The order-number
// options are sent through optimistically (not part of the confirmed
// list) — if the backend doesn't recognize this specific field name,
// it will simply have no effect rather than error, but this one
// specifically hasn't been verified with a real example yet.
// --------------------------------------------------
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "-total_amount", label: "Amount: High to Low" },
  { value: "total_amount", label: "Amount: Low to High" },
  { value: "order_number", label: "Order Number: A-Z" },
  { value: "-order_number", label: "Order Number: Z-A" },
];

const PAGE_SIZE = 10;

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

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // showAdvancedFilters — toggles the Date Range + Sort By row open/closed
  // so the filter card stays compact until the admin actually needs it.

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // startDate / endDate — sent straight through to API 48 as
  // start_date / end_date query params.

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — sent straight to the backend as `ordering` (see SORT_OPTIONS
  // comment above). Defaults to "Newest First".

  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

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

  const activeFilterCount = [
    activeStatus,
    debouncedSearch,
    startDate,
    endDate,
    debouncedPhoneSearch,
  ].filter(Boolean).length;
  // activeFilterCount — feeds the little numbered badge next to the
  // "Filters" heading.

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
      },
    ],
    queryFn: ({ signal }) => {
      if (!hasActiveFilters) {
        return getAdminOrders({ ordering: sortBy, page: currentPage }, signal);
      }
      return filterAdminOrders(
        {
          status: activeStatus || undefined,
          search: effectiveSearch || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          ordering: sortBy,
          page: currentPage,
        },
        signal,
      );
    },
    keepPreviousData: true,
  });

  const visibleOrders = extractListData(ordersResponse);
  const totalCount = ordersResponse?.data?.count ?? visibleOrders.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  // `visibleOrders` is now always exactly one real, already-filtered,
  // already-sorted page straight from the backend — no more client-side
  // re-filtering or re-sorting on top of it. The old safety-net
  // client-side search/phone/sort pass has been removed: it existed
  // specifically because the backend used to silently ignore these
  // params, which is now fixed and confirmed.

  const hasAnyFilterActive = hasActiveFilters;

  // Whenever any filter or sort changes, jump back to page 1 — staying
  // on, say, page 3 of a now-much-smaller filtered result set would
  // otherwise show an empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, effectiveSearch, startDate, endDate, sortBy]);

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
          FILTERS CARD
          ================================================================ */}
      <div className="bg-white rounded-2xl border border-white shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)] overflow-hidden">
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

        <div className="p-5 flex flex-col gap-4">
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by order number or customer name..."
                leftIcon={<AiOutlineSearch className="w-4 h-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
          ORDERS TABLE
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
