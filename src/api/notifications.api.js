// ============================================================
// NOTIFICATIONS API MODULE
// ============================================================
// This file contains ALL API calls related to the Notifications
// module. It covers endpoints needed by BOTH customers (viewing
// their own notifications, marking them as read) AND admins
// (viewing their own notifications and sending notifications to a
// specific user or broadcasting to every customer).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// Get notifications for the logged-in user
// ----------------------------
// Fetches ONE PAGE of the current user's notifications. Used in TWO
// places:
// 1. The bell icon dropdown in the navbar (showing recent notifications)
// 2. A dedicated "Notifications" page showing the complete history
//
// What the list contains depends on the account's role:
// - A customer account sees notifications addressed to it plus
//   broadcast notifications.
// - An admin/staff account sees ONLY notifications addressed to its own
//   account (new orders, returns, complaints, QR payment proofs and the
//   other customer-originated events). Broadcasts, and anything an admin
//   sends to a customer, never appear in an admin's own list.
// Read state is independent per account, so a customer reading a
// notification never changes what an admin sees as read.
//
// Query params (all optional):
//   - page     -> standard pagination
//   - type     -> "order" | "promotion" | "system"
//   - is_read  -> true / false
//
// Response shape:
//   {
//     count, next, previous,
//     unread_count,   <- the account's TOTAL unread count across its
//                         ENTIRE notification history, not just this
//                         page. Used for the "Unread (N)" tab badge and
//                         the page subtitle, since neither can be
//                         computed on the frontend once only one page
//                         is ever loaded at a time.
//     unread_by_type: { order, promotion, system },
//                     <- the same idea as unread_count, broken down per
//                         type across the ENTIRE history. Used so the
//                         Orders/Promotions/System tabs can each show
//                         their own real unread badge.
//     results: [
//       { id, title, message, type, is_read, created_at,
//         reference_type, reference_id, customer_name }
//     ]
//   }
//
// created_at is an ISO 8601 string already expressed in Pakistan local
// time (with the +05:00 offset), so it can be handed straight to
// Date/Intl formatters with no manual timezone adjustment.
//
// customer_name is only populated for admin accounts: the current name
// of the customer the notification is about (resolved from an order,
// return or complaint reference). It is null for customer accounts and
// for notifications with no customer behind them (low stock, reports,
// manual messages and so on).
//
// reference_type ("order" | "return" | "complaint" | null) and
// reference_id (the real order_number / return id / complaint id, as
// a string, or null) let the UI deep-link straight to whatever this
// notification is actually about — see utils/resolveNotificationLink.js
// and utils/resolveAdminNotificationLink.js. Every automatic
// notification (order/return status change, complaint reply) always
// populates both; a general/manual notification may leave them null.
export const getNotifications = (params, signal) => {
  return axiosInstance.get("/api/v1/notifications/", { signal, params });
};

// ----------------------------
// Get full details of a specific notification
// ----------------------------
// Fetches everything about one specific notification, identified
// by its ID — the same shape as one item in getNotifications()'s
// `results` array (reference fields and customer_name included). Used
// when a user clicks on a notification to view its complete content.
// A notification that does not exist, or is not visible to the
// current account (another user's notification, or a broadcast
// requested by an admin), answers with a 404.
export const getNotificationDetail = (id, signal) => {
  return axiosInstance.get(`/api/v1/notifications/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// Mark a notification as read
// ----------------------------
// Updates a specific notification's status to "read". This is
// typically called AUTOMATICALLY in the background the moment a
// user opens/clicks on a notification — so the unread badge count
// decreases without the user having to do anything extra.
// Responds with the updated notification object (customer_name
// included for admin accounts).
export const markNotificationRead = (id, signal) => {
  return axiosInstance.put(`/api/v1/notifications/${id}/read/`, undefined, {
    signal,
  });
  // No "data" argument passed since marking as read doesn't require
  // sending a request body — the notification ID in the URL is enough
};

// ----------------------------
// Mark ALL of the current user's notifications as read
// ----------------------------
// One bulk call instead of a separate request per unread
// notification, so a single click never fires dozens of simultaneous
// requests and a partial failure cannot leave the list half updated.
//
// No request body — applies to the logged-in account's own unread
// notifications only. For an admin account that is exactly the set
// getNotifications() lists for it; broadcasts are never touched.
// Response: { message, updated_count }
export const markAllNotificationsRead = (signal) => {
  return axiosInstance.post("/api/v1/notifications/mark-all-read/", undefined, {
    signal,
  });
};

// ----------------------------
// Send a notification to a user or broadcast to everyone (Admin only)
// ----------------------------
// Allows admins to manually send a notification. The "data" payload
// is expected to include:
// - user: optional — the id of the user to send the notification to.
//   Sent as null (or omitted) the notification is a BROADCAST to every
//   customer account.
// - title: the notification's title/heading (required)
// - message: the actual notification content (required)
// - type: "order" | "promotion" | "system" (defaults to "system")
// - sent_via: the delivery channel — "web" | "email" | "whatsapp" |
//   "in_app" (defaults to "web")
// - reference_type: optional — "order" | "return" | "complaint",
//   lets this manual notification deep-link somewhere too, exactly
//   like the automatic ones do
// - reference_id: optional — the order_number / return id / complaint
//   id this notification refers to
//
// reference_type and reference_id must be sent together, or both left
// out for a general notification; sending only one is rejected with a
// 400.
//
// Channel behaviour:
// - "email" really delivers the notification by email in addition to
//   creating the in-app notification. A targeted notification is emailed
//   to that user; a broadcast is emailed to every active customer that
//   has an email address. Emails are queued in the background and
//   cannot be recalled. The response then carries email_recipients, the
//   number of recipients the email was queued for.
// - "web" and "in_app" only create the in-app notification.
// - "whatsapp" is recorded but not delivered over WhatsApp.
//
// Admin accounts never see the notifications they send in their own
// list; every successful send is recorded in the audit log instead.
//
// Response (201): the created notification, plus email_recipients when
// sent_via is "email".
export const sendNotification = (data, signal) => {
  return axiosInstance.post("/api/v1/notifications/send/", data, { signal });
};
