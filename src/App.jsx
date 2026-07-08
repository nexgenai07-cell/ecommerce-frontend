// ============================================================
// App.jsx — Root component of the entire React application
// This file does 4 things:
// 1. Wraps the app in Redux, TanStack Query, and React Router providers
// 2. Lazy loads every page component for better performance
// 3. Defines route guards (ProtectedRoute, AdminProtectedRoute, PublicRoute)
// 4. Maps every URL path to its correct page component and layout
// ============================================================

// --- Core React imports ---
import { lazy, Suspense } from "react";
// lazy    — tells React to NOT import this component immediately on app load
//           instead, it downloads the JS chunk only when the user first visits that page
//           this reduces the initial bundle size significantly
// Suspense — wraps lazy components and shows a fallback UI (spinner)
//            while the lazy component's JS chunk is still downloading

// --- Redux import ---
import { Provider } from "react-redux";
// Provider — a wrapper component that injects the Redux store into the React tree
//            every component inside <Provider> can access the store via useSelector/useDispatch

// --- TanStack Query imports ---
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// QueryClient         — the main cache engine for TanStack Query
//                       stores all fetched API data, manages refetching, retries, stale time
// QueryClientProvider — injects the QueryClient into the React tree
//                       every useQuery/useMutation hook below this can use the cache

// --- React Router imports ---
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
// BrowserRouter  — enables HTML5 history-based routing (uses real URLs like /products, /cart)
//                  without BrowserRouter, no routing works at all
// Routes         — container that looks at the current URL and renders ONLY the first matching Route
//                  without Routes, all matching routes would render at once
// Route          — maps one URL path to one component
//                  path="/cart" means: when URL is /cart, render this component
// Navigate       — a component that immediately redirects the user to another URL
//                  used inside route guards to block unauthorized access
// useLocation    — a hook that returns the current URL object (pathname, search, state)
//                  used to save "where the user was trying to go" before redirecting to login

// --- Toast notification import ---
import { Toaster } from "react-hot-toast";
// Toaster — renders a fixed container above all page content
//           toast() calls anywhere in the app show notifications inside this container
//           must be rendered once at the root level so it works on every page

// --- App-level imports ---
import { store } from "./store/index";
// store — the configured Redux store
//         contains all slices: auth (login state), cart, wishlist, etc.
//         created once here and injected via <Provider>

import { ROUTES } from "./constants/routes";
// ROUTES — an object of all URL path constants, e.g.:
//          ROUTES.HOME = "/"
//          ROUTES.LOGIN = "/login"
//          ROUTES.ADMIN_DASHBOARD = "/admin/dashboard"
//          using constants avoids typos from hardcoding strings in multiple places

import useAuth from "./hooks/useAuth";
// useAuth — custom hook that reads auth state from the Redux store
//           returns: { isAuthenticated, role }
//           isAuthenticated: true if user is logged in
//           role: "admin" or "customer"

// ============================================================
// LAYOUTS — imported normally (NOT lazy loaded)
// Layouts are wrapper components that render on EVERY page visit
// Lazy loading them would cause a flicker/delay on every navigation
// So they are imported eagerly (immediately available)
// ============================================================

import CustomerLayout from "./components/layouts/CustomerLayout";
// CustomerLayout — renders the shared navbar at the top and footer at the bottom
//                  all public customer pages (home, products, cart) render inside this
//                  uses React Router's <Outlet /> to render the current child page

import CustomerAccountLayout from "./components/layouts/CustomerAccountLayout";
// CustomerAccountLayout — renders the account sidebar (My Orders, Profile, Wishlist, etc.)
//                         nested INSIDE CustomerLayout — so navbar + sidebar + page all show together
//                         uses <Outlet /> to render the current account page in the content area

// ============================================================
// LAZY LOADED PAGES — Customer (public, no login required)
// Each import() call creates a separate JS chunk
// That chunk is downloaded only when the user navigates to that page
// ============================================================

const Home = lazy(() => import("./pages/customer/Home"));
// Home — the landing page, shown at ROUTES.HOME "/"
// contains featured products, banners, category highlights

const Products = lazy(() => import("./pages/customer/Products"));
// Products — product listing page at ROUTES.PRODUCTS "/products"
// filterable by category, price, rating — searchable grid of product cards

const ProductDetail = lazy(() => import("./pages/customer/ProductDetail"));
// ProductDetail — single product page at ROUTES.PRODUCT_DETAIL "/products/:id"
// shows images, description, price, reviews, add to cart button

const Cart = lazy(() => import("./pages/customer/Cart"));
// Cart — shopping cart page at ROUTES.CART "/cart"
// shows all cart items, quantities, subtotals, proceed to checkout button

const Checkout = lazy(() => import("./pages/customer/Checkout"));
// Checkout — order placement page at ROUTES.CHECKOUT "/checkout"
// address selection, payment method, order summary, place order button
// PROTECTED — login required (wrapped in ProtectedRoute in the routes section)

