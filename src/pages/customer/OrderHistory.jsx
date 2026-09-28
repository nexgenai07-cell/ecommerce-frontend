import { useState, useEffect } from "react"; // useState manages the active tab, date range, custom dates and page locally; useEffect resets the page number when a filter changes
import { useQuery } from "@tanstack/react-query"; // useQuery handles API fetching, caching, and loading state automatically
import { AnimatePresence } from "framer-motion"; // AnimatePresence enables exit animations when order cards change
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized query key constants — keeps cache keys consistent across the app
import { getMyOrders } from "../../api/orders.api"; // API function that calls GET /api/v1/orders/ and returns the logged-in user's orders
import extractListData from "../../utils/extractListData"; // Reads the results array out of either a flat array or a DRF-paginated response
import getDateRangeBounds from "../../utils/getDateRangeBounds"; // Converts a preset date-range id into real start_date/end_date strings for the backend
import formatDate from "../../utils/formatDate"; // Human-readable date formatting, reused for the Custom Range empty-state copy
import Container from "../../components/layouts/Container"; // Wrapper that applies consistent max-width and horizontal padding to the page
import OrderFilters, {
  DATE_RANGES,
} from "../../components/order-history/OrderFilters"; // Icon-box header + status tabs + date range dropdown; DATE_RANGES re-exported for building accurate empty-state copy
import OrderCard from "../../components/order-history/OrderCard"; // Single order card — renders one row per order
import EmptyState from "../../components/ui/EmptyState"; // Generic empty state component shown when no orders match the current filter
import ErrorState from "../../components/ui/ErrorState"; // Reusable error-state component with a retry button — same pattern used in OrderDetail.jsx, ProductDetail.jsx, NotificationHistory.jsx
import Pagination from "../../components/ui/Pagination"; // Same numbered prev/next pagination control used on NotificationHistory, ActiveTickets, and the admin side

