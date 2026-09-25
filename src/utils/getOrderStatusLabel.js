import { ORDER_STATUS } from "../constants/statusTypes";

// getOrderStatusLabel — converts a raw order status value into the same
// human-readable wording shown on the colored status badge across the
// app. Kept as its own utility (rather than living only inside
// OrderStatusBadge) so any other place that needs to describe a status
// in plain English — for example, building a fallback timeline entry
// from status_history — reads from a single source instead of
// duplicating this switch statement.
const getOrderStatusLabel = (status) => {
  switch (status) {
    case ORDER_STATUS.ORDER_PLACED:
      // QR order, still inside its 10-minute payment-proof upload
      // window — distinct wording from "Pending Payment" so it's
      // clear proof hasn't been uploaded yet at all
      return "Awaiting Payment Proof";
    case ORDER_STATUS.PENDING:
      return "Pending Payment"; // Order created, awaiting Stripe payment confirmation
    case ORDER_STATUS.ON_HOLD:
      // A QR order reopened for a retry review after an earlier proof
      // rejection — distinct wording from "Pending Payment" so it's
      // clear this is a second attempt, not a first
      return "Under Review — Retry";
    case ORDER_STATUS.CONFIRMED:
      return "Confirmed"; // Order has been confirmed
    case ORDER_STATUS.SHIPPED:
      return "Shipped"; // Order has been dispatched for delivery
    case ORDER_STATUS.OUT_FOR_DELIVERY:
      return "Out for Delivery"; // Order is on its way to the customer
    case ORDER_STATUS.DELIVERED:
      return "Delivered"; // Order has been delivered to the customer
    case ORDER_STATUS.CANCELLED:
      return "Cancelled"; // Order has been cancelled
    default:
      return status; // Unknown status — just display it as is
  }
};

export default getOrderStatusLabel;
