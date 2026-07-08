import { useState, useEffect } from "react"; // useState manages the cancel confirmation modal's open/close state + local "just confirmed" flag; useEffect drives the one-time success toast + URL cleanup
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom"; // useParams reads the order number from the URL; useSearchParams reads the ?success=true flag set by Checkout; useNavigate cleans that flag out of the URL once handled; Link for breadcrumb navigation
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // useQuery fetches data; useMutation handles the cancel API call; useQueryClient invalidates stale cache
import { motion, AnimatePresence } from "framer-motion"; // motion.div wraps the page to animate it in on mount; AnimatePresence animates the payment-confirmation banner in/out
import { BsReceiptCutoff } from "react-icons/bs"; // Receipt icon used inside the page header's gradient icon box
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants — keeps query keys consistent across the app
import { getOrderDetail, cancelOrder } from "../../api/orders.api"; // API functions: fetch one order by number, cancel an order
import { getReturns } from "../../api/returns.api"; // API function: fetch all return requests — filtered client-side for this order
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the returns endpoint)
import { showSuccess, showError } from "../../components/ui/Toast"; // Toast notification helpers for mutation feedback
import Container from "../../components/layouts/Container"; // Consistent max-width + horizontal padding wrapper
import OrderStepper from "../../components/order-detail/OrderStepper"; // 5-step progress stepper showing where the order is in its journey
import OrderItems from "../../components/order-detail/OrderItems"; // Product list + price breakdown section
import PaymentInfo from "../../components/order-detail/PaymentInfo"; // Payment method, transaction ID, and paid badge
import DeliveryAddress from "../../components/order-detail/DeliveryAddress"; // Recipient name, address, and phone number
import ReturnStatus from "../../components/order-detail/ReturnStatus"; // Return request card — only renders when a return exists
import NeedHelp from "../../components/order-detail/NeedHelp"; // Contextual action buttons: track, return, cancel, AI chat
import OrderStatusBadge from "../../components/shared/OrderStatusBadge"; // Colored status pill shown in the page heading row
import { SkeletonDetail } from "../../components/ui/Skeleton"; // Full-page skeleton shown while the order data is loading
import ErrorState from "../../components/ui/ErrorState"; // Error UI with a retry button shown when the API call fails
import ConfirmModal from "../../components/ui/ConfirmModal"; // Modal dialog that asks the customer to confirm before cancelling

// How long (ms) we're willing to keep polling for the Stripe webhook to land
// before giving up and just showing the order in whatever state it's in.
// Stripe test-mode webhooks are near-instant, but the customer's browser
// redirect always races ahead of the actual webhook HTTP call — this window
// comfortably covers that gap without polling forever if something's stuck.
const PAYMENT_CONFIRMATION_POLL_WINDOW_MS = 20000;
const PAYMENT_CONFIRMATION_POLL_INTERVAL_MS = 2500;

