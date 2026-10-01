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
// Get the admin's own store profile information
// ----------------------------
// Fetches the current store's profile details — things like the
// store's name, logo, contact phone number, and address. Used to
// display/pre-fill the store settings page in the admin panel.
export const getMyStore = (signal) => {
  return axiosInstance.get("/api/v1/stores/me/", { signal });
};

// ----------------------------
// Update the admin's store information
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
export const updateMyStore = (data, signal) => {
  return axiosInstance.put("/api/v1/stores/me/", data, {
    signal,
    headers: { "Content-Type": "multipart/form-data" },
    // Overriding the default "application/json" content type
    // (set globally in axiosInstance) specifically for THIS request,
    // since file uploads require "multipart/form-data" instead.
  });
};

// ----------------------------
// Get the platform's audit logs (Admin only)
// ----------------------------
// Returns a read-only log of important actions taken across the
// platform, by the AI assistant and by manual admin actions alike.
//
// Supported query params:
//   - page   -> standard pagination
//   - entity -> filters by entity type
//   - user   -> filters by the acting user
//   - search -> matches against the log's action/description text
//   - action -> filters by "create"/"update"/"delete" (a prefix match
//               on the log's action, so "create" also matches
//               "create_product" and "create_notification"); combines
//               correctly with entity/user/search/page
//
// Response shape is the standard paginated object
// ({ count, next, previous, results }). Each result carries:
//   - user_name     -> the acting admin's readable name ("System" when
//                      the action had no user)
//   - customer_name -> the current name of the customer the action was
//                      about (resolved for order, payment, return and
//                      complaint entries, and for a notification sent to
//                      one specific customer); null for entities with no
//                      customer or when the record no longer exists
//   - ip_address    -> the real client IP for actions performed through
//                      the admin panel; null for older entries and for
//                      actions performed through the AI assistant
export const getAuditLogs = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/audit-logs/", { signal, params });
};

// ----------------------------
// Get every distinct audit log entity value (Admin only)
// ----------------------------
// Powers the Audit Logs page's Entity filter dropdown. Returns every
// distinct entity value that has ever actually been logged,
// system-wide, rather than only the values on the current page of
// results.
// Response: a plain array of strings, alphabetically sorted, e.g.
//   ["category", "discount", "inventory", "notification", "order", ...]
export const getAuditLogEntities = (signal) => {
  return axiosInstance.get("/api/v1/admin/audit-logs/entities/", { signal });
};

// ----------------------------
// Get every distinct audit log user (Admin only)
// ----------------------------
// Same idea as getAuditLogEntities(), but for the User/Admin filter
// dropdown. Returns every admin/staff user who has actually performed
// at least one logged action — NOT every admin account in the system —
// so the dropdown only ever offers options that are guaranteed to
// return results.
// Response: [ { id, name, email }, ... ]
export const getAuditLogUsers = (signal) => {
  return axiosInstance.get("/api/v1/admin/audit-logs/users/", { signal });
};
