// ============================================================
// CUSTOMERS API MODULE (ADMIN)
// ============================================================
// This file contains ALL API calls related to the Customers module
// from an ADMIN's perspective. It allows admins to view the full
// list of registered customers and drill down into a specific
// customer's complete profile and order history.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API — Get the list of registered customers (Admin only)
// ----------------------------
// Fetches ONE PAGE of customers matching the given filters. Used on
// the admin's "Customers" management page.
//
// CONFIRMED WORKING SERVER-SIDE (as of the backend's latest fix):
//   - search   -> matches against the customer's name, phone, AND email.
//                 Phone matching is confirmed to normalize formatting
//                 (spaces, dashes, "+" country code prefix) before
//                 comparing, so a search value in one format (e.g. a
//                 plain-digit WhatsApp number) still matches a
//                 customer whose phone was stored in a different
//                 format.
//   - ordering -> e.g. "-created_at", "name", "-name", "total_orders",
//                 "-total_orders", "total_spent", "-total_spent"
//   - page     -> standard pagination
//
// Response shape (confirmed): { count, next, previous, results }
// This is always the paginated object — never a bare array.
export const getCustomers = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/customers/", { signal, params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
  // (e.g. ?search=john&ordering=-total_spent&page=2)
};

// ----------------------------
// API Get full details of a specific customer (Admin only)
// ----------------------------
// Fetches everything about one specific customer, identified by
// their ID — profile information (name, email, phone, address,
// created_at, total_orders, total_spent). Does NOT include the
// customer's order list — use getCustomerOrders() from orders.api.js
// for that instead (see the comment there for why).
export const getCustomerDetail = (id, signal) => {
  return axiosInstance.get(`/api/v1/admin/customers/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};
