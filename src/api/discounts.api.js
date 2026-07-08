// ============================================================
// DISCOUNTS API MODULE
// ============================================================
// This file contains ALL API calls related to the Discounts module.
// It covers full CRUD (Create, Read, Update, Delete) operations for
// admins managing discount coupons, PLUS a customer-facing endpoint
// to validate a coupon code before it's actually applied to an order.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 26 - Get the list of all discount coupons (Admin only)
// ----------------------------
// Fetches every discount coupon that currently exists in the system,
// whether active or expired. Used on the admin's "Discounts"
// management page.
export const getDiscounts = () => {
  return axiosInstance.get("/api/v1/discounts/");
};

// ----------------------------
// API 27 - Create a new discount coupon (Admin only)
// ----------------------------
// Allows an admin to create a brand new coupon. The "data" payload
// is expected to include:
// - code: the actual coupon code customers will type in (e.g. "SAVE20")
// - type: what kind of discount this is (e.g. percentage or fixed amount)
// - value: the discount amount/percentage itself
// - min_order_amount: the minimum order total required to use this coupon
// - start_date / end_date: the date range during which this coupon is valid
// - is_active: whether this coupon is currently enabled or disabled
export const createDiscount = (data) => {
  return axiosInstance.post("/api/v1/discounts/", data);
};

// ----------------------------
// API 28 - Get full details of a specific coupon (Admin only)
// ----------------------------
// Fetches everything about one specific coupon, identified by its
// ID. This is mainly used to PRE-FILL the edit form when an admin
// clicks "Edit" on a coupon — so the form already shows the
// existing values instead of being blank.
export const getDiscountById = (id) => {
  return axiosInstance.get(`/api/v1/discounts/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API 29 - Update an existing coupon (Admin only)
// ----------------------------
// Allows an admin to edit/update a coupon's details, identified by
// its ID. Sends the updated fields as "data" (same shape as
// createDiscount's payload above).
export const updateDiscount = (id, data) => {
  return axiosInstance.put(`/api/v1/discounts/${id}/`, data);
};

// ----------------------------
// API 30 - Permanently delete a coupon (Admin only)
// ----------------------------
// Removes a discount coupon entirely from the system. The comment
// notes this is a PERMANENT delete (not a soft delete), unlike
// some other delete operations in this project — so once deleted,
// the coupon record is gone for good.
export const deleteDiscount = (id) => {
  return axiosInstance.delete(`/api/v1/discounts/${id}/`);
};

// ----------------------------
// API 31 - Validate a coupon code (Customer-facing)
// ----------------------------
// Used at checkout when a customer types a coupon code into an
// input box and clicks "Apply" — this checks WHETHER the code is
// valid BEFORE actually applying it to the order. The "data"
// payload is expected to include:
// - code: the coupon code the customer entered
// - order_amount: the customer's current order total, so the
//   backend can verify it meets the coupon's min_order_amount
//   requirement (if any)
//
// This is a separate, lighter-weight endpoint from the cart's
// "apply-coupon" API — this one is purely for VALIDATION/checking,
// while the cart API actually applies the discount to the cart.
export const validateCoupon = (data) => {
  return axiosInstance.post("/api/v1/discounts/validate/", data);
};
