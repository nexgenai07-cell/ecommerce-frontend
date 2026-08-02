// ============================================================================
// CartItem Component
// ----------------------------------------------------------------------------
// Renders a single row inside the Cart page's item list: product image,
// name, category, price, a quantity +/- selector, and a delete (trash) button.
// Every quantity change and every removal is sent to the real backend API and
// then synced into the Redux store so the navbar cart badge stays accurate.
// Framer Motion animates the whole row sliding out smoothly when it's removed.
// ============================================================================

import { useState, useRef } from "react";
// useState is used to hold the quantity value locally, so the UI can update
// instantly ("optimistically") before the server confirms the change.
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

  // --------------------------------------------------------------------------
  // MUTATION: Update Quantity
  // Sends the new quantity to the backend whenever the user clicks + or -.
  // --------------------------------------------------------------------------
  const updateMutation = useMutation({
    // mutationFn receives whatever value is passed to mutate(newQty).
    mutationFn: (newQty) => updateCartItem(item.id, { quantity: newQty }),

    // Runs when the update succeeds. The second argument (newQty) is the
    // value that was originally passed into mutate().
    onSuccess: (_, newQty) => {
      // Updates the Redux cart slice so the navbar total updates instantly.
      handleUpdateQuantity(item.id, newQty);
      // Marks the cart query as stale so React Query refetches fresh cart data.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },

    // Runs when the update fails (e.g. network error, out of stock, etc.).
    onError: () => {
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

    // Runs when the removal succeeds.
    onSuccess: () => {
      // Removes the item from the Redux cart slice so the navbar count drops.
      handleRemoveItem(item.id);
      // Refetches the cart query so the parent page shows updated data.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Shows a green success toast confirming the removal.
      showSuccess("Item removed from cart");
      // Calls the optional onRemove callback (only if the parent provided one),
      // letting the Cart page know this specific item id was removed.
      onRemove?.(item.id);
    },

    // Runs when the removal fails.
    onError: () => {
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

  // True only when between 1 and 5 units remain in stock (inclusive).
  // Used to conditionally show the orange "low stock" warning message.
  const isLowStock = item.product.stock <= 5 && item.product.stock > 0;

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
              Only {item.product.stock} left in stock
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
            max={item.product.stock || 99}
            disabled={updateMutation.isPending}
            size="sm"
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
