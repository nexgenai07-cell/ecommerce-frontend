// Decides whether the "Estimated delivery" line should be shown for an
// order. Shared by the customer and admin Order Detail pages so both
// follow exactly the same rule.
//
// An estimate only makes sense while the order is genuinely on its way
// to being delivered. It is hidden when:
//   - the order is cancelled or already delivered (nothing left to
//     estimate — a returned order keeps the "delivered" status too),
//   - payment is not confirmed yet (order_placed / pending_payment /
//     on_hold): the order may still be cancelled, so a date would be a
//     promise nobody can keep,
//   - the payment was refunded.
import { ORDER_STATUS, PAYMENT_STATUS } from "../constants/statusTypes";

const STATUSES_WITH_ESTIMATE = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
];

const shouldShowEstimatedDelivery = (order) => {
  if (!order?.expected_delivery) return false; // nothing to show
  if (order.payment?.status === PAYMENT_STATUS.REFUNDED) return false;
  return STATUSES_WITH_ESTIMATE.includes(order.status);
};

// Date a delivered order actually reached the customer, taken from the
// "delivered" entry of its status_history. Returns null when the order
// is not delivered or the entry is missing.
export const getDeliveredAt = (order) => {
  if (order?.status !== ORDER_STATUS.DELIVERED) return null;
  const entry = (order.status_history || [])
    .filter((h) => h.status === ORDER_STATUS.DELIVERED)
    .pop();
  return entry?.changed_at || null;
};

export default shouldShowEstimatedDelivery;
