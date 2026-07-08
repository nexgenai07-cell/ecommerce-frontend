// Single cart item row shown inside the Cart page
// Displays product image, name, category, price, quantity selector, and a delete button
// Quantity changes and removals are sent to the real API and also synced to Redux
// Framer Motion animates the item sliding out when it gets removed

import { useState } from "react";
// useState holds the local quantity value for optimistic UI updates

import { Link } from "react-router-dom";
// Link makes the product image and name clickable — navigates to the product detail page

import { motion } from "framer-motion";
// motion.div wraps the whole item so it can animate out smoothly when removed

import { useMutation, useQueryClient } from "@tanstack/react-query";
// useMutation handles API calls that change data (update quantity, remove item)
// useQueryClient lets us refresh the cart query cache after a successful mutation

import { AiOutlineDelete } from "react-icons/ai";
// Trash can icon shown in the delete button on the right side of each item

import { BsExclamationTriangle } from "react-icons/bs";
// Warning triangle icon shown next to the low stock message

import { ROUTES } from "../../constants/routes";
// Centralized route constants — used to build the product detail URL with the product ID

import { QUERY_KEYS } from "../../constants/queryKeys";
// Centralized query key constants — used to invalidate the cart cache after mutations

import { updateCartItem, removeCartItem } from "../../api/cart.api";
// updateCartItem — calls PUT /api/v1/cart/update/{item_id}/ to change the quantity
// removeCartItem — calls DELETE /api/v1/cart/remove/{item_id}/ to delete the item

import useCart from "../../hooks/useCart";
// Custom hook that gives us handleUpdateQuantity and handleRemoveItem to sync Redux cart state

import { showSuccess, showError } from "../ui/Toast";
// Toast notification helpers for success and error feedback after API calls

import QuantitySelector from "../shared/QuantitySelector";
// Reusable +/- quantity control component

import formatPrice from "../../utils/formatPrice";
// Utility function that formats a number into a readable currency string e.g. "$12.99"

