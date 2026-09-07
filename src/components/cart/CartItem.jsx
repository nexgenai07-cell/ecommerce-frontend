import { useState, useRef, useEffect } from "react";
// useState is used to hold the quantity value locally, so the UI can update
// instantly ("optimistically") before the server confirms the change.
// useEffect keeps that local value in sync when the server-side quantity
// changes from somewhere else (e.g. re-adding the product from its
// Product Detail page).
// useRef holds a reference to the actual <img> element below — the exact
// on-screen starting point for the "fly out of the cart" animation.

import { Link } from "react-router-dom";
// Link creates a client-side navigation link — used on the product image and
// product name so clicking either one takes the user to the product's detail page.

import { motion } from "framer-motion";
// motion.div wraps the entire row so we can animate it (e.g. sliding out and
// collapsing in height) when the item is deleted from the cart.

import { useMutation, useQueryClient } from "@tanstack/react-query";
// useMutation runs the "update quantity" and "remove item" API calls and
// tracks whether each one is pending, succeeded, or failed.
// useQueryClient gives access to the shared cache so we can mark the cart
// query as stale and trigger a refetch after a successful mutation.

import { AiOutlineDelete } from "react-icons/ai";
// Trash-can icon displayed inside the delete button on the right side of the row.

import { BsExclamationTriangle } from "react-icons/bs";
// Warning triangle icon shown next to the "low stock" message when applicable.

import { ROUTES } from "../../constants/routes";
// Shared route path constants (e.g. ROUTES.PRODUCT_DETAIL) — avoids typing
// raw URL strings directly in this file.

import { QUERY_KEYS } from "../../constants/queryKeys";
// Shared React Query cache key constants — used to tell React Query which
// cached data ("the cart") needs to be refreshed after a change.

import { updateCartItem, removeCartItem } from "../../api/cart.api";
// updateCartItem(id, { quantity }) → sends PUT /api/v1/cart/update/{item_id}/
// removeCartItem(id) → sends DELETE /api/v1/cart/remove/{item_id}/

import useCart from "../../hooks/useCart";
// Custom hook exposing handleUpdateQuantity() and handleRemoveItem(), which
// update the local Redux cart slice so other components (like the navbar
// cart icon) reflect changes immediately without waiting for a network refetch.

import useFlyToIcon from "../../hooks/useFlyToIcon";
// flyToCart       — plays the "fly into the cart graphic" animation when
//                   the quantity is increased.
// flyBackFromCart — plays the "pop out of the cart and return to this
// row" animation when the quantity is decreased — the row is still on
// screen, so it makes sense for the photo to land back on it.
// dismissFromCart — plays the "pop out of the cart graphic and fade
// off-screen" animation only when the row is deleted entirely (trash
// button), since then it's actually leaving the page for good.

import { showSuccess, showError } from "../ui/Toast";
// Helper functions that display a green (success) or red (error) toast popup.

import QuantitySelector from "../shared/QuantitySelector";
// Reusable "-  [number]  +" control shared across the Cart and Product Detail pages.

import formatPrice from "../../utils/formatPrice";
// Utility that converts a raw number (e.g. 1200) into a formatted currency
// string (e.g. "Rs. 1,200") for display.

