// ============================================================
// BREADCRUMB CONFIGURATION — single source of truth
// ============================================================
// This file maps every real route in the project (see constants/routes.js)
// to the trail of breadcrumb "crumbs" that should appear for it.

// This config-driven approach means:
//   1. ONE component (components/shared/Breadcrumbs.jsx) renders the
//      breadcrumb bar, driven entirely by the CURRENT URL.
//   2. Every route in the app gets a breadcrumb automatically, just by
//      having an entry below — no JSX needs to be added to the page
//      component itself.
//   3. A future page only needs ONE new entry here (plus, if it's a
//      dynamic detail page, one useBreadcrumb().handleSetLabel() call —
//      see hooks/useBreadcrumb.js) to be fully covered.
//
// SHAPE OF EACH ENTRY:
//   pattern -> a React Router path pattern (exactly the same string
//              already defined in constants/routes.js — including any
//              ":id" dynamic segments), matched against the current
//              URL with React Router's own matchPath() utility.
//   trail   -> an ordered array of crumbs to render AFTER the
//              automatic "Home" (customer side) / "Dashboard" (admin
//              side) root crumb that <Breadcrumbs /> always prepends.
//              Each crumb is: { label, path?, dynamic? }
//                - label   -> the text shown for this crumb
//                - path    -> optional; if present, the crumb (unless
//                             it's the LAST one) renders as a clickable
//                             link to this route
//                - dynamic -> optional flag; when true, <Breadcrumbs />
//                             will swap `label` for the real page title
//                             published via useBreadcrumb().handleSetLabel()
//                             once that page's own data has loaded,
//                             falling back to this static `label` until
//                             then (e.g. "Product Details" while the
//                             product is still being fetched)
//
// NOTE: ROUTES.HOME and ROUTES.ADMIN_DASHBOARD are deliberately NOT
// listed below — <Breadcrumbs /> hides itself entirely on those two
// root pages, since a single "Home" or "Dashboard" crumb pointing at
// the page you're already on adds no navigational value (the same
// convention most large storefronts and admin panels follow).
// Auth pages (Login, Register, ...) and the two full-page AI chat
// routes are also intentionally absent — none of them render inside
// CustomerLayout/AdminLayout, so there's no breadcrumb mount point for
// them in the first place.

import { ROUTES } from "./routes";

