// import { useEffect } from "react";
// // useEffect handles two side effects: redirect if not logged in, and Redux sync when cart loads

// import { Link, useNavigate } from "react-router-dom";
// // Link is used for breadcrumb and "Continue Shopping" navigation
// // useNavigate redirects unauthenticated users to login and handles "Start Shopping" button

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // useQuery fetches cart data and recommended products from the API
// // useMutation handles the clear cart API call
// // useQueryClient lets us refresh the cart cache after mutations

// import { motion, AnimatePresence } from "framer-motion";
// // AnimatePresence enables exit animations when cart items are removed
// // motion is available for animated elements within the page

// import { AiOutlineArrowLeft, AiOutlineShoppingCart } from "react-icons/ai";
// // AiOutlineArrowLeft — back arrow icon in the "Continue Shopping" link
// // AiOutlineShoppingCart — cart icon shown in the "You Might Also Like" section header

// import { getCart, clearCart } from "../../api/cart.api";
// // getCart — calls GET /api/v1/cart/ to fetch the full cart with all items
// // clearCart — calls DELETE /api/v1/cart/clear/ to remove all items at once

// import { getProducts } from "../../api/products.api";
// // getProducts — fetches newest products for the "You Might Also Like" section

// import useCart from "../../hooks/useCart";
// // handleSyncCart — syncs the API cart data into Redux on page load
// // clearCart (clearCartRedux) — clears Redux cart state after the clear cart API succeeds

// import useAuth from "../../hooks/useAuth";
// // isAuthenticated — used to check login status and redirect if needed

// import { showSuccess, showError } from "../../components/ui/Toast";
// // Toast helpers for success and error feedback after the clear cart action

// import { ROUTES } from "../../constants/routes";
// // Centralized route constants — avoids hardcoding paths like "/login", "/products"

// import { QUERY_KEYS } from "../../constants/queryKeys";
// // Centralized query key constants used for caching and cache invalidation

// import Container from "../../components/layouts/Container";
// // Consistent max-width + padding wrapper used across all pages

// import CartItem from "../../components/cart/CartItem";
// // Renders a single cart item row with image, name, quantity selector, and delete button

// import CartSummary from "../../components/cart/CartSummary";
// // Sticky order summary card with price breakdown, coupon input, and checkout button

// import ProductGrid from "../../components/shared/ProductGrid";
// // Reusable grid for the recommended products section at the bottom

// import { SkeletonCard } from "../../components/ui/Skeleton";
// // Skeleton placeholder cards — imported and available if needed

// import EmptyState from "../../components/ui/EmptyState";
// // Friendly empty state UI shown when the cart has no items

// import ConfirmModal from "../../components/ui/ConfirmModal";
// // Confirmation dialog shown before clearing all cart items

// import { useState } from "react";
// // useState controls whether the clear cart confirmation modal is open

// import formatPrice from "../../utils/formatPrice";
// // Price formatter utility — imported and available if needed on this page

// const Cart = () => {
//   const navigate = useNavigate();
//   const queryClient = useQueryClient();
//   const { isAuthenticated } = useAuth();

//   // handleSyncCart pushes API cart data into Redux so the navbar cart count stays accurate
//   // clearCartRedux empties the Redux cart store after a successful clear cart API call
//   const { handleSyncCart, clearCart: clearCartRedux } = useCart();

//   // Controls visibility of the "Are you sure you want to clear cart?" confirmation modal
//   const [showClearModal, setShowClearModal] = useState(false);

//   // Redirect unauthenticated users to the login page immediately
//   // Passes the cart route as "from" so the user is sent back here after logging in
//   useEffect(() => {
//     if (!isAuthenticated) {
//       navigate(ROUTES.LOGIN, { state: { from: { pathname: ROUTES.CART } } });
//     }
//   }, [isAuthenticated, navigate]);

//   // ─────────────────────────────────────────────
//   // FETCH CART DATA
//   // Calls GET /api/v1/cart/ — returns all items, subtotal, discount, and coupon info
//   // Only runs when the user is authenticated — no point fetching for guests
//   // staleTime of 2 minutes avoids refetching too aggressively while browsing the page
//   // ─────────────────────────────────────────────
//   const {
//     data: cartData,
//     isLoading: cartLoading,
//     isError: cartError,
//   } = useQuery({
//     queryKey: QUERY_KEYS.CART,
//     queryFn: getCart,
//     enabled: isAuthenticated,
//     // Query is disabled entirely if the user is not logged in
//     staleTime: 1000 * 60 * 2,
//   });

