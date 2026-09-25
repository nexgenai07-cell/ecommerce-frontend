// // COMPLAINTS API MODULE
// // ============================================================
// // This file contains ALL API calls related to the Complaints module.
// // It covers endpoints needed by BOTH customers (submitting a
// // complaint, viewing their own complaints, replying) AND admins
// // (viewing all complaints, updating status, replying). A complaint is
// // a running message thread between the customer and any admin —
// // there is no longer a single admin "response" field; see
// // getComplaintMessages()/postComplaintMessage() below.
// //
// // These functions are designed to be used as query/mutation functions
// // inside TanStack Query (React Query) hooks throughout the app.

// import axiosInstance from "../lib/axiosInstance";
// // Importing the pre-configured Axios instance, which automatically
// // attaches the base URL, auth token, and handles 401 errors globally.

// // ----------------------------
// // API - Submit a new complaint
// // ----------------------------
// // Used when a customer wants to raise a complaint about something
// // (an order, payment, product, or delivery issue).

// export const submitComplaint = (data, signal) => {
//   // No file attached — send plain JSON, simplest case, no need for FormData overhead
//   if (!data.attachment) {
//     const { attachment, ...jsonPayload } = data;
//     return axiosInstance.post("/api/v1/complaints/", jsonPayload, { signal });
//   }

//   // File attached — must send as multipart/form-data
//   const formData = new FormData();
//   formData.append("type", data.type);
//   if (data.order) formData.append("order", data.order);
//   formData.append("message", data.message);
//   formData.append("priority", data.priority);
//   formData.append("attachment", data.attachment);

//   // IMPORTANT: axiosInstance has a default "Content-Type: application/json"
//   // header set at the instance level (see lib/axiosInstance.js). Axios only
//   // auto-detects FormData and generates the correct multipart boundary when
//   // NO Content-Type has already been set — since one IS already set here
//   // (at the instance level), we must explicitly clear it for this request by
//   // setting it to `undefined`. That lets axios/browser take over and attach
//   // the correct "multipart/form-data; boundary=..." header automatically.
//   // Do NOT hardcode "multipart/form-data" yourself — without the boundary
//   // parameter the backend can't parse the body and will silently fall back
//   // to default field values (or, as seen here, reject the file entirely).
//   return axiosInstance.post("/api/v1/complaints/", formData, {
//     signal,
//     headers: { "Content-Type": undefined },
//   });
// };

// // ----------------------------
// // API - Get the list of complaints
// // ----------------------------
// // Fetches complaints, but the actual data returned DEPENDS on WHO
// // is calling this — a customer will only get THEIR OWN complaints,
// // while an admin will get ALL complaints from every customer.
// // This role-based filtering is handled on the backend based on the
// // authenticated user's token/role.
// //
// // CONFIRMED WORKING SERVER-SIDE (as of the backend's latest fix):
// //   - status   -> filters by the complaint's status field
// //   - search   -> matches complaint reference number and/or message text
// //   - priority -> filters by "normal"/"urgent", combines correctly
// //                 with status and search in the same request
// //   - page     -> standard pagination
// // These previously did not filter at all (every request silently
// // returned the same unfiltered page) — this is now fixed.
// export const getComplaints = (params, signal) => {
//   return axiosInstance.get("/api/v1/complaints/", { signal, params });
// };

// // ----------------------------
// // API 72.2 - Get the logged-in customer's open complaints count ★ NEW
// // ----------------------------
// // Returns how many of the caller's OWN complaints are not yet
// // resolved/closed (status "open" or "in_progress"). An admin calling
// // this instead gets the count across every customer, not just their
// // own — same endpoint, role-based response, same pattern getComplaints()
// // above already uses.
// //
// // Replaces the previously hardcoded, non-functional "Active Status
// // Notice" block on the customer Support/Complaints page (static
// // "1 open complaint" text, static "Order #N/A", non-functional View
// // Status button) with a single real number — see
// // ActiveComplaintBanner.jsx.
// //
// // Response (200 OK): { count: number }
// export const getOpenComplaintsCount = (signal) => {
//   return axiosInstance.get("/api/v1/complaints/open-count/", { signal });
// };

// // ----------------------------
// // API - Get full details of a specific complaint
// // ----------------------------
// // Fetches everything about one specific complaint, identified by
// // its ID — including the original complaint message AND any admin
// // response that has been added. Used on a complaint detail page,
// // for both customers (to see if there's a reply) and admins
// // (to review before responding).
// export const getComplaintDetail = (id, signal) => {
//   return axiosInstance.get(`/api/v1/complaints/${id}/`, { signal });
//   // Template literal inserts the "id" directly into the URL path
// };

// // ----------------------------
// // API  - Update a complaint's status (Admin only)
// // ----------------------------
// // Allows admins to move a complaint forward in its lifecycle.
// // The "data" payload is expected to include:
// // - status: the new status to set, one of: "open", "in_progress",
// //   "resolved", or "closed" (matching the COMPLAINT_STATUS constants)
// export const updateComplaintStatus = (id, data, signal) => {
//   return axiosInstance.put(`/api/v1/admin/complaints/${id}/status/`, data, {
//     signal,
//   });
// };

