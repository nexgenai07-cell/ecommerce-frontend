// ----------------------------
// ORDER STATUS
// ----------------------------

export const ORDER_STATUS = {
  PENDING: "pending_payment", // Order placed, awaiting Stripe payment confirmation
  // NEW (Sep 2026, API 74.1/74.4 backend fix): a QR order that was
  // cancelled specifically because its payment proof was rejected, and
  // has since had a fresh screenshot re-uploaded for a retry review.
  // Distinct from PENDING so the admin QR queue and order detail pages
  // can tell a first-time review apart from a retry — this status is
  // only ever set by the backend itself (never a selectable option in
  // the admin "Update Status" dropdown).
  ON_HOLD: "on_hold",
  CONFIRMED: "confirmed", // Payment succeeded (Stripe webhook) — order confirmed
  SHIPPED: "shipped", // Order has been dispatched/shipped to the customer
  // Courier is actively delivering to the customer's address — backend
  // confirmed (Bug #30 fix) this requires payment.status === "paid" first,
  // same rule as SHIPPED/DELIVERED, and triggers its own customer
  // notification ("Order {order_number} is out for delivery.")
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered", // Order has successfully reached the customer
  CANCELLED: "cancelled", // Order was cancelled (by customer or admin)
};

// ----------------------------
// PAYMENT STATUS
// ----------------------------
// Represents the current state of payment for an order. Exactly these
// five values exist on the backend — for BOTH Stripe and QR orders.
// UNDER_REVIEW and REJECTED only ever apply to QR orders (payment
// proof awaiting/failing manual admin verification); Stripe orders
// never enter those two states.
export const PAYMENT_STATUS = {
  PENDING: "pending", // Payment has not been completed yet
  UNDER_REVIEW: "under_review", // QR only — proof uploaded, awaiting admin approval
  PAID: "paid", // Payment was successfully completed
  // UPDATED (Sep 2026, API 74.4 backend fix): rejecting a QR proof now
  // also moves order.status to CANCELLED and releases reserved stock —
  // it no longer leaves the order sitting at "pending_payment". The
  // payment object also now carries a `qr_rejection_count` integer
  // (how many times this order's proof has been rejected) — surfaced
  // on the customer Order Detail page and the admin QR queue/detail
  // pages so both sides can see how close an order is to the
  // 3-attempt cap (see PAYMENT_METHOD.QR flows in payments.api.js).
  REJECTED: "rejected", // QR only — admin rejected the uploaded proof
  REFUNDED: "refunded", // Payment was refunded back to the customer
};

// ----------------------------
// RETURN STATUS
// ----------------------------
// Represents the current state of a product return request
export const RETURN_STATUS = {
  // NOTE: Real backend responses (confirmed via Network tab on /api/v1/returns/)
  // send "pending" for a freshly-filed, undecided return — NOT "requested" as
  // the API docs implied. Value corrected to match the ACTUAL backend contract.
  // This one value is consumed everywhere (getStatusColor.js badge coloring,
  // ActiveTickets.jsx label mapping, AccountDashboard.jsx filtering) — fixing
  // it here fixes all three call sites at once instead of patching each one.
  REQUESTED: "pending", // Customer has requested a return, decision pending
  APPROVED: "approved", // Admin has approved the return request
  REJECTED: "rejected", // Admin has rejected the return request
};

// ----------------------------
// COMPLAINT STATUS
// ----------------------------
// Represents the current state of a customer complaint/support ticket
export const COMPLAINT_STATUS = {
  OPEN: "open", // Complaint has just been raised, not yet handled
  IN_PROGRESS: "in_progress", // Admin/support team is currently working on it
  RESOLVED: "resolved", // Issue has been resolved
  CLOSED: "closed", // Complaint is fully closed (no further action)
};

// ----------------------------
// COMPLAINT TYPE
// ----------------------------
// Categorizes what the customer's complaint is actually about
export const COMPLAINT_TYPE = {
  ORDER: "order", // Complaint related to an order in general
  PAYMENT: "payment", // Complaint related to a payment issue
  PRODUCT: "product", // Complaint related to the product itself (quality, defect, etc.)
  DELIVERY: "delivery", // Complaint related to delivery/shipping issues
  OTHER: "other", // Anything that doesn't fit the above categories
};

// ----------------------------
// PAYMENT METHOD
// ----------------------------
// Chosen by the customer on the Checkout page and sent as
// "payment_method" on the Checkout request. QR is a static-image,
// manual-verification flow (Easypaisa/JazzCash) — no live gateway
// integration; the customer pays outside the system and uploads
// proof, which an admin verifies manually.
export const PAYMENT_METHOD = {
  STRIPE: "stripe",
  QR: "qr",
};

// ----------------------------
// SOCIAL POST STATUS
// ----------------------------
// Represents the current state of a social media post in the admin panel
export const SOCIAL_POST_STATUS = {
  PENDING: "pending", // Post created but not yet scheduled/approved
  SCHEDULED: "scheduled", // Post has been scheduled for a future date/time
  PUBLISHED: "published", // Post has gone live on the social platform
  REJECTED: "rejected", // Post was rejected (e.g. failed review/approval)
};

// ----------------------------
// WHATSAPP MESSAGE DIRECTION
// ----------------------------
// Represents whether a WhatsApp message was sent or received
export const WHATSAPP_DIRECTION = {
  INCOMING: "incoming", // Message received FROM the customer
  OUTGOING: "outgoing", // Message sent TO the customer
};

// ----------------------------
// USER ROLE
// ----------------------------
// Represents the role/permission level of a logged-in user
export const USER_ROLE = {
  CUSTOMER: "customer", // Regular shopper/customer account
  ADMIN: "admin", // Admin/store management account with elevated access
};
