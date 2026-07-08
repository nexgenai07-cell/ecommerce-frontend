import { useEffect } from "react";
// useEffect handles two side effects: redirect if not logged in, and Redux sync when cart loads

import { Link, useNavigate } from "react-router-dom";
// Link is used for breadcrumb and "Continue Shopping" navigation
// useNavigate redirects unauthenticated users to login and handles "Start Shopping" button

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// useQuery fetches cart data and recommended products from the API
// useMutation handles the clear cart API call
// useQueryClient lets us refresh the cart cache after mutations

import { motion, AnimatePresence } from "framer-motion";
// AnimatePresence enables exit animations when cart items are removed
// motion is available for animated elements within the page

import { AiOutlineArrowLeft, AiOutlineShoppingCart } from "react-icons/ai";
// AiOutlineArrowLeft — back arrow icon in the "Continue Shopping" link
// AiOutlineShoppingCart — cart icon shown in the "You Might Also Like" section header

import { getCart, clearCart } from "../../api/cart.api";
// getCart — calls GET /api/v1/cart/ to fetch the full cart with all items
// clearCart — calls DELETE /api/v1/cart/clear/ to remove all items at once

import { getProducts } from "../../api/products.api";
// getProducts — fetches newest products for the "You Might Also Like" section

import useCart from "../../hooks/useCart";
// handleSyncCart — syncs the API cart data into Redux on page load
// clearCart (clearCartRedux) — clears Redux cart state after the clear cart API succeeds

import useAuth from "../../hooks/useAuth";
// isAuthenticated — used to check login status and redirect if needed

import { showSuccess, showError } from "../../components/ui/Toast";
// Toast helpers for success and error feedback after the clear cart action

import { ROUTES } from "../../constants/routes";
// Centralized route constants — avoids hardcoding paths like "/login", "/products"

import { QUERY_KEYS } from "../../constants/queryKeys";
// Centralized query key constants used for caching and cache invalidation

import Container from "../../components/layouts/Container";
// Consistent max-width + padding wrapper used across all pages

import CartItem from "../../components/cart/CartItem";
// Renders a single cart item row with image, name, quantity selector, and delete button

import CartSummary from "../../components/cart/CartSummary";
// Sticky order summary card with price breakdown, coupon input, and checkout button

import ProductGrid from "../../components/shared/ProductGrid";
// Reusable grid for the recommended products section at the bottom

import { SkeletonCard } from "../../components/ui/Skeleton";
// Skeleton placeholder cards — imported and available if needed

import EmptyState from "../../components/ui/EmptyState";
// Friendly empty state UI shown when the cart has no items

import ConfirmModal from "../../components/ui/ConfirmModal";
// Confirmation dialog shown before clearing all cart items

import { useState } from "react";
// useState controls whether the clear cart confirmation modal is open

import formatPrice from "../../utils/formatPrice";
// Price formatter utility — imported and available if needed on this page

