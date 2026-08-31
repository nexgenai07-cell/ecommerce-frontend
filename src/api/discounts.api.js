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
// API  - Get the list of all discount coupons (Admin only)
// ----------------------------
// Fetches every discount coupon that currently exists in the system,
// whether active, expired, or manually disabled — EXCEPT any coupon
// whose internal is_delete flag is true, which the backend now
// filters out of this response automatically. Used on the admin's
// "Discounts" management page. Called with NO params from
// DiscountManagement now — all filtering/search/pagination happens
// client-side there instead, since the backend doesn't reliably honor
// query params on this endpoint (confirmed via Network tab: switching
// filters wasn't actually narrowing anything down).
export const getDiscounts = (params) => {
  return axiosInstance.get("/api/v1/discounts/", { params });
};

// ----------------------------
// API - Create a new discount coupon (Admin only)
// ----------------------------
// Allows an admin to create a brand new coupon. The "data" payload
// is expected to include:
// - code: the actual coupon code customers will type in (e.g. "SAVE20")
// - type: what kind of discount this is (e.g. percentage or fixed amount)
// - value: the discount amount/percentage itself
// - min_order_amount: the minimum order total required to use this coupon
// - start_date / end_date: the date range during which this coupon is valid
// - is_active: whether this coupon is currently enabled or disabled.
//   This is a genuine, independent business toggle (a "pause/enable"
//   switch the admin controls directly) — it is NOT related to
//   deletion. A coupon can be is_active: false (paused, still exists,
//   still shows up here) without ever having been deleted.
export const createDiscount = (data) => {
  return axiosInstance.post("/api/v1/discounts/", data);
};

// ----------------------------
// API 40.1 - Check whether a coupon code is already taken (Admin only)
// ----------------------------
// Used by the Create/Edit Discount form to show an inline "already
// exists" error the moment the admin leaves the Coupon Code field,
// instead of only finding out after Submit. excludeId is passed only
// in edit mode, so a coupon doesn't get flagged as a duplicate of
// itself. Response shape (confirmed with backend): { exists: boolean }
export const checkDiscountCodeExists = (code, excludeId) => {
  return axiosInstance.get("/api/v1/discounts/check-code/", {
    params: { code, exclude_id: excludeId },
  });
};

// ----------------------------
// API  - Get full details of a specific coupon (Admin only)
// ----------------------------
// Fetches everything about one specific coupon, identified by its
// ID. This is mainly used to PRE-FILL the edit form when an admin
// clicks "Edit" on a coupon — so the form already shows the
// existing values instead of being blank.
// UPDATED BEHAVIOR: if this coupon's internal is_delete flag is true,
// the backend now returns a plain 404 Not Found here instead of the
// coupon object.
export const getDiscountById = (id) => {
  return axiosInstance.get(`/api/v1/discounts/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API  Update an existing coupon (Admin only)
// ----------------------------
// Allows an admin to edit/update a coupon's details, identified by
// its ID. Sends the updated fields as "data" (same shape as
// createDiscount's payload above). This is also how an admin flips
// is_active back to true on a coupon they had previously paused —
// there is no separate "un-pause" endpoint, it's just a normal edit.
export const updateDiscount = (id, data) => {
  return axiosInstance.put(`/api/v1/discounts/${id}/`, data);
};

// ----------------------------
// API - Delete a coupon (Admin only)
// ----------------------------
// UPDATED BEHAVIOR: this now performs a real SOFT delete on the
// backend — it sets a separate internal is_delete flag to true on
// the coupon's row (the row itself, and any past order that already
// used this code, is fully preserved for audit/analytics purposes).
// That flag is never exposed to the frontend, and every list/detail
// endpoint above filters it out automatically from this point on.
//
// IMPORTANT — this is a DIFFERENT flag from is_active above. Deleting
// a coupon here is final from the UI's point of view: there is no
// restore endpoint for it (unlike is_active, which the admin can
// freely flip back and forth through the normal Update Discount
// call). Once a coupon is deleted via this endpoint, it disappears
// from every list for good — the only way to get an equivalent coupon
// back is to create a brand new one with the same code.
export const deleteDiscount = (id) => {
  return axiosInstance.delete(`/api/v1/discounts/${id}/`);
};

// ----------------------------
// API - Validate a coupon code (Customer-facing)
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
// A soft-deleted coupon (is_delete: true) is treated the same as any
// other invalid code here — the existing "invalid coupon" error
// response covers it, no special handling needed on the frontend.
export const validateCoupon = (data) => {
  return axiosInstance.post("/api/v1/discounts/validate/", data);
};