const Wishlist = lazy(() => import("./pages/customer/Wishlist"));
// Wishlist — saved products page at ROUTES.ACCOUNT_WISHLIST "/account/wishlist"
// shows all products the user has saved, with add to cart option

// ============================================================
// LAZY LOADED PAGES — Customer Account (all protected, login required)
// These pages render inside CustomerAccountLayout (sidebar visible)
// ============================================================

const AccountDashboard = lazy(
  () => import("./pages/customer/AccountDashboard"),
);
// AccountDashboard — account overview at ROUTES.ACCOUNT_DASHBOARD "/account"
// shows recent orders summary, wishlist count, profile completion status

const OrderHistory = lazy(() => import("./pages/customer/OrderHistory"));
// OrderHistory — full list of past orders at ROUTES.ACCOUNT_ORDERS "/account/orders"
// paginated table with order ID, date, status badge, total amount

const OrderDetail = lazy(() => import("./pages/customer/OrderDetail"));
// OrderDetail — single order view at ROUTES.ACCOUNT_ORDER_DETAIL "/account/orders/:id"
// shows all items, shipping address, payment info, status timeline

const OrderTracking = lazy(() => import("./pages/customer/OrderTracking"));
// OrderTracking — live tracking at ROUTES.ACCOUNT_ORDER_TRACKING "/account/orders/:id/tracking"
// shows courier status, estimated delivery date, tracking steps

const ProfileSettings = lazy(() => import("./pages/customer/ProfileSettings"));
// ProfileSettings — edit profile at ROUTES.ACCOUNT_PROFILE "/account/profile"
// change name, email, password, manage saved addresses

const ReturnRequest = lazy(() => import("./pages/customer/ReturnRequest"));
// ReturnRequest — return form at ROUTES.ACCOUNT_RETURNS "/account/returns"
// select order to return, choose reason, submit return request

const ComplaintSubmit = lazy(() => import("./pages/customer/ComplaintSubmit"));
// ComplaintSubmit — complaint form at ROUTES.ACCOUNT_COMPLAINTS "/account/complaints"
const ComplaintDetail = lazy(() => import("./pages/customer/ComplaintDetail"));
// ComplaintDetail — single complaint view at ROUTES.ACCOUNT_COMPLAINT_DETAIL "/account/complaints/:id"
// describe issue, attach screenshot or photo, submit for admin review

const NotificationHistory = lazy(
  () => import("./pages/customer/NotificationHistory"),
);
// NotificationHistory — notification inbox at ROUTES.ACCOUNT_NOTIFICATIONS "/account/notifications"
// lists all order updates, promotional messages, system alerts

// ============================================================
// LAZY LOADED PAGES — Auth (login, register, password reset)
// These are standalone pages — no CustomerLayout wrapper
// ============================================================

const Login = lazy(() => import("./pages/auth/Login"));
// Login — customer login page at ROUTES.LOGIN "/login"
// email + password form, redirects back to the page user was trying to visit after login
// GUARDED by PublicRoute — logged in users are redirected away from this page

const Register = lazy(() => import("./pages/auth/Register"));
// Register — new account creation at ROUTES.REGISTER "/register"
// name, email, password fields — creates a new customer account
// GUARDED by PublicRoute — logged in users are redirected away

const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
// ForgotPassword — password recovery at ROUTES.FORGOT_PASSWORD "/forgot-password"
// user enters email, receives a password reset link in their inbox
// GUARDED by PublicRoute — logged in users are redirected away

const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
// ResetPassword — new password form at ROUTES.RESET_PASSWORD "/reset-password"
// user clicks the link from their email and sets a new password
// NOT guarded by PublicRoute — reset links must work even if user is already logged in
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
// VerifyEmail — email confirmation at ROUTES.VERIFY_EMAIL "/verify-email/:token"
// user clicks the link from their email (API 17), token is read from ?token= query string
// NOT guarded by PublicRoute — verification links must work even if user is already logged in
// ============================================================
// LAZY LOADED PAGES — Admin (role-protected, admin role required)
// These pages are only accessible to users with role === "admin"
// ============================================================

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
// AdminLogin — admin login page at ROUTES.ADMIN_LOGIN "/admin/login"
// separate login form for admin users — not guarded by PublicRoute

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
// AdminDashboard — main admin overview at ROUTES.ADMIN_DASHBOARD "/admin"
// KPI cards (total orders, revenue, customers), revenue chart, recent orders table

const ProductList = lazy(() => import("./pages/admin/ProductList"));
// ProductList — all products table at ROUTES.ADMIN_PRODUCTS "/admin/products"
// searchable, sortable DataTable with add/edit/delete action buttons

const ProductAdd = lazy(() => import("./pages/admin/ProductAdd"));
// ProductAdd — new product form at ROUTES.ADMIN_PRODUCT_ADD "/admin/products/add"
// name, description, category, price, stock quantity, image upload