// Selectable "rows per page" values shown in the pagination dropdown —
// same pattern/values as NotificationHistory. The first option is also
// the default page size when the page first loads.
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const OrderHistory = () => {
  // activeTab tracks which status filter tab is currently selected — "all" shows every order
  const [activeTab, setActiveTab] = useState("all");

  // dateRange tracks the selected date window — defaults to last 3 months.
  // "custom" means the customer is using their own picked dates instead
  // of one of the fixed presets (Today, Last 7 days, Last month, etc.)
  const [dateRange, setDateRange] = useState("3months");

  // customStartDate / customEndDate hold the two "yyyy-mm-dd" values the
  // customer picks when dateRange is "custom" — unused for every preset
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // currentPage tracks which page of results the backend is currently returning
  const [currentPage, setCurrentPage] = useState(1);

  // pageSize tracks how many orders the backend returns per page, controlled
  // by the "Rows per page" dropdown inside the Pagination control below
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Real start_date/end_date bounds sent to the backend. A preset is
  // resolved through getDateRangeBounds; "custom" uses the customer's
  // own picked dates directly, exactly as typed (each side stays
  // undefined until the customer fills it in, same as the admin Orders
  // page's date filter).
  const { startDate, endDate } =
    dateRange === "custom"
      ? {
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        }
      : getDateRangeBounds(dateRange);

  // =============================================
  // MY ORDERS API — GET /api/v1/orders/
  // =============================================
  // Every active filter (status tab, date range, page, rows per page) is
  // sent straight to the backend as a query param — the same server-side
  // filtering and pagination pattern already used on the admin orders
  // list. Exactly one already-filtered, already-paginated page of orders
  // is fetched per request, regardless of how large the customer's real
  // order history is.
  const {
    data: ordersResponse,
    isLoading,
    isError, // true if the request itself failed (network drop, 500, expired session) — must be handled separately from "zero orders"
    refetch, // passed to ErrorState so the customer can retry without a full page reload
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.MY_ORDERS,
      "list",
      {
        status: activeTab === "all" ? undefined : activeTab,
        startDate,
        endDate,
        page: currentPage,
        pageSize,
      },
    ],
    queryFn: ({ signal }) =>
      getMyOrders(
        {
          status: activeTab === "all" ? undefined : activeTab,
          start_date: startDate,
          end_date: endDate,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    keepPreviousData: true, // keeps the previous page's orders on screen while a new filter/page loads, instead of flashing back to the loading skeleton
  });

  const orders = extractListData(ordersResponse);
  const totalCount = ordersResponse?.data?.count ?? orders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // `orders` is always exactly one already-filtered page straight from the
  // backend, sized according to the currently selected `pageSize` — no
  // client-side re-filtering, re-sorting, or re-slicing on top of it.

  // Human-readable label for whichever date range is currently active —
  // reused below to build accurate empty-state copy. For "custom" this
  // reads the two picked dates instead of a fixed preset label.
  const dateRangeLabel =
    dateRange === "custom"
      ? customStartDate && customEndDate
        ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`
        : "selected range"
      : DATE_RANGES.find((d) => d.id === dateRange)?.label;

  // Whether a date restriction is actually narrowing the results right now —
  // "all" means no restriction, so it shouldn't be mentioned in copy
  const hasDateFilter = dateRange !== "all";

  // Whenever the status tab, date range (preset or custom dates), or
  // rows-per-page changes, the result set behind the current page
  // changes too — jump back to page 1 so we don't land on a now-empty
  // or mismatched page (same pattern as the admin Orders page).
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateRange, customStartDate, customEndDate, pageSize]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    // Switching away from "Custom range" clears any previously picked
    // dates, so re-selecting "Custom range" later starts from a clean
    // pair of empty fields instead of silently reusing a stale range.
    if (range !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  // Called when the customer picks a different "rows per page" value.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
  };

  return (
    // relative + overflow-hidden hosts the decorative ambient gradient glow
    // behind the header without it bleeding into the navbar/footer or causing
    // horizontal scrollbars — same treatment as Wishlist and Notifications
    <div className="relative overflow-hidden flex-1 flex flex-col min-h-0">
      {/* flex-1 flex flex-col min-h-0: lets this page stretch to fill the
          height CustomerAccountLayout's <main> now hands down, so the
          pagination footer further below can be pinned to the bottom of
          the screen instead of hugging right under one or two order
          cards. */}
      {/* Ambient background glow — soft emerald blur behind the page header,
          purely decorative (pointer-events-none), keeps this page visually
          consistent with the other account pages
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Container className="py-6 sm:py-8 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* ── Filters: icon-box heading + status tabs + date range dropdown ──
              totalCount is the backend's real count for the current filters,
              covering every page, not just the orders currently on screen */}
          <OrderFilters
            activeTab={activeTab}
            onTabChange={handleTabChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
            totalCount={totalCount}
          />

          {/* ── Loading skeleton ──────────────────────────────────────────────
              Mirrors OrderCard.jsx exactly: the top row has BOTH an Order ID
              block AND a separate Date block (divided by a thin vertical
              line) next to the status badge — not just one bar — and the
              bottom row includes the action button(s) (View Details / Track
              Order / Return Items), not just a single price line. Without
              these two pieces the real cards rendered noticeably taller than
              their placeholders the moment the order data arrived. */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 animate-pulse"
                >
                  {/* Top row: Order ID block + divider + Date block, status badge on the right */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-6 flex-wrap">
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3 w-14 bg-gray-100 rounded" />
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="hidden sm:block w-px h-8 bg-gray-100" />
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3 w-10 bg-gray-100 rounded" />
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-24 bg-gray-100 rounded-full" />
                  </div>

                  {/* Product thumbnails row */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="w-16 h-16 bg-gray-100 rounded-xl shrink-0"
                      />
                    ))}
                  </div>

                  {/* Bottom row: item count + total, plus the action button(s) */}
                  <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-gray-100 rounded" />
                      <div className="h-5 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-28 bg-gray-100 rounded-xl" />
                      <div className="h-9 w-28 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Error state ──────────────────────────────────────────────────
              Only shown once loading has finished AND the request genuinely
              failed — checked BEFORE the empty state, so a failed request is
              never mistaken for "you simply have no orders"                 */}
          {!isLoading && isError && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <ErrorState
                title="Couldn't load your orders"
                message="Something went wrong while fetching your order history. Please try again."
                onRetry={refetch}
              />
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────────
              Title and description account for BOTH active filters — a
              customer who picks "Cancelled" + a date range and gets zero
              results should be told about the date window too, not just the
              status, otherwise they might think Cancelled orders don't exist
              at all when really they're just outside the selected window.
              Wrapped in an elevated white card so it looks properly "raised"
              off the page, matching Wishlist and Notifications              */}
          {!isLoading && !isError && orders.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <EmptyState
                variant="noOrders"
                title={
                  activeTab === "all" && !hasDateFilter
                    ? "No orders yet"
                    : activeTab === "all"
                      ? `No orders in the ${dateRangeLabel.toLowerCase()}`
                      : `No ${activeTab} orders`
                }
                description={
                  activeTab === "all" && !hasDateFilter
                    ? "When you place an order, it will appear here."
                    : hasDateFilter
                      ? `You don't have any ${activeTab === "all" ? "" : activeTab + " "}orders in the ${dateRangeLabel.toLowerCase()}.`
                      : `You don't have any ${activeTab} orders.`
                }
              />
            </div>
          )}

          {/* ── Order cards + pagination ───────────────────────────────────────
              Both live inside one shared white card so the list and its
              pagination footer read as a single unit, matching the
              merged-box look DataTable already gives every admin table.
              variant="compact" strips Pagination's own card chrome
              (shadow/border/rounded corners) since this wrapper already
              supplies all of that; border-t is what visually separates the
              footer from the cards above. Shown whenever the current page
              has at least one order — not gated on totalPages > 1, so the
              "rows per page" dropdown stays reachable even while everything
              currently fits on a single page.                               */}
          {!isLoading && !isError && orders.length > 0 && (
            <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white flex-1 flex flex-col min-h-0">
              {/* flex-1 flex flex-col min-h-0: this card now stretches to
                  fill the remaining page height, so the Pagination footer
                  below is pinned at the bottom of the screen even when
                  there's only one or two orders on the page. */}
              <AnimatePresence mode="popLayout">
                <div className="flex flex-col gap-4 p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto">
                  {/* flex-1 min-h-0: absorbs the extra space inside the
                      card, leaving blank room below the last order card
                      instead of the footer below it climbing up.
                      overflow-y-auto: safety net in case the card list is
                      ever taller than the available space, so cards
                      scroll within their own area rather than pushing the
                      pagination footer off-screen. */}
                  {orders.map((order, index) => (
                    <OrderCard
                      key={order.order_number}
                      order={order}
                      index={index}
                    />
                  ))}
                </div>
              </AnimatePresence>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={handlePageSizeChange}
                variant="compact"
                className="border-t border-gray-100"
              />
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default OrderHistory;
