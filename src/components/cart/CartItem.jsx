// // Single cart item row shown inside the Cart page
// // Displays product image, name, category, price, quantity selector, and a delete button
// // Quantity changes and removals are sent to the real API and also synced to Redux
// // Framer Motion animates the item sliding out when it gets removed

// import { useState } from "react";
// // useState holds the local quantity value for optimistic UI updates

// import { Link } from "react-router-dom";
// // Link makes the product image and name clickable — navigates to the product detail page

// import { motion } from "framer-motion";
// // motion.div wraps the whole item so it can animate out smoothly when removed

// import { useMutation, useQueryClient } from "@tanstack/react-query";
// // useMutation handles API calls that change data (update quantity, remove item)
// // useQueryClient lets us refresh the cart query cache after a successful mutation

// import { AiOutlineDelete } from "react-icons/ai";
// // Trash can icon shown in the delete button on the right side of each item

// import { BsExclamationTriangle } from "react-icons/bs";
// // Warning triangle icon shown next to the low stock message

// import { ROUTES } from "../../constants/routes";
// // Centralized route constants — used to build the product detail URL with the product ID

// import { QUERY_KEYS } from "../../constants/queryKeys";
// // Centralized query key constants — used to invalidate the cart cache after mutations

// import { updateCartItem, removeCartItem } from "../../api/cart.api";
// // updateCartItem — calls PUT /api/v1/cart/update/{item_id}/ to change the quantity
// // removeCartItem — calls DELETE /api/v1/cart/remove/{item_id}/ to delete the item

// import useCart from "../../hooks/useCart";
// // Custom hook that gives us handleUpdateQuantity and handleRemoveItem to sync Redux cart state

// import { showSuccess, showError } from "../ui/Toast";
// // Toast notification helpers for success and error feedback after API calls

// import QuantitySelector from "../shared/QuantitySelector";
// // Reusable +/- quantity control component

// import formatPrice from "../../utils/formatPrice";
// // Utility function that formats a number into a readable currency string e.g. "$12.99"

// // item — a single cart item object from the API, contains product info + quantity + total_price
// // onRemove — optional callback called after successful removal, used by parent for exit animation
// const CartItem = ({ item, onRemove }) => {
//   const queryClient = useQueryClient();

//   // handleUpdateQuantity and handleRemoveItem sync the Redux cart store after API success
//   const { handleUpdateQuantity, handleRemoveItem } = useCart();

//   // Local quantity state — updated immediately when user clicks +/- for a snappy feel
//   // If the API call fails, this gets rolled back to the original item quantity
//   const [quantity, setQuantity] = useState(item.quantity);

//   // ─────────────────────────────────────────────
//   // UPDATE QUANTITY MUTATION
//   // Calls PUT /api/v1/cart/update/{item_id}/ with the new quantity
//   // On success: syncs Redux and refreshes cart cache
//   // On error: rolls back the local quantity to what it was before
//   // ─────────────────────────────────────────────
//   const updateMutation = useMutation({
//     // newQty is passed in when mutate(newQty) is called
//     mutationFn: (newQty) => updateCartItem(item.id, { quantity: newQty }),

//     onSuccess: (_, newQty) => {
//       // Second argument to onSuccess is the variable passed to mutate() — the new quantity
//       handleUpdateQuantity(item.id, newQty);
//       // Sync Redux cart store so the cart total in the navbar updates instantly
//       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
//       // Refresh the cart query so any other cart components also get updated data
//     },

//     onError: () => {
//       // Roll back the displayed quantity to match what was saved on the server
//       setQuantity(item.quantity);
//       showError("Failed to update quantity. Please try again.");
//     },
//   });

//   // ─────────────────────────────────────────────
//   // REMOVE ITEM MUTATION
//   // Calls DELETE /api/v1/cart/remove/{item_id}/
//   // On success: syncs Redux, refreshes cache, and notifies parent for exit animation
//   // ─────────────────────────────────────────────
//   const removeMutation = useMutation({
//     mutationFn: () => removeCartItem(item.id),

