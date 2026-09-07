// ============================================================
// NOTIFICATIONS API MODULE
// ============================================================
// This file contains ALL API calls related to the Notifications
// module. It covers endpoints needed by BOTH customers (viewing
// their own notifications, marking them as read) AND admins
// (sending notifications to a specific user or broadcasting to
// everyone).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API - Get notifications for the logged-in user
// ----------------------------
// Fetches ONE PAGE of the current user's notifications. Used in TWO
// places:
// 1. The bell icon dropdown in the navbar (showing recent notifications)
// 2. A dedicated "Notifications" page showing the complete history
//
// This endpoint was previously entirely undocumented. Its exact
// contract has now been specified and confirmed implemented:
//
// Query params (all optional):
//   - page     -> standard pagination
//   - type     -> "order" | "promotion" | "system"
//   - is_read  -> true / false
//
// Confirmed response shape:
//   {
//     count, next, previous,
//     unread_count,   <- the customer's TOTAL unread count across
//                         their ENTIRE notification history, not just
//                         this page. Used for the "Unread (N)" tab
//                         badge and the page subtitle, since neither
//                         can be correctly computed on the frontend
//                         once only one page is ever loaded at a time.
//     results: [
//       { id, title, message, type, is_read, created_at,
//         reference_type, reference_id }
//     ]
//   }
//
// reference_type ("order" | "return" | "complaint" | null) and
// reference_id (the real order_number / return id / complaint id, as
// a string, or null) let the UI deep-link straight to whatever this
// notification is actually about — see utils/resolveNotificationLink.js.
// Every automatic notification (order/return status change, complaint
// reply) always populates both; a general/manual notification may
// leave them null.
export const getNotifications = (params, signal) => {
  return axiosInstance.get("/api/v1/notifications/", { signal, params });
};

// ----------------------------
// API  - Get full details of a specific notification
// ----------------------------
// Fetches everything about one specific notification, identified
// by its ID — the same shape as one item in getNotifications()'s
// `results` array (reference_type/reference_id included). Used when a
// user clicks on a notification to view its complete content.
export const getNotificationDetail = (id, signal) => {
  return axiosInstance.get(`/api/v1/notifications/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API  - Mark a notification as read
// ----------------------------
// Updates a specific notification's status to "read". This is
// typically called AUTOMATICALLY in the background the moment a
// user opens/clicks on a notification — so the unread badge count
// decreases without the user having to do anything extra.
export const markNotificationRead = (id, signal) => {
  return axiosInstance.put(`/api/v1/notifications/${id}/read/`, undefined, {
    signal,
  });
  // No "data" argument passed since marking as read doesn't require
  // sending a request body — the notification ID in the URL is enough
};

// ----------------------------
// API — Mark ALL of the current user's notifications as read
// ----------------------------
// NEW ENDPOINT — did not exist before. The "Mark all as read" button
// used to fire one individual markNotificationRead() PUT request PER
// unread notification, all at once (20+ simultaneous requests for one
// click, with no clean way to recover from a partial failure). This
// single bulk endpoint replaces that entirely.
//
// No request body — applies to all of the logged-in user's own
// unread notifications only.
// Response: { marked_count: number }
export const markAllNotificationsRead = (signal) => {
  return axiosInstance.post("/api/v1/notifications/mark-all-read/", undefined, {
    signal,
  });
};

// ----------------------------
// API  - Send a notification to a user or broadcast to everyone (Admin only)
// ----------------------------
// Allows admins to manually send a notification. The "data" payload
// is expected to include:
// - user: the specific user to send the notification to
// - title: the notification's title/heading
// - message: the actual notification content
// - type: what kind of notification this is (e.g. info, warning, promo)
// - sent_via: the delivery channel (e.g. in-app, email, SMS, WhatsApp)
// - reference_type: optional — "order" | "return" | "complaint" | null,
//   lets this manual notification deep-link somewhere too, exactly
//   like the automatic ones do
// - reference_id: optional — the order_number / return id / complaint
//   id this notification refers to, as a string
//
// Both reference fields default to null when omitted entirely — this
// endpoint works exactly as before if the admin doesn't set them.
//
// IMPORTANT BEHAVIOR: if "user" is sent as null, the backend treats
// this as a BROADCAST — meaning the notification gets sent to
// EVERY user in the system, not just one specific person.
export const sendNotification = (data, signal) => {
  return axiosInstance.post("/api/v1/notifications/send/", data, { signal });
};
