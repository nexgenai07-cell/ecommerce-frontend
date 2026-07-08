// This file defines ALL routes for the entire project in one central place.
// Pages/components should NEVER use hardcoded route strings (like "/login")
// directly — they should always import and use these constants instead.
// This way, if a route's path ever needs to change, it only needs to be
// updated here, and it will automatically reflect everywhere it's used.

export const ROUTES = {
  // ----------------------------
  // AUTH ROUTES
  // ----------------------------
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password/:uid/:token",
  // API 18 docs explicitly say: "Create a /verify-email/:token page" —
  // path param, same convention as RESET_PASSWORD above (not a query string).
  VERIFY_EMAIL: "/verify-email/:token",

  // ----------------------------
  // CUSTOMER ROUTES
  // ----------------------------
  HOME: "/",
  PRODUCTS: "/products",
  PRODUCT_DETAIL: "/products/:id",
  CART: "/cart",
  CHECKOUT: "/checkout",
  WISHLIST: "/wishlist",
  SEARCH: "/search",

  // ----------------------------
  // CUSTOMER ACCOUNT ROUTES
  // ----------------------------
  ACCOUNT_DASHBOARD: "/account/dashboard",
  ACCOUNT_ORDERS: "/account/orders",
  ACCOUNT_ORDER_DETAIL: "/account/orders/:id",
  ACCOUNT_ORDER_TRACKING: "/account/orders/:id/tracking",
  ACCOUNT_WISHLIST: "/account/wishlist",
  ACCOUNT_PROFILE: "/account/profile",
  ACCOUNT_RETURNS: "/account/returns",
  ACCOUNT_COMPLAINTS: "/account/complaints",
  ACCOUNT_COMPLAINT_DETAIL: "/account/complaints/:id",
  ACCOUNT_NOTIFICATIONS: "/account/notifications",

  // ----------------------------
  // ADMIN ROUTES
  // ----------------------------
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",

  // Product management
  ADMIN_PRODUCTS: "/admin/products",
  ADMIN_PRODUCT_ADD: "/admin/products/add",
  ADMIN_PRODUCT_EDIT: "/admin/products/:id/edit",
  ADMIN_CATEGORIES: "/admin/categories",

  // Order management
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_ORDER_DETAIL: "/admin/orders/:id",

  // Returns & complaints management
  ADMIN_RETURNS: "/admin/returns",
  ADMIN_COMPLAINTS: "/admin/complaints",

  // Customer & discount management
  ADMIN_CUSTOMERS: "/admin/customers",
  ADMIN_DISCOUNTS: "/admin/discounts",

  // Analytics & reporting section
  ADMIN_ANALYTICS_SALES: "/admin/analytics/sales",
  ADMIN_ANALYTICS_REVENUE: "/admin/analytics/revenue",
  ADMIN_ANALYTICS_PRODUCTS: "/admin/analytics/products",
  ADMIN_ANALYTICS_CUSTOMERS: "/admin/analytics/customers",
  ADMIN_ANALYTICS_INVENTORY: "/admin/analytics/inventory",
  ADMIN_ANALYTICS_EXPORT: "/admin/analytics/export",

  // Social media management section
  ADMIN_SOCIAL_DASHBOARD: "/admin/social",
  ADMIN_SOCIAL_POSTS: "/admin/social/posts",
  ADMIN_SOCIAL_CREATE_POST: "/admin/social/posts/create",
  ADMIN_SOCIAL_CALENDAR: "/admin/social/calendar",
  ADMIN_SOCIAL_ACCOUNTS: "/admin/social/accounts",

  // WhatsApp integration management
  ADMIN_WHATSAPP_LOGS: "/admin/whatsapp/logs",
  ADMIN_WHATSAPP_NUMBERS: "/admin/whatsapp/numbers",

  // System-level admin tools
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  ADMIN_NOTIFICATION_TEMPLATES: "/admin/notification-templates",

  // ----------------------------
  // ERROR ROUTES
  // ----------------------------
  NOT_FOUND: "*",
  SERVER_ERROR: "/500",
};
