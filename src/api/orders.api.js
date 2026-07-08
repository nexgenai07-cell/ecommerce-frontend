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
// API 52 - Convert the cart into an actual order (Checkout)
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
// API 43 - Get the logged-in customer's own orders
// ----------------------------
// Fetches the full list of orders placed by the currently logged-in
// customer. Used on the "My Orders" page in the customer account section.
export const getMyOrders = () => {
  return axiosInstance.get("/api/v1/orders/");
};

// ----------------------------
// API 44 - Get full details of a specific order
// ----------------------------
// Fetches everything about one specific order, identified by its
// order number — including the items ordered, payment details,
// and shipping information. Used on the order detail page.
export const getOrderDetail = (orderNumber) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/`);
  // Template literal inserts the "orderNumber" directly into the URL path
};

// ----------------------------
// API 45 - Cancel an order
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
// API 46 - Track an order's status history
// ----------------------------
// Fetches the tracking timeline/history for a specific order
// (e.g. "Order Placed" -> "Confirmed" -> "Shipped" -> "Delivered"),
// identified by its order number. Used on the order tracking page.
export const trackOrder = (orderNumber) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/track/`);
};

// ----------------------------
// API 47 - Get all orders from all customers (Admin only)
// ----------------------------
// Fetches the complete list of orders across the ENTIRE store
// (not just one customer's orders). Used in the admin panel's
// orders management page.
export const getAdminOrders = () => {
  return axiosInstance.get("/api/v1/admin/orders/");
};

// ----------------------------
// API 48 - Filter admin orders (Admin only)
// ----------------------------
// Allows admins to narrow down the orders list using various filters.
// The "params" object can include:
// - status: filter by order status (e.g. pending, shipped, delivered)
// - start_date / end_date: filter orders within a date range
// - search: search by customer name, order number, etc.
// - page: which page of results to fetch (for pagination)
export const filterAdminOrders = (params) => {
  return axiosInstance.get("/api/v1/admin/orders/filter/", { params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
};

// ----------------------------
// API 49 - Update an order's status (Admin only)
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
// API 50 - Request a return for a delivered order
// ----------------------------
// Allows the customer to request a return for an order that has
// already been delivered. The "data" payload is expected to include:
// - reason: why the customer wants to return the order/item
export const requestReturn = (orderNumber, data) => {
  return axiosInstance.post(`/api/v1/orders/${orderNumber}/return/`, data);
};
