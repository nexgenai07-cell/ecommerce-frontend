// // Root component of the entire React application
// // This file does 4 things:
// // 1. Wraps the app in Redux, TanStack Query, and React Router providers
// // 2. Lazy loads every page component for better performance
// // 3. Defines route guards (ProtectedRoute, AdminProtectedRoute, PublicRoute)
// // 4. Maps every URL path to its correct page component and layout
// // ============================================================

// // --- Core React imports ---
// import { lazy, Suspense } from "react";
// // lazy    — tells React to NOT import this component immediately on app load
// //           instead, it downloads the JS chunk only when the user first visits that page
// //           this reduces the initial bundle size significantly
// // Suspense — wraps lazy components and shows a fallback UI (spinner)
// //            while the lazy component's JS chunk is still downloading

// // --- Redux import ---
// import { Provider } from "react-redux";
// // Provider — a wrapper component that injects the Redux store into the React tree
// //            every component inside <Provider> can access the store via useSelector/useDispatch

// // --- TanStack Query imports ---
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// // QueryClient         — the main cache engine for TanStack Query
// //                       stores all fetched API data, manages refetching, retries, stale time
// // QueryClientProvider — injects the QueryClient into the React tree
// //                       every useQuery/useMutation hook below this can use the cache

// // --- React Router imports ---
// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Navigate,
//   useLocation,
// } from "react-router-dom";
// // BrowserRouter  — enables HTML5 history-based routing (uses real URLs like /products, /cart)
// //                  without BrowserRouter, no routing works at all
// // Routes         — container that looks at the current URL and renders ONLY the first matching Route
// //                  without Routes, all matching routes would render at once
// // Route          — maps one URL path to one component
// //                  path="/cart" means: when URL is /cart, render this component
// // Navigate       — a component that immediately redirects the user to another URL
// //                  used inside route guards to block unauthorized access
// // useLocation    — a hook that returns the current URL object (pathname, search, state)
// //                  used to save "where the user was trying to go" before redirecting to login

// // --- Toast notification import ---
// import { Toaster } from "react-hot-toast";
// // Toaster — renders a fixed container above all page content
// //           toast() calls anywhere in the app show notifications inside this container
// //           must be rendered once at the root level so it works on every page

// // --- App-level imports ---
// import { store } from "./store/index";
// // store — the configured Redux store
// //         contains all slices: auth (login state), cart, wishlist, chat, etc.
// //         created once here and injected via <Provider>

// import { ROUTES } from "./constants/routes";
// // ROUTES — an object of all URL path constants, e.g.:
// //          ROUTES.HOME = "/"
// //          ROUTES.LOGIN = "/login"
// //          ROUTES.ADMIN_DASHBOARD = "/admin/dashboard"
// //          ROUTES.CHAT = "/chat"
// //          ROUTES.ADMIN_CHAT = "/admin/chat"
// //          using constants avoids typos from hardcoding strings in multiple places

// import useAuth from "./hooks/useAuth";
// // useAuth — custom hook that reads auth state from the Redux store
// //           returns: { isAuthenticated, role }

// import ChatProvider from "./components/chat-assistant/ChatProvider";
// // ChatProvider — mounted ONCE here, wrapping the entire route tree. Owns
// // the AI chat assistant's session + live WebSocket connection for
// // whichever role currently applies (guest/customer/admin), so the
// // connection survives every navigation in the app — including the
// // jump to the dedicated full-page chat routes below, which
// // deliberately render OUTSIDE CustomerLayout/AdminLayout.

// import ScrollToTop from "./components/shared/ScrollToTop";
// // ScrollToTop — renders no UI, only runs a side effect: on every route
// // change it resets window scroll position to the top. Must be rendered
// // INSIDE <BrowserRouter> (it uses useLocation), and it must be rendered
// // ONCE at this top level (not per-page) so it applies to every route
// // automatically without having to add it to each individual page.

// import FlyToIconProvider from "./components/shared/FlyToIcon/FlyToIconProvider";
// // FlyToIconProvider — mounted ONCE here, wrapping the entire route tree.
// // Renders the "fly to wishlist / fly to cart" animation overlay (a product
// // image flying up into a bag or cart graphic) and exposes trigger
// // functions via the useFlyToIcon() hook to any component below it —
// // mainly <ProductCard />. Must wrap everything so the animation can play
// // no matter which page the user is currently on.

// // ============================================================
// // LAYOUTS — imported normally (NOT lazy loaded)
// // ============================================================

// import CustomerLayout from "./components/layouts/CustomerLayout";
// // CustomerLayout — renders the shared navbar at the top and footer at the bottom
// //                  all public customer pages (home, products, cart) render inside this
// //                  also mounts the floating <ChatWidget /> (the icon/compact panel)

// import CustomerAccountLayout from "./components/layouts/CustomerAccountLayout";
// // CustomerAccountLayout — renders the account sidebar (My Orders, Profile, Wishlist, etc.)
// import AdminLayout from "./components/layouts/AdminLayout";
// // AdminLayout — renders AdminSidebar + TopHeader around every admin page
// //               also mounts the floating <ChatWidget /> for the store-ops assistant