const ProductEdit = lazy(() => import("./pages/admin/ProductEdit"));
// ProductEdit — edit existing product at ROUTES.ADMIN_PRODUCT_EDIT "/admin/products/:id/edit"
// same form as ProductAdd but pre-filled with the existing product data

const CategoryManagement = lazy(
  () => import("./pages/admin/CategoryManagement"),
);
// CategoryManagement — manage categories at ROUTES.ADMIN_CATEGORIES "/admin/categories"
// create new categories, rename, reorder, delete existing ones

const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
// OrderManagement — all orders at ROUTES.ADMIN_ORDERS "/admin/orders"
// filter by status (pending, processing, shipped, delivered), bulk status update

const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
// AdminOrderDetail — single order admin view at ROUTES.ADMIN_ORDER_DETAIL "/admin/orders/:id"
// update order status, view full item list, see customer info and shipping address

const ReturnsManagement = lazy(() => import("./pages/admin/ReturnsManagement"));
// ReturnsManagement — return requests at ROUTES.ADMIN_RETURNS "/admin/returns"
// approve or reject customer return requests, view return reason and evidence

const ComplaintsManagement = lazy(
  () => import("./pages/admin/ComplaintsManagement"),
);
// ComplaintsManagement — customer complaints at ROUTES.ADMIN_COMPLAINTS "/admin/complaints"
// view all submitted complaints, respond to them, mark as resolved

const CustomerManagement = lazy(
  () => import("./pages/admin/CustomerManagement"),
);
// CustomerManagement — all customers at ROUTES.ADMIN_CUSTOMERS "/admin/customers"
// list all registered customers, view their profile, suspend or activate accounts

const DiscountManagement = lazy(
  () => import("./pages/admin/DiscountManagement"),
);
// DiscountManagement — promo codes at ROUTES.ADMIN_DISCOUNTS "/admin/discounts"
// create discount codes, set percentage or fixed amount, expiry date, usage limit

const SalesReport = lazy(() => import("./pages/admin/SalesReport"));
// SalesReport — sales analytics at ROUTES.ADMIN_ANALYTICS_SALES "/admin/analytics/sales"
// daily, weekly, monthly sales charts with order count and revenue breakdown

const RevenueReport = lazy(() => import("./pages/admin/RevenueReport"));
// RevenueReport — revenue analytics at ROUTES.ADMIN_ANALYTICS_REVENUE "/admin/analytics/revenue"
// gross revenue, net revenue after refunds, revenue by category over time

const ProductsPerformance = lazy(
  () => import("./pages/admin/ProductsPerformance"),
);
// ProductsPerformance — product analytics at ROUTES.ADMIN_ANALYTICS_PRODUCTS "/admin/analytics/products"
// best selling products, lowest performers, view-to-purchase conversion rates

const CustomerGrowth = lazy(() => import("./pages/admin/CustomerGrowth"));
// CustomerGrowth — customer analytics at ROUTES.ADMIN_ANALYTICS_CUSTOMERS "/admin/analytics/customers"
// new signups over time, retention rate, churn analysis, repeat purchase rate

const InventoryAlerts = lazy(() => import("./pages/admin/InventoryAlerts"));
// InventoryAlerts — stock alerts at ROUTES.ADMIN_ANALYTICS_INVENTORY "/admin/analytics/inventory"
// products with low stock warnings, out-of-stock products list, reorder suggestions

const ExportData = lazy(() => import("./pages/admin/ExportData"));
// ExportData — data export at ROUTES.ADMIN_ANALYTICS_EXPORT "/admin/analytics/export"
// download orders, customers, products data as CSV or Excel files

const SocialDashboard = lazy(() => import("./pages/admin/SocialDashboard"));
// SocialDashboard — social overview at ROUTES.ADMIN_SOCIAL_DASHBOARD "/admin/social"
// engagement metrics (likes, shares, comments) across all connected social platforms

const PostsList = lazy(() => import("./pages/admin/PostsList"));
// PostsList — all posts at ROUTES.ADMIN_SOCIAL_POSTS "/admin/social/posts"
// list of all scheduled and published social media posts with status

const CreatePost = lazy(() => import("./pages/admin/CreatePost"));
// CreatePost — new post form at ROUTES.ADMIN_SOCIAL_CREATE_POST "/admin/social/posts/create"
// compose post content, select platforms, schedule publish date and time

const Calendar = lazy(() => import("./pages/admin/Calendar"));
// Calendar — content calendar at ROUTES.ADMIN_SOCIAL_CALENDAR "/admin/social/calendar"
// visual month/week view of all upcoming and past scheduled social posts

const Accounts = lazy(() => import("./pages/admin/Accounts"));
// Accounts — social accounts at ROUTES.ADMIN_SOCIAL_ACCOUNTS "/admin/social/accounts"
// connect, disconnect, and manage linked social media platform accounts