//   // Extract the cart object and items array from the API response
//   const cart = cartData?.data || null;
//   const cartItems = cart?.items || [];
//   // Falls back to empty array so the rest of the page renders safely before data loads

//   // Sync the fetched cart into Redux whenever the cart data changes
//   // This keeps the navbar cart count badge in sync with the actual cart
//   useEffect(() => {
//     if (cart) {
//       handleSyncCart(cart);
//     }
//   }, [cart]);

//   // ─────────────────────────────────────────────
//   // FETCH RECOMMENDED PRODUCTS
//   // Shows the 4 newest products in the "You Might Also Like" section
//   // Separate query from cart so they load independently
//   // ─────────────────────────────────────────────
//   const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
//     queryKey: [...QUERY_KEYS.PRODUCTS, "cart-recommended"],
//     // "cart-recommended" suffix makes this cache entry unique from other product queries
//     queryFn: () => getProducts({ ordering: "-created_at", page: 1 }),
//     staleTime: 1000 * 60 * 5,
//     // 5 minute cache — recommended products don't need to refresh as often
//   });

//   // Take only the first 4 results to keep the grid compact and clean
//   const recommendedProducts = recommendedData?.data?.results?.slice(0, 4) || [];

//   // ─────────────────────────────────────────────
//   // CLEAR CART MUTATION
//   // Calls DELETE /api/v1/cart/clear/ to remove all items at once
//   // On success: clears Redux, refreshes cart cache, closes the modal
//   // ─────────────────────────────────────────────
//   const clearCartMutation = useMutation({
//     mutationFn: clearCart,

//     onSuccess: () => {
//       clearCartRedux();
//       // Clear Redux cart so the navbar cart count drops to 0 immediately
//       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
//       // Refresh the cart query so the page shows the empty state
//       showSuccess("Cart cleared successfully");
//       setShowClearModal(false);
//       // Close the confirmation modal after successful clear
//     },

//     onError: () => {
//       showError("Failed to clear cart. Please try again.");
//     },
//   });

//   // ─── Loading State ───
//   // Custom skeleton layout that matches the actual cart page structure
//   // Shows placeholder item cards on the left and a summary skeleton on the right
//   if (cartLoading) {
//     return (
//       <Container className="py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left skeleton — 3 fake cart item rows */}
//           <div className="lg:col-span-2 flex flex-col gap-4">
//             {[1, 2, 3].map((i) => (
//               <div
//                 key={i}
//                 className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
//               >
//                 <div className="flex gap-4">
//                   {/* Fake product image */}
//                   <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0" />
//                   <div className="flex-1 flex flex-col gap-2">
//                     {/* Fake product name */}
//                     <div className="h-4 bg-gray-100 rounded w-3/4" />
//                     {/* Fake category label */}
//                     <div className="h-3 bg-gray-100 rounded w-1/2" />
//                     {/* Fake quantity selector */}
//                     <div className="h-8 bg-gray-100 rounded w-24 mt-2" />
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Right skeleton — fake order summary card */}
//           <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit animate-pulse">
//             <div className="h-5 bg-gray-100 rounded w-1/2 mb-4" />
//             {[1, 2, 3, 4].map((i) => (
//               // Fake price breakdown rows
//               <div key={i} className="flex justify-between mb-3">
//                 <div className="h-4 bg-gray-100 rounded w-1/3" />
//                 <div className="h-4 bg-gray-100 rounded w-1/4" />
//               </div>
//             ))}
//           </div>
//         </div>
//       </Container>
//     );
//   }

//   return (
//     // min-h-screen ensures the page fills the full viewport even with few items
//     // bg-gray-50 gives a subtle off-white background behind the white cards
//     <div className="min-h-screen bg-gray-50 px-25">
//       <Container className="py-6 sm:py-8">
//         <div className="flex flex-col gap-8">
//           {/* ─── Breadcrumb ─── */}
//           {/* Simple Home > Cart path — no need for a separate component here */}
//           <nav className="flex items-center gap-1.5 text-sm text-gray-400">
//             <Link
//               to={ROUTES.HOME}
//               className="hover:text-gray-600 transition-colors"
//             >
//               Home
//             </Link>
//             <span className="text-gray-300">›</span>
//             <span className="text-gray-600 font-medium">Cart</span>
//           </nav>

