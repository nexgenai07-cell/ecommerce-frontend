// ORDERS API MODULE
// ============================================================
// This file contains ALL API calls related to the Orders module.
// It covers endpoints needed by BOTH customers (placing orders,
// viewing their own order history, tracking, cancelling, requesting
// returns) AND admins (viewing/filtering all orders, updating
// order status, adding tracking info).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API  - Convert the cart into an actual order (Checkout)
// ----------------------------
// Called when the customer completes the checkout process.
// This takes everything in their current cart and turns it into
// a real order with status "pending_payment". The "data" payload
// is expected to include:
// - address_id: which saved Address Book entry to ship to (optional —
//   backend falls back to whichever saved address is currently
//   marked is_default if omitted; still 400s if neither exists)
// - payment_method: "stripe" | "qr" (required)
// - notes: any special instructions from the customer
//
// Response differs by payment_method:
// - "stripe": call createPaymentIntent() (payments.api.js, API 69)
//   immediately after, with the returned order_number, to start the
//   Stripe payment — exactly as before.
// - "qr": the response ALSO includes qr_image_url (a static,
//   config-driven QR image) and payment_reference (the order_number,
//   to write in the transfer note) — no Stripe call needed at all.
//   payment.status starts as "pending" until the customer uploads
//   proof via uploadQrProof() (payments.api.js).
//
// On success, the cart is cleared server-side automatically, so we
// also clear it from Redux state on the frontend.
export const checkout = (data, signal) => {
  return axiosInstance.post("/api/v1/orders/checkout/", data, { signal });
};

// ----------------------------
// API - Get the logged-in customer's own orders
// ----------------------------
// Fetches orders placed by the currently logged-in customer. Used on
// the "My Orders" page in the customer account section.
//
// BACKEND FIX CONFIRMED: this endpoint's pagination behavior has now
// been explicitly confirmed by the backend team — see OrderHistory.jsx
// for how the frontend fetches every page to guarantee the customer's
// complete order history is always shown, regardless of how many
// orders they have.
export const getMyOrders = (params, signal) => {
  return axiosInstance.get("/api/v1/orders/", { signal, params });
};

// ----------------------------
// API 56.1 - Get the logged-in customer's own order stats
// ----------------------------
// Returns exactly two numbers for the current customer: total_orders
// and total_spent. Both are computed using the same locked counting
// rule used everywhere else in the app — only an order whose status
// is confirmed, shipped, out_for_delivery, or delivered counts;
// pending_payment, on_hold, and cancelled orders never count, even a
// cancelled order that was paid and later refunded.
//
// No request body/params. Response shape:
//   { total_orders: number, total_spent: string }
// total_spent always comes back as a string (e.g. "0.00" for a
// customer with no qualifying orders yet) — parse it with
// parseFloat()/Number() before formatting for display.
//
// This is the ONLY correct source for the customer account
// dashboard's "Total Orders" / "Total Spent" cards — see
// AccountDashboard.jsx. Do NOT rebuild these numbers by summing
// getMyOrders() above on the frontend: that list includes every
// order regardless of status, which produces an inflated total that
// doesn't match what the backend (and the admin panel) consider a
// real, paid order.
export const getMyOrderStats = (signal) => {
  return axiosInstance.get("/api/v1/orders/stats/", { signal });
};

