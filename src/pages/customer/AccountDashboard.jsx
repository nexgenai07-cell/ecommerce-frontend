import { useQuery } from "@tanstack/react-query"; // useQuery fetches and caches each API response independently
import { motion } from "framer-motion"; // motion.div wraps the page to animate it in on mount
import { BsSpeedometer2 } from "react-icons/bs"; // Speedometer icon used inside the page header's gradient icon box — represents "overview"
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants — keeps query keys consistent across the app
import { getMyOrders, getMyOrderStats } from "../../api/orders.api"; // API functions — fetches the logged-in customer's orders, and their accurate total_orders/total_spent stats
import { getWishlist } from "../../api/wishlist.api"; // API function — fetches the customer's saved wishlist items
import { getNotifications } from "../../api/notifications.api"; // API function — fetches all notifications for the customer
import { getReturns } from "../../api/returns.api"; // API function — fetches all return requests filed by the customer
import { getComplaints } from "../../api/complaints.api"; // API function — fetches all complaints filed by the customer
import extractListData from "../../utils/extractListData"; // Normalizer — list endpoints may return a plain array or a paginated object, and this handles both
import { RETURN_STATUS } from "../../constants/statusTypes"; // Centralized status constant — never hardcode raw "pending"/"requested" strings when comparing statuses
import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel"; // Shared label formatter for a complaint's "type" (order/payment/product/delivery/other) — used as a fallback reference when a complaint isn't linked to an order
import Container from "../../components/layouts/Container"; // Consistent max-width + horizontal padding wrapper
import DashboardStats from "../../components/account-dashboard/DashboardStats"; // 4-card summary row: Total Orders, Total Spent, Wishlist, Pending Returns
import RecentOrdersTable from "../../components/account-dashboard/RecentOrdersTable"; // Table showing the 3 most recent orders
import WishlistPreview from "../../components/account-dashboard/WishlistPreview"; // Preview of the first 3 wishlist items with Add to Cart
import RecentNotifications from "../../components/account-dashboard/RecentNotifications"; // Preview of the 3 most recent notifications with mark-as-read
import ActiveTickets from "../../components/account-dashboard/ActiveTickets"; // Single ticket table — reused twice below, once for complaints and once for returns
import { SkeletonAccountDashboard } from "../../components/ui/Skeleton"; // Full-page skeleton shown while the orders data is loading — mirrors this exact page's sections