// // ============================================================
// // LAZY LOADED PAGES — Customer (public, no login required)
// // ============================================================

// const Home = lazy(() => import("./pages/customer/Home"));
// const Products = lazy(() => import("./pages/customer/Products"));
// const ProductDetail = lazy(() => import("./pages/customer/ProductDetail"));
// const Cart = lazy(() => import("./pages/customer/Cart"));
// const Checkout = lazy(() => import("./pages/customer/Checkout"));
// const Wishlist = lazy(() => import("./pages/customer/Wishlist"));

// // ============================================================
// // LAZY LOADED PAGES — AI Chat full-page views
// // ============================================================
// // These render at the TOP LEVEL of the route tree (see SECTION 1D
// // below) — deliberately NOT nested inside CustomerLayout/AdminLayout,
// // since the full-page chat has its own dedicated layout (its own
// // sidebar + top bar, built into ChatFullPageLayout) rather than
// // reusing the normal site navbar/footer or admin sidebar/header.

// const ChatPage = lazy(() => import("./pages/customer/ChatPage"));
// // ChatPage — full-page customer assistant view at ROUTES.CHAT "/chat"
// // same ongoing conversation as the floating widget, just a bigger canvas

// const AdminChatPage = lazy(() => import("./pages/admin/AdminChatPage"));
// // AdminChatPage — full-page store-ops assistant view at ROUTES.ADMIN_CHAT "/admin/chat"

// // ============================================================
// // LAZY LOADED PAGES — Customer Account (all protected, login required)
// // ============================================================

// const AccountDashboard = lazy(
//   () => import("./pages/customer/AccountDashboard"),
// );
// const OrderHistory = lazy(() => import("./pages/customer/OrderHistory"));
// const OrderDetail = lazy(() => import("./pages/customer/OrderDetail"));
// const OrderTracking = lazy(() => import("./pages/customer/OrderTracking"));
// const ProfileSettings = lazy(() => import("./pages/customer/ProfileSettings"));
// const ReturnRequest = lazy(() => import("./pages/customer/ReturnRequest"));
// const ComplaintSubmit = lazy(() => import("./pages/customer/ComplaintSubmit"));
// const ComplaintDetail = lazy(() => import("./pages/customer/ComplaintDetail"));
// const NotificationHistory = lazy(
//   () => import("./pages/customer/NotificationHistory"),
// );

// // ============================================================
// // LAZY LOADED PAGES — Auth (login, register, password reset)
// // ============================================================

// const Login = lazy(() => import("./pages/auth/Login"));
// const Register = lazy(() => import("./pages/auth/Register"));
// const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
// const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
// const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
// const ReactivateAccount = lazy(() => import("./pages/auth/ReactivateAccount"));
// // ReactivateAccount — brand new page, handles BOTH steps of the
// // account reactivation flow (request form + token confirm) at a
// // single route. See constants/routes.js and the page file itself.

// // ============================================================
// // LAZY LOADED PAGES — Admin (role-protected, admin role required)
// // ============================================================

// const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
// const ProductList = lazy(() => import("./pages/admin/ProductList"));
// const ProductAdd = lazy(() => import("./pages/admin/ProductAdd"));
// const ProductEdit = lazy(() => import("./pages/admin/ProductEdit"));
// const CategoryManagement = lazy(
//   () => import("./pages/admin/CategoryManagement"),
// );
// const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
// const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
// const ReturnsManagement = lazy(() => import("./pages/admin/ReturnsManagement"));
// const ComplaintsManagement = lazy(
//   () => import("./pages/admin/ComplaintsManagement"),
// );
// const CustomerManagement = lazy(
//   () => import("./pages/admin/CustomerManagement"),
// );
// const DiscountManagement = lazy(
//   () => import("./pages/admin/DiscountManagement"),
// );
// const SalesReport = lazy(() => import("./pages/admin/SalesReport"));
// const RevenueReport = lazy(() => import("./pages/admin/RevenueReport"));
// const ProductsPerformance = lazy(
//   () => import("./pages/admin/ProductsPerformance"),
// );
// const CustomerGrowth = lazy(() => import("./pages/admin/CustomerGrowth"));
// const InventoryAlerts = lazy(() => import("./pages/admin/InventoryAlerts"));
// const ExportData = lazy(() => import("./pages/admin/ExportData"));
// const SocialDashboard = lazy(() => import("./pages/admin/SocialDashboard"));
// const PostsList = lazy(() => import("./pages/admin/PostsList"));
// const PostAnalytics = lazy(() => import("./pages/admin/PostAnalytics"));
// const CreatePost = lazy(() => import("./pages/admin/CreatePost"));
// const Calendar = lazy(() => import("./pages/admin/Calendar"));
// const Accounts = lazy(() => import("./pages/admin/Accounts"));
// const BotLogs = lazy(() => import("./pages/admin/BotLogs"));
// const NumbersManagement = lazy(() => import("./pages/admin/NumbersManagement"));
// const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
// const NotificationTemplates = lazy(
//   () => import("./pages/admin/NotificationTemplates"),
// );

// // ============================================================
// // LAZY LOADED PAGES — Error pages
// // ============================================================

