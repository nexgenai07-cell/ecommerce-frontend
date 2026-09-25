// Import "useEffect" to publish this page's dynamic breadcrumb label, and
// "useParams" to read dynamic URL params, from react-router-dom / react
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
// Import "useQuery" hook from react-query (tanstack) to handle data fetching, caching, and refetching
import { useQuery } from "@tanstack/react-query";
// Import "motion" from framer-motion to enable a simple fade-in animation on the page
import { motion } from "framer-motion";
// Import a truck icon used inside the page header's gradient icon box
import { BsTruck } from "react-icons/bs";
// Import useBreadcrumb — publishes this order's number to the shared,
// globally-mounted <Breadcrumbs /> component (rendered once inside
// CustomerLayout, above every customer page).
import useBreadcrumb from "../../hooks/useBreadcrumb";
// Import a constants object that holds standardized react-query cache key generator functions
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the centralized route paths, used to redirect a cancelled order back to its detail page
import { ROUTES } from "../../constants/routes";
// Import the API functions for fetching order details and order tracking info
import { getOrderDetail, trackOrder } from "../../api/orders.api";
// Import the shared status-to-label mapping — used to build a readable
// title for each entry when this page falls back to status_history below
import getOrderStatusLabel from "../../utils/getOrderStatusLabel";
// Import a layout wrapper component that applies consistent max-width/padding container styling
import Container from "../../components/layouts/Container";
// Import the progress stepper component that shows order status steps
import TrackingStepper from "../../components/order-tracking/TrackingStepper";
// Import the timeline component that shows the detailed history of status updates
import TrackingTimeline from "../../components/order-tracking/TrackingTimeline";
// Import the "Need Help?" support section component
import TrackingHelp from "../../components/order-tracking/TrackingHelp";
// Import the order summary card component (order ID, items, pricing)
import TrackingOrderSummary from "../../components/order-tracking/TrackingOrderSummary";
// Import the delivery address card component (customer address)
import TrackingDeliveryAddress from "../../components/order-tracking/TrackingDeliveryAddress";
// Import a skeleton loading placeholder component used while the order detail data is loading
import { SkeletonOrderTracking } from "../../components/ui/Skeleton"; // Mirrors this page's own header, stepper, and timeline/summary + address/help grid
// Import a reusable error state component used to show an error message with a retry option
import ErrorState from "../../components/ui/ErrorState";