//     onSuccess: () => {
//       handleRemoveItem(item.id);
//       // Remove item from Redux so the navbar cart count decreases immediately
//       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
//       showSuccess("Item removed from cart");
//       onRemove?.(item.id);
//       // Optional chaining — only calls onRemove if the parent passed it as a prop
//     },

//     onError: () => {
//       showError("Failed to remove item. Please try again.");
//     },
//   });

//   // Called when user clicks + or - in the quantity selector
//   // Updates local state immediately for snappy UI, then fires the API call
//   const handleQuantityChange = (newQty) => {
//     setQuantity(newQty);
//     updateMutation.mutate(newQty);
//   };

//   // True when stock is critically low — triggers the orange warning message
//   // stock > 0 check ensures we don't show a warning on completely out-of-stock items
//   const isLowStock = item.product.stock <= 5 && item.product.stock > 0;

//   return (
//     // layout prop tells Framer Motion to animate repositioning when other items are removed
//     // exit animation slides the item left and collapses its height smoothly
//     <motion.div
//       layout
//       exit={{ opacity: 0, x: -20, height: 0 }}
//       transition={{ duration: 0.25 }}
//       className="flex items-start gap-4 p-4 bg-white rounded-xl border shadow-lg border-gray-100"
//     >
//       {/* ─── Product Image ─── */}
//       {/* Clicking the image navigates to the product detail page */}
//       {/* shrink-0 prevents the image from getting squished when the name is long */}
//       <Link
//         to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
//         className="shrink-0"
//       >
//         <img
//           src={item.product.primary_image || "/placeholder-product.png"}
//           // Falls back to a generic placeholder if the product has no image
//           alt={item.product.name}
//           className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-100"
//           // Slightly larger image on sm+ screens for better readability
//         />
//       </Link>

//       {/* ─── Product Details: Right of the image ─── */}
//       {/* flex-1 fills remaining width, min-w-0 prevents text overflow */}
//       <div className="flex-1 min-w-0 flex flex-col gap-2">
//         {/* Name + Delete button row */}
//         <div className="flex items-start justify-between gap-2">
//           <div className="min-w-0">
//             {/* Product name — clickable, navigates to product detail page */}
//             {/* line-clamp-2 truncates long names after 2 lines */}
//             <Link
//               to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
//               className="text-sm font-semibold text-gray-800 hover:text-primary transition-colors line-clamp-2 leading-snug"
//             >
//               {item.product.name}
//             </Link>

//             {/* Category name shown as a small grey label below the product name */}
//             {item.product.category?.name && (
//               <p className="text-xs text-gray-400 mt-0.5">
//                 {item.product.category.name}
//               </p>
//             )}
//           </div>

//           {/* Delete button — shows a spinner while the remove API call is in progress */}
//           <button
//             onClick={() => removeMutation.mutate()}
//             disabled={removeMutation.isPending}
//             // Disabled during API call to prevent double-clicking
//             aria-label="Remove item"
//             className="
//               p-1.5 text-gray-300 hover:text-danger
//               transition-colors rounded-lg hover:bg-danger-light
//               disabled:opacity-50 shrink-0
//             "
//             // shrink-0 keeps the button from getting compressed by long product names
//           >
//             {removeMutation.isPending ? (
//               // Spinning loader replaces the trash icon while deletion is in progress
//               <div className="w-4 h-4 border-2 border-gray-300 border-t-danger rounded-full animate-spin" />
//             ) : (
//               <AiOutlineDelete className="w-4 h-4" />
//             )}
//           </button>
//         </div>

//         {/* Low stock warning — only shown when 5 or fewer units remain */}
//         {isLowStock && (
//           <div className="flex items-center gap-1.5">
//             <BsExclamationTriangle className="w-3 h-3 text-warning shrink-0" />
//             <p className="text-xs text-warning font-medium">
//               Only {item.product.stock} left in stock
//             </p>
//           </div>
//         )}

