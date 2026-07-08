// ============================================================
// ADMIN API MODULE
// ============================================================
// This file contains ALL API calls related to general Admin
// management — specifically the store's own profile/settings
// and the system-wide audit log. Both of these are exclusively
// accessible and manageable by admins.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 9 - Get the admin's own store profile information
// ----------------------------
// Fetches the current store's profile details — things like the
// store's name, logo, contact phone number, and address. Used to
// display/pre-fill the store settings page in the admin panel.
export const getMyStore = () => {
  return axiosInstance.get("/api/v1/stores/me/");
};

// ----------------------------
// API 10 - Update the admin's store information
// ----------------------------
// Allows the admin to update their store's profile details. The
// "data" payload is expected to include:
// - name: the store's name
// - logo: the store's logo image file
// - phone: contact phone number
// - address: physical/business address
//
// Since "logo" involves uploading an actual image FILE (not just
// plain text), this request needs to use "multipart/form-data"
// instead of the default JSON content type.
export const updateMyStore = (data) => {
  return axiosInstance.put("/api/v1/stores/me/", data, {
    headers: { "Content-Type": "multipart/form-data" },
    // Overriding the default "application/json" content type
    // (set globally in axiosInstance) specifically for THIS request,
    // since file uploads require "multipart/form-data" instead.
  });
};

// ----------------------------
// API 66 - Get the platform's audit logs (Admin only)
// ----------------------------
// Fetches a log of important actions that have happened across the
// platform — useful for tracking accountability and reviewing system
// history (e.g. who updated an order status, who approved a return,
// who changed store settings, etc.)
//
// IMPORTANT: This endpoint is READ-ONLY. There's no corresponding
// "create", "update", or "delete" function for audit logs, since
// these records should remain permanent and untampered with — they
// exist specifically to provide an unchangeable history of actions
// taken on the platform.
export const getAuditLogs = () => {
  return axiosInstance.get("/api/v1/admin/audit-logs/");
};
