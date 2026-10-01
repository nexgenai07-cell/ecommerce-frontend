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
  // Paginated list of approved reviews plus the rating summary for one
  // product. Kept separate from PRODUCT_DETAIL(id) above because it is a
  // different endpoint with a different response shape (a review page,
  // not the product itself), and it needs its own cache entry per page.
  PRODUCT_REVIEWS: (productId) => ["product-reviews", productId],
  // Shared prefix of every product review list cache entry, whatever the
  // product. Used to refresh all of them at once after a moderation
  // decision.
  ALL_PRODUCT_REVIEWS: ["product-reviews"],
  // Admin review moderation queue. Each status tab and page number is
  // cached separately by appending them to this key.
  ADMIN_REVIEWS: ["admin-reviews"],

  // ----------------------------
  // CATEGORIES
  // ----------------------------
  CATEGORIES: ["categories"],
  CATEGORY_DETAIL: (id) => ["category", id],

  // ----------------------------
  // ADDRESSES
  // ----------------------------
  ADDRESSES: ["addresses"],

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
  // Separate key for OrderHistory.jsx's fully-paginated (all pages,
  // pre-flattened into one plain array) version of "my orders" —
  // MUST stay distinct from MY_ORDERS above, since every other screen
  // using MY_ORDERS expects the raw single-page axios response shape
  // ({ data: { results, count, ... } }), not a flattened array. Reusing
  // the same key would let one shape silently overwrite the other in
  // the cache and break whichever screen reads it next.
  MY_ORDERS_FULL: ["my-orders", "full-paginated"],
  // The customer's own accurate { total_orders, total_spent } totals.
  // Kept separate from MY_ORDERS because it is a different endpoint with
  // a completely different response shape.
  MY_ORDER_STATS: ["my-order-stats"],
  ORDER_DETAIL: (orderNumber) => ["order", orderNumber],
  ORDER_TRACKING: (orderNumber) => ["order-tracking", orderNumber],
  ADMIN_ORDERS: ["admin-orders"],
  // Every admin QR payments query (the filterable list and the stat
  // cards) is cached under this shared prefix, so one invalidation
  // refreshes all of them together.
  QR_PAYMENTS: ["qr-payments"],
  // The store's payment QR image exactly as customers see it at checkout.
  QR_STORE_IMAGE: ["qr-store-image"],
  // The same image as managed from the admin QR payments page.
  ADMIN_QR_IMAGE: ["admin-qr-image"],

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
  COMPLAINT_MESSAGES: (id) => ["complaint-messages", id],
  // The logged-in user's own count of open or in-progress complaints,
  // used by the active complaint notice banner on the support page.
  OPEN_COMPLAINTS_COUNT: ["open-complaints-count"],

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
  PROFIT_REPORT: ["profit-report"],
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
