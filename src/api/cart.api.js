// ============================================================
// CART API MODULE
// ============================================================
// This file contains ALL API calls related to the Cart module.
// These endpoints handle everything needed to manage a customer's
// shopping cart — viewing it, adding/removing items, updating
// quantities, clearing it, and applying/removing discount coupons.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.
// After most of these mutations succeed, the cart should typically
// be re-synced with Redux (via the syncCart action) so the UI
// reflects the latest backend state.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API- Get the full cart data
// ----------------------------
// Fetches everything about the logged-in user's cart: the list of
// items, subtotal (before discount), discount amount, final total,
// and any applied coupon. Typically called when the cart page loads.
export const getCart = (signal) => {
  return axiosInstance.get("/api/v1/cart/", { signal });
};

// ----------------------------
// API  - Add a product to the cart (or increase its quantity)
// ----------------------------
// Used when the customer clicks "Add to Cart" on a product card or
// product detail page. The "data" payload is expected to contain:
// - product_id: which product to add
// - quantity: how many units to add
// If the product is already in the cart, the backend should increase
// its existing quantity rather than creating a duplicate entry.
export const addToCart = (data, signal) => {
  return axiosInstance.post("/api/v1/cart/add/", data, { signal });
};

// ----------------------------
// API - Update the quantity of a specific cart item
// ----------------------------
// Used when the customer changes an item's quantity on the cart page
// (e.g. using + / - buttons or a quantity input).
// "itemId" identifies which specific cart item to update.
// IMPORTANT BEHAVIOR: if "quantity" is sent as 0, the backend will
// treat this as a removal request and delete the item from the cart
// entirely, instead of leaving a cart item with zero quantity.
export const updateCartItem = (itemId, data, signal) => {
  return axiosInstance.put(`/api/v1/cart/update/${itemId}/`, data, { signal });
};

// ----------------------------
// API  - Remove a single item from the cart
// ----------------------------
// Used when the customer clicks the trash/delete icon next to a
// specific cart item, explicitly removing it from the cart —
// regardless of its quantity.
export const removeCartItem = (itemId, signal) => {
  return axiosInstance.delete(`/api/v1/cart/remove/${itemId}/`, { signal });
};

// ----------------------------
// API  - Clear the entire cart at once
// ----------------------------
// Removes ALL items from the cart in a single request. Typically
// called either after a successful checkout (since items are now
// purchased), or if there's a "Clear Cart" button for the user to
// empty their cart manually.
export const clearCart = (signal) => {
  return axiosInstance.delete("/api/v1/cart/clear/", { signal });
};

// ----------------------------
// API  - Apply a coupon/discount code to the cart
// ----------------------------
// Used when the customer enters a coupon code at checkout/cart page
// and clicks "Apply". The "data" payload is expected to contain:
// - code: the actual coupon code string entered by the customer
// The backend validates the code and, if valid, applies the discount
// to the cart's total.
export const applyCoupon = (data, signal) => {
  return axiosInstance.post("/api/v1/cart/apply-coupon/", data, { signal });
};

// ----------------------------
// API - Remove the currently applied coupon
// ----------------------------
// Used when the customer wants to remove a coupon they previously
// applied (e.g. clicking an "X" next to the applied coupon badge).
// This resets the cart's discount back to zero.
export const removeCoupon = (signal) => {
  return axiosInstance.delete("/api/v1/cart/remove-coupon/", { signal });
};