const Cart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // handleSyncCart pushes API cart data into Redux so the navbar cart count stays accurate
  // clearCartRedux empties the Redux cart store after a successful clear cart API call
  const { handleSyncCart, clearCart: clearCartRedux } = useCart();

  // Controls visibility of the "Are you sure you want to clear cart?" confirmation modal
  const [showClearModal, setShowClearModal] = useState(false);

  // Redirect unauthenticated users to the login page immediately
  // Passes the cart route as "from" so the user is sent back here after logging in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { from: { pathname: ROUTES.CART } } });
    }
  }, [isAuthenticated, navigate]);

  // ─────────────────────────────────────────────
  // FETCH CART DATA
  // Calls GET /api/v1/cart/ — returns all items, subtotal, discount, and coupon info
  // Only runs when the user is authenticated — no point fetching for guests
  // staleTime of 2 minutes avoids refetching too aggressively while browsing the page
  // ─────────────────────────────────────────────
  const {
    data: cartData,
    isLoading: cartLoading,
    isError: cartError,
  } = useQuery({
    queryKey: QUERY_KEYS.CART,
    queryFn: getCart,
    enabled: isAuthenticated,
    // Query is disabled entirely if the user is not logged in
    staleTime: 1000 * 60 * 2,
  });

  // Extract the cart object and items array from the API response
  const cart = cartData?.data || null;
  const cartItems = cart?.items || [];
  // Falls back to empty array so the rest of the page renders safely before data loads

  // Sync the fetched cart into Redux whenever the cart data changes
  // This keeps the navbar cart count badge in sync with the actual cart
  useEffect(() => {
    if (cart) {
      handleSyncCart(cart);
    }
  }, [cart]);

  // ─────────────────────────────────────────────
  // FETCH RECOMMENDED PRODUCTS
  // Shows the 4 newest products in the "You Might Also Like" section
  // Separate query from cart so they load independently
  // ─────────────────────────────────────────────
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "cart-recommended"],
    // "cart-recommended" suffix makes this cache entry unique from other product queries
    queryFn: () => getProducts({ ordering: "-created_at", page: 1 }),
    staleTime: 1000 * 60 * 5,
    // 5 minute cache — recommended products don't need to refresh as often
  });

  // Take only the first 4 results to keep the grid compact and clean
  const recommendedProducts = recommendedData?.data?.results?.slice(0, 4) || [];

  // ─────────────────────────────────────────────
  // CLEAR CART MUTATION
  // Calls DELETE /api/v1/cart/clear/ to remove all items at once
  // On success: clears Redux, refreshes cart cache, closes the modal
  // ─────────────────────────────────────────────
  const clearCartMutation = useMutation({
    mutationFn: clearCart,

    onSuccess: () => {
      clearCartRedux();
      // Clear Redux cart so the navbar cart count drops to 0 immediately
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Refresh the cart query so the page shows the empty state
      showSuccess("Cart cleared successfully");
      setShowClearModal(false);
      // Close the confirmation modal after successful clear
    },

    onError: () => {
      showError("Failed to clear cart. Please try again.");
    },
  });

  // ─── Loading State ───
  // Custom skeleton layout that matches the actual cart page structure
  // Shows placeholder item cards on the left and a summary skeleton on the right
  if (cartLoading) {
    return (
      <Container className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left skeleton — 3 fake cart item rows */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
              >
                <div className="flex gap-4">
                  {/* Fake product image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    {/* Fake product name */}
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    {/* Fake category label */}
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    {/* Fake quantity selector */}
                    <div className="h-8 bg-gray-100 rounded w-24 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right skeleton — fake order summary card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit animate-pulse">
            <div className="h-5 bg-gray-100 rounded w-1/2 mb-4" />
            {[1, 2, 3, 4].map((i) => (
              // Fake price breakdown rows
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

  return (
    // min-h-screen ensures the page fills the full viewport even with few items
    // bg-gray-50 gives a subtle off-white background behind the white cards
    <div className="min-h-screen bg-gray-50 px-25">
      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-8">
          {/* ─── Breadcrumb ─── */}
          {/* Simple Home > Cart path — no need for a separate component here */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link
              to={ROUTES.HOME}
              className="hover:text-gray-600 transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-600 font-medium">Cart</span>
          </nav>

          {/* ─── Page Heading ─── */}
          {/* Shows item count below the title when the cart has items */}
          <div className="flex flex-col gap-1 shadow-lg rounded-2xl p-3">
            <h1 className="text-3xl font-bold text-gray-900">My Cart</h1>
            {cartItems.length > 0 && (
              <p className="text-sm text-gray-500">
                You have{" "}
                <span className="font-semibold text-green-600">
                  {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                  {/* Correct singular/plural based on item count */}
                </span>{" "}
                in your cart
              </p>
            )}
          </div>

          {/* ─── Empty Cart State ─── */}
          {/* Shown after loading finishes and the cart has zero items */}
          {/* "Start Shopping" button takes the user to the products page */}
          {!cartLoading && cartItems.length === 0 && (
            <EmptyState
              variant="emptyCart"
              actionLabel="Start Shopping"
              onAction={() => navigate(ROUTES.PRODUCTS)}
            />
          )}

          {/* ─── Main Cart Layout ─── */}
          {/* Only rendered when there are items in the cart */}
          {/* 3-column grid: items take 2 columns, summary takes 1 column on large screens */}
          {/* Stacks vertically on mobile so items appear above the summary */}
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start shadow">
              {/* ── Left: Cart Items List ── */}
              <div className="lg:col-span-2 flex flex-col gap-4 shadow p-3">
                {/* AnimatePresence tracks items being removed and plays exit animations */}
                {/* mode="popLayout" makes remaining items smoothly reflow after one is removed */}
                <AnimatePresence mode="popLayout">
                  {cartItems.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onRemove={() => {
                        // Refresh cart data after an item is successfully removed
                        queryClient.invalidateQueries({
                          queryKey: QUERY_KEYS.CART,
                        });
                      }}
                    />
                  ))}
                </AnimatePresence>

                {/* Bottom row below the items — Continue Shopping link and Clear Cart button */}
                <div className="flex items-center justify-between pt-2">
                  {/* Navigate back to the products page to keep browsing */}
                  <Link
                    to={ROUTES.PRODUCTS}
                    className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                  >
                    <AiOutlineArrowLeft className="w-3.5 h-3.5" />
                    Continue Shopping
                  </Link>

                  {/* "Clear Cart" button — only shown when there are 2 or more items */}
                  {/* One item can just be deleted individually, so this button isn't needed */}
                  {cartItems.length > 1 && (
                    <button
                      onClick={() => setShowClearModal(true)}
                      // Opens the confirmation modal instead of clearing immediately
                      className="text-sm text-danger font-medium hover:underline"
                    >
                      Clear Cart
                    </button>
                  )}
                </div>
              </div>

              {/* ── Right: Order Summary ── */}
              {/* lg:col-span-1 keeps it in the third column on large screens */}
              {/* Sticky behavior is handled inside CartSummary itself */}
              <div className="lg:col-span-1 border border-green-300 rounded-2xl">
                <CartSummary cart={cart} />
              </div>
            </div>
          )}

          {/* ─── You Might Also Like ─── */}
          {/* Only shown when there are items in the cart — hides on empty cart */}
          {cartItems.length > 0 && (
            <section className="flex flex-col gap-6">
              {/* Section header with title and shopping cart icon */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  You Might Also Like
                </h2>
                {/* Dark circular badge with cart icon as a decorative accent */}
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
                  <AiOutlineShoppingCart className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* 4-column product grid — 2 columns on mobile, 4 on medium+ screens */}
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
      {/* Rendered outside the main layout so it overlays the full page */}
      {/* isLoading disables the confirm button and shows a spinner while the API call runs */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => clearCartMutation.mutate()}
        title="Clear Cart?"
        message="This will remove all items from your cart. This action cannot be undone."
        confirmLabel="Clear Cart"
        cancelLabel="Keep Items"
        variant="danger"
        // danger variant styles the confirm button in red to signal a destructive action
        isLoading={clearCartMutation.isPending}
      />
    </div>
  );
};

// Export so React Router can render this as the page for the /cart route
export default Cart;
