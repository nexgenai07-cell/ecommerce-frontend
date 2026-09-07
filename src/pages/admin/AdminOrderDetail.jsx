import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineTruck,
  AiOutlineCreditCard,
  AiOutlineUser,
  AiOutlineFileText,
  AiOutlineRight,
} from "react-icons/ai";

import {
  getAdminOrderDetail,
  trackOrder,
  updateOrderStatus,
} from "../../api/orders.api";
// getAdminOrderDetail — NEW admin-only endpoint (added after backend
// fixed a real bug: the old customer-facing getOrderDetail() only
// returned orders the requester themselves owned, so an admin got a
// 404 for real orders that weren't theirs). This now correctly
// returns ANY order in the store for an admin request.
// trackOrder        — API 46: GET /api/v1/orders/{order_number}/track/
// updateOrderStatus — API 49: PUT /api/v1/admin/orders/{order_number}/status/

import { ROUTES } from "../../constants/routes";
import { ORDER_STATUS, PAYMENT_METHOD } from "../../constants/statusTypes";
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

// Dropdown options for the "Update Status" modal — one per real
// ORDER_STATUS value, using the centralized constants file so the
// exact string values always match what the backend expects
const STATUS_OPTIONS = [
  { value: ORDER_STATUS.PENDING, label: "Pending Payment" },
  { value: ORDER_STATUS.CONFIRMED, label: "Confirmed" },
  { value: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { value: ORDER_STATUS.DELIVERED, label: "Delivered" },
  { value: ORDER_STATUS.CANCELLED, label: "Cancelled" },
];

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

const AdminOrderDetail = () => {
  // Reads the ":id" route param — in this app that's actually the
  // order_number string (e.g. "ORD-2026-00041"), not a numeric id
  const { id: orderNumber } = useParams();

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

  // --------------------------------------------------
  // ORDER DETAIL — now uses the NEW admin-only endpoint, fixed after
  // real testing found the old shared customer endpoint returning a
  // false 404 for orders admins didn't personally own
  // --------------------------------------------------
  const { data: orderResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
    queryFn: ({ signal }) => getAdminOrderDetail(orderNumber, signal),
  });

  const order = orderResponse?.data;
  // The actual order object — everything below reads from this

  // --------------------------------------------------
  // TRACKING HISTORY — API 46 — feeds the reused OrderStatusStepper
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
  // UPDATE STATUS MUTATION — API 49
  // --------------------------------------------------
  const isCancelling = newStatus === ORDER_STATUS.CANCELLED;
  const isQrOrder = order?.payment?.method === PAYMENT_METHOD.QR;
  // The manual refund fields only apply when BOTH are true — cancelling
  // AND the order was paid via QR (Stripe cancellations keep working
  // exactly as before, with an automatic refund and no extra fields).
  const requiresManualRefundProof = isCancelling && isQrOrder;

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
    onSuccess: () => {
      showSuccess("Order status updated.");
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
      showError(error?.response?.data?.message || "Failed to update status."),
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
    setNewStatus(order?.status || "");
    // Pre-fills the dropdown with the order's CURRENT status, so the
    // admin sees where it already stands instead of a blank field
    setTrackingNumber(order?.tracking_number || "");
    setCancellationReason("");
    setRefundTransactionReference("");
    setStatusFormError("");
    setIsStatusModalOpen(true);
  };

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
          <Button variant="primary" onClick={openStatusModal}>
            Update Status
          </Button>
        }
      />

      {/* ================================================================
          ORDER SUMMARY STRIP — breadcrumb, order number, live status
          badge, and placed-on date, now presented as its own elevated
          card (instead of loose text sitting directly on the gray page
          background) so it reads as a proper "hero" section for this
          specific order.
          ================================================================ */}
      <div className={CARD_CLASS}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {/* Breadcrumb — lets the admin jump straight back to the full
                orders list without using the browser's back button. */}
            <p className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <Link
                to={ROUTES.ADMIN_ORDERS}
                className="hover:text-primary transition-colors"
              >
                Orders
              </Link>
              <AiOutlineRight className="w-3 h-3" />
              <span className="text-gray-500">{order.order_number}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {order.order_number}
              </h2>
              <OrderStatusBadge status={order.status} size="md" />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
        </div>
      </div>

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
              // FIXED — the real API response nests customer details
              // inside an `order.customer` object:
              //   { id, name, email, phone }
              // The previous code read flat fields that don't exist on
              // this response at all — order.customer_name,
              // order.customer_phone, order.customer_email — which were
              // always undefined, so this section fell through to the
              // "not available" message every single time, even though
              // the backend was sending full customer data correctly.
              // Reading order.customer.name / .phone / .email (with
              // optional chaining, so nothing crashes if `customer` is
              // ever missing on some order) fixes it.
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
            {order.payment?.stripe_payment_intent_id && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500 shrink-0">Stripe Intent</span>
                <span className="font-mono text-xs text-gray-600 truncate max-w-35">
                  {order.payment.stripe_payment_intent_id}
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
            options={STATUS_OPTIONS}
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