export const BREADCRUMB_ROUTES = [
  // ============================================================
  // CUSTOMER — PUBLIC STORE PAGES
  // ============================================================
  {
    pattern: ROUTES.PRODUCTS,
    trail: [{ label: "Products" }],
  },
  {
    pattern: ROUTES.PRODUCT_DETAIL,
    trail: [
      { label: "Products", path: ROUTES.PRODUCTS },
      { label: "Product Details", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.SEARCH,
    trail: [{ label: "Search Results" }],
  },
  {
    pattern: ROUTES.CART,
    trail: [{ label: "Shopping Cart" }],
  },
  {
    pattern: ROUTES.CHECKOUT,
    trail: [
      { label: "Shopping Cart", path: ROUTES.CART },
      { label: "Checkout" },
    ],
  },
  {
    pattern: ROUTES.PAYMENT_RESULT,
    trail: [
      { label: "Shopping Cart", path: ROUTES.CART },
      { label: "Checkout", path: ROUTES.CHECKOUT },
      { label: "Payment Result" },
    ],
  },

  // ============================================================
  // CUSTOMER — MY ACCOUNT PAGES
  // ============================================================
  // Every account page's trail starts with "My Account" pointing back
  // at the account dashboard, mirroring the top-level item in
  // CustomerAccountSidebar's own NAV_ITEMS list.
  {
    pattern: ROUTES.ACCOUNT_DASHBOARD,
    trail: [{ label: "My Account" }],
  },
  {
    pattern: ROUTES.ACCOUNT_ORDERS,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "My Orders" },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_ORDER_DETAIL,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "My Orders", path: ROUTES.ACCOUNT_ORDERS },
      { label: "Order Details", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_ORDER_TRACKING,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "My Orders", path: ROUTES.ACCOUNT_ORDERS },
      { label: "Track Order", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_WISHLIST,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Wishlist" },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_PROFILE,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Profile Settings" },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_ADDRESSES,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Address Book" },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_RETURNS,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Returns" },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_RETURN_DETAIL,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Returns", path: ROUTES.ACCOUNT_RETURNS },
      { label: "Return Details", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_COMPLAINTS,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Support Tickets" },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_COMPLAINT_DETAIL,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Support Tickets", path: ROUTES.ACCOUNT_COMPLAINTS },
      { label: "Ticket Details", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.ACCOUNT_NOTIFICATIONS,
    trail: [
      { label: "My Account", path: ROUTES.ACCOUNT_DASHBOARD },
      { label: "Notifications" },
    ],
  },

  // ============================================================
  // ADMIN — CATALOG MANAGEMENT
  // ============================================================
  {
    pattern: ROUTES.ADMIN_PRODUCT_ADD,
    trail: [
      { label: "Products", path: ROUTES.ADMIN_PRODUCTS },
      { label: "Add Product" },
    ],
  },
  {
    pattern: ROUTES.ADMIN_PRODUCT_EDIT,
    trail: [
      { label: "Products", path: ROUTES.ADMIN_PRODUCTS },
      { label: "Edit Product", dynamic: true },
    ],
  },
  {
    // Listed after ADMIN_PRODUCT_ADD/ADMIN_PRODUCT_EDIT on purpose —
    // matching is order-independent here (the three patterns have
    // different segment counts so they can never collide), but keeping
    // the plain list route last among its siblings reads more naturally.
    pattern: ROUTES.ADMIN_PRODUCTS,
    trail: [{ label: "Products" }],
  },
  {
    pattern: ROUTES.ADMIN_CATEGORIES,
    trail: [{ label: "Categories" }],
  },
  {
    pattern: ROUTES.ADMIN_DISCOUNTS,
    trail: [{ label: "Discounts" }],
  },

  // ============================================================
  // ADMIN — ORDERS, PAYMENTS, RETURNS & COMPLAINTS
  // ============================================================
  {
    pattern: ROUTES.ADMIN_ORDER_DETAIL,
    trail: [
      { label: "Orders", path: ROUTES.ADMIN_ORDERS },
      { label: "Order Details", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.ADMIN_ORDERS,
    trail: [{ label: "Orders" }],
  },
  {
    pattern: ROUTES.ADMIN_QR_PAYMENTS,
    trail: [{ label: "QR Payments" }],
  },
  {
    pattern: ROUTES.ADMIN_RETURNS,
    trail: [{ label: "Returns" }],
  },
  {
    pattern: ROUTES.ADMIN_COMPLAINTS,
    trail: [{ label: "Complaints" }],
  },
  {
    pattern: ROUTES.ADMIN_CUSTOMERS,
    trail: [{ label: "Customers" }],
  },

  // ============================================================
  // ADMIN — ANALYTICS & REPORTING
  // ============================================================
  // Mirrors the "Analytics" expandable group in AdminSidebar — the
  // group label itself has no dedicated page, so it renders as plain
  // (non-clickable) text ahead of the specific report crumb.
  {
    pattern: ROUTES.ADMIN_ANALYTICS_SALES,
    trail: [{ label: "Analytics" }, { label: "Sales Report" }],
  },
  {
    pattern: ROUTES.ADMIN_ANALYTICS_REVENUE,
    trail: [{ label: "Analytics" }, { label: "Revenue Report" }],
  },
  {
    pattern: ROUTES.ADMIN_ANALYTICS_PRODUCTS,
    trail: [{ label: "Analytics" }, { label: "Product Performance" }],
  },
  {
    pattern: ROUTES.ADMIN_ANALYTICS_CUSTOMERS,
    trail: [{ label: "Analytics" }, { label: "Customer Growth" }],
  },
  {
    pattern: ROUTES.ADMIN_ANALYTICS_INVENTORY,
    trail: [{ label: "Analytics" }, { label: "Inventory Alerts" }],
  },
  {
    pattern: ROUTES.ADMIN_ANALYTICS_EXPORT,
    trail: [{ label: "Analytics" }, { label: "Export Data" }],
  },

  // ============================================================
  // ADMIN — SOCIAL MEDIA MANAGEMENT
  // ============================================================
  {
    pattern: ROUTES.ADMIN_SOCIAL_DASHBOARD,
    trail: [{ label: "Social Media" }, { label: "Overview" }],
  },
  {
    pattern: ROUTES.ADMIN_SOCIAL_CREATE_POST,
    trail: [
      { label: "Social Media" },
      { label: "All Posts", path: ROUTES.ADMIN_SOCIAL_POSTS },
      { label: "Create Post" },
    ],
  },
  {
    pattern: ROUTES.ADMIN_SOCIAL_POST_ANALYTICS,
    trail: [
      { label: "Social Media" },
      { label: "All Posts", path: ROUTES.ADMIN_SOCIAL_POSTS },
      { label: "Post Analytics", dynamic: true },
    ],
  },
  {
    pattern: ROUTES.ADMIN_SOCIAL_POSTS,
    trail: [{ label: "Social Media" }, { label: "All Posts" }],
  },
  {
    pattern: ROUTES.ADMIN_SOCIAL_CALENDAR,
    trail: [{ label: "Social Media" }, { label: "Content Calendar" }],
  },
  {
    pattern: ROUTES.ADMIN_SOCIAL_ACCOUNTS,
    trail: [{ label: "Social Media" }, { label: "Connected Accounts" }],
  },

  // ============================================================
  // ADMIN — WHATSAPP INTEGRATION
  // ============================================================
  {
    pattern: ROUTES.ADMIN_WHATSAPP_LOGS,
    trail: [{ label: "WhatsApp" }, { label: "Bot Conversations" }],
  },
  {
    pattern: ROUTES.ADMIN_WHATSAPP_NUMBERS,
    trail: [{ label: "WhatsApp" }, { label: "Numbers" }],
  },

  // ============================================================
  // ADMIN — SYSTEM TOOLS
  // ============================================================
  {
    pattern: ROUTES.ADMIN_AUDIT_LOGS,
    trail: [{ label: "Audit Logs" }],
  },
  {
    pattern: ROUTES.ADMIN_NOTIFICATION_TEMPLATES,
    trail: [{ label: "Send Notification" }],
  },
];
