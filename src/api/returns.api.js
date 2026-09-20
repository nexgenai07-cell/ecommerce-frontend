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

// ----------------------------
// API 67.1 - Approve or reject multiple return requests in one request (Admin only)
// ----------------------------
// Decides several return requests in a single call, all with the same
// status. Replaces the old pattern of calling updateReturnStatus() once
// per selected row — each return in the batch still goes through the
// exact same rule as updateReturnStatus() (only a return that has not
// been decided yet can be updated), independently of the others, so a
// return that was already decided never blocks the rest of the batch.
//
// ids — a non-empty array of return ids, maximum 100 per call. A
// selection larger than 100 rows must be split into batches of 100
// and sent as separate calls (see chunkArray in utils/chunkArray.js).
// status — the decision to apply to every selected return, either
// "approved" or "rejected".
//
// The response is always 200 OK for a well-formed request, even if
// some returns could not be decided, so the result must be read from
// the response body rather than the HTTP status:
//   updated_ids — return ids that were decided successfully
//   missing_ids — return ids that no longer exist, or are stale in the
//                 current selection; these should be dropped from the
//                 table and the selection quietly, without an error
//   failed      — returns that exist but could not be decided (most
//                 commonly one that was already approved or rejected);
//                 each entry is { id, error }
//   message     — a ready-made summary sentence, suitable for a toast
//   results     — one small object per decided return, e.g. its new
//                 status
//
// A 400 response means the request itself was invalid (empty ids,
// invalid ids, more than 100 ids, or an invalid status) and nothing
// was processed.
export const bulkUpdateReturnStatus = (ids, status, signal) => {
  return axiosInstance.post(
    "/api/v1/admin/returns/bulk-status/",
    { ids, status },
    { signal },
  );
};
