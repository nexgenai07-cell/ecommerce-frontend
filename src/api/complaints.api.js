// ============================================================
// COMPLAINTS API MODULE
// ============================================================
// This file contains ALL API calls related to the Complaints module.
// It covers endpoints needed by BOTH customers (submitting a
// complaint, viewing their own complaints) AND admins (viewing all
// complaints, updating their status, and responding to them).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 54 - Submit a new complaint
// ----------------------------
// Used when a customer wants to raise a complaint about something
// (an order, payment, product, or delivery issue).
//
// UPDATED (backend change request applied): the backend now accepts
// two additional real fields — "priority" and "attachment" — instead
// of those being faked in the message text on the frontend.
//
// Because "attachment" is a file, this now sends multipart/form-data
// whenever a file is present, and falls back to plain JSON when it
// isn't (both are supported server-side — see MultiPartParser +
// JSONParser on the backend view).
//
// Expected "data" shape:
// {
//   type: "order" | "payment" | "product" | "delivery" | "other",
//   order: "order_number" (optional),
//   message: "string",
//   priority: "normal" | "urgent",
//   attachment: File | null (optional),
// }
export const submitComplaint = (data) => {
  // No file attached — send plain JSON, simplest case, no need for FormData overhead
  if (!data.attachment) {
    const { attachment, ...jsonPayload } = data;
    return axiosInstance.post("/api/v1/complaints/", jsonPayload);
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
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API 55 - Get the list of complaints
// ----------------------------
// Fetches complaints, but the actual data returned DEPENDS on WHO
// is calling this — a customer will only get THEIR OWN complaints,
// while an admin will get ALL complaints from every customer.
// This role-based filtering is handled on the backend based on the
// authenticated user's token/role.
export const getComplaints = () => {
  return axiosInstance.get("/api/v1/complaints/");
};

// ----------------------------
// API 56 - Get full details of a specific complaint
// ----------------------------
// Fetches everything about one specific complaint, identified by
// its ID — including the original complaint message AND any admin
// response that has been added. Used on a complaint detail page,
// for both customers (to see if there's a reply) and admins
// (to review before responding).
export const getComplaintDetail = (id) => {
  return axiosInstance.get(`/api/v1/complaints/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API 57 - Update a complaint's status (Admin only)
// ----------------------------
// Allows admins to move a complaint forward in its lifecycle.
// The "data" payload is expected to include:
// - status: the new status to set, one of: "open", "in_progress",
//   "resolved", or "closed" (matching the COMPLAINT_STATUS constants)
export const updateComplaintStatus = (id, data) => {
  return axiosInstance.put(`/api/v1/admin/complaints/${id}/status/`, data);
};

// ----------------------------
// API 58 - Respond to a complaint (Admin only)
// ----------------------------
// Allows admins to write and submit a reply/response to a customer's
// complaint. The "data" payload is expected to include:
// - response: the actual text of the admin's reply to the customer
// Note: this is a SEPARATE action from updateComplaintStatus —
// an admin might respond to a complaint without necessarily changing
// its status in the same request, or vice versa.
export const respondToComplaint = (id, data) => {
  return axiosInstance.put(`/api/v1/admin/complaints/${id}/respond/`, data);
};
