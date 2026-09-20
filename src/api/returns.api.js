// ============================================================
// RETURNS API MODULE
// ============================================================
// This file contains ALL API calls related to the Returns module.
// It covers endpoints needed by BOTH customers (viewing their own
// return requests) AND admins (viewing all returns and deciding
// whether to approve or reject them).
//
// A return has exactly three statuses: "pending" (awaiting a decision),
// "approved" and "rejected". Approved and rejected are final — once a
// decision is made it can never be changed.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// Get the list of return requests
// ----------------------------
// A customer receives only their own returns; an admin receives every
// return in the store.
//
// Query params:
// - status: pending, approved or rejected
// - search, ordering, page, page_size
// - start_date / end_date: "YYYY-MM-DD". start_date may equal end_date
//   but can never be later than it; an invalid range or a malformed
//   date is answered with a 400 and an "error" message.
//
// For an admin, every return in the list also carries:
// - can_update_status: true only while the return is pending
// - allowed_statuses: the statuses the admin may set — ["approved",
//   "rejected"] for a pending return and an empty list once decided
// The UI reads these instead of deciding from the status text.
export const getReturns = (params, signal) => {
  return axiosInstance.get("/api/v1/returns/", { signal, params });
};

// ----------------------------
// Get full details of a specific return request
// ----------------------------
// Fetches everything about one specific return request, identified
// by its ID — including the related order, reason for return, current
// status and, for an admin, can_update_status and allowed_statuses.
// Used on a return detail page, for both customers (to check status)
// and admins (to review before approving/rejecting), and to reload a
// return after a decision so its controls reflect the real state.
export const getReturnDetail = (id, signal) => {
  return axiosInstance.get(`/api/v1/returns/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// Approve or reject a return request (Admin only)
// ----------------------------
// Allows admins to make a decision on a pending return request.
// The "data" payload is expected to include:
// - status: the decision being made, either "approved" or "rejected"
//
// Only a pending return can be decided. Deciding a return that was
// already approved or rejected is answered with a 400 and an "error"
// message, so the UI must show that message and reload the return.
// Note: this uses a separate "/admin/returns/" URL path (different
// from the customer-facing "/returns/" used in the GET endpoints above),
// clearly separating admin-only actions from general read access.
export const updateReturnStatus = (id, data, signal) => {
  return axiosInstance.put(`/api/v1/admin/returns/${id}/status/`, data, {
    signal,
  });
};
