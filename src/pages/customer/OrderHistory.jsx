import { useState } from "react"; // useState manages the active tab and selected date range locally
import { useQuery } from "@tanstack/react-query"; // useQuery handles API fetching, caching, and loading state automatically
import { AnimatePresence } from "framer-motion"; // AnimatePresence enables exit animations when order cards are filtered out
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized query key constants — keeps cache keys consistent across the app
import { getMyOrders } from "../../api/orders.api"; // API function that calls GET /api/v1/orders/ and returns the logged-in user's orders
import isWithinDateRange from "../../utils/isWithinDateRange"; // Real date-window comparison — powers the "Last 3 months" etc. dropdown
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

  // dateRange tracks the selected date window — defaults to last 3 months
  const [dateRange, setDateRange] = useState("3months");

  // currentPage tracks which page of the (filtered) orders list is showing
  const [currentPage, setCurrentPage] = useState(1);

  // pageSize tracks how many orders are shown per page, controlled by the
  // "Rows per page" dropdown inside the Pagination control below
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // =============================================
  // MY ORDERS API — GET /api/v1/orders/
  // =============================================
  // BACKEND FIX CONFIRMED: this endpoint's pagination has now been
  // explicitly confirmed by the backend team. This fetches page 1
  // first, then — if the response indicates there are more pages —
  // fetches every remaining page IN PARALLEL, so the customer's
  // COMPLETE order history is always shown, no matter how many orders
  // they've placed. Older orders can never silently become invisible.
  // A single customer's own order count is naturally small/bounded
  // (unlike the admin catalog), so fetching every page here is safe
  // and not the "download everything" anti-pattern fixed elsewhere.
  const {
    data: ordersData,
    isLoading,
    isError, // true if the request itself failed (network drop, 500, expired session) — must be handled separately from "zero orders"
    refetch, // passed to ErrorState so the customer can retry without a full page reload
  } = useQuery({
    queryKey: QUERY_KEYS.MY_ORDERS_FULL,
    queryFn: async ({ signal }) => {
      const firstResponse = await getMyOrders({ page: 1 }, signal);
      const firstResults = firstResponse?.data?.results || [];
      const totalCount = firstResponse?.data?.count ?? firstResults.length;

      // If the backend genuinely returns everything in one response
      // (no real pagination), totalCount will equal firstResults.length
      // and this loop simply does nothing extra — safe either way.
      const pageSize = firstResults.length || 1;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      if (totalPages <= 1) {
        return firstResults;
      }

      const remainingPageNumbers = Array.from(
        { length: totalPages - 1 },
        (_, index) => index + 2,
      );
      const remainingResponses = await Promise.all(
        remainingPageNumbers.map((page) => getMyOrders({ page }, signal)),
      );
      const remainingResults = remainingResponses.flatMap(
        (response) => response?.data?.results || [],
      );

      return [...firstResults, ...remainingResults];
    },
    staleTime: 1000 * 60 * 2,
  });

  const allOrders = ordersData || [];

  // Date-window filtering is applied FIRST, before the status tab — this is
  // the set both the tab counts AND the final list are derived from, so a
  // tab badge like "Cancelled (1)" always matches what actually shows up
  // when that tab is clicked. Applying date only at the very end (after
  // tab filtering) would let the two filters disagree with each other.
  const dateFilteredOrders = allOrders.filter((order) =>
    isWithinDateRange(order.created_at, dateRange),
  );

  // Client-side status filtering on top of the date-filtered set —
  // "all" tab returns everything within the date window; any other tab
  // narrows further by matching order.status
  const filteredOrders =
    activeTab === "all"
      ? dateFilteredOrders
      : dateFilteredOrders.filter((order) => order.status === activeTab);

  // Human-readable label for whichever date range is currently active —
  // reused below to build accurate empty-state copy (e.g. "Last 3 months")
  const dateRangeLabel = DATE_RANGES.find((d) => d.id === dateRange)?.label;

  // Whether a date restriction is actually narrowing the results right now —
  // "all" means no restriction, so it shouldn't be mentioned in copy
  const hasDateFilter = dateRange !== "all";

  // --------------------------------------------------
  // PAGINATION — same numbered prev/next control used on
  // NotificationHistory/ActiveTickets, replacing the earlier plain
  // "show everything in one long list" behavior
  // --------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Whenever the status tab or date range changes, the filtered result set
  // changes too — jump back to page 1 so we don't land on a now-empty or
  // mismatched page (same pattern as NotificationHistory's handleTabChange)
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  // Called when the customer picks a different "rows per page" value.
  // Resets back to page 1 as well, since staying on a deep page number
  // could land past the end of the newly-sized result set.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    // relative + overflow-hidden hosts the decorative ambient gradient glow
    // behind the header without it bleeding into the navbar/footer or causing
    // horizontal scrollbars — same treatment as Wishlist and Notifications
    <div className="relative overflow-hidden">
      {/* Ambient background glow — soft emerald blur behind the page header,
          purely decorative (pointer-events-none), keeps this page visually
          consistent with the other account pages
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-6">
          {/* ── Filters: icon-box heading + status tabs + date range dropdown ──
              Receives the date-window-filtered orders so tab counts stay
              accurate for whichever date range is currently selected        */}
          <OrderFilters
            activeTab={activeTab}
            onTabChange={handleTabChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            orders={dateFilteredOrders} // date-window-filtered list — so tab badge counts (e.g. "Cancelled (1)") match what the date dropdown currently shows, not the full unfiltered history
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
              customer who picks "Cancelled" + "Last 3 months" and gets zero
              results should be told about the date window too, not just the
              status, otherwise they might think Cancelled orders don't exist
              at all when really they're just outside the selected window.
              Wrapped in an elevated white card so it looks properly "raised"
              off the page, matching Wishlist and Notifications              */}
          {!isLoading && !isError && filteredOrders.length === 0 && (
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
              footer from the cards above. Shown whenever there's at least
              one (filtered) order — not gated on totalPages > 1, so the
              "rows per page" dropdown stays reachable even while everything
              currently fits on a single page.                               */}
          {!isLoading && !isError && filteredOrders.length > 0 && (
            <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
              <AnimatePresence mode="popLayout">
                <div className="flex flex-col gap-4 p-4 sm:p-5">
                  {paginatedOrders.map((order, index) => (
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