const BotLogs = lazy(() => import("./pages/admin/BotLogs"));
// BotLogs — WhatsApp logs at ROUTES.ADMIN_WHATSAPP_LOGS "/admin/whatsapp/logs"
// full history of incoming and outgoing WhatsApp bot messages

const NumbersManagement = lazy(() => import("./pages/admin/NumbersManagement"));
// NumbersManagement — WhatsApp numbers at ROUTES.ADMIN_WHATSAPP_NUMBERS "/admin/whatsapp/numbers"
// add, remove, and manage registered WhatsApp Business phone numbers

const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
// AuditLogs — audit trail at ROUTES.ADMIN_AUDIT_LOGS "/admin/audit-logs"
// complete log of all admin actions: who changed what, when, and from which IP

const NotificationTemplates = lazy(
  () => import("./pages/admin/NotificationTemplates"),
);
// NotificationTemplates — template editor at ROUTES.ADMIN_NOTIFICATION_TEMPLATES "/admin/notification-templates"
// create and edit email, SMS, and push notification message templates

// ============================================================
// LAZY LOADED PAGES — Error pages
// ============================================================

const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
// NotFoundPage — 404 page shown when no route matches the current URL
// rendered by the catch-all Route path="*" at the bottom of AppRoutes

const ServerErrorPage = lazy(() => import("./pages/ServerErrorPage"));
// ServerErrorPage — 500 page shown when the server returns an unexpected error
// rendered at the fixed path "/500" — API error handlers can redirect here

// ============================================================
// PAGE LOADER FALLBACK COMPONENT
// Shown by every <Suspense> boundary while a lazy page chunk is downloading
// Appears in the center of the screen — minimal, non-distracting spinner
// ============================================================
const PageLoader = () => (
  // min-h-screen — takes full viewport height so spinner is vertically centered
  // flex items-center justify-center — centers the spinner both horizontally and vertically
  // bg-gray-50 — very light gray background, consistent with the app's neutral theme
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      {/* Spinner — pure CSS animation, no external library needed */}
      {/* w-8 h-8 — 32x32px circle */}
      {/* border-2 — thin border so the circle looks clean */}
      {/* border-gray-200 — light gray forms the full circle background */}
      {/* border-t-black — only the top border is black, creating the spinning arc effect */}
      {/* rounded-full — makes the div a perfect circle */}
      {/* animate-spin — Tailwind's built-in class that rotates 360deg infinitely */}
      <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      {/* text-sm — small font size so it doesn't compete with the spinner visually */}
      {/* text-gray-400 — muted gray color, subtle and unobtrusive */}
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  </div>
);

// ============================================================
// PROTECTED ROUTE — Customer pages guard
// Purpose: blocks unauthenticated users from accessing account pages
// How it works:
//   - reads isAuthenticated from Redux via useAuth()
//   - if NOT authenticated → redirects to /login and saves the current URL in state
//   - if authenticated → renders the child component (the actual page)
// The saved URL (state.from) is read by the Login page to redirect back after login
// ============================================================
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  // isAuthenticated — boolean, true if user has a valid session in Redux auth slice

  const location = useLocation();
  // location — the current URL object, e.g. { pathname: "/account/orders", search: "", state: null }
  // we save this so the Login page can redirect back here after successful login

  if (!isAuthenticated) {
    // User is NOT logged in — block access and redirect to login
    return (
      <Navigate
        to={ROUTES.LOGIN}
        // redirect destination — the customer login page
        state={{ from: location }}
        // state.from — passes the blocked URL to the Login page
        // Login page reads this and redirects back here after login succeeds
        replace
        // replace — replaces the current history entry instead of pushing a new one
        // this means pressing browser Back won't return to the blocked page
      />
    );
  }

  // User IS authenticated — allow access, render the actual page
  return children;
  // children — the actual protected page component (e.g. <AccountDashboard />)
};

// ============================================================
// ADMIN PROTECTED ROUTE — Admin pages guard
// Purpose: TWO-LAYER guard for admin pages
//   Layer 1: must be logged in at all
//   Layer 2: must have role === "admin" (not just any logged-in user)
// A regular customer who finds an admin URL cannot access it
// ============================================================
const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  // isAuthenticated — boolean, is anyone logged in?
  // role            — string, "admin" or "customer"

  const location = useLocation();
  // location — saved so admin login page can redirect back after login

  if (!isAuthenticated) {
    // Not logged in at all — redirect to ADMIN login (not customer login)
    return (
      <Navigate
        to={ROUTES.ADMIN_LOGIN}
        // sends to /admin/login, not /login — keeps admin and customer flows separate
        state={{ from: location }}
        // saves the blocked admin URL so admin login can redirect back after login
        replace
        // replace — avoids polluting browser history with the blocked URL
      />
    );
  }

  if (role !== "admin") {
    // Logged in but NOT an admin (e.g. a regular customer who found an admin URL)
    return <Navigate to={ROUTES.HOME} replace />;
    // redirect to the customer homepage — no state needed, just send them away
  }

  // Logged in AND is an admin — allow access, render the admin page
  return children;
  // children — the actual admin page component (e.g. <AdminDashboard />)
};

