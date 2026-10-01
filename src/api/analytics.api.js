// ============================================================
// ANALYTICS API MODULE
// ============================================================
// This file contains every API call related to the Analytics module.
// It covers two main areas:
//   1. Behavior tracking: silently recording what customers do (views,
//      searches, cart adds, and so on) for analytics purposes.
//   2. Admin reporting: the dashboard, sales, revenue and profit
//      reports, best sellers, customer growth, inventory alerts and CSV
//      exports.
//
// Definitions shared by the money reports (dashboard, sales, revenue,
// profit and best sellers). Everything is calculated from product sales
// only, that is, each order item's selling price multiplied by its
// quantity:
//   - total_revenue   = sum of (selling price x quantity). It excludes
//                       shipping and is calculated before any coupon
//                       discount.
//   - total_cost      = sum of (the product's purchase price x quantity),
//                       also called the cost of goods sold.
//   - gross_profit    = total_revenue - total_cost. total_markup carries
//                       the same value.
//   - markup_percent  = gross_profit / total_cost x 100 (profit against
//                       COST). profit_percent carries the same value.
//   - profit_margin_percent = gross_profit / total_revenue x 100 (profit
//                       against REVENUE). A 100% markup is therefore
//                       only a 50% margin.
// Percentages and per-unit averages are rounded to two decimal places
// and are null when their base is zero. Order items whose product has
// been deleted, or has no purchase price saved, are left out of the cost
// and profit figures (their revenue still counts), and
// items_missing_cost reports how many were left out.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Pre-configured Axios instance: attaches the base URL and the auth
// token, and handles expired tokens globally.

// ----------------------------
// Track a customer's behavior/action
// ----------------------------
// Silently records what a customer is doing on the site, without the
// customer being aware of it. It runs in the background with no loading
// spinners and no visible UI changes. The "data" payload is expected to
// include:
// - session_key: identifies which session/user this action belongs to
// - action: what kind of action happened, e.g. "view", "search",
//   "cart_add", "wishlist", "purchase"
// - entity_type: what kind of thing the action was performed on
//   (e.g. "product", "category")
// - entity_id: the specific ID of that thing (e.g. which product)
//
// This data later feeds admin analytics such as customer growth and
// behavior reports.
export const trackBehavior = (data, signal) => {
  return axiosInstance.post("/api/v1/analytics/track/", data, { signal });
};

// ----------------------------
// Get customer behavior records (Admin only)
// ----------------------------
// Fetches the raw list of tracked behavior records collected via
// trackBehavior(). The "params" object can include:
// - action: filter by a specific action type (e.g. only "purchase")
// - entity_type: filter by entity type (e.g. only "product")
export const getBehaviorRecords = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/behavior/", { signal, params });
  // Passing "params" as the second argument tells Axios to convert the
  // object into URL query parameters.
};

// ----------------------------
// Get key dashboard summary numbers (Admin only)
// ----------------------------
// Fetches the high-level business metrics shown on the main admin
// dashboard. The response contains:
// - total_revenue, today_revenue, revenue_growth: product sales only
//   (selling price x quantity), counted for orders whose status is
//   confirmed, shipped, out_for_delivery or delivered.
// - total_orders, total_customers, total_products, orders_growth,
//   pending_orders, today_orders, low_stock_products.
// - pending_reviews: the number of customer reviews waiting for admin
//   approval.
// - total_cost, gross_profit, total_markup, markup_percent,
//   profit_percent and profit_margin_percent: the profit figures for
//   all time. The percentages are null when they cannot be calculated.
//
// The result is cached on the server for five minutes, so a change may
// take up to five minutes to show up here.
export const getDashboardSummary = (signal) => {
  return axiosInstance.get("/api/v1/analytics/dashboard/", { signal });
};

// ----------------------------
// Get the sales report (Admin only)
// ----------------------------
// Fetches sales data broken down over time. The "params" object can
// include:
// - start_date / end_date: the date range to report on (YYYY-MM-DD)
// - period: how the data is grouped: "daily", "weekly", "monthly" or
//   "yearly"
// - status: optional, defaults to "sold". One of "sold" (orders that
//   count as revenue and were not refunded), "cancelled" (cancelled
//   orders that were never refunded), "refunded" (every order whose
//   payment was refunded: cancelled orders and delivered orders whose
//   return was approved), "all" (every order, no filtering) or any exact order
//   status string (e.g. "on_hold"). Pass the exact same value to
//   exportReport() so a CSV download always matches the screen.
//
// The response is { period, summary, data }. "summary" covers the whole
// date range and every row of "data" carries the same figures: units
// sold, average selling price and cost per unit, markup per unit,
// total revenue, total cost, total markup, gross profit, markup and
// profit percentages and items_missing_cost. The keys date,
// total_orders, total_revenue and total_units are always present.
export const getSalesReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/sales/", { signal, params });
};

