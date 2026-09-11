import { Link } from "react-router-dom"; // Link renders anchor tags that navigate without a full page reload
import { useQuery } from "@tanstack/react-query"; // useQuery fetches and caches each API response independently
import { motion } from "framer-motion"; // motion.div wraps the page to animate it in on mount
import { BsSpeedometer2 } from "react-icons/bs"; // Speedometer icon used inside the page header's gradient icon box — represents "overview"
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants — keeps query keys consistent across the app
import { getMyOrders } from "../../api/orders.api"; // API function — fetches all orders placed by the logged-in customer
import { getWishlist } from "../../api/wishlist.api"; // API function — fetches the customer's saved wishlist items
import { getNotifications } from "../../api/notifications.api"; // API function — fetches all notifications for the customer
import { getReturns } from "../../api/returns.api"; // API function — fetches all return requests filed by the customer
import { getComplaints } from "../../api/complaints.api"; // API function — fetches all complaints filed by the customer
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on notifications/returns/complaints endpoints)
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

  // Total money spent — sum of total_amount across all orders
  // parseFloat guards against string values from the API; || 0 prevents NaN
  const totalSpent = orders.reduce(
    (sum, o) => sum + parseFloat(o.total_amount || 0),
    0,
  );

  // Full wishlist items array — falls back to empty array
  const wishlistItems = wishlistData?.data?.items || [];

  // Full notifications array — falls back to empty array
  // API_Documentation_Final.pdf (API 59) documents a flat array, but
  // real responses show a paginated object — backend/docs mismatch.
  const notifications = extractListData(notificationsData);

  // Count of notifications the customer hasn't read yet — drives the red badge in RecentNotifications
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Full returns array — falls back to empty array
  // API_Documentation_Final.pdf (API 51) documents a flat array. We
  // still route this through the normalizer defensively, in case the
  // actual backend response drifts from docs like categories/notifications did.
  const returns = extractListData(returnsData);

  // Count of returns still awaiting seller review — shown in the DashboardStats card
  // Compares against the RETURN_STATUS constant instead of a hardcoded string —
  // see the NOTE in constants/statusTypes.js for why the real value is "pending".
  const pendingReturns = returns.filter(
    (r) => r.status === RETURN_STATUS.REQUESTED,
  ).length;

  // Full complaints array — falls back to empty array
  // API_Documentation_Final.pdf (API 55) documents a flat array. Routed
  // through the normalizer defensively for the same reason as returns.
  const complaints = extractListData(complaintsData);

  // activeReturns / activeComplaints — kept as two separate lists (previously
  // merged into one combined "activeTickets" array) so the dashboard can show
  // two side-by-side tables instead of one combined table. Each is sorted
  // most-recently-filed-first on its own.
  //
  // activeReturns intentionally shows EVERY return regardless of status (not
  // just ones still awaiting review) — per explicit request, so an
  // Approved/Rejected return still shows up here the same way it does on the
  // full Returns page's "Previous Returns" table, instead of disappearing
  // from the dashboard the moment a decision is made.
  const activeReturns = returns
    .map((r) => ({
      id: `#TIC-${r.id}`, // prefixed ticket ID for display
      type: "Return Request", // human-readable type label
      // Returns are always tied to an order per the API contract (API 51 always
      // returns order_number), so this reference is never empty in practice
      reference: r.order_number,
      status: r.status, // raw status string passed to the table
      // NOTE: "updated_at" is NOT a field on the Return object — confirmed against
      // real Network-tab responses (API 51), which only expose id, order, order_number,
      // reason, resolved_at, status, created_at. Using created_at as the filed-on date.
      expectedResolution: r.created_at,
      // Route to this specific return's detail page (API 66) — uses the return's
      // raw numeric id, not the "#TIC-" prefixed display id above.
      linkTo: ROUTES.ACCOUNT_RETURN_DETAIL.replace(":id", r.id),
    }))
    .sort(
      (a, b) => new Date(b.expectedResolution) - new Date(a.expectedResolution),
    );

  // activeComplaints intentionally shows EVERY complaint regardless of status
  // (including closed ones) — per explicit request, so a closed complaint
  // still shows up here the same way a decided return now does above,
  // instead of disappearing from the dashboard once it's closed.
  const activeComplaints = complaints
    .map((c) => ({
      id: `#CMP-${c.id}`, // prefixed complaint ID for display
      type: "Complaint", // human-readable type label
      // Real complaint responses (confirmed via Network tab, API 55) expose BOTH
      // "order" (raw FK id, e.g. 9) and "order_number" (human-readable, e.g. "ORD-2026-00009").
      // Previously this read the raw "order" FK directly, which the app never displays
      // anywhere else (order_number is the app-wide convention — same fix already
      // applied to ComplaintDetail/OrderDetail components). A complaint filed with
      // type "other" often isn't linked to any order at all (order/order_number both
      // null) — in that case we fall back to the complaint's own category (e.g.
      // "Payment", "Product") via the shared getComplaintTypeLabel util, so the column
      // is never a dead blank cell — it always shows something the customer can act on.
      reference: c.order_number || getComplaintTypeLabel(c.type),
      status: c.status, // raw status string passed to the table
      // NOTE: "updated_at" is NOT a field on the Complaint object either — confirmed
      // against real Network-tab responses (API 55), which only expose id, customer,
      // customer_name, message, order, order_number, resolved_by_name, response,
      // status, type, created_at. Using created_at as the filed-on date.
      expectedResolution: c.created_at,
      // Route to this specific complaint's detail page (API 56) — uses the
      // complaint's raw numeric id, not the "#CMP-" prefixed display id above.
      linkTo: ROUTES.ACCOUNT_COMPLAINT_DETAIL.replace(":id", c.id),
    }))
    .sort(
      (a, b) => new Date(b.expectedResolution) - new Date(a.expectedResolution),
    );

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
            {/* ── Breadcrumb navigation ────────────────────────────────────────────
                "Home" is a clickable link; "My Account" is the current page (plain text) */}
            <nav className="flex items-center gap-1.5 text-sm text-gray-400">
              <Link
                to={ROUTES.HOME} // navigates back to the storefront homepage
                className="hover:text-gray-600 transition-colors"
              >
                Home
              </Link>
              <span className="text-gray-300">›</span>{" "}
              {/* Visual separator between breadcrumb segments */}
              <span className="text-gray-600 font-medium">My Account</span>{" "}
              {/* Current page — not a link */}
            </nav>

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
              orders={orders} // full orders array — used to compute orders.length
              totalSpent={totalSpent} // pre-computed sum of all order totals
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
                Split into two separate tables (previously one combined table),
                each showing its full history (not just still-open items) —
                so each type is easier to scan on its own; each renders nothing
                when its own list is empty. Single column on mobile, 2-column
                grid on lg+ screens, same pattern as the Wishlist/Notifications
                row above. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* items-stretch: makes both tables always match height, whichever
                  has less data — their pagination footers line up at the same
                  bottom edge instead of one floating higher than the other */}
              <ActiveTickets
                tickets={activeComplaints}
                title="Complaints"
                showType={false}
                // showType=false hides the redundant "Type" column — every
                // row in this table is already a complaint
              />
              <ActiveTickets
                tickets={activeReturns}
                title="Returns"
                showType={false}
                // showType=false hides the redundant "Type" column — every
                // row in this table is already a return request
              />
            </div>
          </div>
        </Container>
      </motion.div>
    </div>
  );
};

export default AccountDashboard; // Export so React Router can render this as the /account page