// // ----------------------------
// // API 71.1 - Update the status of multiple complaints in one request (Admin only)
// // ----------------------------
// // Moves several complaints to the same target status in a single call.
// // Replaces the old pattern of calling updateComplaintStatus() once per
// // selected row — each complaint in the batch still follows the exact
// // same fixed workflow as updateComplaintStatus() (open -> in_progress
// // -> resolved -> closed, or back to open; closed is final),
// // independently of the others, so one complaint failing never blocks
// // the rest of the batch. Setting a complaint to the status it already
// // has is accepted without error.
// //
// // ids — a non-empty array of complaint ids, maximum 100 per call. A
// // selection larger than 100 rows must be split into batches of 100
// // and sent as separate calls (see chunkArray in utils/chunkArray.js).
// // status — the target status to apply to every selected complaint,
// // one of: "open", "in_progress", "resolved", "closed".
// //
// // The response is always 200 OK for a well-formed request, even if
// // some complaints could not be updated, so the result must be read
// // from the response body rather than the HTTP status:
// //   updated_ids — complaint ids that were updated successfully
// //   missing_ids — complaint ids that no longer exist, or are stale in
// //                 the current selection; these should be dropped from
// //                 the table and the selection quietly, without an error
// //   failed      — complaints that exist but could not make the
// //                 requested move (for example a still-"open" complaint
// //                 being sent straight to "resolved", or a "closed"
// //                 complaint); each entry is { id, error }
// //   message     — a ready-made summary sentence, suitable for a toast
// //   results     — one small object per updated complaint, e.g. its new
// //                 status
// //
// // A 400 response means the request itself was invalid (empty ids,
// // invalid ids, more than 100 ids, or an invalid status) and nothing
// // was processed.
// export const bulkUpdateComplaintStatus = (ids, status, signal) => {
//   return axiosInstance.post(
//     "/api/v1/admin/complaints/bulk-status/",
//     { ids, status },
//     { signal },
//   );
// };

// // ----------------------------
// // API - Get a complaint's full message thread
// // ----------------------------
// // Replaces the old single admin "response" field entirely — a
// // complaint is now a running back-and-forth thread between the
// // customer and any admin, in chronological order.
// //
// // Response shape (API 72.1, Complaint Messages Thread — Corrected):
// // { results: [ { id, complaint, sender, sender_name, sender_role,
// // message, created_at } ] }
// // "sender" is the numeric id of whoever posted the message — it is
// // NOT the role string. "sender_role" ("customer" | "admin") is what
// // decides which side of the chat a message belongs to, and
// // "sender_name" is the display name of that specific sender.
// export const getComplaintMessages = (id, signal) => {
//   return axiosInstance.get(`/api/v1/complaints/${id}/messages/`, { signal });
// };

// // ----------------------------
// // API - Post a new message on a complaint's thread
// // ----------------------------
// // Allowed for the complaint's own customer OR any admin — the backend
// // figures out which side is posting from the auth token, so "sender"
// // is never sent from here. The "data" payload is just:
// // - message: the text of this reply
// //
// // IMPORTANT: posting a message NEVER changes the complaint's status,
// // in either direction — status only ever changes via the separate
// // updateComplaintStatus() call below, and only an admin can call that.
// // Each new message also triggers exactly one notification to the
// // OTHER party (reference_type: "complaint"), handled entirely
// // server-side — nothing extra to do here for that.
// export const postComplaintMessage = (id, data, signal) => {
//   return axiosInstance.post(`/api/v1/complaints/${id}/messages/`, data, {
//     signal,
//   });
// };

// // ----------------------------
// // Helper — build the correct ws:// or wss:// base URL
// // ----------------------------
// // Same conversion chat.api.js already uses for its own sockets — the
// // REST base URL's scheme is swapped from http(s) to ws(s), everything
// // else about it stays the same.
// const getWebSocketBaseUrl = () => {
//   const restBaseUrl = import.meta.env.VITE_API_BASE_URL;
//   return restBaseUrl.replace(/^http/, "ws");
// };