// const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
// const ServerErrorPage = lazy(() => import("./pages/ServerErrorPage"));

// // ============================================================
// // PAGE LOADER FALLBACK COMPONENT
// // ============================================================
// const PageLoader = () => (
//   <div className="min-h-screen flex items-center justify-center bg-gray-50">
//     <div className="flex flex-col items-center gap-3">
//       <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
//       <p className="text-sm text-gray-400">Loading...</p>
//     </div>
//   </div>
// );

// // ============================================================
// // PROTECTED ROUTE — Customer pages guard
// // ============================================================
// const ProtectedRoute = ({ children }) => {
//   const { isAuthenticated } = useAuth();
//   const location = useLocation();

//   if (!isAuthenticated) {
//     return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
//   }

//   return children;
// };

// // ============================================================
// // ADMIN PROTECTED ROUTE — Admin pages guard
// // ============================================================
// const AdminProtectedRoute = ({ children }) => {
//   const { isAuthenticated, role } = useAuth();
//   const location = useLocation();

//   if (!isAuthenticated) {
//     return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
//   }

//   if (role !== "admin") {
//     return <Navigate to={ROUTES.HOME} replace />;
//   }

//   return children;
// };

// // ============================================================
// // PUBLIC ROUTE — Auth pages guard
// // ============================================================
// const PublicRoute = ({ children }) => {
//   const { isAuthenticated, role } = useAuth();

//   if (isAuthenticated) {
//     // Redirect by role: admins go to the admin dashboard, customers to home.
//     return (
//       <Navigate
//         to={role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME}
//         replace
//       />
//     );
//   }

//   return children;
// };

// // ============================================================
// // CUSTOMER ONLY ROUTE — restricts customer-facing pages to non-admins
// // ============================================================
// // Redirects admin accounts to the admin dashboard. Guests and
// // customers pass through unaffected.
// const CustomerOnlyRoute = ({ children }) => {
//   const { role } = useAuth();

//   if (role === "admin") {
//     return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
//   }

//   return children;
// };

// // ============================================================
// // TANSTACK QUERY CLIENT
// // ============================================================
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 1000 * 60 * 5,
//       retry: 1,
//       refetchOnWindowFocus: false,
//     },
//     mutations: {
//       retry: 0,
//     },
//   },
// });

// // ============================================================
// // APP ROUTES COMPONENT
// // ============================================================
// const AppRoutes = () => {
//   return (
//     <>
//       {/* ScrollToTop renders here, as a sibling of <Routes>, so it can watch
//           EVERY route change across the whole app (customer + admin + auth)
//           from one single place, instead of being duplicated inside each
//           individual page component. It renders nothing visible. */}
//       <ScrollToTop />

//       <Routes>
//         {/* ==========================================================
//             SECTION 1: CUSTOMER ROUTES (restricted to non-admin users)
//             ========================================================== */}
//         <Route
//           element={
//             <CustomerOnlyRoute>
//               <CustomerLayout />
//             </CustomerOnlyRoute>
//           }
//         >
//           {/* ----------------------------------------------------------
//             SECTION 1A: PUBLIC CUSTOMER PAGES — no login required
//             ---------------------------------------------------------- */}

//           <Route
//             path={ROUTES.HOME}
//             element={
//               <Suspense fallback={<PageLoader />}>
//                 <Home />
//               </Suspense>
//             }
//           />

//           <Route
//             path={ROUTES.PRODUCTS}
//             element={
//               <Suspense fallback={<PageLoader />}>
//                 <Products />
//               </Suspense>
//             }
//           />

//           <Route
//             path={ROUTES.PRODUCT_DETAIL}
//             element={
//               <Suspense fallback={<PageLoader />}>
//                 <ProductDetail />
//               </Suspense>
//             }
//           />

//           <Route
//             path={ROUTES.CART}
//             element={
//               <Suspense fallback={<PageLoader />}>
//                 <Cart />
//               </Suspense>
//             }
//           />

//           {/* ----------------------------------------------------------
//             SECTION 1B: CHECKOUT — protected (login required)
//             ---------------------------------------------------------- */}

//           <Route
//             path={ROUTES.CHECKOUT}
//             element={
//               <ProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <Checkout />
//                 </Suspense>
//               </ProtectedRoute>
//             }
//           />

//           {/* ----------------------------------------------------------
//             SECTION 1C: ACCOUNT ROUTES
//             ---------------------------------------------------------- */}
//           <Route element={<CustomerAccountLayout />}>
//             <Route
//               path={ROUTES.ACCOUNT_DASHBOARD}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <AccountDashboard />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_ORDERS}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <OrderHistory />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_ORDER_DETAIL}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <OrderDetail />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_ORDER_TRACKING}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <OrderTracking />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_WISHLIST}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <Wishlist />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_PROFILE}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <ProfileSettings />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_RETURNS}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <ReturnRequest />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_COMPLAINTS}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <ComplaintSubmit />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_COMPLAINT_DETAIL}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <ComplaintDetail />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path={ROUTES.ACCOUNT_NOTIFICATIONS}
//               element={
//                 <ProtectedRoute>
//                   <Suspense fallback={<PageLoader />}>
//                     <NotificationHistory />
//                   </Suspense>
//                 </ProtectedRoute>
//               }
//             />
//           </Route>
//         </Route>