//         {/* ─── Price + Quantity + Total Row ─── */}
//         {/* flex-wrap allows these three items to stack on very small screens */}
//         <div className="flex items-center justify-between gap-3 flex-wrap">
//           {/* Unit price — shows original price crossed out if there's a discount */}
//           <div className="flex items-center gap-2">
//             {parseFloat(item.product.original_price) >
//               parseFloat(item.product.price) && (
//               // Only render the strikethrough if original price is actually higher
//               <p className="text-xs text-gray-400 line-through">
//                 {formatPrice(parseFloat(item.product.original_price))}
//               </p>
//             )}
//             {/* Current selling price */}
//             <p className="text-sm text-gray-600 font-medium">
//               {formatPrice(parseFloat(item.product.price))}
//             </p>
//           </div>

//           {/* Quantity selector — disabled while an update API call is in progress */}
//           <QuantitySelector
//             value={quantity}
//             onChange={handleQuantityChange}
//             min={1}
//             // Minimum 1 — removing should use the delete button, not setting qty to 0
//             max={item.product.stock || 99}
//             // Cap at actual available stock so user can't order more than exists
//             disabled={updateMutation.isPending}
//             size="sm"
//             // Smaller size than the product detail page to fit compactly in the cart row
//           />

//           {/* Line total — quantity × unit price, calculated and returned by the API */}
//           <div className="text-right">
//             <p className="text-xs text-gray-400">Total</p>
//             <p className="text-sm font-bold text-gray-900">
//               {formatPrice(parseFloat(item.total_price))}
//             </p>
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// };

// // Export so the Cart page can import and render one CartItem per item in the cart
// export default CartItem;
// ============================================================================
// CartItem Component
// ----------------------------------------------------------------------------
// Renders a single row inside the Cart page's item list: product image,
// name, category, price, a quantity +/- selector, and a delete (trash) button.
// Every quantity change and every removal is sent to the real backend API and
// then synced into the Redux store so the navbar cart badge stays accurate.
// Framer Motion animates the whole row sliding out smoothly when it's removed.
// ============================================================================