// ----------------------------
// API - Get full details of a specific order (CUSTOMER-OWNED ONLY)
// ----------------------------
// Fetches everything about one specific order, identified by its
// order number — including the items ordered, payment details,
// and shipping information. Used on the CUSTOMER's own order detail
// page ("/account/orders/:id").
//
// IMPORTANT: this endpoint only returns an order if it belongs to
// the currently logged-in user — the backend returns a 404 for any
// order that exists but isn't owned by the requester, even if that
// requester is an admin. This was confirmed via real testing (an
// admin got "No Order matches the given query" for a real, existing
// order that wasn't theirs) and reported to the backend team.
//
// UPDATED (Sep 2026, API 57 backend fix): the returned payment object
// now also includes qr_rejection_count (integer, 0 if the QR proof
// has never been rejected) — how many times this order's proof has
// been rejected by an admin. Surface it on the customer Order Detail
// page (see PaymentInfo.jsx) so the customer understands why the
// order shows "on hold" / "cancelled" after a rejected proof.
//
// DO NOT reuse this function for the admin order detail page — use
// getAdminOrderDetail() below instead, which calls the new
// admin-only endpoint the backend added specifically to fix this.
export const getOrderDetail = (orderNumber, signal) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/`, { signal });
  // Template literal inserts the "orderNumber" directly into the URL path
};

// ----------------------------
// API - Cancel an order
// ----------------------------
// Allows the customer to cancel an order, identified by its order
// number. The comment notes this should only be ALLOWED on the
// frontend if the order hasn't already been delivered or cancelled
// (this restriction logic is enforced in the UI/component, and
// likely double-checked on the backend as well).
// ----------------------------
// API - Cancel a customer's own order
// ----------------------------
// data.reason is entirely optional — sending no body at all (or
// data with no reason) continues to work exactly as before. When
// provided, it's just a free-text string for the customer's own
// context; it does not change how the cancellation itself is handled.
//
// UPDATED (Sep 2026, API 58 backend fix): the customer can now only
// cancel an order BEFORE it ships — "shipped", "out_for_delivery", and
// "delivered" are all blocked now (previously only "delivered" was
// blocked). The frontend hides the Cancel button itself once the
// order reaches one of those statuses (see NeedHelp.jsx's canCancel),
// but the backend also enforces this with a specific 400 message per
// status (e.g. "This order has already been shipped and can no
// longer be cancelled."), returned under an "error" key.
export const cancelOrder = (orderNumber, data, signal) => {
  return axiosInstance.put(`/api/v1/orders/${orderNumber}/cancel/`, data, {
    signal,
  });
};

// ----------------------------
// API - Track an order's status history
// ----------------------------
// Fetches the tracking timeline/history for a specific order
// (e.g. "Order Placed" -> "Confirmed" -> "Shipped" -> "Delivered"),
// identified by its order number. Used on the order tracking page.
export const trackOrder = (orderNumber, signal) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/track/`, { signal });
};

// ----------------------------
// API  - Get all orders from all customers (Admin only)
// ----------------------------
// Fetches orders across the ENTIRE store (not just one customer's
// orders). Used in the admin panel's orders management page when no
// status/search/date filter is active.
//
// The "params" object supports standard list-endpoint query params —
// "page" (which page of results to fetch), "page_size" (rows per
// page; server default is 10, capped at 100), and "ordering" (sort
// field, e.g. "-created_at"). The response follows the standard
// paginated shape: { count, next, previous, results }.
export const getAdminOrders = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/orders/", { signal, params });
};

// ----------------------------
// API  - Filter admin orders (Admin only)
// ----------------------------
// Allows admins to narrow down the orders list using various filters.
// The "params" object can include:
// - status: filter by order status (e.g. pending, shipped, delivered)
// - start_date / end_date: filter orders within a date range
// - search: search by customer name, order number, and phone number
//   (both the number saved on the customer's profile and the
//   contact_phone entered at checkout)
// - customer_id: added by the backend team specifically so we
//   can show one customer's own order history (see getCustomerOrders
//   below). Returns only orders placed by that exact customer.
// - ordering: sort field, e.g. "-created_at", "created_at",
//   "-total_amount", "total_amount"
// - page: which page of results to fetch
// - page_size: rows per page; server default is 10, capped at 100
//
// NEW (Sep 2026, API 62 backend fix): two additional filters, both
// combinable with everything else above in the same request —
// - product: partial, case-insensitive match against any product
//   name inside the order (across every line item)
// - category: same matching behavior, against the category name of
//   any product inside the order
// Also, status now accepts "pending" as an alias for
// "pending_payment", so that value returns the expected results
// instead of an empty list. An order is never duplicated in the
// results even if it contains multiple items matching product/category.
export const filterAdminOrders = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/orders/filter/", { signal, params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
};

// ----------------------------
// — Get every order placed by ONE specific customer (Admin only)
// ----------------------------
// Added after the backend team implemented the `customer_id` filter
// param on API 48 (per our request — see Backend-Request doc). This
// is used on the admin Customers page, inside the customer detail
// drawer, to show that exact customer's order history.
//
// `params` can additionally include status / search / page / page_size —
// all of which combine correctly with customer_id on the backend, e.g.:
//   getCustomerOrders(20, { status: "delivered", page: 2, page_size: 20 })
export const getCustomerOrders = (customerId, params = {}, signal) => {
  return filterAdminOrders({ ...params, customer_id: customerId }, signal);
  // Reuses filterAdminOrders so both functions always stay in sync —
  // this is just filterAdminOrders with customer_id always included
};