//         {/* ==========================================================
//           SECTION 1D: FULL-PAGE AI CHAT — TOP-LEVEL, NO LAYOUT
//           Deliberately OUTSIDE CustomerLayout/AdminLayout — each chat
//           page renders its own complete layout via ChatFullPageLayout
//           (its own sidebar + top bar), not the normal site navbar/
//           footer or admin sidebar/header. Both still work correctly
//           because <ChatProvider> is mounted around ALL routes below
//           (see the bottom of this file), so the same ongoing
//           conversation/WebSocket connection is available here exactly
//           as it is inside the floating widget.
//           ========================================================== */}

//         <Route
//           path={ROUTES.CHAT}
//           // path="/chat" — customer full-page assistant, open to guests
//           // and customers. Wrapped in CustomerOnlyRoute to keep admins out.
//           element={
//             <CustomerOnlyRoute>
//               <Suspense fallback={<PageLoader />}>
//                 <ChatPage />
//               </Suspense>
//             </CustomerOnlyRoute>
//           }
//         />

//         <Route
//           path={ROUTES.ADMIN_CHAT}
//           // path="/admin/chat" — admin full-page assistant, guarded the
//           // exact same way every other admin route is (login + admin
//           // role required) — just not nested inside <AdminLayout />,
//           // since it doesn't want AdminSidebar/TopHeader chrome.
//           element={
//             <AdminProtectedRoute>
//               <Suspense fallback={<PageLoader />}>
//                 <AdminChatPage />
//               </Suspense>
//             </AdminProtectedRoute>
//           }
//         />

//         {/* ==========================================================
//           SECTION 2: AUTH ROUTES
//           ========================================================== */}

//         <Route
//           path={ROUTES.LOGIN}
//           element={
//             <PublicRoute>
//               <Suspense fallback={<PageLoader />}>
//                 <Login />
//               </Suspense>
//             </PublicRoute>
//           }
//         />

//         <Route
//           path={ROUTES.REGISTER}
//           element={
//             <PublicRoute>
//               <Suspense fallback={<PageLoader />}>
//                 <Register />
//               </Suspense>
//             </PublicRoute>
//           }
//         />

//         <Route
//           path={ROUTES.FORGOT_PASSWORD}
//           element={
//             <PublicRoute>
//               <Suspense fallback={<PageLoader />}>
//                 <ForgotPassword />
//               </Suspense>
//             </PublicRoute>
//           }
//         />

//         <Route
//           path={ROUTES.RESET_PASSWORD}
//           element={
//             <Suspense fallback={<PageLoader />}>
//               <ResetPassword />
//             </Suspense>
//           }
//         />

//         <Route
//           path={ROUTES.VERIFY_EMAIL}
//           element={
//             <Suspense fallback={<PageLoader />}>
//               <VerifyEmail />
//             </Suspense>
//           }
//         />

//         {/* REACTIVATE_ACCOUNT — deliberately NOT wrapped in <PublicRoute>,
//             same reasoning as RESET_PASSWORD/VERIFY_EMAIL above: this page
//             is reached from an emailed link carrying a one-time token, so
//             it must render regardless of the visitor's current auth state.
//             The page itself renders either the request form or the
//             token-confirm step, depending on whether ?token is present. */}
//         <Route
//           path={ROUTES.REACTIVATE_ACCOUNT}
//           element={
//             <Suspense fallback={<PageLoader />}>
//               <ReactivateAccount />
//             </Suspense>
//           }
//         />

//         {/* ==========================================================
//           SECTION 3: ADMIN ROUTES
//           ========================================================== */}

//         <Route element={<AdminLayout />}>
//           <Route
//             path={ROUTES.ADMIN_DASHBOARD}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <AdminDashboard />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_PRODUCTS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ProductList />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_PRODUCT_ADD}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ProductAdd />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_PRODUCT_EDIT}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ProductEdit />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_CATEGORIES}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <CategoryManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ORDERS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <OrderManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ORDER_DETAIL}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <AdminOrderDetail />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_RETURNS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ReturnsManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_COMPLAINTS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ComplaintsManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_CUSTOMERS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <CustomerManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_DISCOUNTS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <DiscountManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ANALYTICS_SALES}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <SalesReport />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ANALYTICS_REVENUE}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <RevenueReport />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ANALYTICS_PRODUCTS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ProductsPerformance />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ANALYTICS_CUSTOMERS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <CustomerGrowth />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ANALYTICS_INVENTORY}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <InventoryAlerts />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_ANALYTICS_EXPORT}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <ExportData />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_SOCIAL_DASHBOARD}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <SocialDashboard />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_SOCIAL_POSTS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <PostsList />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_SOCIAL_CREATE_POST}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <CreatePost />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_SOCIAL_CALENDAR}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <Calendar />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_SOCIAL_ACCOUNTS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <Accounts />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_SOCIAL_POST_ANALYTICS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <PostAnalytics />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_WHATSAPP_LOGS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <BotLogs />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_WHATSAPP_NUMBERS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <NumbersManagement />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_AUDIT_LOGS}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <AuditLogs />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />

//           <Route
//             path={ROUTES.ADMIN_NOTIFICATION_TEMPLATES}
//             element={
//               <AdminProtectedRoute>
//                 <Suspense fallback={<PageLoader />}>
//                   <NotificationTemplates />
//                 </Suspense>
//               </AdminProtectedRoute>
//             }
//           />
//         </Route>

//         {/* ==========================================================
//           SECTION 4: ERROR PAGES
//           ========================================================== */}

//         <Route
//           path="/500"
//           element={
//             <Suspense fallback={<PageLoader />}>
//               <ServerErrorPage />
//             </Suspense>
//           }
//         />

//         <Route
//           path="*"
//           element={
//             <Suspense fallback={<PageLoader />}>
//               <NotFoundPage />
//             </Suspense>
//           }
//         />
//       </Routes>
//     </>
//   );
// };

// // ============================================================
// // MAIN APP COMPONENT
// // Provider order matters:
// //   1. Redux Provider      — outermost, everything needs the store
// //   2. QueryClientProvider — query hooks need Redux (e.g. auth tokens)
// //   3. BrowserRouter       — routing hooks need this
// //   4. ChatProvider        — wraps AppRoutes so the chat session/socket
// //                            is available on every route, INCLUDING the
// //                            full-page chat routes that render outside
// //                            CustomerLayout/AdminLayout
// //   5. FlyToIconProvider   — wraps AppRoutes so the wishlist/cart flying
// //                            animation overlay can be triggered from any
// //                            page's <ProductCard />
// //   6. AppRoutes           — all route definitions
// //   7. Toaster             — toast notifications
// // ============================================================
// function App() {
//   return (
//     <Provider store={store}>
//       <QueryClientProvider client={queryClient}>
//         <BrowserRouter>
//           <ChatProvider>
//             {/* ChatProvider wraps the routes (not the other way around)
//                 so its session-init effect and WebSocket connection are
//                 created ONCE and never torn down just because the user
//                 navigated from, say, "/" to "/chat" or "/admin/dashboard"
//                 to "/admin/chat". */}
//             <FlyToIconProvider>
//               <AppRoutes />

//               <Toaster
//                 position="top-right"
//                 toastOptions={{
//                   duration: 3000,
//                   style: {
//                     fontSize: "14px",
//                     fontFamily: "Inter, sans-serif",
//                   },
//                   success: {
//                     style: {
//                       background: "#ecfdf5",
//                       color: "#065f46",
//                       border: "1px solid #a7f3d0",
//                     },
//                   },
//                   error: {
//                     duration: 4000,
//                     style: {
//                       background: "#fef2f2",
//                       color: "#991b1b",
//                       border: "1px solid #fecaca",
//                     },
//                   },
//                 }}
//               />
//             </FlyToIconProvider>
//           </ChatProvider>
//         </BrowserRouter>
//       </QueryClientProvider>
//     </Provider>
//   );
// }

// export default App;
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
//         contains all slices: auth (login state), cart, wishlist, chat, etc.
//         created once here and injected via <Provider>

import { ROUTES } from "./constants/routes";
// ROUTES — an object of all URL path constants, e.g.:
//          ROUTES.HOME = "/"
//          ROUTES.LOGIN = "/login"
//          ROUTES.ADMIN_DASHBOARD = "/admin/dashboard"
//          ROUTES.CHAT = "/chat"
//          ROUTES.ADMIN_CHAT = "/admin/chat"
//          using constants avoids typos from hardcoding strings in multiple places

import useAuth from "./hooks/useAuth";
// useAuth — custom hook that reads auth state from the Redux store
//           returns: { isAuthenticated, role }

import ChatProvider from "./components/chat-assistant/ChatProvider";
// ChatProvider — mounted ONCE here, wrapping the entire route tree. Owns
// the AI chat assistant's session + live WebSocket connection for
// whichever role currently applies (guest/customer/admin), so the
// connection survives every navigation in the app — including the
// jump to the dedicated full-page chat routes below, which
// deliberately render OUTSIDE CustomerLayout/AdminLayout.

import ScrollToTop from "./components/shared/ScrollToTop";
// ScrollToTop — renders no UI, only runs a side effect: on every route
// change it resets window scroll position to the top. Must be rendered
// INSIDE <BrowserRouter> (it uses useLocation), and it must be rendered
// ONCE at this top level (not per-page) so it applies to every route
// automatically without having to add it to each individual page.

import FlyToIconProvider from "./components/shared/FlyToIcon/FlyToIconProvider";
// FlyToIconProvider — mounted ONCE here, wrapping the entire route tree.
// Renders the "fly to wishlist / fly to cart" animation overlay (a product
// image flying up into a bag or cart graphic) and exposes trigger
// functions via the useFlyToIcon() hook to any component below it —
// mainly <ProductCard />. Must wrap everything so the animation can play
// no matter which page the user is currently on.

// ============================================================
// LAYOUTS — imported normally (NOT lazy loaded)
// ============================================================

