import { useEffect } from "react";
// useEffect syncs freshly-fetched cart data into the Redux store.

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

import { getCart, clearCart, removeCartItem } from "../../api/cart.api";
// getCart() → GET /api/v1/cart/ — fetches every item currently in the cart.
// clearCart() → DELETE /api/v1/cart/clear/ — removes every item at once.
// removeCartItem() → DELETE /api/v1/cart/remove/{item_id}/ — removes one
// specific item, used below to power "Remove Selected".

import { getProducts } from "../../api/products.api";
// getProducts() fetches product listings — used here to populate the
// "You Might Also Like" recommendation section at the bottom of the page.

import useCart from "../../hooks/useCart";
// Custom hook exposing handleSyncCart() (writes fetched cart data into Redux)
// and clearCart() (empties the Redux cart slice after the API call succeeds).

import useFlyToIcon from "../../hooks/useFlyToIcon";
// dismissAllFromCart — plays the "every item pops out of the cart at once"
// animation when the whole cart is cleared.

import { showSuccess, showError } from "../../components/ui/Toast";
// Helper functions that display green (success) / red (error) toast popups.

import Button from "../../components/ui/Button";
// Shared button component — used by the "Remove Selected" bulk action bar.

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

  // handleSyncCart writes the freshly-fetched API cart data into Redux.
  // handleClearCart empties the Redux cart slice after a successful
  // "clear cart" API call.
  const { handleSyncCart, handleClearCart } = useCart();

  // Fly-to-icon trigger for the "Clear Cart" animation.
  const { dismissAllFromCart } = useFlyToIcon();

  // Boolean state controlling whether the "Clear Cart?" confirmation modal
  // is currently open on screen.
  const [showClearModal, setShowClearModal] = useState(false);

  // Bulk-select state for the "Remove Selected" action bar — a Set of
  // cart item ids (item.id, matching what removeCartItem expects).
  // NOTE: there is no bulk/partial checkout endpoint documented on the
  // backend (checkout() always converts the ENTIRE cart into an order),
  // so selection here is intentionally scoped to bulk removal only —
  // not "select items to check out".
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);

  // --------------------------------------------------------------------------
  // QUERY: Fetch Cart Data
  // Calls GET /api/v1/cart/ and returns all items, subtotal, discount, and
  // coupon info. Guest carts are fully supported by the backend now (v3.0):
  // a logged-out visitor gets an anonymous server-side cart identified by
  // the X-Cart-Session header (attached automatically by axiosInstance —
  // see src/lib/axiosInstance.js), so this page no longer forces a login
  // redirect and the query runs for everyone, guest or logged in.
  // Login/registration is only required later, at "Proceed to Checkout"
  // (ROUTES.CHECKOUT is wrapped in ProtectedRoute in App.jsx).
  // staleTime of 2 minutes prevents this data from refetching too aggressively
  // while the user is simply browsing the page.
  // --------------------------------------------------------------------------
  const {
    data: cartData, // Raw response object from the API
    isLoading: cartLoading, // True while the very first fetch is in progress
    isError: cartError, // True if the fetch failed
  } = useQuery({
    queryKey: QUERY_KEYS.CART,
    queryFn: ({ signal }) => getCart(signal),
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
    queryFn: ({ signal }) =>
      getProducts({ ordering: "-created_at", page: 1 }, signal),
    // 5-minute cache — recommended products don't need to refresh very often.
    staleTime: 1000 * 60 * 5,
  });

  // Only keep the first 4 results, so the recommendation grid stays compact.
  const recommendedProducts = recommendedData?.data?.results?.slice(0, 4) || [];

  // --------------------------------------------------------------------------
  // BULK SELECTION HELPERS
  // --------------------------------------------------------------------------
  const toggleSelect = (itemId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const isAllSelected =
    cartItems.length > 0 && selectedIds.size === cartItems.length;

  const toggleSelectAll = () => {
    setSelectedIds(
      isAllSelected ? new Set() : new Set(cartItems.map((i) => i.id)),
    );
  };

  // handleRemoveSelected — removes every selected cart item, one after
  // another, via the same removeCartItem endpoint each row's own trash
  // button uses, then invalidates the cart query once at the end so the
  // subtotal/total and navbar badge all pick up the final state in one
  // refetch rather than one per item.
  const handleRemoveSelected = async () => {
    setIsBulkRemoving(true);
    try {
      const idsToRemove = [...selectedIds];
      let failedCount = 0;
      for (const itemId of idsToRemove) {
        try {
          await removeCartItem(itemId);
        } catch {
          // Continues removing the rest of the selection even if one
          // item fails — a single stale/already-removed row shouldn't
          // block the others. Counted below so the final toast is
          // honest about a partial failure instead of always claiming
          // full success.
          failedCount += 1;
        }
      }
      const removedCount = idsToRemove.length - failedCount;
      if (removedCount > 0) {
        showSuccess(
          `${removedCount} item${removedCount === 1 ? "" : "s"} removed from cart${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
        );
      }
      if (removedCount === 0) {
        showError("Failed to remove the selected items. Please try again.");
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      setSelectedIds(new Set());
    } finally {
      setIsBulkRemoving(false);
    }
  };

  // --------------------------------------------------------------------------
  // MUTATION: Clear Cart
  // Calls DELETE /api/v1/cart/clear/ to remove every item from the cart at once.
  // --------------------------------------------------------------------------
  const clearCartMutation = useMutation({
    // Directly references the clearCart API function as the mutation function.
    mutationFn: () => clearCart(),

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
  // While the cart's very first fetch is still in progress, show a skeleton
  // layout that mirrors the real page's structure exactly — same outer
  // wrapper and padding, same breadcrumb, same item-row content (image,
  // title, category, price/quantity/total row), and the same fully-built
  // order summary card (price breakdown, coupon box, checkout button,
  // payment icons, and trust badges). Matching all of this precisely is
  // what stops the page from visibly growing taller the instant the real
  // cart data replaces this placeholder.
  // ----------------------------------------------------------------------------
  if (cartLoading) {
    return (
      <div className="relative overflow-hidden min-h-screen bg-gray-50 md:px-20">
        <Container className="py-6 sm:py-8">
          <div className="flex flex-col gap-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
              <span className="text-gray-300">›</span>
              <div className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Page heading — icon box + title/subtitle stack */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-200 animate-pulse shrink-0" />
              <div className="flex flex-col gap-2">
                <div className="h-7 sm:h-8 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-52 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Item rows — same shape as CartItem.jsx: responsive image,
                  a 2-line title/category block, and a price/quantity/total
                  row underneath */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-xl animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-3 flex-wrap mt-1">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex flex-col items-end gap-1">
                          <div className="h-3 w-8 bg-gray-100 rounded animate-pulse" />
                          <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order summary card — full shape: heading, price breakdown,
                  divider, total row, coupon input, checkout button, payment
                  icons, and trust badges, matching CartSummary.jsx exactly */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 flex flex-col gap-5 h-fit">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>

                {/* Coupon input row */}
                <div className="flex gap-2">
                  <div className="flex-1 h-10.5 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="w-16 h-10.5 bg-gray-100 rounded-xl animate-pulse shrink-0" />
                </div>

                {/* Proceed to Checkout button */}
                <div className="w-full h-12.5 bg-gray-200 rounded-xl animate-pulse" />

                {/* Payment method pills */}
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-6 bg-gray-100 rounded-md animate-pulse" />
                  <div className="w-8 h-6 bg-gray-100 rounded-md animate-pulse" />
                  <div className="w-12 h-6 bg-gray-100 rounded-md animate-pulse" />
                </div>

                {/* Trust badges */}
                <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 bg-gray-100 rounded-full animate-pulse shrink-0" />
                      <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── You Might Also Like — skeleton ───────────────────────────
                The real page only renders this section once cartItems.length
                is greater than 0, which is never true yet during this very
                first loading phase — so without a placeholder here, the
                whole section used to pop into existence out of nowhere the
                moment the cart finished loading, instead of already being
                on screen. Reusing ProductGrid with isLoading={true} guarantees
                this placeholder is pixel-identical to the real section's
                own loading state, since it's the exact same component. */}
            <section className="flex flex-col gap-6 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between pt-4">
                <div className="h-7 w-52 bg-gray-200 rounded animate-pulse" />
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              </div>

              <ProductGrid
                products={[]}
                isLoading={true}
                skeletonCount={4}
                cols={{ default: 2, sm: 2, md: 4, lg: 4 }}
              />
            </section>
          </div>
        </Container>
      </div>
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
                {/* Bulk-select bar — "Select all" checkbox always visible with
                    more than one item; "Remove Selected" only appears once
                    something is actually checked. There is no bulk-checkout
                    action here since the backend's checkout endpoint always
                    converts the entire cart, not a chosen subset. */}
                {cartItems.length > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      {selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : "Select all"}
                    </label>

                    {selectedIds.size > 0 && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveSelected}
                        isLoading={isBulkRemoving}
                        className="w-full sm:w-auto"
                      >
                        Remove Selected
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-4 max-h-130 overflow-y-auto scrollbar-hide pr-1">
                  <AnimatePresence mode="popLayout">
                    {cartItems.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onRemove={(id) => {
                          setSelectedIds((prev) => {
                            if (!prev.has(id)) return prev;
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                          });
                          queryClient.invalidateQueries({
                            queryKey: QUERY_KEYS.CART,
                          });
                        }}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={
                          cartItems.length > 1 ? toggleSelect : undefined
                        }
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