// ----------------------------
// — Get full details of ANY order (Admin only)
// ----------------------------
// Added after a real bug was found and reported to the backend team:
// the customer-facing getOrderDetail() above only ever returns an
// order that belongs to the requesting user, which meant an admin
// got a 404 "Order not found" for real orders that simply weren't
// theirs. The backend team added this new dedicated admin endpoint
// to fix it — it returns full order details for ANY order in the
// store, regardless of who placed it, as long as the requester has
// the admin role. Matches the same "/admin/..." prefix convention
// already used by getAdminOrders() and filterAdminOrders() above.
//
// Used ONLY on the admin order detail page ("/admin/orders/:id") —
// the customer-facing page keeps using getOrderDetail() unchanged.
//
// UPDATED (Sep 2026, API 61 backend fix): same addition as the
// customer-facing getOrderDetail() above — the payment object now
// also includes qr_rejection_count. Show this, and treat
// order.status "on_hold" distinctly from "pending_payment", on the
// admin Order Detail page so the admin can tell a first review apart
// from a retry review.
export const getAdminOrderDetail = (orderNumber, signal) => {
  return axiosInstance.get(`/api/v1/admin/orders/${orderNumber}/`, { signal });
};

// ----------------------------
// API - Update an order's status (Admin only)
// ----------------------------
// Allows admins to move an order forward in its lifecycle
// (e.g. from "confirmed" to "shipped") and optionally attach a
// tracking number for the customer to follow. The "data" payload
// is expected to include:
// - status: the new status to set for this order
// - tracking_number: the courier/shipping tracking number (if applicable)
// - cancellation_reason: required whenever status is "cancelled" — its
//   exact text is included in the customer's cancellation notification
// - refund_method / refund_transaction_reference: ONLY required when
//   status is "cancelled" AND the order's payment.method is "qr".
//   refund_method is always "manual" in that case (no live gateway
//   exists to refund automatically); refund_transaction_reference is
//   mandatory and the backend 400s without it. For payment.method
//   "stripe", omit both entirely — refund stays fully automatic,
//   exactly as before.
//
// UPDATED (Sep 2026, API 63 backend fix) — several new restrictions
// the frontend now needs to respect when building the status dropdown
// (see AdminOrderDetail.jsx's getSelectableStatusOptions):
// 1) "confirmed" now also requires payment.status "paid" (previously
//    only enforced starting from "shipped").
// 2) Once payment.status is "paid", status can never move back to
//    "pending_payment" — blocked outright.
// 3) Once payment.status is "refunded" or "rejected", NO further
//    status change is allowed via this endpoint at all — only the
//    Reinstate endpoint (reinstateOrder() below) can reopen it.
// 4) The status sequence is now strictly forward-only: pending_payment
//    → confirmed → shipped → out_for_delivery → delivered. Any
//    backward move within that sequence is rejected, even if paid.
// 5) When status is "shipped" with a tracking_number in the same
//    request, the customer's notification now includes it.
// 6) The unpaid-order error message now starts with "Please approve
//    payment first." — returned under an "error" key, not "message".
export const updateOrderStatus = (orderNumber, data, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/orders/${orderNumber}/status/`,
    data,
    { signal },
  );
};

// ----------------------------
// API 63.1 - Reinstate a cancelled order (Admin only)
// ----------------------------
// Reverses a cancelled order back to "pending_payment" so the customer
// can pay for it again. Clears the old payment record on the backend
// (status back to "pending", stripe_payment_intent_id, paid_at, and
// refunded_at all reset) so a fresh Stripe PaymentIntent can be
// created next time the customer pays, and sends the customer a
// notification that the order has been reinstated. No request body.
//
// Only a "cancelled" order can be reinstated — the backend 400s with
// { "error": "Only a cancelled order can be reinstated." } otherwise.
// This is the ONLY way to move an order forward again once its
// payment has ended up "refunded" or "rejected", since
// updateOrderStatus() above now refuses any further change in that
// case. After reinstating, the customer pays again via the normal Pay
// Now flow — call createPaymentIntent() (payments.api.js) with this
// same order_number.
export const reinstateOrder = (orderNumber, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/orders/${orderNumber}/reinstate/`,
    undefined,
    { signal },
  );
};

// ----------------------------
// API - Request a return for a delivered order
// ----------------------------
// Allows the customer to request a return for an order that has
// already been delivered. The "data" payload is expected to include:
// - reason: why the customer wants to return the order/item
export const requestReturn = (orderNumber, data, signal) => {
  return axiosInstance.post(`/api/v1/orders/${orderNumber}/return/`, data, {
    signal,
  });
};