import CustomerLayout from "./components/layouts/CustomerLayout";
// CustomerLayout — renders the shared navbar at the top and footer at the bottom
//                  all public customer pages (home, products, cart) render inside this
//                  also mounts the floating <ChatWidget /> (the icon/compact panel)

import CustomerAccountLayout from "./components/layouts/CustomerAccountLayout";
// CustomerAccountLayout — renders the account sidebar (My Orders, Profile, Wishlist, etc.)
import AdminLayout from "./components/layouts/AdminLayout";
// AdminLayout — renders AdminSidebar + TopHeader around every admin page
//               also mounts the floating <ChatWidget /> for the store-ops assistant

// ============================================================
// LAZY LOADED PAGES — Customer (public, no login required)
// ============================================================

const Home = lazy(() => import("./pages/customer/Home"));
const Products = lazy(() => import("./pages/customer/Products"));
const ProductDetail = lazy(() => import("./pages/customer/ProductDetail"));
const Cart = lazy(() => import("./pages/customer/Cart"));
const Checkout = lazy(() => import("./pages/customer/Checkout"));
const Wishlist = lazy(() => import("./pages/customer/Wishlist"));

// ============================================================
// LAZY LOADED PAGES — AI Chat full-page views
// ============================================================
// These render at the TOP LEVEL of the route tree (see SECTION 1D
// below) — deliberately NOT nested inside CustomerLayout/AdminLayout,
// since the full-page chat has its own dedicated layout (its own
// sidebar + top bar, built into ChatFullPageLayout) rather than
// reusing the normal site navbar/footer or admin sidebar/header.

const ChatPage = lazy(() => import("./pages/customer/ChatPage"));
// ChatPage — full-page customer assistant view at ROUTES.CHAT "/chat"
// same ongoing conversation as the floating widget, just a bigger canvas

const AdminChatPage = lazy(() => import("./pages/admin/AdminChatPage"));
// AdminChatPage — full-page store-ops assistant view at ROUTES.ADMIN_CHAT "/admin/chat"

// ============================================================
// LAZY LOADED PAGES — Customer Account (all protected, login required)
// ============================================================

const AccountDashboard = lazy(
  () => import("./pages/customer/AccountDashboard"),
);
const OrderHistory = lazy(() => import("./pages/customer/OrderHistory"));
const OrderDetail = lazy(() => import("./pages/customer/OrderDetail"));
const OrderTracking = lazy(() => import("./pages/customer/OrderTracking"));
const ProfileSettings = lazy(() => import("./pages/customer/ProfileSettings"));
const ReturnRequest = lazy(() => import("./pages/customer/ReturnRequest"));
const ReturnDetail = lazy(() => import("./pages/customer/ReturnDetail"));
const ComplaintSubmit = lazy(() => import("./pages/customer/ComplaintSubmit"));
const ComplaintDetail = lazy(() => import("./pages/customer/ComplaintDetail"));
const NotificationHistory = lazy(
  () => import("./pages/customer/NotificationHistory"),
);

// ============================================================
// LAZY LOADED PAGES — Auth (login, register, password reset)
// ============================================================

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const ReactivateAccount = lazy(() => import("./pages/auth/ReactivateAccount"));
// ReactivateAccount — brand new page, handles BOTH steps of the
// account reactivation flow (request form + token confirm) at a
// single route. See constants/routes.js and the page file itself.

// ============================================================
// LAZY LOADED PAGES — Admin (role-protected, admin role required)
// ============================================================

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ProductList = lazy(() => import("./pages/admin/ProductList"));
const ProductAdd = lazy(() => import("./pages/admin/ProductAdd"));
const ProductEdit = lazy(() => import("./pages/admin/ProductEdit"));
const CategoryManagement = lazy(
  () => import("./pages/admin/CategoryManagement"),
);
const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const ReturnsManagement = lazy(() => import("./pages/admin/ReturnsManagement"));
const ComplaintsManagement = lazy(
  () => import("./pages/admin/ComplaintsManagement"),
);
const CustomerManagement = lazy(
  () => import("./pages/admin/CustomerManagement"),
);
const DiscountManagement = lazy(
  () => import("./pages/admin/DiscountManagement"),
);
const SalesReport = lazy(() => import("./pages/admin/SalesReport"));
const RevenueReport = lazy(() => import("./pages/admin/RevenueReport"));
const ProductsPerformance = lazy(
  () => import("./pages/admin/ProductsPerformance"),
);
const CustomerGrowth = lazy(() => import("./pages/admin/CustomerGrowth"));
const InventoryAlerts = lazy(() => import("./pages/admin/InventoryAlerts"));
const ExportData = lazy(() => import("./pages/admin/ExportData"));
const SocialDashboard = lazy(() => import("./pages/admin/SocialDashboard"));
const PostsList = lazy(() => import("./pages/admin/PostsList"));
const PostAnalytics = lazy(() => import("./pages/admin/PostAnalytics"));
const CreatePost = lazy(() => import("./pages/admin/CreatePost"));
const Calendar = lazy(() => import("./pages/admin/Calendar"));
const Accounts = lazy(() => import("./pages/admin/Accounts"));
const BotLogs = lazy(() => import("./pages/admin/BotLogs"));
const NumbersManagement = lazy(() => import("./pages/admin/NumbersManagement"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const NotificationTemplates = lazy(
  () => import("./pages/admin/NotificationTemplates"),
);

// ============================================================
// LAZY LOADED PAGES — Error pages
// ============================================================

const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ServerErrorPage = lazy(() => import("./pages/ServerErrorPage"));

// ============================================================
// PAGE LOADER FALLBACK COMPONENT
// ============================================================
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  </div>
);

// ============================================================
// PROTECTED ROUTE — Customer pages guard
// ============================================================
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children;
};