// ----------------------------
// Get the revenue report (Admin only)
// ----------------------------
// Fetches revenue data (money earned), separate from raw sales counts.
// The "params" object follows the same pattern as getSalesReport():
// - start_date / end_date: the date range to report on
// - period: "daily", "weekly", "monthly" or "yearly"
// - status: optional, defaults to "sold" (same accepted values as
//   getSalesReport()). Pass the same value to exportReport() so the
//   exported file matches the screen.
//
// The response is { summary, data }. Every row of "data" has a "period"
// label, the "revenue" value (the same value as total_revenue) and the
// same profit figures as the sales report.
export const getRevenueReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/revenue/", { signal, params });
};

// ----------------------------
// Get the profit report (Admin only)
// ----------------------------
// Fetches the complete profit picture for a date range: quantity, cost
// and selling price per unit, total cost, total revenue, markup per
// unit, total markup, markup percent, gross profit, profit percent and
// profit margin. Filters and period grouping work exactly like
// getSalesReport(). The "params" object can include:
// - start_date / end_date: the date range to report on (YYYY-MM-DD)
// - period: "daily", "weekly", "monthly" or "yearly"
// - status: optional, defaults to "sold" (same accepted values as
//   getSalesReport())
//
// The response is { period, summary, data }. "summary" covers the whole
// range and adds two extra amounts that are deliberately not part of
// revenue, cost or profit: discounts_given (total coupon discount on
// the included orders) and shipping_collected (total shipping charged).
// Every row of "data" has a "date" (daily and weekly: the day; monthly:
// the first day of the month; yearly: January 1st of the year), the
// total_orders count, and the same profit figures as the summary.
//
// There is no separate profit CSV file: the sales export
// (exportReport with type "sales") already contains the profit columns,
// one row per order.
export const getProfitReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/profit/", { signal, params });
};

// ----------------------------
// Get a breakdown of orders by status (Admin only)
// ----------------------------
// Fetches a breakdown of orders grouped by their current status (e.g.
// how many are pending, confirmed, shipped, delivered, cancelled)
// within a given date range. The "params" object includes:
// - start_date / end_date: the date range to report on
export const getOrdersAnalytics = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/orders/", { signal, params });
};

// ----------------------------
// Get the best-selling products list (Admin only)
// ----------------------------
// Fetches which products have sold the most within a given period. The
// "params" object can include:
// - start_date / end_date: the date range to analyze
// - limit: how many top products to return (e.g. top 10), default 5
// - category_id: a single value or comma-separated list, narrows results
//   to those categories
// - ordering: how the products are ranked BEFORE `limit` and pagination
//   are applied. "-total_sold" (default) ranks by units sold, highest
//   first; "-total_revenue" ranks by revenue, highest first; the same
//   values without the leading "-" rank ascending. An invalid value is
//   answered with a 400 and an "error" message. Ordering on the server
//   means a high-revenue product that sold few units is still returned
//   within the limit. Ranking by profit is not available.
// - page / page_size: opt-in real pagination beyond `limit`'s cap. It
//   only activates when `page` is explicitly sent; without it the
//   response is a plain array sliced to `limit`. With `page` sent, the
//   response becomes { count, results } instead, and page/page_size
//   takes over from limit.
//
// Every product row carries product_id, name, total_sold (also
// available as units_sold), total_revenue and the profit figures:
// avg_selling_price_per_unit, avg_cost_per_unit, markup_per_unit,
// total_cost, total_markup, gross_profit, markup_percent,
// profit_percent, profit_margin_percent and items_missing_cost. Values
// that cannot be calculated are null.
export const getBestSellers = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/products/best-sellers/", {
    signal,
    params,
  });
};

// ----------------------------
// Get the low-performing products list (Admin only)
// ----------------------------
// Fetches which products are selling poorly, which helps admins spot
// items that may need a discount, better marketing, or removal from the
// catalog. The "params" object can include:
// - limit: how many low-performing products to return
// - category_id / page / page_size: same opt-in pagination contract as
//   getBestSellers.
export const getLowPerformingProducts = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/products/low-performing/", {
    signal,
    params,
  });
};

// ----------------------------
// Get customer growth data over time (Admin only)
// ----------------------------
// Fetches how the number of new customers has grown over a given time
// period, which is useful for tracking how marketing and sales efforts
// affect signups. The "params" object can include:
// - start_date / end_date: the date range to analyze
// - period: grouping interval, e.g. "daily", "weekly", "monthly"
export const getCustomerGrowth = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/customers/growth/", {
    signal,
    params,
  });
};

