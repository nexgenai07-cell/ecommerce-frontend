import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineTruck,
  AiOutlineCreditCard,
  AiOutlineUser,
  AiOutlineFileText,
  AiOutlineBulb,
  // Dismiss icon for the suggested-alternatives card — lets the admin
  // close the panel once they've reviewed it, without reloading the page
  AiOutlineClose,
} from "react-icons/ai";
import useBreadcrumb from "../../hooks/useBreadcrumb";
// useBreadcrumb — publishes this order's number to the shared,
// globally-mounted <Breadcrumbs /> component (rendered once inside
// AdminLayout, above every admin page).

import {
  getAdminOrderDetail,
  trackOrder,
  updateOrderStatus,
} from "../../api/orders.api";
// getAdminOrderDetail — GET /api/v1/admin/orders/{order_number}/
//   Returns ANY order in the store for an admin request. The payment
//   object carries qr_rejection_count for QR orders.
// trackOrder          — GET /api/v1/orders/{order_number}/track/
// updateOrderStatus   — PUT /api/v1/admin/orders/{order_number}/status/
//   Enforces a forward-only sequence and a paid-before-confirmed gate,
//   and refuses any change on a delivered or cancelled order — see
//   getStatusOptions() below.

import { ROUTES } from "../../constants/routes";
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "../../constants/statusTypes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the same shared gradient icon + title header used across
// every other admin page (Products, Categories, Orders list, etc). Added
// here so the Order Detail screen finally matches the rest of the panel.
import OrderStatusBadge from "../../components/shared/OrderStatusBadge";
import OrderStatusStepper from "../../components/shared/OrderStatusStepper";
import OrderStatusTimeline from "../../components/order-detail/OrderStatusTimeline";
import QrRejectionHistory from "../../components/order-detail/QrRejectionHistory";

// Every real, admin-settable ORDER_STATUS value, in the exact forward
// sequence the backend enforces: pending_payment -> confirmed ->
// shipped -> out_for_delivery -> delivered. ON_HOLD is intentionally
// excluded — it is a legacy backend-only state and is never a settable
// option here.
const FORWARD_STATUS_SEQUENCE = [
  { value: ORDER_STATUS.PENDING, label: "Pending Payment" },
  { value: ORDER_STATUS.CONFIRMED, label: "Confirmed" },
  { value: ORDER_STATUS.SHIPPED, label: "Shipped" },
  // "out_for_delivery" follows the same paid-only rule as
  // Shipped/Delivered (400 if payment isn't confirmed yet)
  { value: ORDER_STATUS.OUT_FOR_DELIVERY, label: "Out for Delivery" },
  { value: ORDER_STATUS.DELIVERED, label: "Delivered" },
];