// ============================================================
// ADMIN PROTECTED ROUTE — Admin pages guard
// ============================================================
const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (role !== "admin") {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return children;
};

// ============================================================
// PUBLIC ROUTE — Auth pages guard
// ============================================================
const PublicRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    // Redirect by role: admins go to the admin dashboard, customers to home.
    return (
      <Navigate
        to={role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME}
        replace
      />
    );
  }

  return children;
};

// ============================================================
// CUSTOMER ONLY ROUTE — restricts customer-facing pages to non-admins
// ============================================================
// Redirects admin accounts to the admin dashboard. Guests and
// customers pass through unaffected.
const CustomerOnlyRoute = ({ children }) => {
  const { role } = useAuth();

  if (role === "admin") {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  return children;
};

// ============================================================
// TANSTACK QUERY CLIENT
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ============================================================
// APP ROUTES COMPONENT
// ============================================================
const AppRoutes = () => {
  return (
    <>
      {/* ScrollToTop renders here, as a sibling of <Routes>, so it can watch
          EVERY route change across the whole app (customer + admin + auth)
          from one single place, instead of being duplicated inside each
          individual page component. It renders nothing visible. */}
      <ScrollToTop />

      <Routes>
        {/* ==========================================================
            SECTION 1: CUSTOMER ROUTES (restricted to non-admin users)
            ========================================================== */}
        <Route
          element={
            <CustomerOnlyRoute>
              <CustomerLayout />
            </CustomerOnlyRoute>
          }
        >
          {/* ----------------------------------------------------------
            SECTION 1A: PUBLIC CUSTOMER PAGES — no login required
            ---------------------------------------------------------- */}

          <Route
            path={ROUTES.HOME}
            element={
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            }
          />

          <Route
            path={ROUTES.PRODUCTS}
            element={
              <Suspense fallback={<PageLoader />}>
                <Products />
              </Suspense>
            }
          />

          <Route
            path={ROUTES.PRODUCT_DETAIL}
            element={
              <Suspense fallback={<PageLoader />}>
                <ProductDetail />
              </Suspense>
            }
          />

          <Route
            path={ROUTES.CART}
            element={
              <Suspense fallback={<PageLoader />}>
                <Cart />
              </Suspense>
            }
          />

          {/* ----------------------------------------------------------
            SECTION 1B: CHECKOUT — protected (login required)
            ---------------------------------------------------------- */}

          <Route
            path={ROUTES.CHECKOUT}
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Checkout />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* ----------------------------------------------------------
            SECTION 1C: ACCOUNT ROUTES
            ---------------------------------------------------------- */}
          <Route element={<CustomerAccountLayout />}>
            <Route
              path={ROUTES.ACCOUNT_DASHBOARD}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AccountDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_ORDERS}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <OrderHistory />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_ORDER_DETAIL}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <OrderDetail />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_ORDER_TRACKING}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <OrderTracking />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_WISHLIST}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Wishlist />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_PROFILE}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ProfileSettings />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_RETURNS}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ReturnRequest />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_RETURN_DETAIL}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ReturnDetail />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_COMPLAINTS}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ComplaintSubmit />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_COMPLAINT_DETAIL}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ComplaintDetail />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path={ROUTES.ACCOUNT_NOTIFICATIONS}
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <NotificationHistory />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>

        {/* ==========================================================
          SECTION 1D: FULL-PAGE AI CHAT — TOP-LEVEL, NO LAYOUT
          Deliberately OUTSIDE CustomerLayout/AdminLayout — each chat
          page renders its own complete layout via ChatFullPageLayout
          (its own sidebar + top bar), not the normal site navbar/
          footer or admin sidebar/header. Both still work correctly
          because <ChatProvider> is mounted around ALL routes below
          (see the bottom of this file), so the same ongoing
          conversation/WebSocket connection is available here exactly
          as it is inside the floating widget.
          ========================================================== */}

        <Route
          path={ROUTES.CHAT}
          // path="/chat" — customer full-page assistant, open to guests
          // and customers. Wrapped in CustomerOnlyRoute to keep admins out.
          element={
            <CustomerOnlyRoute>
              <Suspense fallback={<PageLoader />}>
                <ChatPage />
              </Suspense>
            </CustomerOnlyRoute>
          }
        />

        <Route
          path={ROUTES.ADMIN_CHAT}
          // path="/admin/chat" — admin full-page assistant, guarded the
          // exact same way every other admin route is (login + admin
          // role required) — just not nested inside <AdminLayout />,
          // since it doesn't want AdminSidebar/TopHeader chrome.
          element={
            <AdminProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminChatPage />
              </Suspense>
            </AdminProtectedRoute>
          }
        />

        {/* ==========================================================
          SECTION 2: AUTH ROUTES
          ========================================================== */}

        <Route
          path={ROUTES.LOGIN}
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            </PublicRoute>
          }
        />

        <Route
          path={ROUTES.REGISTER}
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <Register />
              </Suspense>
            </PublicRoute>
          }
        />

        <Route
          path={ROUTES.FORGOT_PASSWORD}
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <ForgotPassword />
              </Suspense>
            </PublicRoute>
          }
        />

        <Route
          path={ROUTES.RESET_PASSWORD}
          element={
            <Suspense fallback={<PageLoader />}>
              <ResetPassword />
            </Suspense>
          }
        />

        <Route
          path={ROUTES.VERIFY_EMAIL}
          element={
            <Suspense fallback={<PageLoader />}>
              <VerifyEmail />
            </Suspense>
          }
        />

        {/* REACTIVATE_ACCOUNT — deliberately NOT wrapped in <PublicRoute>,
            same reasoning as RESET_PASSWORD/VERIFY_EMAIL above: this page
            is reached from an emailed link carrying a one-time token, so
            it must render regardless of the visitor's current auth state.
            The page itself renders either the request form or the
            token-confirm step, depending on whether ?token is present. */}
        <Route
          path={ROUTES.REACTIVATE_ACCOUNT}
          element={
            <Suspense fallback={<PageLoader />}>
              <ReactivateAccount />
            </Suspense>
          }
        />

        {/* ==========================================================
          SECTION 3: ADMIN ROUTES
          ========================================================== */}

        <Route element={<AdminLayout />}>
          <Route
            path={ROUTES.ADMIN_DASHBOARD}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <AdminDashboard />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_PRODUCTS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProductList />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_PRODUCT_ADD}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProductAdd />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_PRODUCT_EDIT}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProductEdit />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_CATEGORIES}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <CategoryManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ORDERS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <OrderManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ORDER_DETAIL}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <AdminOrderDetail />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_RETURNS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ReturnsManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_COMPLAINTS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ComplaintsManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_CUSTOMERS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <CustomerManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_DISCOUNTS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <DiscountManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ANALYTICS_SALES}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <SalesReport />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ANALYTICS_REVENUE}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <RevenueReport />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ANALYTICS_PRODUCTS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProductsPerformance />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ANALYTICS_CUSTOMERS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <CustomerGrowth />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ANALYTICS_INVENTORY}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <InventoryAlerts />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_ANALYTICS_EXPORT}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ExportData />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_SOCIAL_DASHBOARD}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <SocialDashboard />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_SOCIAL_POSTS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <PostsList />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_SOCIAL_CREATE_POST}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <CreatePost />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_SOCIAL_CALENDAR}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Calendar />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_SOCIAL_ACCOUNTS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Accounts />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_SOCIAL_POST_ANALYTICS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <PostAnalytics />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_WHATSAPP_LOGS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <BotLogs />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_WHATSAPP_NUMBERS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <NumbersManagement />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_AUDIT_LOGS}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <AuditLogs />
                </Suspense>
              </AdminProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_NOTIFICATION_TEMPLATES}
            element={
              <AdminProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <NotificationTemplates />
                </Suspense>
              </AdminProtectedRoute>
            }
          />
        </Route>

        {/* ==========================================================
          SECTION 4: ERROR PAGES
          ========================================================== */}

        <Route
          path="/500"
          element={
            <Suspense fallback={<PageLoader />}>
              <ServerErrorPage />
            </Suspense>
          }
        />

        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
};

