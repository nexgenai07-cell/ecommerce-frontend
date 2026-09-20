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
// API - Track a customer's behavior/action
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
export const trackBehavior = (data, signal) => {
  return axiosInstance.post("/api/v1/analytics/track/", data, { signal });
};

// ----------------------------
// API  - Get customer behavior records (Admin only)
// ----------------------------
// Fetches the raw list of tracked behavior records collected via
// trackBehavior() above. The "params" object can include:
// - action: filter by a specific action type (e.g. only "purchase" events)
// - entity_type: filter by entity type (e.g. only "product" related events)
export const getBehaviorRecords = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/behavior/", { signal, params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
};

// ----------------------------
// API - Get key dashboard summary numbers (Admin only)
// ----------------------------
// Fetches the high-level business metrics shown on the main admin
// dashboard — things like total revenue, total orders, total
// customers, total products, and growth percentages compared to
// previous periods. This gives admins a quick overview at a glance.
export const getDashboardSummary = (signal) => {
  return axiosInstance.get("/api/v1/analytics/dashboard/", { signal });
};

// ----------------------------
// API - Get the sales report (Admin only)
// ----------------------------
// Fetches sales data broken down over time, always using the locked
// revenue-status counting rule (only confirmed/shipped/
// out_for_delivery/delivered orders count as "sold" by default). The
// "params" object can include:
// - start_date / end_date: the date range to report on
// - period: how the data should be grouped, e.g. "daily", "weekly",
//   or "monthly"
// - status: optional, defaults to "sold". One of "sold" (paid orders
//   only, the historical default behavior), "cancelled" (cancelled
//   orders that were never refunded), "refunded" (cancelled orders
//   whose payment was refunded), "all" (every order, no filtering at
//   all), or any exact order status string (e.g. "on_hold"). Pass the
//   exact same value to exportReport() below so a CSV download always
//   matches whatever is currently shown on screen.
export const getSalesReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/sales/", { signal, params });
};

// ----------------------------
// API  - Get the revenue report (Admin only)
// ----------------------------
// Fetches revenue data (money earned), separate from raw sales counts.
// The "params" object follows the same pattern as getSalesReport()
// above:
// - start_date / end_date: the date range to report on
// - period: grouping interval, e.g. "daily", "weekly", "monthly"
// - status: optional, defaults to "sold" — same accepted values as
//   getSalesReport() above ("sold" | "cancelled" | "refunded" | "all"
//   | an exact order status). Pass the same value through to
//   exportReport() so the exported file matches the screen.
export const getRevenueReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/revenue/", { signal, params });
};

// ----------------------------
// API  - Get a breakdown of orders by status (Admin only)
// ----------------------------
// Fetches a breakdown of orders grouped by their current status
// (e.g. how many are pending, confirmed, shipped, delivered,
// cancelled) within a given date range. The "params" object includes:
// - start_date / end_date: the date range to report on
export const getOrdersAnalytics = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/orders/", { signal, params });
};

// ----------------------------
// Get the best-selling products list (Admin only)
// ----------------------------
// Fetches which products have sold the most within a given period.
// The "params" object can include:
// - start_date / end_date: the date range to analyze
// - limit: how many top products to return (e.g. top 10) — default 5
// - category_id: a single value or comma-separated list, narrows results
//   to those categories
// - ordering: how the products are ranked BEFORE `limit` and pagination
//   are applied. "-total_sold" (default) ranks by units sold, highest
//   first; "-total_revenue" ranks by revenue, highest first; the same
//   values without the leading "-" rank ascending. An invalid value is
//   answered with a 400 and an "error" message. Ordering on the server
//   means a high-revenue product that sold few units is still returned
//   within the limit.
// - page / page_size: opt-in real pagination beyond `limit`'s cap. It
//   only activates when `page` is explicitly sent — without it, the
//   response is a plain array sliced to `limit`. With `page` sent, the
//   response becomes { count, results } instead, and page/page_size takes
//   over from limit. The Products Performance page sends category_id and
//   ordering but never sends page, so it always receives the plain array.
export const getBestSellers = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/products/best-sellers/", {
    signal,
    params,
  });
};

// ----------------------------
// Get the low-performing products list (Admin only)
// ----------------------------
// Fetches which products are selling POORLY — useful for admins to
// identify items that may need a discount, better marketing, or
// removal from the catalog. The "params" object can include:
// - limit: how many low-performing products to return
// - category_id / page / page_size: same opt-in pagination contract as
//   getBestSellers above. No page in this project currently consumes
//   this endpoint.
export const getLowPerformingProducts = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/products/low-performing/", {
    signal,
    params,
  });
};

// ----------------------------
// API  - Get customer growth data over time (Admin only)
// ----------------------------
// Fetches how the number of NEW customers has grown over a given
// time period — useful for tracking how marketing/sales efforts
// are affecting signups. The "params" object can include:
// - start_date / end_date: the date range to analyze
// - period: grouping interval, e.g. "daily", "weekly", "monthly"
export const getCustomerGrowth = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/customers/growth/", {
    signal,
    params,
  });
};

// ----------------------------
// API  - Get low-stock inventory alerts (Admin only)
// ----------------------------
// Fetches a list of products that are currently running low on
// available stock, so admins can be alerted and restock them before
// they run out completely. No filters/params needed here — it just
// returns whatever is currently flagged as low stock. Each item now
// carries the full total_stock/reserved_stock/available_stock
// breakdown rather than a single flat stock number — "low" and "out
// of stock" are judged against available_stock, since that's what's
// actually left to sell once pending orders' reservations are
// accounted for.
export const getInventoryAlerts = (signal) => {
  return axiosInstance.get("/api/v1/analytics/inventory/alerts/", { signal });
};

// ----------------------------
// API  - Export a report as a downloadable CSV file (Admin only)
// ----------------------------
// Allows admins to download analytics data as an actual CSV file
// (instead of just viewing it in the browser). The "params" object
// can include:
// - start_date / end_date: the date range to include in the export
// - type: which kind of report to export. CONFIRMED accepted values:
//   "sales", "orders", "discounts", "inventory", "returns",
//   "complaints", "social_posts", "customers", "revenue", "products"
// - status: optional, only applies when type is "sales" or "revenue".
//   Same accepted values as getSalesReport()/getRevenueReport() above
//   ("sold" | "cancelled" | "refunded" | "all" | an exact order
//   status), defaults to "sold". Always send the same status value
//   currently selected on the Sales/Revenue Report page so the
//   downloaded file matches what's on screen.
//
// The "customers" export's Phone column is formatted as
// +92XXXXXXXXXX and wrapped so Excel treats it as text instead of
// stripping the leading 0/country code when the CSV is opened
// directly.
export const exportReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/export/", {
    signal,
    params,

    responseType: "blob",
    // By default, Axios expects JSON data back from the server.
    // Setting responseType to "blob" tells Axios that the response
    // will be BINARY FILE DATA (the actual CSV file content),
    // not JSON — this is required for the browser to properly
    // handle the file and allow the user to download/save it.
  });
};
