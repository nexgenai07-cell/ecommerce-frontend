// ============================================================
// QUERY KEYS FOR TANSTACK QUERY (REACT QUERY)
// ============================================================
// This file centralizes all the unique "keys" used by TanStack Query
// to identify and cache data in its internal cache store.

export const QUERY_KEYS = {
  // ----------------------------
  // AUTH
  // ----------------------------
  MY_PROFILE: ["my-profile"],
  MY_SESSIONS: ["my-sessions"],

  // ----------------------------
  // PRODUCTS
  // ----------------------------
  PRODUCTS: ["products"],
  PRODUCT_DETAIL: (id) => ["product", id],
  LOW_STOCK_PRODUCTS: ["low-stock-products"],

  // ----------------------------
  // CATEGORIES
  // ----------------------------
  CATEGORIES: ["categories"],
  CATEGORY_DETAIL: (id) => ["category", id],

  // ----------------------------
  // CART
  // ----------------------------
  CART: ["cart"],

  // ----------------------------
  // WISHLIST
  // ----------------------------
  WISHLIST: ["wishlist"],

  // ----------------------------
  // ORDERS
  // ----------------------------
  MY_ORDERS: ["my-orders"],
  ORDER_DETAIL: (orderNumber) => ["order", orderNumber],
  ORDER_TRACKING: (orderNumber) => ["order-tracking", orderNumber],
  ADMIN_ORDERS: ["admin-orders"],

  // ----------------------------
  // RETURNS
  // ----------------------------
  RETURNS: ["returns"],
  RETURN_DETAIL: (id) => ["return", id],

  // ----------------------------
  // COMPLAINTS
  // ----------------------------
  COMPLAINTS: ["complaints"],
  COMPLAINT_DETAIL: (id) => ["complaint", id],

  // ----------------------------
  // NOTIFICATIONS
  // ----------------------------
  NOTIFICATIONS: ["notifications"],
  NOTIFICATION_DETAIL: (id) => ["notification", id],

  // ----------------------------
  // ANALYTICS (ADMIN)
  // ----------------------------
  DASHBOARD_SUMMARY: ["dashboard-summary"],
  SALES_REPORT: ["sales-report"],
  REVENUE_REPORT: ["revenue-report"],
  ORDERS_ANALYTICS: ["orders-analytics"],
  BEST_SELLERS: ["best-sellers"],
  LOW_PERFORMING: ["low-performing"],
  CUSTOMER_GROWTH: ["customer-growth"],
  INVENTORY_ALERTS: ["inventory-alerts"],

  // ----------------------------
  // DISCOUNTS
  // ----------------------------
  DISCOUNTS: ["discounts"],
  DISCOUNT_DETAIL: (id) => ["discount", id],

  // ----------------------------
  // CUSTOMERS (ADMIN)
  // ----------------------------
  CUSTOMERS: ["customers"],
  CUSTOMER_DETAIL: (id) => ["customer", id],

  // ----------------------------
  // SOCIAL MEDIA MANAGEMENT
  // ----------------------------
  SOCIAL_POSTS: ["social-posts"],
  SOCIAL_POST_DETAIL: (id) => ["social-post", id],
  SOCIAL_CALENDAR: ["social-calendar"],
  SOCIAL_ACCOUNTS: ["social-accounts"],
  SOCIAL_POST_ANALYTICS: (id) => ["social-post-analytics", id],

  // ----------------------------
  // WHATSAPP INTEGRATION
  // ----------------------------
  WHATSAPP_LOGS: ["whatsapp-logs"],
  WHATSAPP_SESSIONS: ["whatsapp-sessions"],

  // ----------------------------
  // CHAT
  // ----------------------------
  CHAT_HISTORY: (sessionKey) => ["chat-history", sessionKey],

  // ----------------------------
  // AUDIT LOGS
  // ----------------------------
  AUDIT_LOGS: ["audit-logs"],

  // ----------------------------
  // STORE
  // ----------------------------
  MY_STORE: ["my-store"],
};