// ============================================================
// PUBLIC ROUTE — Auth pages guard
// Purpose: prevents already-logged-in users from seeing login/register pages
// How it works:
//   - if authenticated as admin → redirect to admin dashboard
//   - if authenticated as customer → redirect to homepage
//   - if NOT authenticated → render the auth page normally
// ============================================================
const PublicRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  // isAuthenticated — is anyone logged in?
  // role            — "admin" or "customer", determines where to redirect

  if (isAuthenticated) {
    if (role === "admin") {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
      // Admin visiting /login → sent to /admin (admin dashboard)
      // replace — no need to keep /login in history for an already-logged-in admin
    }
    return <Navigate to={ROUTES.HOME} replace />;
    // Customer visiting /login or /register → sent to "/" (homepage)
    // replace — no need to keep /login in history for an already-logged-in customer
  }

  // Not logged in — allow access to the auth page
  return children;
  // children — the actual auth page (e.g. <Login />, <Register />, <ForgotPassword />)
};

// ============================================================
// TANSTACK QUERY CLIENT — Global cache configuration
// One instance created here, shared across the entire app via QueryClientProvider
// Individual useQuery() calls can override these defaults per-call
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // staleTime — how long (ms) cached data is considered "fresh"
      // 1000 * 60 * 5 = 5 minutes
      // during this time, repeated useQuery calls return cached data WITHOUT hitting the API
      // after 5 minutes, data is "stale" and will be refetched in the background on next use

      retry: 1,
      // retry — how many times to retry a failed API request before showing an error
      // 1 means: try once, if it fails try one more time, then give up and show error

      refetchOnWindowFocus: false,
      // refetchOnWindowFocus — by default TanStack Query refetches when the user
      // switches back to the browser tab. Setting to false disables this behavior.
      // prevents unnecessary API calls when the user alt-tabs or switches windows briefly
    },
    mutations: {
      retry: 0,
      // retry for mutations (POST/PUT/DELETE) — set to 0, never retry
      // mutations must NOT be retried automatically — a form submission or order placement
      // could be duplicated if retried, which would cause real data integrity problems
    },
  },
});

