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
// API 87 - Get the list of all registered customers (Admin only)
// ----------------------------
// Fetches every customer who has registered an account on the
// platform. Used on the admin's "Customers" management page.
// The "params" object can include:
// - search: a search keyword that matches against the customer's
//   name, phone number, or email — used for filtering/finding a
//   specific customer quickly
export const getCustomers = (params) => {
  return axiosInstance.get("/api/v1/admin/customers/", { params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
  // (e.g. ?search=john)
};

// ----------------------------
// API 88 - Get full details of a specific customer (Admin only)
// ----------------------------
// Fetches everything about one specific customer, identified by
// their ID — including their profile information AND their
// complete order history. Used on a customer detail page, giving
// admins a full picture of that customer's activity (e.g. how
// many orders they've placed, their total spend, contact info, etc.)
export const getCustomerDetail = (id) => {
  return axiosInstance.get(`/api/v1/admin/customers/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};