const AccountDashboard = () => {
  // =============================================
  // ALL APIs — all 5 queries fire in parallel on mount
  // =============================================

  // Orders — primary data; ordersLoading drives the page-level loading state
  // staleTime 2 min — orders can change frequently so we refetch relatively often
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: QUERY_KEYS.MY_ORDERS,
    queryFn: ({ signal }) => getMyOrders(undefined, signal),
    staleTime: 1000 * 60 * 2,
  });

  // Order stats — the accurate, backend-computed total_orders
  // and total_spent for this customer, using the same "only a
  // confirmed/shipped/out_for_delivery/delivered order counts" rule
  // used everywhere else in the app. staleTime 2 min, same as orders.
  const { data: orderStatsData } = useQuery({
    queryKey: QUERY_KEYS.MY_ORDER_STATS,
    queryFn: ({ signal }) => getMyOrderStats(signal),
    staleTime: 1000 * 60 * 2,
  });

  // Wishlist — staleTime 5 min — wishlist items change less frequently than orders
  const { data: wishlistData } = useQuery({
    queryKey: QUERY_KEYS.WISHLIST,
    queryFn: ({ signal }) => getWishlist(signal),
    staleTime: 1000 * 60 * 5,
  });

  // Notifications — staleTime 2 min — unread count should stay fairly fresh
  const { data: notificationsData } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: ({ signal }) => getNotifications(undefined, signal),
    staleTime: 1000 * 60 * 2,
  });

  // Returns — staleTime 5 min — return status changes are infrequent
  const { data: returnsData } = useQuery({
    queryKey: QUERY_KEYS.RETURNS,
    queryFn: ({ signal }) => getReturns(undefined, signal),
    staleTime: 1000 * 60 * 5,
  });

  // Complaints — staleTime 5 min — complaint updates are infrequent
  const { data: complaintsData } = useQuery({
    queryKey: QUERY_KEYS.COMPLAINTS,
    queryFn: ({ signal }) => getComplaints(undefined, signal),
    staleTime: 1000 * 60 * 5,
  });

  // ── Derived values from API responses ──────────────────────────────────────

  // Full orders array — falls back to empty array so downstream code never null-checks
  const orders = ordersData?.data?.results || [];

  // Only the 3 most recent orders are shown in the RecentOrdersTable preview
  const recentOrders = orders.slice(0, 3);

  // Total Orders / Total Spent — sourced from getMyOrderStats, NOT computed
  // by summing/counting the orders array above. That list includes every
  // order regardless of status (pending_payment, on_hold, cancelled, etc.),
  // which would give a number that does not match what the backend and
  // admin panel consider a real, paid order. total_spent is always returned
  // as a string, so it's parsed with parseFloat here; both fall back to 0
  // while the query is loading.
  const orderStats = orderStatsData?.data;
  const totalOrdersCount = orderStats?.total_orders || 0;
  const totalSpent = parseFloat(orderStats?.total_spent || 0);

  // Full wishlist items array — falls back to empty array
  const wishlistItems = wishlistData?.data?.items || [];

  // Full notifications array — falls back to empty array. The response may
  // be a paginated object, so it goes through the normalizer.
  const notifications = extractListData(notificationsData);

  // Count of notifications the customer hasn't read yet — drives the red badge in RecentNotifications
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Full returns array — falls back to empty array. The response may be a
  // plain array or a paginated object, so it goes through the normalizer.
  const returns = extractListData(returnsData);

  // Count of returns still awaiting seller review — shown in the DashboardStats card
  // Compares against the RETURN_STATUS constant instead of a hardcoded string
  // (the backend value for a return awaiting review is "pending").
  const pendingReturns = returns.filter(
    (r) => r.status === RETURN_STATUS.REQUESTED,
  ).length;

  // Full complaints array — falls back to empty array. Goes through the
  // normalizer for the same reason as returns.
  const complaints = extractListData(complaintsData);

  // activeReturns / activeComplaints — two separate lists, so the dashboard
  // shows a table for each type side by side. Each is sorted
  // most-recently-filed-first on its own, and the table cards show the
  // latest few with a "View All" link to the full list.
  //
  // activeReturns includes EVERY return regardless of status, so an
  // approved or rejected return still shows up here, the same way it does on
  // the full Returns page's "Previous Returns" table.
  const activeReturns = returns
    .map((r) => ({
      id: `#TIC-${r.id}`, // prefixed ticket ID for display
      type: "Return Request", // human-readable type label
      // Returns are always tied to an order, so order_number is always
      // present and this reference is never empty in practice
      reference: r.order_number,
      status: r.status, // raw status string passed to the table
      // The Return object has no "updated_at" field (it exposes id, order,
      // order_number, reason, resolved_at, status and created_at), so
      // created_at is used as the filed-on date.
      expectedResolution: r.created_at,
      // Route to this specific return's detail page — uses the return's
      // raw numeric id, not the "#TIC-" prefixed display id above.
      linkTo: ROUTES.ACCOUNT_RETURN_DETAIL.replace(":id", r.id),
    }))
    .sort(
      (a, b) => new Date(b.expectedResolution) - new Date(a.expectedResolution),
    );

  // activeComplaints includes EVERY complaint regardless of status
  // (including closed ones), so a closed complaint still shows up here the
  // same way a decided return does above.
  const activeComplaints = complaints
    .map((c) => ({
      id: `#CMP-${c.id}`, // prefixed complaint ID for display
      type: "Complaint", // human-readable type label
      // A complaint response exposes BOTH "order" (raw FK id) and
      // "order_number" (human-readable, e.g. "ORD-2026-00009"); order_number
      // is the app-wide convention, so that is what is shown. A complaint
      // filed with type "other" often isn't linked to any order at all
      // (order/order_number both null) — in that case the complaint's own
      // category (e.g. "Payment", "Product") is shown via the shared
      // getComplaintTypeLabel util, so the column is never a blank cell.
      reference: c.order_number || getComplaintTypeLabel(c.type),
      status: c.status, // raw status string passed to the table
      // The Complaint object has no "updated_at" field either (it exposes id,
      // customer, customer_name, message, order, order_number,
      // resolved_by_name, response, status, type and created_at), so
      // created_at is used as the filed-on date.
      expectedResolution: c.created_at,
      // Route to this specific complaint's detail page — uses the
      // complaint's raw numeric id, not the "#CMP-" prefixed display id above.
      linkTo: ROUTES.ACCOUNT_COMPLAINT_DETAIL.replace(":id", c.id),
    }))
    .sort(
      (a, b) => new Date(b.expectedResolution) - new Date(a.expectedResolution),
    );

  // Whether each ticket table has anything to show — decides whether the row
  // is rendered at all and whether it uses one column or two
  const hasComplaints = activeComplaints.length > 0;
  const hasReturns = activeReturns.length > 0;

  // ── Loading state ───────────────────────────────────────────────────────────
  // Show a full-page skeleton while the primary orders query is still in flight
  // Other queries load silently — their sections render empty until data arrives
  if (ordersLoading) {
    return (
      <Container className="py-6 sm:py-8">
        <SkeletonAccountDashboard />{" "}
        {/* Mirrors this page's real breadcrumb, header, stats cards, recent
            orders table, wishlist/notifications grid, and tickets table */}
      </Container>
    );
  }

  return (
    // relative + overflow-hidden hosts the decorative ambient gradient glow
    // behind the header without it bleeding into the navbar/footer or causing
    // horizontal scrollbars — same treatment as Wishlist/Notifications/Orders
    <div className="relative overflow-hidden">
      {/* Ambient background glow — soft emerald blur behind the page header,
          purely decorative (pointer-events-none), keeps this page visually
          consistent with the other account pages
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Page fade-in — starts transparent and animates to fully visible over 300ms */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Container className="py-6 sm:py-8">
          {/* Outer flex column — stacks all dashboard sections vertically with consistent gaps */}
          <div className="flex flex-col gap-8">
            {/* ── Page header ────────────────────────────────────────────────────
                Same icon-box pattern used across every other account page:
                a rounded gradient icon square + bold heading + gray subtitle */}
            <div className="flex items-center gap-4">
              {/* Icon box — rounded gradient square, brand emerald tones
                  shadow-primary/30 gives it a soft colored glow instead of a flat gray shadow */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                <BsSpeedometer2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />{" "}
                {/* Speedometer icon — represents an at-a-glance overview */}
              </div>

              {/* Title + subtitle stack */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Dashboard Overview
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Welcome back — here's what's happening with your account.
                </p>
              </div>
            </div>

            {/* ── Stats cards ──────────────────────────────────────────────────────
                4-card grid showing key metrics derived from the API responses above */}
            <DashboardStats
              totalOrders={totalOrdersCount} // accurate paid-order count from getMyOrderStats
              totalSpent={totalSpent} // accurate spend total from getMyOrderStats
              wishlistCount={wishlistItems.length} // total number of saved wishlist products
              pendingReturns={pendingReturns} // count of returns still awaiting review
            />

            {/* ── Recent Orders table ───────────────────────────────────────────────
                Shows the 3 most recent orders; "View All" link inside the component navigates to full history */}
            <RecentOrdersTable orders={recentOrders} />

            {/* ── Wishlist Preview + Notifications — side by side on desktop ────────
                Single column on mobile, 2-column grid on lg+ screens                */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WishlistPreview wishlistItems={wishlistItems} />{" "}
              {/* First 3 saved products with Add to Cart */}
              <RecentNotifications
                notifications={notifications} // full list — component slices to 3 internally
                unreadCount={unreadCount} // drives the red badge in the section header
              />
            </div>

            {/* ── Complaints + Returns — side by side on desktop ────────────────
                Each card shows the latest few tickets of its own type, with a
                "View All" link in its header that opens the full list on the
                Complaints / Returns page and scrolls to its table. A card
                renders nothing when its own list is empty; when only one of
                the two exists it takes the full width instead of leaving half
                the row empty. Single column on mobile, 2-column grid on lg+
                screens, same pattern as the Wishlist/Notifications row above. */}
            {(hasComplaints || hasReturns) && (
              <div
                className={`grid grid-cols-1 ${
                  hasComplaints && hasReturns ? "lg:grid-cols-2" : ""
                } gap-6 items-stretch`}
              >
                {/* items-stretch: both cards always match height, whichever
                    has fewer rows */}
                <ActiveTickets
                  tickets={activeComplaints}
                  title="Complaints"
                  viewAllTo={`${ROUTES.ACCOUNT_COMPLAINTS}#previous-complaints`}
                  showType={false}
                  // showType=false hides the redundant "Type" column — every
                  // row in this table is already a complaint
                />
                <ActiveTickets
                  tickets={activeReturns}
                  title="Returns"
                  viewAllTo={`${ROUTES.ACCOUNT_RETURNS}#previous-returns`}
                  showType={false}
                  // showType=false hides the redundant "Type" column — every
                  // row in this table is already a return request
                />
              </div>
            )}
          </div>
        </Container>
      </motion.div>
    </div>
  );
};

export default AccountDashboard; // Export so React Router can render this as the /account page
