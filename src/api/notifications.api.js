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
// API 59 - Get all notifications for the logged-in user
// ----------------------------
// Fetches the full list of notifications belonging to whichever
// user is currently logged in. Used in TWO places:
// 1. The bell icon dropdown in the navbar (showing recent notifications)
// 2. A dedicated "Notifications" page showing the complete history
export const getNotifications = () => {
  return axiosInstance.get("/api/v1/notifications/");
};

// ----------------------------
// API 60 - Get full details of a specific notification
// ----------------------------
// Fetches everything about one specific notification, identified
// by its ID — likely including the full message, type, timestamp,
// and read/unread status. Used when a user clicks on a notification
// to view its complete content.
export const getNotificationDetail = (id) => {
  return axiosInstance.get(`/api/v1/notifications/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API 61 - Mark a notification as read
// ----------------------------
// Updates a specific notification's status to "read". This is
// typically called AUTOMATICALLY in the background the moment a
// user opens/clicks on a notification — so the unread badge count
// decreases without the user having to do anything extra.
export const markNotificationRead = (id) => {
  return axiosInstance.put(`/api/v1/notifications/${id}/read/`);
  // No "data" argument passed since marking as read doesn't require
  // sending a request body — the notification ID in the URL is enough
};

// ----------------------------
// API 62 - Send a notification to a user or broadcast to everyone (Admin only)
// ----------------------------
// Allows admins to manually send a notification. The "data" payload
// is expected to include:
// - user: the specific user to send the notification to
// - title: the notification's title/heading
// - message: the actual notification content
// - type: what kind of notification this is (e.g. info, warning, promo)
// - sent_via: the delivery channel (e.g. in-app, email, SMS, WhatsApp)
//
// IMPORTANT BEHAVIOR: if "user" is sent as null, the backend treats
// this as a BROADCAST — meaning the notification gets sent to
// EVERY user in the system, not just one specific person.
export const sendNotification = (data) => {
  return axiosInstance.post("/api/v1/notifications/send/", data);
};
