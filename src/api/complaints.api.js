// ============================================================
// COMPLAINTS API MODULE
// ============================================================
// This file contains ALL API calls related to the Complaints module.
// It covers endpoints needed by BOTH customers (submitting a
// complaint, viewing their own complaints, replying) AND admins
// (viewing all complaints, updating status, replying). A complaint is
// a running message thread between the customer and any admin —
// there is no longer a single admin "response" field; see
// getComplaintMessages()/postComplaintMessage() below.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API - Submit a new complaint
// ----------------------------
// Used when a customer wants to raise a complaint about something
// (an order, payment, product, or delivery issue).

export const submitComplaint = (data, signal) => {
  // No file attached — send plain JSON, simplest case, no need for FormData overhead
  if (!data.attachment) {
    const { attachment, ...jsonPayload } = data;
    return axiosInstance.post("/api/v1/complaints/", jsonPayload, { signal });
  }

  // File attached — must send as multipart/form-data
  const formData = new FormData();
  formData.append("type", data.type);
  if (data.order) formData.append("order", data.order);
  formData.append("message", data.message);
  formData.append("priority", data.priority);
  formData.append("attachment", data.attachment);

  // IMPORTANT: axiosInstance has a default "Content-Type: application/json"
  // header set at the instance level (see lib/axiosInstance.js). Axios only
  // auto-detects FormData and generates the correct multipart boundary when
  // NO Content-Type has already been set — since one IS already set here
  // (at the instance level), we must explicitly clear it for this request by
  // setting it to `undefined`. That lets axios/browser take over and attach
  // the correct "multipart/form-data; boundary=..." header automatically.
  // Do NOT hardcode "multipart/form-data" yourself — without the boundary
  // parameter the backend can't parse the body and will silently fall back
  // to default field values (or, as seen here, reject the file entirely).
  return axiosInstance.post("/api/v1/complaints/", formData, {
    signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API - Get the list of complaints
// ----------------------------
// Fetches complaints, but the actual data returned DEPENDS on WHO
// is calling this — a customer will only get THEIR OWN complaints,
// while an admin will get ALL complaints from every customer.
// This role-based filtering is handled on the backend based on the
// authenticated user's token/role.
//
// CONFIRMED WORKING SERVER-SIDE (as of the backend's latest fix):
//   - status   -> filters by the complaint's status field
//   - search   -> matches complaint reference number and/or message text
//   - priority -> filters by "normal"/"urgent", combines correctly
//                 with status and search in the same request
//   - page     -> standard pagination
// These previously did not filter at all (every request silently
// returned the same unfiltered page) — this is now fixed.
export const getComplaints = (params, signal) => {
  return axiosInstance.get("/api/v1/complaints/", { signal, params });
};

// ----------------------------
// API - Get full details of a specific complaint
// ----------------------------
// Fetches everything about one specific complaint, identified by
// its ID — including the original complaint message AND any admin
// response that has been added. Used on a complaint detail page,
// for both customers (to see if there's a reply) and admins
// (to review before responding).
export const getComplaintDetail = (id, signal) => {
  return axiosInstance.get(`/api/v1/complaints/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API  - Update a complaint's status (Admin only)
// ----------------------------
// Allows admins to move a complaint forward in its lifecycle.
// The "data" payload is expected to include:
// - status: the new status to set, one of: "open", "in_progress",
//   "resolved", or "closed" (matching the COMPLAINT_STATUS constants)
export const updateComplaintStatus = (id, data, signal) => {
  return axiosInstance.put(`/api/v1/admin/complaints/${id}/status/`, data, {
    signal,
  });
};

// ----------------------------
// API - Get a complaint's full message thread
// ----------------------------
// Replaces the old single admin "response" field entirely — a
// complaint is now a running back-and-forth thread between the
// customer and any admin, in chronological order. Response shape:
// { results: [ { id, sender: "customer" | "admin", message,
// created_at } ] }
export const getComplaintMessages = (id, signal) => {
  return axiosInstance.get(`/api/v1/complaints/${id}/messages/`, { signal });
};

// ----------------------------
// API - Post a new message on a complaint's thread
// ----------------------------
// Allowed for the complaint's own customer OR any admin — the backend
// figures out which side is posting from the auth token, so "sender"
// is never sent from here. The "data" payload is just:
// - message: the text of this reply
//
// IMPORTANT: posting a message NEVER changes the complaint's status,
// in either direction — status only ever changes via the separate
// updateComplaintStatus() call below, and only an admin can call that.
// Each new message also triggers exactly one notification to the
// OTHER party (reference_type: "complaint"), handled entirely
// server-side — nothing extra to do here for that.
export const postComplaintMessage = (id, data, signal) => {
  return axiosInstance.post(`/api/v1/complaints/${id}/messages/`, data, {
    signal,
  });
};