import { useState } from "react";
// useState is used to hold the quantity value locally, so the UI can update
// instantly ("optimistically") before the server confirms the change.

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
  const handleQuantityChange = (newQty) => {
    setQuantity(newQty);
    updateMutation.mutate(newQty);
  };

  // True only when between 1 and 5 units remain in stock (inclusive).
  // Used to conditionally show the orange "low stock" warning message.
  const isLowStock = item.product.stock <= 5 && item.product.stock > 0;

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------
  return (
    // motion.div wraps the whole row so Framer Motion can animate it.
    // layout        → automatically animates this row sliding/repositioning
    //                  whenever a sibling item above/below it is removed.
    // exit          → the animation played right before this row is unmounted:
    //                  fades out, slides 20px left, and collapses its height to 0.
    // transition    → controls how long that exit animation takes (0.25 seconds).
    // className     → white card with rounded corners, a thin border, a subtle
    //                  shadow, and a slightly stronger shadow/border on hover
    //                  for a more premium, interactive feel.
    <motion.div
      layout
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-shadow duration-200"
    >
      {/* ─── Product Image ─── */}
      {/* Wrapping the image in a Link makes the whole image clickable,
          navigating to that product's detail page. shrink-0 stops the
          image from being squeezed if the product name text is very long. */}
      <Link
        to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
        className="shrink-0"
      >
        <img
          // Uses the product's real image if it exists, otherwise falls back
          // to a generic placeholder image so the layout never breaks.
          src={item.product.primary_image || "/placeholder-product.png"}
          alt={item.product.name}
          // Slightly bigger (24x24 instead of 20x20) on sm+ screens for readability.
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-100"
        />
      </Link>

      {/* ─── Product Details Column (everything to the right of the image) ─── */}
      {/* flex-1 makes this column take up all remaining horizontal space.
          min-w-0 is required so text truncation (line-clamp) actually works
          inside a flex container. */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Row containing the product name/category on the left and the
            delete button on the right */}
        <div className="flex items-start justify-between gap-2">
          {/* min-w-0 again ensures the long product name can wrap/truncate
              instead of pushing the delete button off-screen */}
          <div className="min-w-0">
            {/* Product name — clickable link to the product detail page.
                line-clamp-2 cuts the text off after 2 lines with an ellipsis
                if the name is too long. */}
            <Link
              to={ROUTES.PRODUCT_DETAIL.replace(":id", item.product.id)}
              className="text-sm font-semibold text-gray-800 hover:text-primary transition-colors line-clamp-2 leading-snug"
            >
              {item.product.name}
            </Link>

            {/* Category label — only rendered if the product actually has
                a category name attached to it. */}
            {item.product.category?.name && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.product.category.name}
              </p>
            )}
          </div>

          {/* Delete (trash) button for removing this item from the cart */}
          <button
            // Fires the remove-item mutation when clicked.
            onClick={() => removeMutation.mutate()}
            // Disabled while the delete request is in flight, to prevent
            // the user from double-clicking and firing duplicate requests.
            disabled={removeMutation.isPending}
            aria-label="Remove item"
            className="
              p-1.5 text-gray-300 hover:text-danger
              transition-colors rounded-lg hover:bg-danger-light
              disabled:opacity-50 shrink-0
            "
          >
            {/* Shows a small spinning loader while deleting is in progress,
                otherwise shows the static trash-can icon. */}
            {removeMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-danger rounded-full animate-spin" />
            ) : (
              <AiOutlineDelete className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Low stock warning row — only rendered when isLowStock is true */}
        {isLowStock && (
          <div className="flex items-center gap-1.5">
            {/* Small warning-triangle icon in orange (warning color) */}
            <BsExclamationTriangle className="w-3 h-3 text-warning shrink-0" />
            {/* Text telling the user exactly how many units remain */}
            <p className="text-xs text-warning font-medium">
              Only {item.product.stock} left in stock
            </p>
          </div>
        )}

        {/* ─── Bottom Row: Unit Price + Quantity Selector + Line Total ─── */}
        {/* flex-wrap lets these three blocks wrap onto multiple lines on
            very narrow screens instead of overflowing horizontally. */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Unit price block: shows the crossed-out original price (if any
              discount exists) next to the current selling price. */}
          <div className="flex items-center gap-2">
            {/* Only renders the strikethrough price if the original price
                is genuinely higher than the current selling price. */}
            {parseFloat(item.product.original_price) >
              parseFloat(item.product.price) && (
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(parseFloat(item.product.original_price))}
              </p>
            )}
            {/* The actual current selling price for one unit */}
            <p className="text-sm text-gray-600 font-medium">
              {formatPrice(parseFloat(item.product.price))}
            </p>
          </div>

          {/* Quantity +/- selector for this cart line */}
          <QuantitySelector
            // Current quantity value shown in the selector
            value={quantity}
            // Called whenever the user increases/decreases the quantity
            onChange={handleQuantityChange}
            // Minimum allowed quantity is 1 — to go to zero, the user should
            // use the delete button instead of this selector
            min={1}
            // Maximum allowed quantity is capped at whatever stock is
            // actually available for this product (falls back to 99)
            max={item.product.stock || 99}
            // Disabled while an update request is in flight
            disabled={updateMutation.isPending}
            // Smaller visual size to fit compactly inside this cart row
            size="sm"
          />

          {/* Line total block: quantity × unit price, already calculated
              server-side and returned as item.total_price */}
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

// Exported as default so the Cart page can import and render one CartItem
// component per item in the cartItems array.
export default CartItem;