const OrderDetail = () => {
  // Extract the order number from the URL — e.g. /account/orders/ORD-00123 → "ORD-00123"
  const { id: orderNumber } = useParams();

  // Reads ?success=true — set by Checkout.jsx right after stripe.confirmPayment()
  // reports success client-side. Its presence means "the customer just paid,
  // but the backend may not have processed the Stripe webhook yet."
  const [searchParams] = useSearchParams();
  const cameFromSuccessfulPayment = searchParams.get("success") === "true";
  const navigate = useNavigate();

  // queryClient lets us manually invalidate cached queries after a successful mutation
  const queryClient = useQueryClient();

  // showCancelModal controls whether the cancel confirmation dialog is visible
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Tracks whether we're still within the short post-payment polling window —
  // starts true only if we arrived here via a successful Stripe redirect.
  const [isAwaitingWebhook, setIsAwaitingWebhook] = useState(
    cameFromSuccessfulPayment,
  );
  // Flips to true for one render right when payment.status turns "paid",
  // purely so we can fire a single success toast instead of one per refetch.
  const [hasShownPaidToast, setHasShownPaidToast] = useState(false);

  // =============================================
  // ORDER DETAIL API
  // API 44 — GET /api/v1/orders/{order_number}/
  // =============================================

  const {
    data: orderData, // raw API response containing the order object
    isLoading, // true while the initial fetch is in flight
    isError, // true if the fetch threw an error (404, 500, network, etc.)
    refetch, // function passed to ErrorState so the user can retry manually
  } = useQuery({
    queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber), // unique cache key scoped to this order number
    queryFn: () => getOrderDetail(orderNumber), // API call — fetches a single order by its number
    enabled: !!orderNumber, // skip the query entirely if orderNumber is undefined or empty
    staleTime: 1000 * 60 * 2, // treat cached data as fresh for 2 minutes before refetching
    // Only poll while we're actively waiting on the Stripe webhook right after
    // a payment redirect — everywhere else this behaves like a normal one-shot fetch.
    refetchInterval: isAwaitingWebhook
      ? PAYMENT_CONFIRMATION_POLL_INTERVAL_MS
      : false,
  });

  // Safely unwrap the order object from the API response envelope
  const order = orderData?.data || null;
  const paymentStatus = order?.payment?.status;

  // Stop polling as soon as the webhook has actually landed (payment is no
  // longer "pending"), or once the polling window has run out either way —
  // we don't want to hammer the API forever if a webhook is delayed/misconfigured.
  useEffect(() => {
    if (!isAwaitingWebhook) return;

    if (paymentStatus && paymentStatus !== "pending") {
      setIsAwaitingWebhook(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsAwaitingWebhook(false);
    }, PAYMENT_CONFIRMATION_POLL_WINDOW_MS);

    return () => clearTimeout(timeout);
  }, [isAwaitingWebhook, paymentStatus]);

  // Fire a one-time success toast + strip ?success=true from the URL once the
  // webhook confirms payment, so refreshing the page later doesn't replay it.
  useEffect(() => {
    if (
      cameFromSuccessfulPayment &&
      paymentStatus === "paid" &&
      !hasShownPaidToast
    ) {
      showSuccess("Payment confirmed! Your order is being processed.");
      setHasShownPaidToast(true);
      navigate(`${ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber)}`, {
        replace: true,
      });
    }
  }, [
    cameFromSuccessfulPayment,
    paymentStatus,
    hasShownPaidToast,
    navigate,
    orderNumber,
  ]);

  // =============================================
  // RETURNS API
  // API 51 — fetch all returns, then filter for this specific order
  // =============================================

  const { data: returnsData } = useQuery({
    queryKey: QUERY_KEYS.RETURNS, // shared cache key — same data used on the Returns page
    queryFn: getReturns, // API call — fetches all return requests for the logged-in user
    staleTime: 1000 * 60 * 5, // returns change less frequently — 5 minute cache is sufficient
  });

  // Find the return that belongs to this specific order, if one exists
  // orderReturn will be undefined if no return has been filed yet
  // API_Documentation_Final.pdf (API 51) documents a flat array, but the
  // real response isn't a plain array — same backend/docs contract drift
  // as categories/notifications/complaints. extractListData() safely
  // handles either shape before we .find() on it.
  const orderReturn = extractListData(returnsData).find(
    (r) => r.order_number === orderNumber,
  );

  // =============================================
  // CANCEL ORDER MUTATION
  // API 45 — PUT /api/v1/orders/{order_number}/cancel/
  // =============================================

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderNumber), // API call — marks the order as cancelled

    onSuccess: () => {
      showSuccess("Order cancelled successfully"); // green toast confirms the action to the user
      setShowCancelModal(false); // close the confirmation modal after success

      // Invalidate the specific order's cached data so the status badge and stepper update immediately
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
      });

      // Also invalidate the full orders list so the Order History page reflects the cancellation
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MY_ORDERS,
      });
    },

    onError: (error) => {
      // Show the server's error message if available, otherwise show a generic fallback
      showError(
        error?.response?.data?.message ||
          "Failed to cancel order. Please try again.",
      );
    },
  });

  // ── Loading state ────────────────────────────────────────────────────────────
  // Show a full-page skeleton while the order data is being fetched for the first time
  if (isLoading) {
    return (
      <Container className="py-8">
        <SkeletonDetail />{" "}
        {/* Mimics the layout of the page with animated placeholder blocks */}
      </Container>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  // Show an error message with a retry button if the fetch failed or returned no data
  if (isError || !order) {
    return (
      <Container className="py-16">
        <ErrorState
          title="Order not found"
          message="This order doesn't exist or you don't have access to it."
          onRetry={refetch} // lets the user trigger a fresh API call without refreshing the page
        />
      </Container>
    );
  }

  return (
    // relative + overflow-hidden hosts the decorative ambient gradient glow
    // behind the header without it bleeding into the navbar/footer or causing
    // horizontal scrollbars — same treatment as the other account pages
    <div className="relative overflow-hidden">
      {/* Ambient background glow — soft emerald blur behind the page header,
          purely decorative (pointer-events-none), keeps this page visually
          consistent with the rest of the account section
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Page fade-in — starts transparent and animates to fully visible over 300ms */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Container className="py-6 sm:py-8">
          <div className="flex flex-col gap-6">
            {/* ── Post-payment confirmation banner ────────────────────────────────
                Only shown right after a Stripe redirect, while we're still
                waiting for the webhook to flip payment.status away from
                "pending". Disappears automatically once confirmed (or once the
                short polling window times out) — never a permanent UI element.
                FIXED: now uses the "info" design token instead of raw,
                hardcoded blue-* classes that don't exist in tokens.css.       */}
            <AnimatePresence>
              {isAwaitingWebhook && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 bg-info-light border border-info/20 rounded-xl px-4 py-3"
                >
                  <div className="w-4 h-4 border-2 border-info/30 border-t-info rounded-full animate-spin shrink-0" />
                  <p className="text-sm text-info">
                    Payment received — confirming with Stripe, this usually
                    takes a few seconds.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Breadcrumb navigation ──────────────────────────────────────────
                "My Orders" is a clickable link back to the list; current order is plain text
                gap-1.5 keeps the chevron separator tight between the two labels   */}
            <nav className="flex items-center gap-1.5 text-sm text-gray-400">
              <Link
                to={ROUTES.ACCOUNT_ORDERS} // navigates back to the Order History page
                className="hover:text-gray-600 transition-colors"
              >
                My Orders
              </Link>
              <span className="text-gray-300">›</span>{" "}
              {/* Visual separator between breadcrumb segments */}
              <span className="text-gray-600 font-medium">
                Order {orderNumber}{" "}
                {/* Current page — not a link since the user is already here */}
              </span>
            </nav>

            {/* ── Page header ────────────────────────────────────────────────────
                Same icon-box pattern used across every other account page:
                a rounded gradient icon square + bold heading + status badge  */}
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-4">
                {/* Icon box — rounded gradient square, brand emerald tones
                    shadow-primary/30 gives it a soft colored glow instead of a flat gray shadow */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                  <BsReceiptCutoff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />{" "}
                  {/* Receipt icon — represents an individual order's detail */}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Order {orderNumber}{" "}
                  {/* Large page title displaying the order reference */}
                </h1>
              </div>
              <OrderStatusBadge status={order.status} size="md" />{" "}
              {/* Colored pill e.g. "Shipped", "Delivered" */}
            </div>

            {/* ── Order progress stepper ─────────────────────────────────────────
                Shows the 5-stage delivery journey with the current stage highlighted */}
            <OrderStepper status={order.status} />

            {/* ── Main content grid ──────────────────────────────────────────────
                Single column on mobile; 3-column grid on lg+ screens
                Left column (span 2): items and payment — wider because they have more content
                Right column (span 1): address, return status, help actions               */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── Left column — primary order content ──────────────────────── */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                <OrderItems order={order} />{" "}
                {/* Product thumbnails, names, quantities, and price breakdown */}
                <PaymentInfo order={order} />{" "}
                {/* Payment method icon, transaction ID, and paid badge */}
              </div>

              {/* ── Right column — contextual sidebar ────────────────────────── */}
              <div className="flex flex-col gap-5">
                <DeliveryAddress order={order} />{" "}
                {/* Recipient name, shipping address, phone */}
                <ReturnStatus orderReturn={orderReturn} />{" "}
                {/* Return card — renders nothing if no return exists */}
                <NeedHelp
                  orderNumber={orderNumber}
                  status={order.status}
                  hasReturn={!!orderReturn} // convert to boolean — true if a return exists
                  onCancel={() => setShowCancelModal(true)} // opens the confirmation modal instead of cancelling immediately
                />
              </div>
            </div>
          </div>
        </Container>

        {/* ── Cancel order confirmation modal ─────────────────────────────────────
            Rendered outside the Container so it overlays the full viewport
            Only fires the mutation after the customer explicitly clicks "Yes, Cancel Order" */}
        <ConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)} // dismisses the modal without cancelling
          onConfirm={() => cancelMutation.mutate()} // triggers the cancel API call on confirmation
          title="Cancel Order?"
          message={`Are you sure you want to cancel order ${orderNumber}? This action cannot be undone.`}
          confirmLabel="Yes, Cancel Order" // destructive action label
          cancelLabel="Keep Order" // safe exit label
          variant="danger" // styles the confirm button in red
          isLoading={cancelMutation.isPending} // disables buttons and shows a spinner while the API call is in flight
        />
      </motion.div>
    </div>
  );
};

export default OrderDetail; // Export so React Router can render this as the /account/orders/:id page