// // ----------------------------
// // WebSocket Connection - Live complaint chat updates
// // ----------------------------
// // Both the complaint's owning customer and any admin viewing it join
// // the same socket, identified by the complaint's id. The backend
// // authenticates the connection from the JWT access token passed as a
// // query parameter (there's no other way to attach an Authorization
// // header to a native WebSocket handshake), and closes the connection
// // with 4401 if that token is missing/invalid/expired, or 4403 if the
// // requester isn't allowed to view this particular complaint.
// //
// // This only delivers messages sent AFTER the socket connects — the
// // existing thread history still has to be loaded separately via
// // getComplaintMessages() above when the chat screen first opens.
// export const createComplaintWebSocket = (complaintId, token) => {
//   const wsUrl = `${getWebSocketBaseUrl()}/ws/complaints/${complaintId}/?token=${token}`;
//   return new WebSocket(wsUrl);
// };
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
// API 72.2 - Get the logged-in customer's open complaints count ★ NEW
// ----------------------------
// Returns how many of the caller's OWN complaints are not yet
// resolved/closed (status "open" or "in_progress"). An admin calling
// this instead gets the count across every customer, not just their
// own — same endpoint, role-based response, same pattern getComplaints()
// above already uses.
//
// Replaces the previously hardcoded, non-functional "Active Status
// Notice" block on the customer Support/Complaints page (static
// "1 open complaint" text, static "Order #N/A", non-functional View
// Status button) with a single real number — see
// ActiveComplaintBanner.jsx.
//
// Response (200 OK): { count: number }
export const getOpenComplaintsCount = (signal) => {
  return axiosInstance.get("/api/v1/complaints/open-count/", { signal });
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
// API 71.1 - Update the status of multiple complaints in one request (Admin only)
// ----------------------------
// Moves several complaints to the same target status in a single call.
// Replaces the old pattern of calling updateComplaintStatus() once per
// selected row — each complaint in the batch still follows the exact
// same fixed workflow as updateComplaintStatus() (open -> in_progress
// -> resolved -> closed, or back to open; closed is final),
// independently of the others, so one complaint failing never blocks
// the rest of the batch. Setting a complaint to the status it already
// has is accepted without error.
//
// ids — a non-empty array of complaint ids, maximum 100 per call. A
// selection larger than 100 rows must be split into batches of 100
// and sent as separate calls (see chunkArray in utils/chunkArray.js).
// status — the target status to apply to every selected complaint,
// one of: "open", "in_progress", "resolved", "closed".
//
// The response is always 200 OK for a well-formed request, even if
// some complaints could not be updated, so the result must be read
// from the response body rather than the HTTP status:
//   updated_ids — complaint ids that were updated successfully
//   missing_ids — complaint ids that no longer exist, or are stale in
//                 the current selection; these should be dropped from
//                 the table and the selection quietly, without an error
//   failed      — complaints that exist but could not make the
//                 requested move (for example a still-"open" complaint
//                 being sent straight to "resolved", or a "closed"
//                 complaint); each entry is { id, error }
//   message     — a ready-made summary sentence, suitable for a toast
//   results     — one small object per updated complaint, e.g. its new
//                 status
//
// A 400 response means the request itself was invalid (empty ids,
// invalid ids, more than 100 ids, or an invalid status) and nothing
// was processed.
export const bulkUpdateComplaintStatus = (ids, status, signal) => {
  return axiosInstance.post(
    "/api/v1/admin/complaints/bulk-status/",
    { ids, status },
    { signal },
  );
};

// ----------------------------
// API - Get a complaint's full message thread
// ----------------------------
// Replaces the old single admin "response" field entirely — a
// complaint is now a running back-and-forth thread between the
// customer and any admin, in chronological order.
//
// Response shape (API 72.1, Complaint Messages Thread — Corrected):
// { results: [ { id, complaint, sender, sender_name, sender_role,
// message, created_at } ] }
// "sender" is the numeric id of whoever posted the message — it is
// NOT the role string. "sender_role" ("customer" | "admin") is what
// decides which side of the chat a message belongs to, and
// "sender_name" is the display name of that specific sender.
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

// ----------------------------
// Helper — build the correct ws:// or wss:// base URL
// ----------------------------
// Same conversion chat.api.js already uses for its own sockets — the
// REST base URL's scheme is swapped from http(s) to ws(s), everything
// else about it stays the same.
const getWebSocketBaseUrl = () => {
  const restBaseUrl = import.meta.env.VITE_API_BASE_URL;
  // Strip any trailing slash(es) from the configured base URL first, so that
  // appending "/ws/..." below can never produce a double slash (e.g. ".pro//ws").
  // A double slash breaks the backend's Nginx path matching and causes the
  // WebSocket handshake to fail silently (close code 1006) on live/VPS.
  const cleanRestBaseUrl = restBaseUrl.replace(/\/+$/, "");
  return cleanRestBaseUrl.replace(/^http/, "ws");
};

// ----------------------------
// WebSocket Connection - Live complaint chat updates
// ----------------------------
// Both the complaint's owning customer and any admin viewing it join
// the same socket, identified by the complaint's id. The backend
// authenticates the connection from the JWT access token passed as a
// query parameter (there's no other way to attach an Authorization
// header to a native WebSocket handshake), and closes the connection
// with 4401 if that token is missing/invalid/expired, or 4403 if the
// requester isn't allowed to view this particular complaint.
//
// This only delivers messages sent AFTER the socket connects — the
// existing thread history still has to be loaded separately via
// getComplaintMessages() above when the chat screen first opens.
export const createComplaintWebSocket = (complaintId, token) => {
  const wsUrl = `${getWebSocketBaseUrl()}/ws/complaints/${complaintId}/?token=${token}`;
  return new WebSocket(wsUrl);
};