// ============================================================
// APP ROUTES COMPONENT
// Contains ALL route definitions for the entire application
// Organized into 4 sections:
//   1. Customer routes (inside CustomerLayout)
//      1a. Public customer pages (home, products, cart, etc.)
//      1b. Checkout (protected)
//      1c. Account routes (inside CustomerAccountLayout, all protected)
//   2. Auth routes (standalone, no layout)
//   3. Admin routes (all guarded by AdminProtectedRoute)
//   4. Error pages (404, 500)
// ============================================================
const AppRoutes = () => {
  return (
    <Routes>
      {/* Routes — looks at the current URL and renders only the first matching Route */}

      {/* ==========================================================
          SECTION 1: CUSTOMER ROUTES
          All customer pages are nested inside CustomerLayout
          CustomerLayout renders: navbar → <Outlet /> → footer
          The <Outlet /> is where child Route components render
          ========================================================== */}
      <Route element={<CustomerLayout />}>
        {/* This parent Route has no path — it matches everything
            Its only job is to wrap child routes with CustomerLayout
            CustomerLayout's <Outlet /> renders whichever child matches the URL */}

        {/* ----------------------------------------------------------
            SECTION 1A: PUBLIC CUSTOMER PAGES — no login required
            ---------------------------------------------------------- */}

        <Route
          path={ROUTES.HOME}
          // path="/" — matches the root URL, renders the homepage
          element={
            <Suspense fallback={<PageLoader />}>
              {/* Suspense — shows <PageLoader /> spinner while Home.js chunk downloads */}
              <Home />
              {/* Home — landing page with banners, featured products, categories */}
            </Suspense>
          }
        />

        <Route
          path={ROUTES.PRODUCTS}
          // path="/products" — product listing page
          element={
            <Suspense fallback={<PageLoader />}>
              <Products />
              {/* Products — filterable, searchable grid of all products */}
            </Suspense>
          }
        />

        <Route
          path={ROUTES.PRODUCT_DETAIL}
          // path="/products/:id" — single product, :id is dynamic (e.g. /products/42)
          element={
            <Suspense fallback={<PageLoader />}>
              <ProductDetail />
              {/* ProductDetail — images, description, reviews, add to cart */}
            </Suspense>
          }
        />

        <Route
          path={ROUTES.CART}
          // path="/cart" — shopping cart page
          element={
            <Suspense fallback={<PageLoader />}>
              <Cart />
              {/* Cart — items, quantities, totals, proceed to checkout button */}
            </Suspense>
          }
        />

        {/* ----------------------------------------------------------
            SECTION 1B: CHECKOUT — protected (login required)
            Checkout is inside CustomerLayout but NOT inside CustomerAccountLayout
            It does not need the account sidebar — it has its own full layout
            ---------------------------------------------------------- */}

        <Route
          path={ROUTES.CHECKOUT}
          // path="/checkout" — order placement page
          element={
            <ProtectedRoute>
              {/* ProtectedRoute — redirects to /login if not authenticated */}
              <Suspense fallback={<PageLoader />}>
                <Checkout />
                {/* Checkout — address, payment method, order summary, place order */}
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* ----------------------------------------------------------
            SECTION 1C: ACCOUNT ROUTES
            Nested inside CustomerLayout AND CustomerAccountLayout
            Render chain: CustomerLayout → CustomerAccountLayout → page
            CustomerLayout provides: navbar + footer
            CustomerAccountLayout provides: account sidebar (My Orders, Profile, etc.)
            The page content renders inside CustomerAccountLayout's <Outlet />
            ALL account routes are protected — login required
            ---------------------------------------------------------- */}
        <Route element={<CustomerAccountLayout />}>
          {/* CustomerAccountLayout — renders the account sidebar
              Its <Outlet /> is where each account page renders
              This Route has no path — it just wraps account child routes with the sidebar layout */}

          <Route
            path={ROUTES.ACCOUNT_DASHBOARD}
            // path="/account" — account overview page
            element={
              <ProtectedRoute>
                {/* ProtectedRoute — blocks unauthenticated users, redirects to /login */}
                <Suspense fallback={<PageLoader />}>
                  <AccountDashboard />
                  {/* AccountDashboard — recent orders, wishlist count, profile summary */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_ORDERS}
            // path="/account/orders" — full order history
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <OrderHistory />
                  {/* OrderHistory — paginated list of all past orders with status badges */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_ORDER_DETAIL}
            // path="/account/orders/:id" — single order details
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <OrderDetail />
                  {/* OrderDetail — items, payment info, shipping address, status timeline */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_ORDER_TRACKING}
            // path="/account/orders/:id/tracking" — live courier tracking
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <OrderTracking />
                  {/* OrderTracking — courier status, tracking steps, estimated delivery */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_WISHLIST}
            // path="/account/wishlist" — saved products list
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Wishlist />
                  {/* Wishlist — all saved products with move to cart option */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_PROFILE}
            // path="/account/profile" — edit personal information
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProfileSettings />
                  {/* ProfileSettings — name, email, password, saved addresses */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_RETURNS}
            // path="/account/returns" — return request form
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ReturnRequest />
                  {/* ReturnRequest — select order, choose return reason, submit */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_COMPLAINTS}
            // path="/account/complaints" — complaint submission form
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ComplaintSubmit />
                  {/* ComplaintSubmit — describe issue, attach evidence, submit to admin */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_COMPLAINT_DETAIL}
            // path="/account/complaints/:id" — single complaint detail view
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ComplaintDetail />
                  {/* ComplaintDetail — full complaint + admin response, via API 56 */}
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ACCOUNT_NOTIFICATIONS}
            // path="/account/notifications" — notification inbox
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <NotificationHistory />
                  {/* NotificationHistory — order updates, promos, system alerts */}
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>
        {/* END <Route element={<CustomerAccountLayout />}> */}
        {/* All account pages above now render with the account sidebar visible */}
      </Route>
      {/* END <Route element={<CustomerLayout />}> */}
      {/* All customer pages above now render with navbar and footer visible */}

      {/* ==========================================================
          SECTION 2: AUTH ROUTES
          Standalone pages — NOT inside CustomerLayout
          No navbar or footer shown on login/register pages
          PublicRoute redirects already-authenticated users away
          ========================================================== */}

      <Route
        path={ROUTES.LOGIN}
        // path="/login" — customer login page
        element={
          <PublicRoute>
            {/* PublicRoute — if already logged in, redirect to home (or admin dashboard) */}
            <Suspense fallback={<PageLoader />}>
              <Login />
              {/* Login — email/password form, redirects back to originally requested page */}
            </Suspense>
          </PublicRoute>
        }
      />

      <Route
        path={ROUTES.REGISTER}
        // path="/register" — new account registration
        element={
          <PublicRoute>
            {/* PublicRoute — logged in users are redirected away */}
            <Suspense fallback={<PageLoader />}>
              <Register />
              {/* Register — name, email, password fields, creates new customer account */}
            </Suspense>
          </PublicRoute>
        }
      />

      <Route
        path={ROUTES.FORGOT_PASSWORD}
        // path="/forgot-password" — password recovery
        element={
          <PublicRoute>
            {/* PublicRoute — logged in users don't need to recover their password */}
            <Suspense fallback={<PageLoader />}>
              <ForgotPassword />
              {/* ForgotPassword — email input, sends reset link to user's inbox */}
            </Suspense>
          </PublicRoute>
        }
      />

      <Route
        path={ROUTES.RESET_PASSWORD}
        // path="/reset-password" — set new password after clicking email link
        // NO PublicRoute guard here — the reset link must work even if user is logged in
        // e.g. user is logged in on another device and clicks the reset link on their phone
        element={
          <Suspense fallback={<PageLoader />}>
            <ResetPassword />
            {/* ResetPassword — token from URL is validated, user sets new password */}
          </Suspense>
        }
      />

      <Route
        path={ROUTES.VERIFY_EMAIL}
        // path="/verify-email" — confirms email after clicking the link sent by API 17
        // NO PublicRoute guard here — must work even if user is already logged in
        element={
          <Suspense fallback={<PageLoader />}>
            <VerifyEmail />
          </Suspense>
        }
      />
      {/* ==========================================================
          SECTION 3: ADMIN ROUTES
          All wrapped in AdminProtectedRoute — requires login + admin role
          Standalone pages — no CustomerLayout, no account sidebar
          Admin will get its own AdminLayout when that is built
          ========================================================== */}

      <Route
        path={ROUTES.ADMIN_LOGIN}
        // path="/admin/login" — admin-specific login page
        // no PublicRoute guard — admin login is separate from customer login flow
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminLogin />
            {/* AdminLogin — admin email/password form */}
          </Suspense>
        }
      />

      <Route
        path={ROUTES.ADMIN_DASHBOARD}
        // path="/admin" — main admin overview
        element={
          <AdminProtectedRoute>
            {/* AdminProtectedRoute — must be logged in AND role must be "admin" */}
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
              {/* AdminDashboard — KPI cards, revenue chart, recent orders table */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_PRODUCTS}
        // path="/admin/products" — product management list
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProductList />
              {/* ProductList — searchable/sortable DataTable, add/edit/delete buttons */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_PRODUCT_ADD}
        // path="/admin/products/add" — add new product form
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProductAdd />
              {/* ProductAdd — name, description, category, price, stock, images */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_PRODUCT_EDIT}
        // path="/admin/products/:id/edit" — edit existing product
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProductEdit />
              {/* ProductEdit — same form as ProductAdd, pre-filled with existing data */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_CATEGORIES}
        // path="/admin/categories" — category management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CategoryManagement />
              {/* CategoryManagement — create, rename, reorder, delete categories */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ORDERS}
        // path="/admin/orders" — all orders management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <OrderManagement />
              {/* OrderManagement — filter by status, bulk update, paginated table */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ORDER_DETAIL}
        // path="/admin/orders/:id" — single order admin view
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminOrderDetail />
              {/* AdminOrderDetail — update status, full item list, customer info */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_RETURNS}
        // path="/admin/returns" — return requests management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ReturnsManagement />
              {/* ReturnsManagement — approve or reject customer return requests */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_COMPLAINTS}
        // path="/admin/complaints" — customer complaints management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComplaintsManagement />
              {/* ComplaintsManagement — view, respond to, resolve complaints */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_CUSTOMERS}
        // path="/admin/customers" — customer accounts management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CustomerManagement />
              {/* CustomerManagement — list all customers, view profiles, manage accounts */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_DISCOUNTS}
        // path="/admin/discounts" — promo code management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DiscountManagement />
              {/* DiscountManagement — create codes, set amount/expiry/usage limits */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ANALYTICS_SALES}
        // path="/admin/analytics/sales" — sales analytics report
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SalesReport />
              {/* SalesReport — daily/weekly/monthly charts, order count, revenue */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ANALYTICS_REVENUE}
        // path="/admin/analytics/revenue" — revenue analytics report
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <RevenueReport />
              {/* RevenueReport — gross vs net revenue, refunds, revenue by category */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ANALYTICS_PRODUCTS}
        // path="/admin/analytics/products" — product performance analytics
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProductsPerformance />
              {/* ProductsPerformance — best sellers, low performers, conversion rates */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ANALYTICS_CUSTOMERS}
        // path="/admin/analytics/customers" — customer growth analytics
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CustomerGrowth />
              {/* CustomerGrowth — signups over time, retention, churn, repeat buyers */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ANALYTICS_INVENTORY}
        // path="/admin/analytics/inventory" — inventory stock alerts
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <InventoryAlerts />
              {/* InventoryAlerts — low stock warnings, out-of-stock products */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_ANALYTICS_EXPORT}
        // path="/admin/analytics/export" — data export tool
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ExportData />
              {/* ExportData — download orders/customers/products as CSV or Excel */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_SOCIAL_DASHBOARD}
        // path="/admin/social" — social media analytics overview
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SocialDashboard />
              {/* SocialDashboard — engagement metrics across all social platforms */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_SOCIAL_POSTS}
        // path="/admin/social/posts" — all social media posts list
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <PostsList />
              {/* PostsList — scheduled and published posts with status indicators */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_SOCIAL_CREATE_POST}
        // path="/admin/social/posts/create" — create new social post
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CreatePost />
              {/* CreatePost — compose content, select platforms, schedule publish time */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_SOCIAL_CALENDAR}
        // path="/admin/social/calendar" — visual content calendar
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Calendar />
              {/* Calendar — month/week view of all scheduled and published social posts */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_SOCIAL_ACCOUNTS}
        // path="/admin/social/accounts" — connected social accounts management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Accounts />
              {/* Accounts — connect, disconnect, manage linked social media accounts */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_WHATSAPP_LOGS}
        // path="/admin/whatsapp/logs" — WhatsApp bot message history
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <BotLogs />
              {/* BotLogs — full log of incoming and outgoing WhatsApp bot messages */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_WHATSAPP_NUMBERS}
        // path="/admin/whatsapp/numbers" — WhatsApp number management
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <NumbersManagement />
              {/* NumbersManagement — add, remove, manage WhatsApp Business numbers */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_AUDIT_LOGS}
        // path="/admin/audit-logs" — admin action audit trail
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AuditLogs />
              {/* AuditLogs — complete log: who changed what, when, from which IP */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ADMIN_NOTIFICATION_TEMPLATES}
        // path="/admin/notification-templates" — notification template editor
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <NotificationTemplates />
              {/* NotificationTemplates — create/edit email, SMS, push message templates */}
            </Suspense>
          </AdminProtectedRoute>
        }
      />

      {/* ==========================================================
          SECTION 4: ERROR PAGES
          No layout wrapper — full-page error displays
          ========================================================== */}

      <Route
        path="/500"
        // path="/500" — server error page
        // API interceptors redirect here when the server returns a 500 error
        element={
          <Suspense fallback={<PageLoader />}>
            <ServerErrorPage />
            {/* ServerErrorPage — friendly message, option to go back or retry */}
          </Suspense>
        }
      />

      <Route
        path="*"
        // path="*" — catch-all route, matches ANY path not matched above
        // must always be the LAST route — React Router matches routes top to bottom
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
            {/* NotFoundPage — 404 message, link back to homepage */}
          </Suspense>
        }
      />
    </Routes>
  );
};

