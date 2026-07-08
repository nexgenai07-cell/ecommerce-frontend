// ============================================================
// STATUS & ENUM CONSTANTS
// ============================================================
// This file defines ALL status/enum values used across the project
// for orders, payments, returns, complaints, and other modules.
//
// WHY THIS MATTERS:
// - These exact string values should be used everywhere instead of
//   hardcoding strings like "pending" or "shipped" directly in components.
// - This avoids typos (e.g. "Pending" vs "pending" vs "PENDING") which
//   could cause bugs when comparing values or filtering data.
// - If the backend ever changes a status value, it only needs to be
//   updated here, and it reflects everywhere automatically.
// - Makes the code more readable: ORDER_STATUS.SHIPPED is clearer
//   than just "shipped" scattered everywhere.

// ----------------------------
// ORDER STATUS
// ----------------------------
// Represents the current stage of a customer's order in its lifecycle
// NOTE (Stripe integration, API doc v2.1): Order ka pehla status ab
// "pending_payment" hai — order checkout ke turant baad isi status ke
// sath banta hai aur Stripe webhook (API 70) payment succeed hone par
// isko "confirmed" mein badalta hai. Constant ka NAME (PENDING) wahi
// rakha hai taake jahan bhi ORDER_STATUS.PENDING use ho raha hai woh
// sab jagah bina file chhue automatically naye value ke sath kaam kare.
export const ORDER_STATUS = {
  PENDING: "pending_payment", // Order placed, awaiting Stripe payment confirmation
  CONFIRMED: "confirmed", // Payment succeeded (Stripe webhook) — order confirmed
  SHIPPED: "shipped", // Order has been dispatched/shipped to the customer
  DELIVERED: "delivered", // Order has successfully reached the customer
  CANCELLED: "cancelled", // Order was cancelled (by customer or admin)
};

// ----------------------------
// PAYMENT STATUS
// ----------------------------
// Represents the current state of payment for an order
export const PAYMENT_STATUS = {
  PENDING: "pending", // Payment has not been completed yet
  PAID: "paid", // Payment was successfully completed
  FAILED: "failed", // Payment attempt failed (e.g. card declined)
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
// PAYMENT METHOD — REMOVED
// ----------------------------
// COD / Easypaisa / manual card selection no longer exists in this
// project. All payments now go through Stripe (Test Mode). Payment
// status is tracked via PAYMENT_STATUS above, together with
// order.payment.stripe_payment_intent_id returned by the API.

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