//           {/* ─── Page Heading ─── */}
//           {/* Shows item count below the title when the cart has items */}
//           <div className="flex flex-col gap-1 shadow-lg rounded-2xl p-3">
//             <h1 className="text-3xl font-bold text-gray-900">My Cart</h1>
//             {cartItems.length > 0 && (
//               <p className="text-sm text-gray-500">
//                 You have{" "}
//                 <span className="font-semibold text-green-600">
//                   {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
//                   {/* Correct singular/plural based on item count */}
//                 </span>{" "}
//                 in your cart
//               </p>
//             )}
//           </div>

//           {/* ─── Empty Cart State ─── */}
//           {/* Shown after loading finishes and the cart has zero items */}
//           {/* "Start Shopping" button takes the user to the products page */}
//           {!cartLoading && cartItems.length === 0 && (
//             <EmptyState
//               variant="emptyCart"
//               actionLabel="Start Shopping"
//               onAction={() => navigate(ROUTES.PRODUCTS)}
//             />
//           )}

//           {/* ─── Main Cart Layout ─── */}
//           {/* Only rendered when there are items in the cart */}
//           {/* 3-column grid: items take 2 columns, summary takes 1 column on large screens */}
//           {/* Stacks vertically on mobile so items appear above the summary */}
//           {cartItems.length > 0 && (
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start shadow">
//               {/* ── Left: Cart Items List ── */}
//               <div className="lg:col-span-2 flex flex-col gap-4 shadow p-3">
//                 {/* AnimatePresence tracks items being removed and plays exit animations */}
//                 {/* mode="popLayout" makes remaining items smoothly reflow after one is removed */}
//                 <AnimatePresence mode="popLayout">
//                   {cartItems.map((item) => (
//                     <CartItem
//                       key={item.id}
//                       item={item}
//                       onRemove={() => {
//                         // Refresh cart data after an item is successfully removed
//                         queryClient.invalidateQueries({
//                           queryKey: QUERY_KEYS.CART,
//                         });
//                       }}
//                     />
//                   ))}
//                 </AnimatePresence>

//                 {/* Bottom row below the items — Continue Shopping link and Clear Cart button */}
//                 <div className="flex items-center justify-between pt-2">
//                   {/* Navigate back to the products page to keep browsing */}
//                   <Link
//                     to={ROUTES.PRODUCTS}
//                     className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
//                   >
//                     <AiOutlineArrowLeft className="w-3.5 h-3.5" />
//                     Continue Shopping
//                   </Link>

//                   {/* "Clear Cart" button — only shown when there are 2 or more items */}
//                   {/* One item can just be deleted individually, so this button isn't needed */}
//                   {cartItems.length > 1 && (
//                     <button
//                       onClick={() => setShowClearModal(true)}
//                       // Opens the confirmation modal instead of clearing immediately
//                       className="text-sm text-danger font-medium hover:underline"
//                     >
//                       Clear Cart
//                     </button>
//                   )}
//                 </div>
//               </div>

//               {/* ── Right: Order Summary ── */}
//               {/* lg:col-span-1 keeps it in the third column on large screens */}
//               {/* Sticky behavior is handled inside CartSummary itself */}
//               <div className="lg:col-span-1 border border-green-300 rounded-2xl">
//                 <CartSummary cart={cart} />
//               </div>
//             </div>
//           )}

//           {/* ─── You Might Also Like ─── */}
//           {/* Only shown when there are items in the cart — hides on empty cart */}
//           {cartItems.length > 0 && (
//             <section className="flex flex-col gap-6">
//               {/* Section header with title and shopping cart icon */}
//               <div className="flex items-center justify-between">
//                 <h2 className="text-xl font-bold text-gray-900">
//                   You Might Also Like
//                 </h2>
//                 {/* Dark circular badge with cart icon as a decorative accent */}
//                 <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
//                   <AiOutlineShoppingCart className="w-5 h-5 text-white" />
//                 </div>
//               </div>

//               {/* 4-column product grid — 2 columns on mobile, 4 on medium+ screens */}
//               <ProductGrid
//                 products={recommendedProducts}
//                 isLoading={recommendedLoading}
//                 skeletonCount={4}
//                 cols={{ default: 2, sm: 2, md: 4, lg: 4 }}
//               />
//             </section>
//           )}
//         </div>
//       </Container>

