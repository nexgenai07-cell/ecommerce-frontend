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

import extractListData from "../utils/extractListData";
// extractListData — normalizes a customer-list response into a plain
// array regardless of whether the backend returned a flat array or a
// DRF-paginated object ({ count, next, previous, results }). Needed
// here because fetchAllCustomers (below) has to read `.results` and
// `.next` off of every page it follows.

// ----------------------------
// API Get the list of all registered customers (Admin only)
// ----------------------------
// Fetches every customer who has registered an account on the
// platform. Used on the admin's "Customers" management page.
// The "params" object can include:
// - search: a search keyword that matches against the customer's
//   name, phone number, or email — used for filtering/finding a
//   specific customer quickly
// - page: which page of results to fetch (backend paginates this
//   endpoint — confirmed via the { count, next, previous, results }
//   shape seen in real Network-tab responses)
export const getCustomers = (params) => {
  return axiosInstance.get("/api/v1/admin/customers/", { params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
  // (e.g. ?search=john&page=2)
};

// ----------------------------
// API Get full details of a specific customer (Admin only)
// ----------------------------
// Fetches everything about one specific customer, identified by
// their ID — profile information (name, email, phone, address,
// created_at, total_orders, total_spent). Does NOT include the
// customer's order list — use getCustomerOrders() from orders.api.js
// for that instead (see the comment there for why).
export const getCustomerDetail = (id) => {
  return axiosInstance.get(`/api/v1/admin/customers/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// — Fetch EVERY customer across ALL pages (Admin only)
// ----------------------------

//
// USAGE:
//   const allCustomers = await fetchAllCustomers({ search: "ali" });
//   // allCustomers is a plain array — every matching customer, not
//   // just the first page.
export const fetchAllCustomers = async (params = {}) => {
  const allResults = [];
  // Accumulates every customer object from every page into one array

  // Fetch the first page using the normal getCustomers() call above
  let response = await getCustomers({ ...params, page: 1 });
  allResults.push(...extractListData(response));
  // Spreads this page's results into the accumulator array

  // response.data.next is the FULL absolute URL for the next page,
  // exactly as returned by DRF's standard pagination (confirmed in
  // the real Network-tab response: "next": "https://...&page=2").
  // We keep following it until the backend says there isn't one.
  let nextUrl = response?.data?.next;

  while (nextUrl) {
    // axiosInstance.get() accepts a full absolute URL here — Axios
    // uses it as-is instead of prefixing baseURL, and the auth
    // interceptor still attaches the Bearer token automatically
    // since the interceptor doesn't check the URL, only the config.
    response = await axiosInstance.get(nextUrl);
    allResults.push(...extractListData(response));
    nextUrl = response?.data?.next;
    // Keeps looping until the backend eventually returns next: null
  }

  return allResults;
  // Returns a plain flat array — the calling component does not need
  // to know or care how many pages it took to gather this
};
