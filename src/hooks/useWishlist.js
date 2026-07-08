// ============================================================
// useWishlist - CUSTOM HOOK
// ============================================================
// This is a custom React hook that acts as a SHORTCUT for accessing
// wishlist-related state and actions from the Redux store.
//
// WHY THIS HOOK EXISTS:
// Without it, components would need to manually write useSelector/
// useDispatch calls and import all wishlist actions individually.
// This hook bundles everything together so components can simply do:
//   const { items, isProductInWishlist, handleAddToWishlist } = useWishlist();
//
// It's ALSO used to decide whether a product card's heart icon should
// be shown as FILLED (already in wishlist) or EMPTY (not in wishlist).

import { useSelector, useDispatch } from "react-redux";
// useSelector -> lets us READ data from the Redux store
// useDispatch -> lets us DISPATCH actions to update the Redux store

import {
  setWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  isInWishlist,
} from "../store/slices/wishlistSlice";
// Importing the action creators AND the "isInWishlist" selector function
// that were defined and exported from wishlistSlice.js

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
const useWishlist = () => {
  // --------------------------------------------------
  // READING WISHLIST STATE FROM REDUX
  // --------------------------------------------------
  // Pulling out "items" and "count" from the "wishlist" branch
  // of the Redux store, so components can use them directly.
  const { items, count } = useSelector(
    (state) => state.wishlist, // Access the "wishlist" branch of the Redux store
  );

  // --------------------------------------------------
  // GETTING THE DISPATCH FUNCTION
  // --------------------------------------------------
  // useDispatch gives us the "dispatch" function, used to send
  // actions to the Redux store so the wishlist reducers can run.
  const dispatch = useDispatch();

  // --------------------------------------------------
  // FUNCTION: handleSetWishlist
  // --------------------------------------------------
  // Dispatches the "setWishlist" action to overwrite the local Redux
  // wishlist state with fresh data fetched from the backend.
  // Typically called when the wishlist page loads and a TanStack Query
  // (useQuery) successfully fetches the wishlist from the API.
  const handleSetWishlist = (wishlistData) => {
    dispatch(setWishlist(wishlistData));
  };

  // --------------------------------------------------
  // FUNCTION: handleAddToWishlist
  // --------------------------------------------------
  // Dispatches the "addToWishlist" action to add a product to the
  // wishlist. Called when the user clicks an EMPTY heart icon on a
  // product card or product detail page.
  const handleAddToWishlist = (item) => {
    dispatch(addToWishlist(item));
  };

  // --------------------------------------------------
  // FUNCTION: handleRemoveFromWishlist
  // --------------------------------------------------
  // Dispatches the "removeFromWishlist" action to remove a product
  // from the wishlist. Called when the user clicks a FILLED heart icon
  // (meaning the product is already in the wishlist and they want to
  // remove it). itemId here refers to the wishlist ITEM's id.
  const handleRemoveFromWishlist = (itemId) => {
    dispatch(removeFromWishlist(itemId));
  };

  // --------------------------------------------------
  // FUNCTION: handleClearWishlist
  // --------------------------------------------------
  // Dispatches the "clearWishlist" action to empty the entire wishlist.
  // Typically called when the user logs out, so the next user on the
  // same browser doesn't see leftover wishlist data.
  const handleClearWishlist = () => {
    dispatch(clearWishlist());
  };

  // --------------------------------------------------
  // FUNCTION: isProductInWishlist
  // --------------------------------------------------
  // Given a specific product's ID, this checks whether that product
  // currently exists in the wishlist. It calls the "isInWishlist" pure
  // check function (imported from wishlistSlice.js), passing in the
  // `items` array we ALREADY selected above via useSelector — instead
  // of pulling in the entire Redux root state just for this check.
  // Used in product cards to decide whether to render a filled or
  // empty heart icon.
  const isProductInWishlist = (productId) => {
    return isInWishlist(items, productId);
  };

  // --------------------------------------------------
  // RETURNING VALUES & FUNCTIONS
  // --------------------------------------------------
  // Whatever this hook returns becomes available to any component
  // that calls useWishlist(). This bundles together both the current
  // wishlist STATE and the FUNCTIONS to modify/check that state.
  return {
    items, // Array of products currently in the wishlist
    count, // Number of items in the wishlist — used for navbar badge
    handleSetWishlist, // Function to sync Redux wishlist with backend data
    handleAddToWishlist, // Function to add a product to the wishlist
    handleRemoveFromWishlist, // Function to remove a product from the wishlist
    handleClearWishlist, // Function to clear the entire wishlist
    isProductInWishlist, // Function to check if a given product is in the wishlist
  };
};

// ----------------------------
// EXPORTING THE HOOK
// ----------------------------
// Default export so it can be imported in any component like:
// import useWishlist from "../hooks/useWishlist";
// const { items, isProductInWishlist, handleAddToWishlist } = useWishlist();
export default useWishlist;