//       {/* ─── Clear Cart Confirmation Modal ─── */}
//       {/* Rendered outside the main layout so it overlays the full page */}
//       {/* isLoading disables the confirm button and shows a spinner while the API call runs */}
//       <ConfirmModal
//         isOpen={showClearModal}
//         onClose={() => setShowClearModal(false)}
//         onConfirm={() => clearCartMutation.mutate()}
//         title="Clear Cart?"
//         message="This will remove all items from your cart. This action cannot be undone."
//         confirmLabel="Clear Cart"
//         cancelLabel="Keep Items"
//         variant="danger"
//         // danger variant styles the confirm button in red to signal a destructive action
//         isLoading={clearCartMutation.isPending}
//       />
//     </div>
//   );
// };

// // Export so React Router can render this as the page for the /cart route
// export default Cart;
// ============================================================================
// Cart Page
// ----------------------------------------------------------------------------
// This is the full "/cart" page. It fetches the logged-in user's cart from
// the real backend API, shows every item in it, lets the user update
// quantities, remove single items, clear the whole cart (with a confirmation
// modal), apply/remove a coupon (inside CartSummary), proceed to checkout,
// and shows a small "You Might Also Like" product recommendation strip.
// Nothing in this file is fake — all data comes from real API/Redux state.
// ============================================================================

import { useEffect } from "react";
// useEffect is used twice in this file: once to redirect guests to the login
// page, and once to sync freshly-fetched cart data into the Redux store.

import { Link, useNavigate } from "react-router-dom";
// Link renders normal client-side navigation links (breadcrumb, "Continue
// Shopping"). useNavigate gives us a function to redirect programmatically
// (used for the login redirect and the "Start Shopping" empty-state button).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// useQuery fetches both the cart data and the "recommended products" list.
// useMutation runs the "clear cart" API call.
// useQueryClient lets us mark cached queries as stale so they refetch.

import { motion, AnimatePresence } from "framer-motion";
// AnimatePresence allows cart item rows to play an exit animation right
// before they're removed from the list. motion is imported for use by any
// animated child elements on this page.

import {
  AiOutlineArrowLeft, // Back-arrow icon used in the "Continue Shopping" link
  AiOutlineShoppingCart, // Cart icon used in the page header and the recommendations badge
  AiOutlineDelete, // Trash icon used on the "Clear Cart" button
} from "react-icons/ai";

import { getCart, clearCart } from "../../api/cart.api";
// getCart() → GET /api/v1/cart/ — fetches every item currently in the cart.
// clearCart() → DELETE /api/v1/cart/clear/ — removes every item at once.

import { getProducts } from "../../api/products.api";
// getProducts() fetches product listings — used here to populate the
// "You Might Also Like" recommendation section at the bottom of the page.

import useCart from "../../hooks/useCart";
// Custom hook exposing handleSyncCart() (writes fetched cart data into Redux)
// and clearCart() (empties the Redux cart slice after the API call succeeds).

import useAuth from "../../hooks/useAuth";
// Custom hook exposing isAuthenticated — used to guard this page against
// guests and to enable/disable the cart data query.

import { showSuccess, showError } from "../../components/ui/Toast";
// Helper functions that display green (success) or red (error) toast popups.

import { ROUTES } from "../../constants/routes";
// Shared route path constants — e.g. ROUTES.LOGIN, ROUTES.CART, ROUTES.PRODUCTS.

import { QUERY_KEYS } from "../../constants/queryKeys";
// Shared React Query cache key constants, e.g. QUERY_KEYS.CART, QUERY_KEYS.PRODUCTS.

import Container from "../../components/layouts/Container";
// Shared layout wrapper that centers content and applies consistent side
// padding — used on every page in the project for visual consistency.

import CartItem from "../../components/cart/CartItem";
// Renders a single row for one product in the cart (image, name, price,
// quantity selector, delete button).

import CartSummary from "../../components/cart/CartSummary";
// The sticky order-summary card on the right: price breakdown, coupon input,
// and the "Proceed to Checkout" button.

import ProductGrid from "../../components/shared/ProductGrid";
// Shared responsive product grid, reused here for the recommended products.

import { SkeletonCard } from "../../components/ui/Skeleton";
// Animated gray placeholder card — kept imported since it's available for
// use if a future loading state needs it.

import EmptyState from "../../components/ui/EmptyState";
// Shared "nothing here yet" component with an icon, title, description, and
// an optional call-to-action button — used here for the empty cart state.