// ----------------------------
// Get low-stock inventory alerts (Admin only)
// ----------------------------
// Fetches a list of products that are currently running low on
// available stock, so admins can restock them before they run out
// completely. No filters or params are needed: it returns whatever is
// currently flagged as low stock. Each item carries the full
// total_stock / reserved_stock / available_stock breakdown. "Low" and
// "out of stock" are judged against available_stock, since that is what
// is actually left to sell once the reservations of pending orders are
// accounted for.
export const getInventoryAlerts = (signal) => {
  return axiosInstance.get("/api/v1/analytics/inventory/alerts/", { signal });
};

// ----------------------------
// Export a report as a downloadable CSV file (Admin only)
// ----------------------------
// Allows admins to download data as an actual CSV file instead of just
// viewing it in the browser. The "params" object can include:
// - start_date / end_date: the date range to include in the export.
//   The format is YYYY-MM-DD, and end_date cannot be earlier than
//   start_date, or the backend responds with a 400.
// - type: which kind of report to export. Accepted values: "sales",
//   "orders", "discounts", "inventory", "returns", "complaints",
//   "social_posts", "customers", "revenue", "products", "categories",
//   "audit_logs", "whatsapp_numbers", "whatsapp_conversation"
// - status: optional, only applies when type is "sales" or "revenue".
//   Same accepted values as getSalesReport()/getRevenueReport()
//   ("sold" | "cancelled" | "refunded" | "all" | an exact order
//   status), defaults to "sold". Always send the same status value
//   currently selected on the report page so the downloaded file
//   matches what is on screen.
//
// Files with profit columns:
//   sales, revenue - one row per order with: Order Number, Customer,
//                    Units Sold (sales only), Total Revenue (Sales),
//                    Total Cost (COGS), Gross Profit (Total Markup),
//                    Markup %, Profit %, Profit Margin %, Order Total
//                    Paid, Status and Created At. Total Revenue (Sales)
//                    is product sales only, while Order Total Paid is
//                    what the customer actually paid. A percentage cell
//                    is left blank when it cannot be calculated.
//   products       - the Price column is followed by Purchase Price,
//                    Markup (per unit), Markup %, Profit % and Profit
//                    Margin %. They are blank for a product without a
//                    purchase price.
//
// Extra filters accepted per type, on top of start_date/end_date (send
// only the ones the on-screen page currently has selected; an unset
// filter should be omitted, not sent empty):
//   orders                 - status ("pending" is accepted as an alias
//                            for pending_payment), search (order number
//                            or customer name only, it never matches
//                            phone), product (product name, partial
//                            match), category (category name, partial
//                            match), ordering
//   returns                - status ("requested" is accepted as an
//                            alias for pending), search (order number,
//                            reason text, customer name, or the return
//                            reference), ordering
//   complaints             - status, priority, search (message text or
//                            the complaint reference). No ordering
//                            parameter exists for this type.
//   discounts              - search (coupon code), discount_type (NOT
//                            "type": that key already selects this as
//                            the discounts report, and sending the
//                            coupon type filter as "type" overwrites it
//                            and the request fails with a 400), status,
//                            ordering
//   inventory              - status (out_of_stock / low_stock / healthy,
//                            comma-separated or repeated for multiple),
//                            category_id, search (name, description,
//                            SKU or category name; sent as "search",
//                            NOT "q", even though the on-screen
//                            inventory search box queries the product
//                            search endpoint with "q")
//   customers              - search (name, email or phone), ordering.
//                            No status filter exists for this type.
//   social_posts           - status, platform, search (caption or
//                            hashtags)
//   products               - q, category_id, min_price, max_price,
//                            in_stock, status, ordering (same accepted
//                            values as searchProducts() in
//                            products.api.js)
//   categories             - search, ordering
//   audit_logs             - entity, user (its id or its name), action,
//                            search
//   whatsapp_numbers       - search (start_date/end_date are accepted
//                            but do not filter this type)
//   whatsapp_conversation  - phone_number (REQUIRED, a 400 is returned
//                            without it), start_date/end_date filter
//                            that number's messages
//
// A non-numeric category_id sent to type=inventory (or type=products)
// returns a clean 400 { "error": "category_id must contain only valid
// ids." }, so a stray or corrupted value can be shown to the admin as a
// normal toast.
//
// The "customers" export's Phone column, and the "whatsapp_numbers" /
// "whatsapp_conversation" exports' name and message columns, are
// formatted so Excel treats them as text instead of misreading a
// leading +, -, = or @ as part of a formula when the CSV is opened
// directly.
export const exportReport = (params, signal) => {
  return axiosInstance.get("/api/v1/analytics/export/", {
    signal,
    params,

    responseType: "blob",
    // By default, Axios expects JSON data back from the server.
    // Setting responseType to "blob" tells Axios that the response is
    // BINARY FILE DATA (the actual CSV file content), not JSON. This is
    // required for the browser to handle the file and let the user
    // download/save it.
  });
};
