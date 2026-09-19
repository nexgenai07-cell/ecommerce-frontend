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
// API 39 - Get the list of all discount coupons (Admin only)
// ----------------------------
// Fetches discount coupons — EXCEPT any coupon whose internal
// is_delete flag is true, which the backend filters out of this
// response automatically.
//
// The response is ALWAYS the standard paginated shape
// { count, next, previous, results }, even if no params are sent at
// all. The row data itself is unchanged (same fields per coupon), only
// the outer envelope differs from a plain array.
//
// This endpoint accepts real query params:
//   - search    -> matches the coupon code (case-insensitive)
//   - type      -> filters by discount type (matches the "type" field
//                   used when creating/editing a coupon above)
//   - status    -> "active" | "inactive" | "expired" (API 39, Sep 2026
//                   addendum) — three mutually exclusive values derived
//                   server-side from is_active + end_date, NOT a stored
//                   column:
//                     • active   -> is_active: true AND end_date still
//                                   in the future (or no end_date)
//                     • inactive -> is_active: false, regardless of
//                                   end_date (manually turned off)
//                     • expired  -> is_active: true AND end_date has
//                                   already passed
//                   Omitting the param returns every coupon regardless
//                   of status, same as before.
//   - ordering  -> created_at, -created_at, code, -code, value,
//                   -value, end_date, -end_date
//   - page / page_size -> standard pagination
// DiscountManagement sends these directly and reads `.results` /
// `.count` from the response instead of fetching everything and
// filtering/sorting/paginating it in the browser (see
// DiscountManagement.jsx and DiscountFilters.jsx).
export const getDiscounts = (params, signal) => {
  return axiosInstance.get("/api/v1/discounts/", { signal, params });
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
//
// UPDATED (API 40, Sep 2026 addendum) — two date rules enforced here:
//   1. start_date cannot be a date before today (compared by date
//      only — today itself is always allowed, so a same-day coupon is
//      never blocked by time-of-day). Violating this returns
//      (400) { "start_date": ["Start date cannot be in the past."] }.
//   2. A date-only end_date (no explicit time) is treated as valid
//      through 23:59:59.999999 of that day rather than its start — a
//      same-day coupon's end_date is therefore never "before" its
//      start_date purely because both were sent without a time
//      component. An end_date that is genuinely before start_date
//      still returns
//      (400) { "non_field_errors": ["End date must be after start date."] }.
//
// For an hours-only flash-sale coupon, the Create/Edit Coupon form's
// "specific time" toggle (DiscountFormModal.jsx) stitches an explicit
// time onto both dates before sending them here — e.g.
// "2026-09-19T10:00:00" / "2026-09-19T18:00:00" — and the backend
// respects that exact end time instead of stretching it to end-of-day.
export const createDiscount = (data, signal) => {
  return axiosInstance.post("/api/v1/discounts/", data, { signal });
};

// ----------------------------
// API 40.1 - Check whether a coupon code is already taken (Admin only)
// ----------------------------
// Used by the Create/Edit Discount form to show an inline "already
// exists" error the moment the admin leaves the Coupon Code field,
// instead of only finding out after Submit. excludeId is passed only
// in edit mode, so a coupon doesn't get flagged as a duplicate of
// itself. Response shape (confirmed with backend): { exists: boolean }
export const checkDiscountCodeExists = (code, excludeId, signal) => {
  return axiosInstance.get("/api/v1/discounts/check-code/", {
    signal,
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
export const getDiscountById = (id, signal) => {
  return axiosInstance.get(`/api/v1/discounts/${id}/`, { signal });
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
//
// UPDATED (API 42, Sep 2026 addendum): the same two date rules
// documented above on createDiscount now apply here as well. The
// past-date check on start_date is only meaningful when start_date is
// actually being changed to a new value — a coupon that already had an
// old start_date before this rule existed is not retroactively broken
// just because one of its other fields (e.g. is_active) is being
// edited.
export const updateDiscount = (id, data, signal) => {
  return axiosInstance.put(`/api/v1/discounts/${id}/`, data, { signal });
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
export const deleteDiscount = (id, signal) => {
  return axiosInstance.delete(`/api/v1/discounts/${id}/`, { signal });
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
export const validateCoupon = (data, signal) => {
  return axiosInstance.post("/api/v1/discounts/validate/", data, { signal });
};
