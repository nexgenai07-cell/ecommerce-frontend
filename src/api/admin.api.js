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
// API  - Get the admin's own store profile information
// ----------------------------
// Fetches the current store's profile details — things like the
// store's name, logo, contact phone number, and address. Used to
// display/pre-fill the store settings page in the admin panel.
export const getMyStore = () => {
  return axiosInstance.get("/api/v1/stores/me/");
};

// ----------------------------
// API  - Update the admin's store information
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
// API  - Get the platform's audit logs (Admin only)
// FIXED — same bug pattern found and fixed in returns.api.js,
// complaints.api.js, and discounts.api.js: this took no arguments
// before, making filtering impossible. API 55's docs don't document
// any query params either, but that hasn't reliably meant "backend
// rejects extra params" anywhere else in this project.
export const getAuditLogs = (params) => {
  return axiosInstance.get("/api/v1/admin/audit-logs/", { params });
};