// ============================================================
// MAIN APP COMPONENT
// Provider order matters:
//   1. Redux Provider      — outermost, everything needs the store
//   2. QueryClientProvider — query hooks need Redux (e.g. auth tokens)
//   3. BrowserRouter       — routing hooks need this
//   4. ChatProvider        — wraps AppRoutes so the chat session/socket
//                            is available on every route, INCLUDING the
//                            full-page chat routes that render outside
//                            CustomerLayout/AdminLayout
//   5. FlyToIconProvider   — wraps AppRoutes so the wishlist/cart flying
//                            animation overlay can be triggered from any
//                            page's <ProductCard />
//   6. AppRoutes           — all route definitions
//   7. Toaster             — toast notifications
// ============================================================
function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ChatProvider>
            {/* ChatProvider wraps the routes (not the other way around)
                so its session-init effect and WebSocket connection are
                created ONCE and never torn down just because the user
                navigated from, say, "/" to "/chat" or "/admin/dashboard"
                to "/admin/chat". */}
            <FlyToIconProvider>
              <AppRoutes />

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    fontSize: "14px",
                    fontFamily: "Inter, sans-serif",
                  },
                  success: {
                    style: {
                      background: "#ecfdf5",
                      color: "#065f46",
                      border: "1px solid #a7f3d0",
                    },
                  },
                  error: {
                    duration: 4000,
                    style: {
                      background: "#fef2f2",
                      color: "#991b1b",
                      border: "1px solid #fecaca",
                    },
                  },
                }}
              />
            </FlyToIconProvider>
          </ChatProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