// item — a single cart item object from the API, contains product info + quantity + total_price
// onRemove — optional callback called after successful removal, used by parent for exit animation
const CartItem = ({ item, onRemove }) => {
  const queryClient = useQueryClient();

  // handleUpdateQuantity and handleRemoveItem sync the Redux cart store after API success
  const { handleUpdateQuantity, handleRemoveItem } = useCart();

  // Local quantity state — updated immediately when user clicks +/- for a snappy feel
  // If the API call fails, this gets rolled back to the original item quantity
  const [quantity, setQuantity] = useState(item.quantity);

  // ─────────────────────────────────────────────
  // UPDATE QUANTITY MUTATION
  // Calls PUT /api/v1/cart/update/{item_id}/ with the new quantity
  // On success: syncs Redux and refreshes cart cache
  // On error: rolls back the local quantity to what it was before
  // ─────────────────────────────────────────────
  const updateMutation = useMutation({
    // newQty is passed in when mutate(newQty) is called
    mutationFn: (newQty) => updateCartItem(item.id, { quantity: newQty }),

    onSuccess: (_, newQty) => {
      // Second argument to onSuccess is the variable passed to mutate() — the new quantity
      handleUpdateQuantity(item.id, newQty);
      // Sync Redux cart store so the cart total in the navbar updates instantly
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Refresh the cart query so any other cart components also get updated data
    },

    onError: () => {
      // Roll back the displayed quantity to match what was saved on the server
      setQuantity(item.quantity);
      showError("Failed to update quantity. Please try again.");
    },
  });

  // ─────────────────────────────────────────────
  // REMOVE ITEM MUTATION
  // Calls DELETE /api/v1/cart/remove/{item_id}/
  // On success: syncs Redux, refreshes cache, and notifies parent for exit animation
  // ─────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: () => removeCartItem(item.id),

    onSuccess: () => {
      handleRemoveItem(item.id);
      // Remove item from Redux so the navbar cart count decreases immediately
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      showSuccess("Item removed from cart");
      onRemove?.(item.id);
      // Optional chaining — only calls onRemove if the parent passed it as a prop
    },

    onError: () => {
      showError("Failed to remove item. Please try again.");
    },
  });

  // Called when user clicks + or - in the quantity selector
  // Updates local state immediately for snappy UI, then fires the API call
  const handleQuantityChange = (newQty) => {
    setQuantity(newQty);
    updateMutation.mutate(newQty);
  };

  // True when stock is critically low — triggers the orange warning message
  // stock > 0 check ensures we don't show a warning on completely out-of-stock items
  const isLowStock = item.product.stock <= 5 && item.product.stock > 0;

  return (
    // layout prop tells Framer Motion to animate repositioning when other items are removed
    // exit animation slides the item left and collapses its height smoothly
    <motion.div
      layout
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-4 p-4 bg-white rounded-xl border shadow-lg border-gray-100"
    >
      {/* ─── Product Image ─── */}
      {/* Clicking the image navigates to the product detail page */}
      {/* shrink-0 prevents the image from getting squished when the name is long */}
      <Link
        to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
        className="shrink-0"
      >
        <img
          src={item.product.primary_image || "/placeholder-product.png"}
          // Falls back to a generic placeholder if the product has no image
          alt={item.product.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-100"
          // Slightly larger image on sm+ screens for better readability
        />
      </Link>

      {/* ─── Product Details: Right of the image ─── */}
      {/* flex-1 fills remaining width, min-w-0 prevents text overflow */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Name + Delete button row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Product name — clickable, navigates to product detail page */}
            {/* line-clamp-2 truncates long names after 2 lines */}
            <Link
              to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
              className="text-sm font-semibold text-gray-800 hover:text-primary transition-colors line-clamp-2 leading-snug"
            >
              {item.product.name}
            </Link>

            {/* Category name shown as a small grey label below the product name */}
            {item.product.category?.name && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.product.category.name}
              </p>
            )}
          </div>

          {/* Delete button — shows a spinner while the remove API call is in progress */}
          <button
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            // Disabled during API call to prevent double-clicking
            aria-label="Remove item"
            className="
              p-1.5 text-gray-300 hover:text-danger
              transition-colors rounded-lg hover:bg-danger-light
              disabled:opacity-50 shrink-0
            "
            // shrink-0 keeps the button from getting compressed by long product names
          >
            {removeMutation.isPending ? (
              // Spinning loader replaces the trash icon while deletion is in progress
              <div className="w-4 h-4 border-2 border-gray-300 border-t-danger rounded-full animate-spin" />
            ) : (
              <AiOutlineDelete className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Low stock warning — only shown when 5 or fewer units remain */}
        {isLowStock && (
          <div className="flex items-center gap-1.5">
            <BsExclamationTriangle className="w-3 h-3 text-warning shrink-0" />
            <p className="text-xs text-warning font-medium">
              Only {item.product.stock} left in stock
            </p>
          </div>
        )}

        {/* ─── Price + Quantity + Total Row ─── */}
        {/* flex-wrap allows these three items to stack on very small screens */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Unit price — shows original price crossed out if there's a discount */}
          <div className="flex items-center gap-2">
            {parseFloat(item.product.original_price) >
              parseFloat(item.product.price) && (
              // Only render the strikethrough if original price is actually higher
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(parseFloat(item.product.original_price))}
              </p>
            )}
            {/* Current selling price */}
            <p className="text-sm text-gray-600 font-medium">
              {formatPrice(parseFloat(item.product.price))}
            </p>
          </div>

          {/* Quantity selector — disabled while an update API call is in progress */}
          <QuantitySelector
            value={quantity}
            onChange={handleQuantityChange}
            min={1}
            // Minimum 1 — removing should use the delete button, not setting qty to 0
            max={item.product.stock || 99}
            // Cap at actual available stock so user can't order more than exists
            disabled={updateMutation.isPending}
            size="sm"
            // Smaller size than the product detail page to fit compactly in the cart row
          />

          {/* Line total — quantity × unit price, calculated and returned by the API */}
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

// Export so the Cart page can import and render one CartItem per item in the cart
export default CartItem;
