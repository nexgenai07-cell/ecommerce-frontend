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
// - shipping_address: where the order should be delivered
// - coupon_code: any discount code applied (if used)
// - notes: any special instructions from the customer
// NOTE: This endpoint no longer accepts a payment_method field —
// all payments now go through Stripe. Immediately after this call
// succeeds, call createPaymentIntent() (payments.api.js, API 69)
// with the returned order_number to start the Stripe payment.
// On success, the cart is cleared server-side automatically, so we
// also clear it from Redux state on the frontend.
export const checkout = (data) => {
  return axiosInstance.post("/api/v1/orders/checkout/", data);
};

// ----------------------------
// API - Get the logged-in customer's own orders
// ----------------------------
// Fetches the full list of orders placed by the currently logged-in
// customer. Used on the "My Orders" page in the customer account section.
export const getMyOrders = () => {
  return axiosInstance.get("/api/v1/orders/");
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
export const getOrderDetail = (orderNumber) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/`);
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
export const cancelOrder = (orderNumber) => {
  return axiosInstance.put(`/api/v1/orders/${orderNumber}/cancel/`);
  // No "data" argument passed since cancelling doesn't require
  // sending a request body — the order number in the URL is enough
};

// ----------------------------
// API - Track an order's status history
// ----------------------------
// Fetches the tracking timeline/history for a specific order
// (e.g. "Order Placed" -> "Confirmed" -> "Shipped" -> "Delivered"),
// identified by its order number. Used on the order tracking page.
export const trackOrder = (orderNumber) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/track/`);
};

// ----------------------------
// API  - Get all orders from all customers (Admin only)
// ----------------------------
// Fetches the complete list of orders across the ENTIRE store
// (not just one customer's orders). Used in the admin panel's
// orders management page.
export const getAdminOrders = () => {
  return axiosInstance.get("/api/v1/admin/orders/");
};

// ----------------------------
// API  - Filter admin orders (Admin only)
// ----------------------------
// Allows admins to narrow down the orders list using various filters.
// The "params" object can include:
// - status: filter by order status (e.g. pending, shipped, delivered)
// - start_date / end_date: filter orders within a date range
// - search: search by customer name, order number, etc.
// - customer_id: NEW — added by the backend team specifically so we
//   can show one customer's own order history (see getCustomerOrders
//   below). Returns only orders placed by that exact customer.
// - page: which page of results to fetch (for pagination)
export const filterAdminOrders = (params) => {
  return axiosInstance.get("/api/v1/admin/orders/filter/", { params });
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
export const getCustomerOrders = (customerId, params = {}) => {
  return filterAdminOrders({ ...params, customer_id: customerId });
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
export const getAdminOrderDetail = (orderNumber) => {
  return axiosInstance.get(`/api/v1/admin/orders/${orderNumber}/`);
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
export const updateOrderStatus = (orderNumber, data) => {
  return axiosInstance.put(`/api/v1/admin/orders/${orderNumber}/status/`, data);
};

// ----------------------------
// API - Request a return for a delivered order
// ----------------------------
// Allows the customer to request a return for an order that has
// already been delivered. The "data" payload is expected to include:
// - reason: why the customer wants to return the order/item
export const requestReturn = (orderNumber, data) => {
  return axiosInstance.post(`/api/v1/orders/${orderNumber}/return/`, data);
};