import ConfirmModal from "../../components/ui/ConfirmModal";
// Shared confirmation dialog used before destructive actions — here it asks
// "Are you sure you want to clear your cart?" before actually clearing it.

import { useState } from "react";
// useState controls whether the "Clear Cart" confirmation modal is open.

import formatPrice from "../../utils/formatPrice";
// Currency formatting utility — kept imported since it's available for use
// on this page if needed directly (price display itself happens inside
// CartItem and CartSummary).

const Cart = () => {
  // Function used to change routes programmatically (redirects, button clicks).
  const navigate = useNavigate();

  // Shared React Query client, used to invalidate (refresh) cached queries.
  const queryClient = useQueryClient();

  // Pulls the current authentication status from the auth hook.
  const { isAuthenticated } = useAuth();

  // handleSyncCart writes the freshly-fetched API cart data into Redux.
  // clearCartRedux (renamed from clearCart to avoid clashing with the API
  // function of the same name) empties the Redux cart slice after a
  // successful "clear cart" API call.
  const { handleSyncCart, clearCart: clearCartRedux } = useCart();

  // Boolean state controlling whether the "Clear Cart?" confirmation modal
  // is currently open on screen.
  const [showClearModal, setShowClearModal] = useState(false);

  // --------------------------------------------------------------------------
  // EFFECT: Redirect guests to login
  // If the user is not logged in, immediately send them to the Login page.
  // We pass the current cart path as "from" state, so after a successful
  // login the app can redirect them straight back here automatically.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { from: { pathname: ROUTES.CART } } });
    }
  }, [isAuthenticated, navigate]);

  // --------------------------------------------------------------------------
  // QUERY: Fetch Cart Data
  // Calls GET /api/v1/cart/ and returns all items, subtotal, discount, and
  // coupon info. Only runs when the user is actually authenticated — there's
  // no point calling this endpoint for a logged-out guest.
  // staleTime of 2 minutes prevents this data from refetching too aggressively
  // while the user is simply browsing the page.
  // --------------------------------------------------------------------------
  const {
    data: cartData, // Raw response object from the API
    isLoading: cartLoading, // True while the very first fetch is in progress
    isError: cartError, // True if the fetch failed
  } = useQuery({
    queryKey: QUERY_KEYS.CART,
    queryFn: getCart,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  // Pulls the actual cart object out of the API response.
  // Defaults to null if the data hasn't arrived yet.
  const cart = cartData?.data || null;

  // Pulls the array of individual cart items out of the cart object.
  // Defaults to an empty array so the rest of the component can safely
  // render (e.g. cartItems.length) before real data has loaded.
  const cartItems = cart?.items || [];

  // --------------------------------------------------------------------------
  // EFFECT: Sync cart into Redux
  // Every time the fetched `cart` object changes, push it into the Redux
  // store. This keeps things like the navbar's cart-count badge accurate,
  // since Redux is the single source of truth other components read from.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (cart) {
      handleSyncCart(cart);
    }
  }, [cart]);

  // --------------------------------------------------------------------------
  // QUERY: Fetch Recommended Products
  // Loads the 4 newest products for the "You Might Also Like" section at the
  // bottom of the page. This is a completely separate query from the cart
  // data query, so the two load independently of one another.
  // --------------------------------------------------------------------------
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
    // The "cart-recommended" suffix makes this cache entry unique so it
    // doesn't collide with any other product listing query elsewhere in the app.
    queryKey: [...QUERY_KEYS.PRODUCTS, "cart-recommended"],
    queryFn: () => getProducts({ ordering: "-created_at", page: 1 }),
    // 5-minute cache — recommended products don't need to refresh very often.
    staleTime: 1000 * 60 * 5,
  });

  // Only keep the first 4 results, so the recommendation grid stays compact.
  const recommendedProducts = recommendedData?.data?.results?.slice(0, 4) || [];

  // --------------------------------------------------------------------------
  // MUTATION: Clear Cart
  // Calls DELETE /api/v1/cart/clear/ to remove every item from the cart at once.
  // --------------------------------------------------------------------------
  const clearCartMutation = useMutation({
    // Directly references the clearCart API function as the mutation function.
    mutationFn: clearCart,

    // Runs when the clear-cart request succeeds.
    onSuccess: () => {
      // Empties the Redux cart slice so the navbar badge drops to 0 instantly.
      clearCartRedux();
      // Marks the cart query as stale so it refetches and the page now shows
      // the empty-cart state.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Shows a green success toast confirming the action.
      showSuccess("Cart cleared successfully");
      // Closes the confirmation modal now that the action is complete.
      setShowClearModal(false);
    },

    // Runs when the clear-cart request fails.
    onError: () => {
      showError("Failed to clear cart. Please try again.");
    },
  });

  // ----------------------------------------------------------------------------
  // LOADING STATE
  // While the cart's very first fetch is still in progress, show a custom
  // skeleton layout that mirrors the real page's structure: a fake header,
  // fake item rows on the left, and a fake summary card on the right.
  // ----------------------------------------------------------------------------
  if (cartLoading) {
    return (
      <Container className="py-6 sm:py-8 md:px-12">
        {/* Skeleton header — a gray pulsing square plus two gray pulsing bars,
            matching the shape of the real gradient icon + title + subtitle. */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 animate-pulse shrink-0" />
          <div className="flex flex-col gap-2">
            <div className="h-6 sm:h-7 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Same 3-column grid shape as the real page: 2 columns of fake items
            on the left, 1 column of a fake summary card on the right. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left skeleton — 3 fake cart item rows, generated with .map() */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse"
              >
                <div className="flex gap-4">
                  {/* Fake square standing in for the product image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    {/* Fake bar standing in for the product name */}
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    {/* Fake bar standing in for the category label */}
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    {/* Fake bar standing in for the quantity selector */}
                    <div className="h-8 bg-gray-100 rounded w-24 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right skeleton — one fake order-summary card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit animate-pulse">
            {/* Fake bar standing in for the "Order Summary" heading */}
            <div className="h-5 bg-gray-100 rounded w-1/2 mb-4" />
            {/* Fake price-breakdown rows, generated with .map() */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between mb-3">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    );
  }

  // ----------------------------------------------------------------------------
  // MAIN RENDER (once loading has finished)
  // ----------------------------------------------------------------------------
  return (
    // Outer wrapper for the whole page.
    // relative + overflow-hidden → lets us place a decorative glow behind the
    //   header without it spilling outside the page or causing scrollbars.
    // min-h-screen → the page always fills at least the full viewport height,
    //   even if the cart only has one item.
    // bg-gray-50 → a soft off-white background that makes the white cards pop.
    <div className="relative overflow-hidden min-h-screen bg-gray-50 md:px-20">
      {/* Purely decorative ambient glow: a soft, blurred emerald circle
          positioned behind the header. pointer-events-none means it can
          never be clicked/interacted with. -z-10 keeps it strictly behind
          all real page content. This matches the same visual treatment
          already used on the Wishlist page for a consistent brand feel. */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Container centers the page content and applies consistent side padding */}
      <Container className="py-6 sm:py-8">
        {/* flex-col + gap-8 stacks every major section vertically with even spacing */}
        <div className="flex flex-col gap-8">
          {/* ─── Breadcrumb ─── */}
          {/* Simple "Home › Cart" trail so the user always knows where they are */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400">
            {/* Clickable link back to the homepage */}
            <Link
              to={ROUTES.HOME}
              className="hover:text-gray-600 transition-colors"
            >
              Home
            </Link>
            {/* Separator character between breadcrumb items */}
            <span className="text-gray-300">›</span>
            {/* Current page — not a link, shown in a slightly darker/bolder tone */}
            <span className="text-gray-600 font-medium">Cart</span>
          </nav>

          {/* ─── Page Heading ─── */}
          {/* Rounded gradient icon square next to a stacked title/subtitle block.
              This mirrors the header style already used on the Wishlist page,
              so both pages feel like part of the same design system. */}
          <div className="flex items-center gap-4">
            {/* Icon box: emerald gradient background, soft colored glow shadow */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
              <AiOutlineShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            {/* Title + subtitle text block */}
            <div>
              {/* Page title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                My Cart
              </h1>
              {/* Subtitle — changes wording depending on whether the cart has items */}
              <p className="text-sm text-gray-400 mt-0.5">
                {cartItems.length > 0 ? (
                  <>
                    You have{" "}
                    <span className="font-semibold text-primary-dark">
                      {cartItems.length}{" "}
                      {/* Shows "item" for exactly 1, "items" for anything else */}
                      {cartItems.length === 1 ? "item" : "items"}
                    </span>{" "}
                    waiting to check out
                  </>
                ) : (
                  "Review your items before checking out."
                )}
              </p>
            </div>
          </div>

          {/* ─── Empty Cart State ─── */}
          {/* Only rendered once loading has finished AND the cart is empty.
              Wrapped in a white, rounded, shadowed card so it feels like a
              proper "raised" element instead of floating on the bare page
              background — matching the same treatment on the Wishlist page. */}
          {!cartLoading && cartItems.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <EmptyState
                variant="emptyCart"
                actionLabel="Start Shopping"
                onAction={() => navigate(ROUTES.PRODUCTS)}
              />
            </div>
          )}

          {/* ─── Main Cart Layout ─── */}
          {/* Only rendered when there's at least one item in the cart.
              3-column grid on large screens: item list takes 2 columns,
              order summary takes the 3rd column. On mobile it stacks into
              a single column with items appearing above the summary. */}
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              {/* ── Left: Cart Items List ── */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* AnimatePresence with mode="popLayout" lets removed items
                    play their exit animation while the remaining items
                    smoothly slide up to fill the gap. */}
                <AnimatePresence mode="popLayout">
                  {cartItems.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onRemove={() => {
                        // After a single item is successfully removed,
                        // refresh the cart query so totals/discounts update.
                        queryClient.invalidateQueries({
                          queryKey: QUERY_KEYS.CART,
                        });
                      }}
                    />
                  ))}
                </AnimatePresence>

                {/* Row below the item list: "Continue Shopping" link on the
                    left, "Clear Cart" button on the right */}
                <div className="flex items-center justify-between pt-1">
                  {/* Takes the user back to the full products listing page */}
                  <Link
                    to={ROUTES.PRODUCTS}
                    className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary-dark transition-colors"
                  >
                    <AiOutlineArrowLeft className="w-3.5 h-3.5" />
                    Continue Shopping
                  </Link>

                  {/* "Clear Cart" button — only shown when there are 2+ items,
                      since a single item can just be deleted individually */}
                  {cartItems.length > 1 && (
                    <button
                      // Opens the confirmation modal instead of clearing immediately
                      onClick={() => setShowClearModal(true)}
                      className="flex items-center gap-1.5 text-sm text-danger font-semibold hover:text-red-700 transition-colors"
                    >
                      <AiOutlineDelete className="w-3.5 h-3.5" />
                      Clear Cart
                    </button>
                  )}
                </div>
              </div>

              {/* ── Right: Order Summary ── */}
              {/* lg:col-span-1 keeps this in the 3rd column on large screens.
                  The sticky positioning itself is handled inside CartSummary. */}
              <div className="lg:col-span-1">
                <CartSummary cart={cart} />
              </div>
            </div>
          )}

          {/* ─── You Might Also Like ─── */}
          {/* Only shown when the cart actually has items — hidden entirely
              on the empty-cart state so there's nothing to recommend from. */}
          {cartItems.length > 0 && (
            <section className="flex flex-col gap-6 pt-2 border-t border-gray-100">
              {/* Section header: title on the left, decorative icon badge on the right */}
              <div className="flex items-center justify-between pt-4">
                <h2 className="text-xl font-bold text-gray-900">
                  You Might Also Like
                </h2>
                {/* Gradient circular badge using the same brand gradient as
                    the page header above, for a consistent visual language */}
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20">
                  <AiOutlineShoppingCart className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Reusable product grid: 2 columns on mobile, 4 columns on
                  medium screens and up, showing the recommended products
                  fetched earlier (with its own built-in loading skeleton) */}
              <ProductGrid
                products={recommendedProducts}
                isLoading={recommendedLoading}
                skeletonCount={4}
                cols={{ default: 2, sm: 2, md: 4, lg: 4 }}
              />
            </section>
          )}
        </div>
      </Container>

      {/* ─── Clear Cart Confirmation Modal ─── */}
      {/* Rendered outside the main page layout so it can overlay the entire
          screen with a backdrop, regardless of scroll position. */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => clearCartMutation.mutate()}
        title="Clear Cart?"
        message="This will remove all items from your cart. This action cannot be undone."
        confirmLabel="Clear Cart"
        cancelLabel="Keep Items"
        // "danger" variant styles the confirm button in red to signal that
        // this action is destructive and cannot be undone.
        variant="danger"
        // While true, disables the confirm button and shows a spinner,
        // preventing the user from submitting the request twice.
        isLoading={clearCartMutation.isPending}
      />
    </div>
  );
};

// Exported as default so React Router can render this component for the "/cart" route.
export default Cart;