// getStatusOptions — builds the full list of statuses shown in the
// "New Status" dropdown. Every status is always listed; the ones the
// admin cannot pick from the order's current state are flagged
// `disabled: true`, so they appear greyed out and cannot be selected.
// The rules mirror the backend's checks:
// 1) The sequence is strictly forward-only — any status before the
//    order's current position in FORWARD_STATUS_SEQUENCE is disabled,
//    since moving backward is rejected outright.
// 2) "confirmed" (and everything after it) requires payment.status to
//    already be "paid" — the order cannot move ahead of its own
//    payment, so those options stay disabled until it is paid.
// 3) "pending_payment" is disabled once payment.status is "paid" — the
//    backend blocks reverting a paid order back to pending, regardless
//    of the order's current status.
// 4) "cancelled" is always enabled, since cancelling isn't part of the
//    forward sequence.
// 5) A delivered or cancelled order is final — no status can be
//    selected for it, so an empty list is returned. (The backend also
//    rejects every status change on a delivered order, including
//    "cancelled".)
// A rejected QR payment does not lock the order: an order that is still
// "pending_payment" can always be cancelled, whatever its payment status.
const getStatusOptions = (order) => {
  const currentStatus = order?.status;

  // Delivered and cancelled orders are final — no status option may be
  // offered.
  if (
    currentStatus === ORDER_STATUS.DELIVERED ||
    currentStatus === ORDER_STATUS.CANCELLED
  ) {
    return [];
  }

  const isPaid = order?.payment?.status === PAYMENT_STATUS.PAID;

  // ON_HOLD and ORDER_PLACED both behave like PENDING for sequence
  // purposes — all three are "not yet confirmed, payment not settled"
  // positions, so the same forward options and payment gate apply.
  // Without this, ORDER_PLACED (a status FORWARD_STATUS_SEQUENCE
  // itself doesn't include, since it isn't manually selectable) would
  // fall through to the "unknown status" branch below and incorrectly
  // allow jumping straight to Confirmed/Shipped/etc. before any
  // payment proof even exists.
  const effectiveStatus =
    currentStatus === ORDER_STATUS.ON_HOLD ||
    currentStatus === ORDER_STATUS.ORDER_PLACED
      ? ORDER_STATUS.PENDING
      : currentStatus;

  const currentIndex = FORWARD_STATUS_SEQUENCE.findIndex(
    (opt) => opt.value === effectiveStatus,
  );

  // isSequenceOptionAllowed — true when the admin may pick this position
  // of the forward sequence. The order's own current position stays
  // allowed (so the modal's pre-filled value, set from order.status when
  // it opens, is a valid choice, i.e. "no real change"), and so does
  // every position strictly ahead of it that the payment gate permits.
  const isSequenceOptionAllowed = (opt, index) => {
    // "pending_payment" can never be selected once the order is paid.
    if (opt.value === ORDER_STATUS.PENDING && isPaid) return false;
    if (currentIndex < 0) return true; // Unknown current status — the full sequence is allowed
    if (index === currentIndex) return true; // The order's own current position
    if (index < currentIndex) return false; // Backward — rejected by the backend
    // Forward move — "confirmed" and anything after it requires
    // payment.status "paid" first
    return isPaid;
  };

  return [
    ...FORWARD_STATUS_SEQUENCE.map((opt, index) => ({
      ...opt,
      disabled: !isSequenceOptionAllowed(opt, index),
    })),
    { value: ORDER_STATUS.CANCELLED, label: "Cancelled", disabled: false },
  ];
};

// --------------------------------------------------
// CARD_CLASS — one shared class string for every white content card on
// this page (Order Items, Status Timeline, Shipping Address, Customer
// Info, Payment, Order Summary). Centralizing it here means every card
// automatically gets the same "raised off the page" look: a soft resting
// shadow (instead of just a flat border) plus a slightly stronger shadow
// and a tiny upward lift on hover — same elevation pattern StatsCard.jsx
// already uses elsewhere in the admin panel, applied here for visual
// consistency across the whole app.
// --------------------------------------------------
const CARD_CLASS =
  "bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)] hover:shadow-[0_10px_24px_-6px_rgba(16,24,40,0.12)] hover:-translate-y-0.5 transition-all duration-300 p-5 sm:p-6 flex flex-col gap-4";

// Local placeholder image shown whenever a suggested-alternative product
// has no image of its own — same fallback path ProductCard.jsx already
// uses elsewhere, kept consistent across the app
const FALLBACK_IMAGE = "/placeholder-product.svg";

