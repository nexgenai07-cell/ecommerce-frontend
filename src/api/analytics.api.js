// ============================================================
// ANALYTICS API MODULE
// ============================================================
// This file contains ALL API calls related to the Analytics module.
// It covers TWO main areas:
// 1. Behavior tracking — silently recording what customers do
//    (views, searches, cart adds, etc.) for analytics purposes
// 2. Admin reporting — dashboards, sales/revenue reports, best
//    sellers, customer growth, inventory alerts, and CSV exports
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 67 - Track a customer's behavior/action
// ----------------------------
// Silently records what a customer is doing on the site, WITHOUT
// the customer being aware of it — this runs in the background
// (no loading spinners, no visible UI changes). The "data" payload
// is expected to include:
// - session_key: identifies which session/user this action belongs to
// - action: what kind of action happened, e.g. "view", "search",
//   "cart_add", "wishlist", "purchase"
// - entity_type: what kind of thing the action was performed on
//   (e.g. "product", "category")
// - entity_id: the specific ID of that thing (e.g. which product)
//
// This data later feeds into admin analytics like best sellers,
// customer growth, and behavior reports.
export const trackBehavior = (data) => {
  return axiosInstance.post("/api/v1/analytics/track/", data);
};

// ----------------------------
// API 68 - Get customer behavior records (Admin only)
// ----------------------------
// Fetches the raw list of tracked behavior records collected via
// trackBehavior() above. The "params" object can include:
// - action: filter by a specific action type (e.g. only "purchase" events)
// - entity_type: filter by entity type (e.g. only "product" related events)
export const getBehaviorRecords = (params) => {
  return axiosInstance.get("/api/v1/analytics/behavior/", { params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
};

// ----------------------------
// API 69 - Get key dashboard summary numbers (Admin only)
// ----------------------------
// Fetches the high-level business metrics shown on the main admin
// dashboard — things like total revenue, total orders, total
// customers, total products, and growth percentages compared to
// previous periods. This gives admins a quick overview at a glance.
export const getDashboardSummary = () => {
  return axiosInstance.get("/api/v1/analytics/dashboard/");
};

// ----------------------------
// API 70 - Get the sales report (Admin only)
// ----------------------------
// Fetches sales data broken down over time. The "params" object
// can include:
// - start_date / end_date: the date range to report on
// - period: how the data should be grouped, e.g. "daily", "weekly",
//   or "monthly"
export const getSalesReport = (params) => {
  return axiosInstance.get("/api/v1/analytics/sales/", { params });
};

// ----------------------------
// API 71 - Get the revenue report (Admin only)
// ----------------------------
// Fetches revenue data (money earned), separate from raw sales counts.
// The "params" object follows the same pattern:
// - start_date / end_date: the date range to report on
// - period: grouping interval, e.g. "daily", "weekly", "monthly"
export const getRevenueReport = (params) => {
  return axiosInstance.get("/api/v1/analytics/revenue/", { params });
};

// ----------------------------
// API 72 - Get a breakdown of orders by status (Admin only)
// ----------------------------
// Fetches a breakdown of orders grouped by their current status
// (e.g. how many are pending, confirmed, shipped, delivered,
// cancelled) within a given date range. The "params" object includes:
// - start_date / end_date: the date range to report on
export const getOrdersAnalytics = (params) => {
  return axiosInstance.get("/api/v1/analytics/orders/", { params });
};

// ----------------------------
// API 73 - Get the best-selling products list (Admin only)
// ----------------------------
// Fetches which products have sold the most within a given period.
// The "params" object can include:
// - start_date / end_date: the date range to analyze
// - limit: how many top products to return (e.g. top 10)
export const getBestSellers = (params) => {
  return axiosInstance.get("/api/v1/analytics/products/best-sellers/", {
    params,
  });
};

// ----------------------------
// API 74 - Get the low-performing products list (Admin only)
// ----------------------------
// Fetches which products are selling POORLY — useful for admins to
// identify items that may need a discount, better marketing, or
// removal from the catalog. The "params" object can include:
// - limit: how many low-performing products to return
export const getLowPerformingProducts = (params) => {
  return axiosInstance.get("/api/v1/analytics/products/low-performing/", {
    params,
  });
};

// ----------------------------
// API 75 - Get customer growth data over time (Admin only)
// ----------------------------
// Fetches how the number of NEW customers has grown over a given
// time period — useful for tracking how marketing/sales efforts
// are affecting signups. The "params" object can include:
// - start_date / end_date: the date range to analyze
// - period: grouping interval, e.g. "daily", "weekly", "monthly"
export const getCustomerGrowth = (params) => {
  return axiosInstance.get("/api/v1/analytics/customers/growth/", { params });
};

// ----------------------------
// API 76 - Get low-stock inventory alerts (Admin only)
// ----------------------------
// Fetches a list of products that are currently running low on
// stock, so admins can be alerted and restock them before they
// run out completely. No filters/params needed here — it just
// returns whatever is currently flagged as low stock.
export const getInventoryAlerts = () => {
  return axiosInstance.get("/api/v1/analytics/inventory/alerts/");
};

// ----------------------------
// API 77 - Export a report as a downloadable CSV file (Admin only)
// ----------------------------
// Allows admins to download analytics data as an actual CSV file
// (instead of just viewing it in the browser). The "params" object
// can include:
// - start_date / end_date: the date range to include in the export
// - type: which kind of report to export (e.g. "sales", "revenue")
export const exportReport = (params) => {
  return axiosInstance.get("/api/v1/analytics/export/", {
    params,

    responseType: "blob",
    // By default, Axios expects JSON data back from the server.
    // Setting responseType to "blob" tells Axios that the response
    // will be BINARY FILE DATA (the actual CSV file content),
    // not JSON — this is required for the browser to properly
    // handle the file and allow the user to download/save it.
  });
};
