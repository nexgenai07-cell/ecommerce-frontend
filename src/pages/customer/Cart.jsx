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

import useFlyToIcon from "../../hooks/useFlyToIcon";
// dismissAllFromCart — plays the "every item pops out of the cart at once"
// animation when the whole cart is cleared.

import { showSuccess } from "../../components/ui/Toast";
// Helper function that displays a green success toast popup.

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
  // handleClearCart empties the Redux cart slice after a successful
  // "clear cart" API call.
  const { handleSyncCart, handleClearCart } = useCart();

  // Fly-to-icon trigger for the "Clear Cart" animation.
  const { dismissAllFromCart } = useFlyToIcon();

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
  //
  // IMPORTANT: the array is re-sorted by each item's own id (ascending)
  // rather than rendered in whatever order the backend happens to return.
  // A cart item's id is assigned once, when it's first added, and never
  // changes afterward — so sorting by it keeps the row order locked to
  // "the order the customer originally added things" regardless of
  // quantity changes or other items being removed, both of which
  // otherwise cause the backend's own ordering to shift around after
  // every refetch. The original array is never mutated directly.
  const cartItems = cart?.items
    ? [...cart.items].sort((a, b) => a.id - b.id)
    : [];

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

    // Runs IMMEDIATELY when mutate() is called, before waiting for the
    // network response. The backend has been observed to sometimes take
    // a while (or return an inconsistent response) even though the items
    // are genuinely deleted server-side — waiting for a "clean" success
    // response before updating anything meant the page could keep
    // showing the old items (and a false "failed" toast) until the
    // person manually refreshed. Clearing everything on screen right
    // away avoids that entirely; onSuccess/onError below just reconcile
    // with whatever the server actually ends up confirming.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });
      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, items: [] } };
      });
      handleClearCart();

      return { previousCart };
    },

    // Runs when the clear-cart request succeeds.
    onSuccess: () => {
      // Refetches for good measure, confirming the cart really is empty.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Shows a green success toast confirming the action.
      showSuccess("Cart cleared successfully");
      // Closes the confirmation modal now that the action is complete.
      setShowClearModal(false);
    },

    // Runs when the clear-cart request reports an error. Still refetches
    // the real cart state from the server instead of rolling back to the
    // stale "previousCart" snapshot — if the deletion actually succeeded
    // server-side despite the error response, this picks that up
    // immediately instead of requiring a manual page refresh.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      setShowClearModal(false);
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
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 animate-pulse shrink-0" />
          <div className="flex flex-col gap-2">
            <div className="h-6 sm:h-7 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 rounded w-24 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit animate-pulse">
            <div className="h-5 bg-gray-100 rounded w-1/2 mb-4" />
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
    <div className="relative overflow-hidden min-h-screen bg-gray-50 md:px-20">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-8">
          {/* ─── Breadcrumb ─── */}
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
              <AiOutlineShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                My Cart
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {cartItems.length > 0 ? (
                  <>
                    You have{" "}
                    <span className="font-semibold text-primary-dark">
                      {cartItems.length}{" "}
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
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex flex-col gap-4 max-h-130 overflow-y-auto scrollbar-hide pr-1">
                  <AnimatePresence mode="popLayout">
                    {cartItems.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onRemove={() => {
                          queryClient.invalidateQueries({
                            queryKey: QUERY_KEYS.CART,
                          });
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    to={ROUTES.PRODUCTS}
                    className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary-dark transition-colors"
                  >
                    <AiOutlineArrowLeft className="w-3.5 h-3.5" />
                    Continue Shopping
                  </Link>

                  {cartItems.length > 1 && (
                    <button
                      onClick={() => setShowClearModal(true)}
                      className="flex items-center gap-1.5 text-sm text-danger font-semibold hover:text-red-700 transition-colors"
                    >
                      <AiOutlineDelete className="w-3.5 h-3.5" />
                      Clear Cart
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1">
                <CartSummary cart={cart} />
              </div>
            </div>
          )}

          {/* ─── You Might Also Like ─── */}
          {cartItems.length > 0 && (
            <section className="flex flex-col gap-6 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between pt-4">
                <h2 className="text-xl font-bold text-gray-900">
                  You Might Also Like
                </h2>
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20">
                  <AiOutlineShoppingCart className="w-5 h-5 text-white" />
                </div>
              </div>

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
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          // Fires immediately, before the network call — every item's
          // photo pops out of the cart graphic and fans out at once.
          const imageUrls = cartItems.map(
            (item) => item.product.primary_image || "/placeholder-product.png",
          );
          dismissAllFromCart(imageUrls);
          clearCartMutation.mutate();
        }}
        title="Clear Cart?"
        message="This will remove all items from your cart. This action cannot be undone."
        confirmLabel="Clear Cart"
        cancelLabel="Keep Items"
        variant="danger"
        isLoading={clearCartMutation.isPending}
      />
    </div>
  );
};

export default Cart;
