// ============================================================
// RETURNS API MODULE
// ============================================================
// This file contains ALL API calls related to the Returns module.
// It covers endpoints needed by BOTH customers (viewing their own
// return requests) AND admins (viewing all returns and deciding
// whether to approve or reject them).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 51 - Get the list of return requests
// ----------------------------
// Fetches return requests, but the actual data returned DEPENDS on
// WHO is calling this — a customer will only get THEIR OWN return
// requests, while an admin will get ALL return requests across the
// entire store. This role-based filtering is handled on the backend
// based on the authenticated user's token/role.
export const getReturns = () => {
  return axiosInstance.get("/api/v1/returns/");
};

// ----------------------------
// API 52 - Get full details of a specific return request
// ----------------------------
// Fetches everything about one specific return request, identified
// by its ID — likely including the related order, reason for return,
// current status, and any admin notes. Used on a return detail page,
// for both customers (to check status) and admins (to review before
// approving/rejecting).
export const getReturnDetail = (id) => {
  return axiosInstance.get(`/api/v1/returns/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API 53 - Approve or reject a return request (Admin only)
// ----------------------------
// Allows admins to make a decision on a pending return request.
// The "data" payload is expected to include:
// - status: the decision being made, either "approved" or "rejected"
// Note: this uses a separate "/admin/returns/" URL path (different
// from the customer-facing "/returns/" used in the GET endpoints above),
// clearly separating admin-only actions from general read access.
export const updateReturnStatus = (id, data) => {
  return axiosInstance.put(`/api/v1/admin/returns/${id}/status/`, data);
};
