// ----------------------------
// ORDER STATUS
// ----------------------------

export const ORDER_STATUS = {
  // QR orders only — the order's very first status, the instant it's
  // placed, while its 10-minute payment-proof upload window is still
  // open (see qr_upload_deadline on the order and payment objects).
  // Moves to PENDING (below) once proof is uploaded, or to CANCELLED if
  // the window (plus its one-time extension) passes with no upload.
  // Stripe orders never enter this status — they start at PENDING
  // directly, exactly as before.
  ORDER_PLACED: "order_placed",
  PENDING: "pending_payment", // Order placed, awaiting payment (Stripe confirmation or QR proof approval)
  // Legacy state for QR orders that were reopened after a rejected proof.
  // The backend does not assign it to new orders: a rejected QR order
  // stays in "pending_payment" while the customer re-uploads a proof. It
  // remains defined so orders that already carry this status still
  // display correctly. It is never a selectable option in the admin
  // "Update Status" dropdown.
  ON_HOLD: "on_hold",
  CONFIRMED: "confirmed", // Payment succeeded — order confirmed
  SHIPPED: "shipped", // Order has been dispatched/shipped to the customer
  // Courier is actively delivering to the customer's address. Requires
  // payment.status === "paid", like SHIPPED and DELIVERED, and triggers
  // its own customer notification.
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered", // Order has reached the customer — final, no further status changes
  CANCELLED: "cancelled", // Order was cancelled (by customer, admin, or automatically) — final, no further status changes
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
  // A rejected proof leaves the order in "pending_payment" so the customer
  // can upload a new one. The third rejection cancels the order
  // permanently. The payment object carries a `qr_rejection_count`
  // integer (how many times the proof has been rejected), which the
  // customer Order Detail page and the admin QR pages use to show how
  // many attempts are used.
  REJECTED: "rejected", // QR only — admin rejected the uploaded proof
  REFUNDED: "refunded", // Payment was refunded back to the customer
};

// ----------------------------
// RETURN STATUS
// ----------------------------
// Represents the current state of a product return request
export const RETURN_STATUS = {
  // A newly filed return awaiting an admin decision. The value sent by the
  // backend is "pending"; the key name is kept because it is referenced by
  // the badge colors, ticket labels and dashboard filters.
  REQUESTED: "pending",
  APPROVED: "approved", // Admin has approved the return request — final
  REJECTED: "rejected", // Admin has rejected the return request — final
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
