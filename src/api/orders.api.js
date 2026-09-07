// ============================================================
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
// BUG FIXED: this used to take no arguments at all, so every click on
// a different page number silently re-requested the exact same
// (unpaginated) response — the admin always saw the same first page
// of orders no matter which page they clicked. The backend's own
// documented example response for this endpoint already includes a
// working "next": ".../admin/orders/?page=2" link, confirming `page`
// was supported all along — it just was never actually being sent.
// Now forwards `page` (and `ordering`, now confirmed working) exactly
// like every other list endpoint in this file.
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
// - search: search by customer name, order number, AND phone number
//   (phone matching is now confirmed working server-side — see the
//   backend fix notes in OrderManagement.jsx)
// - customer_id: added by the backend team specifically so we
//   can show one customer's own order history (see getCustomerOrders
//   below). Returns only orders placed by that exact customer.
// - ordering: now confirmed working — e.g. "-created_at", "created_at",
//   "-total_amount", "total_amount"
// - page: which page of results to fetch (for pagination)
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
// `params` can additionally include status / search / page — all of
// which combine correctly with customer_id on the backend, e.g.:
//   getCustomerOrders(20, { status: "delivered", page: 2 })
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
export const updateOrderStatus = (orderNumber, data, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/orders/${orderNumber}/status/`,
    data,
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