// item — a single cart item object from the API: contains the product info,
//        the current quantity, and the calculated total_price for this line.
// onRemove — optional callback fired after a successful delete, so the parent
//            Cart page can refresh its own data / play its own exit animation.
const CartItem = ({ item, onRemove }) => {
  // Grabs the shared React Query client instance for this component.
  const queryClient = useQueryClient();

  // Pulls the two Redux-sync helper functions out of the useCart hook.
  const { handleUpdateQuantity, handleRemoveItem } = useCart();

  // Fly-to-icon triggers for this row's add/remove animations.
  const { flyToCart, flyBackFromCart, dismissFromCart } = useFlyToIcon();

  // Ref to the actual <img> element rendered below — the flight's exact
  // starting point (its on-screen position + the real product photo).
  const imageRef = useRef(null);

  // Local state holding the quantity currently shown on screen.
  // Initialized from the item's quantity as it exists in the API response.
  // If an update API call fails, this gets reset back to the original value.
  const [quantity, setQuantity] = useState(item.quantity);

  // Keeps the number above in sync whenever the cart's server-side quantity
  // for this item changes from somewhere OTHER than this row's own +/-
  // buttons — e.g. the customer re-adding this same product from the
  // Product Detail page, which updates the shared cart cache but does not
  // go through handleQuantityChange below. Without this, the price total
  // (read directly from the cache) would update instantly while this
  // number stayed stuck at its old value until the page was refreshed.
  useEffect(() => {
    setQuantity(item.quantity);
  }, [item.quantity]);

  // --------------------------------------------------------------------------
  // MUTATION: Update Quantity
  // Sends the new quantity to the backend whenever the user clicks + or -.
  // --------------------------------------------------------------------------
  const updateMutation = useMutation({
    // mutationFn receives whatever value is passed to mutate(newQty).
    mutationFn: (newQty) => updateCartItem(item.id, { quantity: newQty }),

    // Runs INSTANTLY, before the network request even finishes — writes the
    // new quantity straight into the shared cart cache so this row's line
    // total AND the cart-wide subtotal/total (rendered by CartSummary)
    // update on screen right away, instead of waiting for the update
    // request to complete and then waiting again for a follow-up refetch.
    onMutate: async (newQty) => {
      // Stop any in-flight cart refetch so it can't overwrite our
      // optimistic write below with stale data a moment later.
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });

      // Snapshot of the cache exactly as it was, so it can be restored
      // if the update ends up failing server-side.
      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data?.items) return old;

        const unitPrice = parseFloat(item.product.price) || 0;
        const oldSubtotal = parseFloat(old.data.subtotal) || 0;
        const oldTotal = parseFloat(old.data.total) || 0;

        // Recalculate just this one line's total from the unit price —
        // every other line is left completely untouched.
        const updatedItems = old.data.items.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: newQty,
                total_price: (unitPrice * newQty).toFixed(2),
              }
            : cartItem,
        );

        // Subtotal is simply the sum of every line total, so it can be
        // recalculated exactly on the frontend. The grand total is shifted
        // by that same difference so any already-applied coupon discount
        // stays proportionally correct until the server's own numbers
        // arrive a moment later and quietly replace this estimate.
        const newSubtotal = updatedItems.reduce(
          (sum, cartItem) => sum + parseFloat(cartItem.total_price || 0),
          0,
        );
        const newTotal = oldTotal + (newSubtotal - oldSubtotal);

        return {
          ...old,
          data: {
            ...old.data,
            items: updatedItems,
            subtotal: newSubtotal.toFixed(2),
            total: newTotal.toFixed(2),
          },
        };
      });

      // Handed to onError below so the optimistic write can be undone.
      return { previousCart };
    },

    // Runs when the update succeeds. The second argument (newQty) is the
    // value that was originally passed into mutate().
    onSuccess: (_, newQty) => {
      // Updates the Redux cart slice so the navbar total updates instantly.
      handleUpdateQuantity(item.id, newQty);
      // Quietly re-syncs with the authoritative server numbers in the
      // background — the screen already shows the right values from the
      // optimistic update above, so this refetch corrects silently rather
      // than being something the customer has to wait on.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },

    // Runs when the update fails (e.g. network error, out of stock, etc.).
    onError: (_err, _newQty, context) => {
      // Undoes the optimistic cache write from onMutate above, since the
      // change never actually happened server-side.
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      // Rolls the displayed quantity back to whatever the server last confirmed.
      setQuantity(item.quantity);
      // Shows a red error toast explaining the failure to the user.
      showError("Failed to update quantity. Please try again.");
    },
  });

  // --------------------------------------------------------------------------
  // MUTATION: Remove Item
  // Deletes this specific line item from the cart entirely.
  // --------------------------------------------------------------------------
  const removeMutation = useMutation({
    // mutationFn calls the removeCartItem API function with this item's id.
    mutationFn: () => removeCartItem(item.id),

    // Runs INSTANTLY, before the network request even finishes — pulls this
    // item straight out of the shared cart cache. The Cart page's list is
    // rendered directly from that cache, so this row disappears (and plays
    // its exit animation) and the subtotal/total shrink immediately, rather
    // than waiting on the delete request to complete and a follow-up refetch.
    onMutate: async () => {
      // Stop any in-flight cart refetch so it can't overwrite our
      // optimistic write below with stale data a moment later.
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });

      // Snapshot of the cache exactly as it was, so it can be restored
      // if the removal ends up failing server-side.
      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data?.items) return old;

        const oldSubtotal = parseFloat(old.data.subtotal) || 0;
        const oldTotal = parseFloat(old.data.total) || 0;
        const removedLineTotal = parseFloat(item.total_price) || 0;

        const updatedItems = old.data.items.filter(
          (cartItem) => cartItem.id !== item.id,
        );

        // Subtracting this line's own total from the subtotal is exact.
        // The grand total is shifted by that same amount so any
        // already-applied coupon discount stays proportionally correct
        // until the server's own numbers arrive a moment later and
        // quietly replace this estimate.
        const newSubtotal = oldSubtotal - removedLineTotal;
        const newTotal = oldTotal - removedLineTotal;

        return {
          ...old,
          data: {
            ...old.data,
            items: updatedItems,
            subtotal: newSubtotal.toFixed(2),
            total: newTotal.toFixed(2),
          },
        };
      });

      // Handed to onError below so the optimistic removal can be undone.
      return { previousCart };
    },

    // Runs when the removal succeeds.
    onSuccess: () => {
      // Removes the item from the Redux cart slice so the navbar count drops.
      handleRemoveItem(item.id);
      // Quietly re-syncs with the authoritative server numbers in the
      // background — the row is already gone and the totals already
      // reflect it, so this refetch corrects silently rather than being
      // something the customer has to wait on.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Shows a green success toast confirming the removal.
      showSuccess("Item removed from cart");
      // Calls the optional onRemove callback (only if the parent provided one),
      // letting the Cart page know this specific item id was removed.
      onRemove?.(item.id);
    },

    // Runs when the removal fails.
    onError: (_err, _vars, context) => {
      // Undoes the optimistic cache write from onMutate above, bringing
      // the row and the totals back since the deletion never actually
      // happened server-side.
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      // Shows a red error toast telling the user to try again.
      showError("Failed to remove item. Please try again.");
    },
  });

  // Fired whenever the QuantitySelector's + or - button is clicked.
  // Updates the local quantity immediately for a snappy feel, then sends the
  // actual API request in the background via the mutation above.
  //
  // Increasing flies the photo into the cart graphic. Decreasing flies it
  // back OUT of the cart graphic and returns it to this exact row — the
  // row is still right here on screen (only the trash button below
  // actually removes it for good), so returning to it reads more
  // naturally than dismissing off-screen.
  const handleQuantityChange = (newQty) => {
    const imageUrl = item.product.primary_image || "/placeholder-product.png";

    if (newQty > quantity) {
      flyToCart(imageRef.current, imageUrl);
    } else if (newQty < quantity) {
      flyBackFromCart(imageRef.current, imageUrl);
    }

    setQuantity(newQty);
    updateMutation.mutate(newQty);
  };

  // Fired when the trash icon is clicked. Fires the "pop out of the cart"
  // animation immediately — before the network call — since this row is
  // leaving the Cart page for good, then triggers the actual removal.
  const handleRemoveClick = () => {
    dismissFromCart(item.product.primary_image || "/placeholder-product.png");
    removeMutation.mutate();
  };

  // True only when between 1 and 5 units remain AVAILABLE to purchase
  // (inclusive) — i.e. total_stock minus whatever's already reserved by
  // other pending orders, not the raw total_stock figure.
  // Used to conditionally show the orange "low stock" warning message.
  const isLowStock =
    item.product.available_stock <= 5 && item.product.available_stock > 0;

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------
  return (
    <motion.div
      layout
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-shadow duration-200"
    >
      {/* ─── Product Image ─── */}
      <Link
        to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
        className="shrink-0"
      >
        <img
          ref={imageRef}
          src={item.product.primary_image || "/placeholder-product.png"}
          alt={item.product.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-100"
        />
      </Link>

      {/* ─── Product Details Column ─── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
              className="text-sm font-semibold text-gray-800 hover:text-primary transition-colors line-clamp-2 leading-snug"
            >
              {item.product.name}
            </Link>

            {item.product.category?.name && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.product.category.name}
              </p>
            )}
          </div>

          <button
            onClick={handleRemoveClick}
            disabled={removeMutation.isPending}
            aria-label="Remove item"
            className="
              p-1.5 text-gray-300 hover:text-danger
              transition-colors rounded-lg hover:bg-danger-light
              disabled:opacity-50 shrink-0
            "
          >
            {removeMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-danger rounded-full animate-spin" />
            ) : (
              <AiOutlineDelete className="w-4 h-4" />
            )}
          </button>
        </div>

        {isLowStock && (
          <div className="flex items-center gap-1.5">
            <BsExclamationTriangle className="w-3 h-3 text-warning shrink-0" />
            <p className="text-xs text-warning font-medium">
              Only {item.product.available_stock} left in stock
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {parseFloat(item.product.original_price) >
              parseFloat(item.product.price) && (
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(parseFloat(item.product.original_price))}
              </p>
            )}
            <p className="text-sm text-gray-600 font-medium">
              {formatPrice(parseFloat(item.product.price))}
            </p>
          </div>

          <QuantitySelector
            value={quantity}
            onChange={handleQuantityChange}
            min={1}
            max={item.product.available_stock || 99}
            disabled={updateMutation.isPending}
            size="sm"
            showMaxHint
            // showMaxHint: shows "Max N available" the moment the customer
            // reaches the product's stock limit, so the disabled + button
            // always explains itself instead of silently doing nothing
          />

          <div className="text-right">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-sm font-bold text-gray-900">
              {formatPrice(parseFloat(item.total_price))}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CartItem;
