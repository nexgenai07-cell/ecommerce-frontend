export const ROUTES = {
  // ----------------------------
  // AUTH ROUTES
  // ----------------------------
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password/:uid/:token",
  VERIFY_EMAIL: "/verify-email/:token",
  // REACTIVATE_ACCOUNT — a single page that serves BOTH steps of the
  // reactivation flow, matching the exact URL shape from the backend
  // spec ("/reactivate-account?token=xxxx"):
  //   - no ?token in the URL  -> shows the "enter your email" REQUEST
  //     form (reachable from Login's account_deactivated block screen)
  //   - ?token=xxxx present   -> auto-calls the CONFIRM endpoint on
  //     mount, exactly like the email verification link flow
  // See pages/auth/ReactivateAccount.jsx for the full implementation.
  REACTIVATE_ACCOUNT: "/reactivate-account",

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
  // AI CHAT ASSISTANT ROUTES
  // ----------------------------
  // CHAT — the full-page expanded view of the customer shopping
  // assistant (STATE 04 in the approved chat UI designs). This is a
  // TOP-LEVEL route deliberately kept OUTSIDE CustomerLayout in
  // App.jsx — it renders its own dedicated full-screen layout
  // (navbar/footer hidden entirely) instead of the normal site chrome,
  // matching a focused, distraction-free "chat takeover" experience.
  CHAT: "/chat",

  // ADMIN_CHAT — the equivalent full-page expanded view for the admin
  // store-ops assistant. Also a TOP-LEVEL route, kept OUTSIDE
  // AdminLayout for the same reason (no AdminSidebar/TopHeader chrome
  // here — the chat page has its own dedicated dark sidebar instead).
  ADMIN_CHAT: "/admin/chat",

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
  ACCOUNT_RETURN_DETAIL: "/account/returns/:id",
  ACCOUNT_COMPLAINTS: "/account/complaints",
  ACCOUNT_COMPLAINT_DETAIL: "/account/complaints/:id",
  ACCOUNT_NOTIFICATIONS: "/account/notifications",

  // ----------------------------
  // ADMIN ROUTES
  // ----------------------------
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
  ADMIN_SOCIAL_POST_ANALYTICS: "/admin/social/posts/:id/analytics",

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