const AdminOrderDetail = () => {
  // Reads the ":id" route param — in this app that's actually the
  // order_number string (e.g. "ORD-2026-00041"), not a numeric id
  const { id: orderNumber } = useParams();

  // Publishes the order number into the shared breadcrumb trail's last
  // crumb (the config's static fallback for this route is "Order
  // Details" — see constants/breadcrumbs.config.js). The URL param is
  // available immediately, with no API round trip required, so this
  // label is correct from the very first render.
  const { handleSetLabel } = useBreadcrumb();
  useEffect(() => {
    if (orderNumber) handleSetLabel(orderNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const queryClient = useQueryClient();
  // Used to invalidate cached queries after a successful status update,
  // so this page and the main Orders list both refetch fresh data

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  // Controls visibility of the "Update Order Status" modal

  const [newStatus, setNewStatus] = useState("");
  // The status value currently selected inside the modal's dropdown

  const [trackingNumber, setTrackingNumber] = useState("");
  // The tracking number currently typed inside the modal's input

  // Required whenever the admin sets status to "cancelled" — the
  // backend includes this exact string in the customer's cancellation
  // notification.
  const [cancellationReason, setCancellationReason] = useState("");
  // Required ONLY when cancelling a QR-paid order — the backend
  // rejects the request with a 400 if this is missing in that case.
  // refund_method itself is always "manual" for QR (no live gateway
  // exists to refund automatically), so there's nothing to pick there.
  const [refundTransactionReference, setRefundTransactionReference] =
    useState("");
  const [statusFormError, setStatusFormError] = useState("");

  // Alternatives the backend suggests once an order is actually cancelled
  // (returned by the status update) — e.g. similar in-stock products the admin can
  // point the customer toward. Lives only in this component's state
  // (not on the order object itself) because the backend sends it once,
  // as part of the cancel response, not on every future order fetch.
  const [suggestedAlternatives, setSuggestedAlternatives] = useState([]);

  // --------------------------------------------------
  // ORDER DETAIL — uses the admin-only endpoint, which returns any
  // order in the store (the customer endpoint only returns orders the
  // requester owns)
  // --------------------------------------------------
  const { data: orderResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
    queryFn: ({ signal }) => getAdminOrderDetail(orderNumber, signal),
  });

  const order = orderResponse?.data;
  // The actual order object — everything below reads from this

  // A delivered order is final: the backend rejects every status
  // change for it, including "cancelled".
  const isDelivered = order?.status === ORDER_STATUS.DELIVERED;

  // A cancelled order is final as well — whether it was cancelled by the
  // customer, an admin, a timeout or a third rejected QR proof, it can
  // never be reopened or moved to another status.
  const isCancelled = order?.status === ORDER_STATUS.CANCELLED;

  // True when the Update Status controls must not be available. A
  // rejected QR payment does not count: a pending_payment order with a
  // rejected proof must still be cancellable by the admin.
  const isStatusFinal = isDelivered || isCancelled;

  // The options of the "New Status" dropdown — every status is listed,
  // and the ones the admin cannot currently move this order into are
  // flagged as disabled. Recomputed from the order's live status/payment
  // state on every render (see getStatusOptions above).
  const statusOptions = order ? getStatusOptions(order) : [];

  // --------------------------------------------------
  // TRACKING HISTORY — feeds the reused OrderStatusStepper
  // --------------------------------------------------
  const { data: trackResponse } = useQuery({
    queryKey: ["orderTracking", orderNumber],
    queryFn: ({ signal }) => trackOrder(orderNumber, signal),
    enabled: !!order,
    // Only fires once the main order detail has successfully loaded —
    // no point tracking an order that doesn't exist
  });

  const trackingHistory = trackResponse?.data?.history || [];
  // Falls back to an empty array so the stepper never crashes on
  // .map() if the tracking endpoint hasn't returned yet

  // --------------------------------------------------
  // UPDATE STATUS MUTATION
  // --------------------------------------------------
  const isCancelling = newStatus === ORDER_STATUS.CANCELLED;
  const isQrOrder = order?.payment?.method === PAYMENT_METHOD.QR;
  const isPaidOrder = order?.payment?.status === PAYMENT_STATUS.PAID;
  // The manual refund fields only apply when the admin is cancelling an
  // order that was actually PAID via QR — there is money to send back
  // and no live gateway to do it automatically. A QR order whose
  // payment was never approved (proof pending, under review or
  // rejected) has nothing to refund, and Stripe cancellations refund
  // automatically with no extra fields.
  const requiresManualRefundProof = isCancelling && isQrOrder && isPaidOrder;

  const updateStatusMutation = useMutation({
    mutationFn: () =>
      updateOrderStatus(orderNumber, {
        status: newStatus,
        tracking_number: trackingNumber || undefined,
        // undefined (not empty string) so an untouched tracking field
        // doesn't wipe out an existing tracking number on the backend
        cancellation_reason: isCancelling ? cancellationReason : undefined,
        ...(requiresManualRefundProof && {
          refund_method: "manual",
          refund_transaction_reference: refundTransactionReference,
        }),
      }),
    onSuccess: (response) => {
      showSuccess("Order status updated.");
      // The backend only ever populates this on a cancellation response
      // (it's the "similar items" suggestion for an out-of-stock cancel),
      // so for every other status change it will simply be missing/empty
      // and the card below won't render. Falls back to an empty array so
      // .length / .map() below never crash on a missing field.
      setSuggestedAlternatives(response?.data?.suggested_alternatives || []);
      // Invalidating these three query keys forces a fresh refetch of:
      // 1) this exact order's detail (so the new status shows immediately)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
      });
      // 2) this order's tracking history (a new status change usually
      //    adds a new entry to the timeline)
      queryClient.invalidateQueries({
        queryKey: ["orderTracking", orderNumber],
      });
      // 3) the main admin orders list (so its status column/badge for
      //    this order also updates the moment the admin navigates back)
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      setIsStatusModalOpen(false);
      // Closes the modal automatically on success
    },
    onError: (error) =>
      // The sequence, paid-gate and lock errors (e.g. "Please approve
      // payment first...", "This order has been cancelled — its status
      // is final and cannot be changed.") come back under an "error"
      // key; "message" is checked as a fallback so every specific
      // message stays visible instead of the generic text below.
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to update status.",
      ),
    // Falls back to a generic message if the backend didn't send
    // a specific error message field
  });

  const handleSaveStatus = () => {
    if (isCancelling && !cancellationReason.trim()) {
      setStatusFormError("A cancellation reason is required.");
      return;
    }
    if (requiresManualRefundProof && !refundTransactionReference.trim()) {
      setStatusFormError(
        "A refund transaction reference is required for QR-paid orders.",
      );
      return;
    }
    setStatusFormError("");
    updateStatusMutation.mutate();
  };

  const openStatusModal = () => {
    // Safety guard — the button is hidden for delivered and cancelled
    // orders, but the modal must never open for one.
    if (isStatusFinal) return;
    setNewStatus(order?.status || "");
    // Pre-fills the dropdown with the order's CURRENT status, so the
    // admin sees where it already stands instead of a blank field
    setTrackingNumber(order?.tracking_number || "");
    setCancellationReason("");
    setRefundTransactionReference("");
    setStatusFormError("");
    setIsStatusModalOpen(true);
  };

  // Clears the suggested-alternatives card once the admin has seen it —
  // purely local UI state, nothing is sent back to the backend for this
  const dismissSuggestedAlternatives = () => setSuggestedAlternatives([]);

  // Loading state — full-page spinner while the order detail request is
  // still in flight, shown BEFORE the header so the admin isn't looking
  // at a header for an order that hasn't loaded yet.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not-found state — order finished loading but came back empty (e.g.
  // a bad/old order number in the URL).
  if (!order) {
    return (
      <div className="text-center py-24 text-gray-400">Order not found.</div>
    );
  }

  // Order Summary math — subtotal is derived from the real items array
  // (sum of each line's total_price), not a separate field
  const subtotal = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.total_price) || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, first element on
          the page, matching every other admin screen. The right-side
          "actions" slot is used for the "Update Status" button so it
          stays visible right next to the page title on desktop, while
          still wrapping cleanly under the title on small screens (the
          shared PageHeader component already handles that wrap).
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineFileText />}
        title="Order Details"
        actions={
          // Delivered and cancelled orders are final, so no action is
          // shown for them; every other order gets the Update Status
          // button.
          isStatusFinal ? null : (
            <Button variant="primary" onClick={openStatusModal}>
              Update Status
            </Button>
          )
        }
      />

      {/* ================================================================
          ORDER SUMMARY STRIP — order number, live status badge, and
          placed-on date, presented as its own elevated card (instead of
          loose text sitting directly on the gray page background) so it
          reads as a proper "hero" section for this specific order. 
          ================================================================ */}
      <div className={CARD_CLASS}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {order.order_number}
              </h2>
              <OrderStatusBadge status={order.status} size="md" />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Placed on {formatDate(order.created_at)}
              {order.expected_delivery &&
                ` · Estimated delivery: ${order.expected_delivery}`}
            </p>
            {/* Cancellation Reason — only shown once the order is actually
                cancelled AND a reason exists on it. Covers both cases: the
                customer cancelling their own order with a reason, and an
                admin cancelling it and typing one in the Update Status
                modal above — both are stored on the same
                order.cancellation_reason field by the backend. */}
            {order.status === ORDER_STATUS.CANCELLED &&
              order.cancellation_reason && (
                <p className="text-sm text-danger mt-2">
                  <span className="font-medium">Cancellation Reason:</span>{" "}
                  {order.cancellation_reason}
                </p>
              )}
          </div>
        </div>
      </div>

      {/* ================================================================
          SUGGESTED ALTERNATIVES — only rendered right after a cancel that
          actually came back with alternatives. Purely
          session-local: it disappears on dismiss or on navigating away,
          since the backend doesn't persist it back onto the order.
          ================================================================ */}
      {suggestedAlternatives.length > 0 && (
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <AiOutlineBulb className="w-4 h-4 text-gray-400" />
              Suggested Alternatives
            </h3>
            {/* Lets the admin close this card once they've reviewed it */}
            <button
              type="button"
              onClick={dismissSuggestedAlternatives}
              aria-label="Dismiss suggested alternatives"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <AiOutlineClose className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            This order was cancelled — here are similar in-stock products you
            can point the customer toward.
          </p>
          <div className="flex flex-col divide-y divide-gray-50">
            {suggestedAlternatives.map((alt) => (
              <div key={alt.id} className="flex items-center gap-3 py-3">
                {/* Reuses the same fallback pattern as ProductCard.jsx —
                    falls back to the shared placeholder if no image is
                    returned for this specific alternative */}
                <img
                  src={alt.primary_image || FALLBACK_IMAGE}
                  alt={alt.name}
                  className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {alt.name}
                  </p>
                  {/* available_stock is optional on this payload — only
                      shown when the backend actually sends it */}
                  {typeof alt.available_stock === "number" && (
                    <p className="text-xs text-gray-400">
                      {alt.available_stock} in stock
                    </p>
                  )}
                </div>
                {typeof alt.price !== "undefined" && (
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {formatPrice(alt.price)}
                  </p>
                )}
                {/* Takes the admin straight to that product's edit page —
                    same navigation target InventoryAlertsWidget.jsx uses
                    for its own "similar product" shortcuts */}
                <Link
                  to={ROUTES.ADMIN_PRODUCT_EDIT.replace(":id", alt.id)}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          MAIN CONTENT GRID — two columns on large screens (order items,
          timeline, shipping on the left; customer, payment, summary on
          the right), collapsing to a single stacked column on mobile so
          nothing gets cramped on small screens. Every card below uses
          the shared CARD_CLASS so they all sit visually "raised" above
          the page background.
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Order Items */}
          <div className={CARD_CLASS}>
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Order Items
            </h3>
            <div className="flex flex-col divide-y divide-gray-50">
              {(order.items || []).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    {/* min-w-0 lets the product name truncate/wrap instead
                        of pushing the price off-screen on narrow phones */}
                    <p className="text-sm font-medium text-gray-900 wrap-break-word">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0 whitespace-nowrap">
                    {formatPrice(item.total_price)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Status Timeline — reuses the same stepper the customer-facing
              OrderTracking page uses */}
          <div className={CARD_CLASS}>
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">
              Status Timeline
            </h3>
            <OrderStatusStepper
              currentStatus={order.status}
              history={trackingHistory}
            />
          </div>

          {/* Status History — the detailed, note-carrying log (same
              status_history array the customer's own Order Detail page
              shows), distinct from the stepper above: this one keeps
              every change with its own timestamp and the exact note
              recorded against it (e.g. "QR payment proof approved by
              admin"), which the stepper's simplified view doesn't show. */}
          <OrderStatusTimeline history={order.status_history} />

          {/* Shipping Address */}
          <div className={CARD_CLASS}>
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <AiOutlineTruck className="w-4 h-4 text-gray-400" />
              Shipping Address
            </h3>
            <p className="text-sm text-gray-600 wrap-break-word">
              {order.shipping_address || "No address provided."}
            </p>
            {order.tracking_number && (
              <p className="text-xs text-gray-400 mt-1">
                Tracking Number:{" "}
                <span className="font-medium text-gray-600">
                  {order.tracking_number}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Customer Info */}
          <div className={CARD_CLASS}>
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <AiOutlineUser className="w-4 h-4 text-gray-400" />
              Customer Info
            </h3>
            {order.customer?.name ? (
              // The response nests customer details inside an
              // `order.customer` object: { id, name, email, phone }.
              // They are read with optional chaining, so nothing
              // crashes if `customer` is missing on some order.
              <>
                <p className="text-sm font-medium text-gray-900">
                  {order.customer.name}
                </p>
                <p className="text-xs text-gray-400">
                  {order.customer.phone || "—"}
                </p>
                {order.customer.email && (
                  <p className="text-xs text-gray-400 break-all">
                    {order.customer.email}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Customer details not available.
              </p>
            )}
          </div>

          {/* Payment Info */}
          <div className={CARD_CLASS}>
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <AiOutlineCreditCard className="w-4 h-4 text-gray-400" />
              Payment
            </h3>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900 capitalize">
                {order.payment?.status || "—"}
              </span>
            </div>
            {/* Refunded amount — only ever set for manually-refunded QR
                cancellations. There's no partial-refund flow anywhere in
                this app (the admin only ever logs a reference for the
                manual transfer), so the refunded amount is always the
                order's own total — same figure the customer's "Refund
                processed" notification quotes. */}
            {order.payment?.status === PAYMENT_STATUS.REFUNDED && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500">Refunded Amount</span>
                <span className="font-medium text-gray-900">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            )}
            {order.payment?.method_label && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500">Method</span>
                <span className="font-medium text-gray-900">
                  {order.payment.method_label}
                </span>
              </div>
            )}
            {/* Unified transaction reference — the QR transfer reference for
                QR orders, or Stripe's PaymentIntent id for card orders,
                both returned under the same "reference" field. Falls back
                to the raw stripe_payment_intent_id field for orders that
                predate this unified field. */}
            {(order.payment?.reference ||
              order.payment?.stripe_payment_intent_id) && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500 shrink-0">Reference</span>
                <span className="font-mono text-xs text-gray-600 truncate max-w-35">
                  {order.payment.reference ||
                    order.payment.stripe_payment_intent_id}
                </span>
              </div>
            )}
            {order.payment?.paid_at && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500">Paid On</span>
                <span className="text-gray-900">
                  {formatDate(order.payment.paid_at)}
                </span>
              </div>
            )}
            {/* Flags a retry review distinctly from a first-time one, since
                both sit at payment.status "under_review" but mean different
                things to the admin deciding on it. A retry is recognised by
                an earlier rejection (qr_rejection_count above zero). */}
            {order.payment?.method === PAYMENT_METHOD.QR &&
              order.payment?.status === PAYMENT_STATUS.UNDER_REVIEW &&
              order.payment?.qr_rejection_count > 0 && (
                <p className="text-xs text-warning">
                  This is a retry review — the previous payment proof was
                  rejected and the customer has uploaded a new one.
                </p>
              )}
            {/* Rejection attempt history — an "attempts used" counter plus
                one card per past rejection, each carrying the reason an
                admin gave and exactly when they gave it, so reviewing this
                order never depends on remembering only the latest one. */}
            {order.payment?.method === PAYMENT_METHOD.QR && (
              <div className="pt-1 border-t border-gray-100">
                <QrRejectionHistory
                  history={order.status_history}
                  rejectionCount={order.payment?.qr_rejection_count || 0}
                />
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className={CARD_CLASS}>
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Order Summary
            </h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatPrice(subtotal)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-danger">
                  -{formatPrice(order.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-gray-100 mt-1">
              <span className="text-gray-900">Total</span>
              <span className="text-primary">
                {formatPrice(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Status modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Order Status"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="New Status"
            options={statusOptions}
            value={newStatus}
            onChange={(e) => {
              setNewStatus(e.target.value);
              setStatusFormError("");
            }}
          />
          <Input
            label="Tracking Number"
            placeholder="TRK123456"
            hint="Optional"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />

          {isCancelling && (
            <Input
              label="Cancellation Reason"
              required
              placeholder="e.g. Out of stock, customer requested"
              value={cancellationReason}
              onChange={(e) => {
                setCancellationReason(e.target.value);
                setStatusFormError("");
              }}
              hint="Included in the customer's cancellation notification"
            />
          )}

          {requiresManualRefundProof && (
            <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-light/40 p-4">
              <p className="text-xs text-warning font-medium">
                This order was paid via QR — refunds aren't automatic. Confirm
                the manual refund has been sent, then log the reference below.
              </p>
              <div className="text-sm text-gray-600">
                Refund Method: <span className="font-semibold">Manual</span>
              </div>
              <Input
                label="Refund Transaction Reference"
                required
                placeholder="e.g. Easypaisa transaction ID for the refund"
                value={refundTransactionReference}
                onChange={(e) => {
                  setRefundTransactionReference(e.target.value);
                  setStatusFormError("");
                }}
              />
            </div>
          )}

          {statusFormError && (
            <p className="text-xs text-danger">{statusFormError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveStatus}
              isLoading={updateStatusMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOrderDetail;
// Default export — this is the actual page component routed at
// /admin/orders/:id