// ============================================================
// MAIN APP COMPONENT
// The root of the entire application
// Provider order matters — each layer depends on the one above it:
//   1. Redux Provider     — must be outermost, everything needs the store
//   2. QueryClientProvider — TanStack Query hooks need Redux (e.g. for auth tokens)
//   3. BrowserRouter      — routing hooks (useNavigate, useLocation) need this
//   4. AppRoutes          — all route definitions, needs BrowserRouter above it
//   5. Toaster            — toast notifications, needs BrowserRouter for positioning
// ============================================================
function App() {
  return (
    <Provider store={store}>
      {/* Provider — injects the Redux store into the entire component tree
          store contains: auth slice (login state), cart slice, wishlist slice, etc.
          every useSelector and useDispatch call below this works because of this wrapper */}

      <QueryClientProvider client={queryClient}>
        {/* QueryClientProvider — injects the TanStack Query cache into the component tree
            every useQuery() and useMutation() call below this uses the queryClient instance
            must be inside Provider so query hooks can access Redux state (e.g. auth token) */}

        <BrowserRouter>
          {/* BrowserRouter — enables HTML5 history-based routing
              makes window.history.pushState work seamlessly with React components
              every useNavigate(), useLocation(), useParams() hook needs this above it
              all <Link> and <Navigate> components also need this above them */}

          <AppRoutes />
          {/* AppRoutes — renders all Route definitions
              React Router matches the current URL to the correct Route and renders it here */}

          <Toaster
            // Toaster — renders the fixed notification container above all page content
            // toast() calls anywhere in the app display inside this container
            position="top-right"
            // position — where toasts appear on screen
            // "top-right" — top-right corner of the viewport, common UX convention
            toastOptions={{
              duration: 3000,
              // duration — how long (ms) each toast stays visible before auto-dismissing
              // 3000ms = 3 seconds — enough time to read a short success/info message

              style: {
                fontSize: "14px",
                // fontSize — matches the body text size of the rest of the UI
                fontFamily: "Inter, sans-serif",
                // fontFamily — matches the global font used throughout the app
              },

              success: {
                // success — style overrides specifically for success toasts (green theme)
                style: {
                  background: "#ecfdf5",
                  // background — very light emerald green, soft and non-alarming
                  color: "#065f46",
                  // color — dark green text, high contrast against the light background
                  border: "1px solid #a7f3d0",
                  // border — medium green border, ties the color theme together
                },
              },

              error: {
                duration: 4000,
                // duration override for errors — 4 seconds instead of 3
                // errors need more reading time since users must understand what went wrong
                style: {
                  background: "#fef2f2",
                  // background — very light red, signals danger without being harsh
                  color: "#991b1b",
                  // color — dark red text, high contrast and clearly signals an error
                  border: "1px solid #fecaca",
                  // border — medium red border, completes the error color theme
                },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
// export default — makes App importable in main.jsx
// main.jsx mounts it like: ReactDOM.createRoot(document.getElementById("root")).render(<App />)