// Main functional component for the Order Tracking page
const OrderTracking = () => {
  // Read the order number from the URL
  // Extract the "id" route param from the URL and rename it to "orderNumber" for clarity
  const { id: orderNumber } = useParams();

  // Publishes the order number into the shared breadcrumb trail's last
  // crumb (the config's static fallback for this route is "Track
  // Order" — see constants/breadcrumbs.config.js). The URL param is
  // available immediately, with no API round trip required, so this
  // label appears correctly from the very first render.
  const { handleSetLabel } = useBreadcrumb();
  useEffect(() => {
    if (orderNumber) handleSetLabel(`Order ${orderNumber}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  // =============================================
  // ORDER DETAIL API
  // GET /api/v1/orders/{order_number}/
  // Provides the product images, items and payment info
  // =============================================
  // Use react-query to fetch the full order detail data, destructuring and renaming the returned values
  const {
    // Renamed "data" to "orderData" — holds the raw API response once loaded
    data: orderData,
    // Renamed "isLoading" to "orderLoading" — true while the request is in flight
    isLoading: orderLoading,
    // Renamed "isError" to "orderError" — true if the request failed
    isError: orderError,
    // Function to manually re-trigger this query (used for retry button)
    refetch,
  } = useQuery({
    // Generate a unique cache key for this order's detail query based on the order number
    queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
    // The actual function that performs the API call to fetch order details
    queryFn: ({ signal }) => getOrderDetail(orderNumber, signal),
    // Only run this query if orderNumber actually exists (prevents firing with undefined)
    enabled: !!orderNumber,
    // Consider the cached data fresh for 2 minutes before refetching is allowed
    staleTime: 1000 * 60 * 2,
  });

  // Extract the actual order object from the API response, defaulting to null if not present
  const order = orderData?.data || null;

  // A cancelled order has reached the end of its lifecycle, so it has no
  // live tracking. The backend reports this through the can_track flag,
  // which is false for a cancelled order. It is used below to skip the
  // tracking request and to redirect the customer to the order detail
  // page, which also covers a tracking URL that is opened directly.
  const isTrackingUnavailable = order?.can_track === false;

  // =============================================
  // TRACK ORDER API
  // GET /api/v1/orders/{order_number}/track/
  // Provides the status history timeline
  // =============================================
  // Use react-query to fetch the order's tracking/status-history data, destructuring only the "data" field
  const { data: trackingData } = useQuery({
    // Generate a unique cache key for this order's tracking query based on the order number
    queryKey: QUERY_KEYS.ORDER_TRACKING(orderNumber),
    // The actual function that performs the API call to fetch tracking info
    queryFn: ({ signal }) => trackOrder(orderNumber, signal),
    // Only run this query if orderNumber actually exists and the order can
    // be tracked (the tracking endpoint refuses a cancelled order)
    enabled: !!orderNumber && !isTrackingUnavailable,
    // Consider the cached data fresh for only 1 minute since tracking updates frequently
    staleTime: 1000 * 60 * 1, // 1 minute — tracking data changes frequently
    // Automatically refetch this query every 5 minutes to keep tracking info up to date
    refetchInterval: 1000 * 60 * 5, // Har 5 minute pe auto refresh
  });

  // Extract the actual tracking info object from the API response, defaulting to null if not present
  const trackingInfo = trackingData?.data || null;

  // Fallback source for when the dedicated tracking endpoint hasn't
  // recorded a step-by-step history yet: the order's own status_history
  // array — the same data the Order Detail page's own timeline reads
  // from — mapped into the { status, title, description, timestamp }
  // shape TrackingTimeline already expects. This lets a customer see the
  // exact same story on both pages instead of an empty state whenever
  // the tracking endpoint simply hasn't caught up.
  const statusHistoryAsTimeline = (order?.status_history || []).map(
    (entry) => ({
      status: entry.status,
      title: getOrderStatusLabel(entry.status),
      description: entry.note,
      timestamp: entry.changed_at,
    }),
  );

  // Extract the status history array from the tracking info, falling
  // back to the mapped status_history above whenever the tracking
  // endpoint's own history is empty.
  const history = trackingInfo?.history?.length
    ? trackingInfo.history
    : statusHistoryAsTimeline;
  // Determine the current status — prefer the tracking API's current_status, fallback to the order's own status field
  const currentStatus = trackingInfo?.current_status || order?.status;

  // Loading state
  // While the order detail is still loading, show a skeleton placeholder instead of real content
  if (orderLoading) {
    return (
      // Container wrapper with vertical padding
      <Container className="py-6 sm:py-8">
        {/* Skeleton placeholder mimicking THIS page's actual layout — the
            stepper and timeline, not a generic label/value block */}
        <SkeletonOrderTracking />
      </Container>
    );
  }

  // Error state
  // If the order request failed, or no order data was returned, show an error state instead of the page content
  if (orderError || !order) {
    return (
      // Container wrapper with larger vertical padding for the error state
      <Container className="py-16">
        {/* Error component showing a title, message, and a retry button wired to the refetch function */}
        <ErrorState
          title="Order not found"
          message="Could not load tracking information for this order."
          onRetry={refetch}
        />
      </Container>
    );
  }

  // Tracking unavailable state
  // Tracking is not available for a cancelled order, so anyone who reaches this
  // page directly (for example by typing the URL) is sent to the order detail
  // page instead. "replace" keeps this page out of the browser history, so the
  // Back button does not bounce the customer straight back into the redirect.
  if (isTrackingUnavailable) {
    return (
      <Navigate
        to={ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber)}
        replace
      />
    );
  }

  // Begin returning the JSX markup for the main page once data has loaded successfully
  return (
    // relative + overflow-hidden hosts the decorative ambient gradient glow
    // behind the header without it bleeding into the navbar/footer — same
    // treatment as the rest of the account pages
    <div className="relative overflow-hidden">
      {/* Ambient background glow — soft emerald blur behind the page header,
          purely decorative (pointer-events-none)
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Animated wrapper that fades the entire page content in on mount */}
      <motion.div
        // Initial state: fully transparent
        initial={{ opacity: 0 }}
        // Final state: fully opaque
        animate={{ opacity: 1 }}
        // Animation duration of 0.3 seconds
        transition={{ duration: 0.3 }}
      >
        {/* Page container with vertical padding (smaller on mobile, larger on sm+ screens) */}
        <Container className="py-6 sm:py-8">
          {/* Outer vertical flex column holding all page sections, with gap between them */}
          <div className="flex flex-col gap-6">
            {/* ── Page header ────────────────────────────────────────────────────
                Same icon-box pattern used across every other account page:
                a rounded gradient icon square + bold heading + gray subtitle */}
            <div className="flex items-center gap-4">
              {/* Icon box — rounded gradient square, brand emerald tones
                  shadow-primary/30 gives it a soft colored glow instead of a flat gray shadow */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                <BsTruck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />{" "}
                {/* Truck icon — represents live shipment tracking */}
              </div>

              {/* Title + subtitle stack */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Track Your Order
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Order {orderNumber}
                </p>
              </div>
            </div>

            {/* Progress stepper */}
            {/* Render the stepper component, passing the current status (falling back to the order's own status if tracking status is unavailable) */}
            <TrackingStepper status={currentStatus || order.status} />

            {/* Main content — 2 column layout */}
            {/* Grid container: single column on mobile, two columns on large screens, with gap between columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left — Timeline + Help */}
              {/* Left column: vertical flex stack holding the timeline and help sections, with gap between them */}
              <div className="flex flex-col gap-5">
                {/* Render the timeline component, passing the status history array and the current status */}
                <TrackingTimeline
                  history={history}
                  currentStatus={currentStatus || order.status}
                />
                {/* Render the "Need Help?" support section (no props needed) */}
                <TrackingHelp />
              </div>

              {/* Right — Order Summary + Delivery Address */}
              {/* Right column: vertical flex stack holding the order summary and delivery address cards, with gap between them */}
              <div className="flex flex-col gap-5">
                {/* Render the order summary card, passing the full order object */}
                <TrackingOrderSummary order={order} />
                {/* Render the delivery address card, passing the full order object */}
                <TrackingDeliveryAddress order={order} />
              </div>
            </div>
          </div>
        </Container>
      </motion.div>
    </div>
  );
};

// Export this component as the default export so other files (like the router) can import and use it
export default OrderTracking;
