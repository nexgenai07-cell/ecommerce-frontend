// ============================================================
// useCart - CUSTOM HOOK
// ============================================================
// This is a custom React hook that acts as a SHORTCUT for accessing
// cart-related state and actions from the Redux store.
//
// WHY THIS HOOK EXISTS:
// Without it, every component that needs cart info would have to write
// its own useSelector/useDispatch calls and import all the cart actions
// individually. This hook bundles everything together so components
// can simply do:
//   const { items, count, handleAddItem } = useCart();
// This keeps components clean and centralizes cart logic in one place.

import { useSelector, useDispatch } from "react-redux";
// useSelector -> lets us READ data from the Redux store
// useDispatch -> lets us DISPATCH actions to update the Redux store

import {
  syncCart,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
} from "../store/slices/cartSlice";
// Importing the specific action creators defined in cartSlice.js,
// so we can dispatch them from inside this hook.

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
const useCart = () => {
  // --------------------------------------------------
  // READING STATE FROM REDUX
  // --------------------------------------------------
  // Pulling out all the relevant cart fields from the "cart" branch
  // of the Redux store, so components can directly use them without
  // writing their own useSelector calls.
  const { items, count, total, subtotal, discountAmount, coupon } = useSelector(
    (state) => state.cart, // Access the "cart" branch of the Redux store
  );

  // --------------------------------------------------
  // GETTING THE DISPATCH FUNCTION
  // --------------------------------------------------
  // useDispatch gives us the "dispatch" function, used to send
  // actions to the Redux store so the cart reducers can run.
  const dispatch = useDispatch();

  // --------------------------------------------------
  // FUNCTION: handleSyncCart
  // --------------------------------------------------
  // Dispatches the "syncCart" action to overwrite the local Redux
  // cart state with fresh data fetched from the backend.
  // Typically called when the cart page loads and a TanStack Query
  // (useQuery) successfully fetches the cart from the API — its
  // onSuccess callback would call this function with the response data.
  const handleSyncCart = (cartData) => {
    dispatch(syncCart(cartData));
  };

  // --------------------------------------------------
  // FUNCTION: handleAddItem
  // --------------------------------------------------
  // Dispatches the "addItem" action to add a product to the cart.
  // Called from a product card or product detail page when the user
  // clicks an "Add to Cart" button. This gives instant UI feedback
  // before the backend confirms the change.
  const handleAddItem = (item) => {
    dispatch(addItem(item));
  };

  // --------------------------------------------------
  // FUNCTION: handleRemoveItem
  // --------------------------------------------------
  // Dispatches the "removeItem" action to remove a specific item
  // from the cart. Called from the cart page, typically when the
  // user clicks a "Remove" or trash icon button.
  // itemId here refers to the cart ITEM's id (not the product id).
  const handleRemoveItem = (itemId) => {
    dispatch(removeItem(itemId));
  };

  // --------------------------------------------------
  // FUNCTION: handleUpdateQuantity
  // --------------------------------------------------
  // Dispatches the "updateQuantity" action to change how many units
  // of a specific item are in the cart. Called from the cart page
  // when the user clicks + or - buttons (or types a new quantity).
  const handleUpdateQuantity = (itemId, quantity) => {
    dispatch(updateQuantity({ itemId, quantity }));
  };

  // --------------------------------------------------
  // FUNCTION: handleClearCart
  // --------------------------------------------------
  // Dispatches the "clearCart" action to empty the entire cart.
  // Typically called right after a successful checkout/order
  // placement, since the items have now been purchased and
  // shouldn't remain in the cart anymore.
  const handleClearCart = () => {
    dispatch(clearCart());
  };

  // --------------------------------------------------
  // RETURNING VALUES & FUNCTIONS
  // --------------------------------------------------
  // Whatever this hook returns becomes available to any component
  // that calls useCart(). This bundles together both the current
  // cart STATE and the FUNCTIONS to modify that state, all in one
  // convenient object.
  return {
    items, // Array of products currently in the cart
    count, // Number of items in the cart — used for navbar badge
    total, // Final payable amount (after discount)
    subtotal, // Total amount before any discount is applied
    discountAmount, // How much discount has been applied
    coupon, // Details of the currently applied coupon (if any)
    handleSyncCart, // Function to sync Redux cart with backend data
    handleAddItem, // Function to add an item to the cart
    handleRemoveItem, // Function to remove an item from the cart
    handleUpdateQuantity, // Function to update an item's quantity
    handleClearCart, // Function to clear the entire cart
  };
};

// ----------------------------
// EXPORTING THE HOOK
// ----------------------------
// Default export so it can be imported in any component like:
// import useCart from "../hooks/useCart";
// const { items, count, handleAddItem } = useCart();
export default useCart;
