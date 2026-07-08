// ============================================================
// WISHLIST SLICE (Redux Toolkit)
// ============================================================
// This slice manages the user's wishlist state:
// - The list of products saved to the wishlist
// - A count of how many items are in the wishlist (used for navbar badges, etc.)
//
// Any component in the app (e.g. a product card) can check whether
// a specific product is already in the wishlist, so it can show
// a filled heart icon vs an empty one.

import { createSlice } from "@reduxjs/toolkit";
// Importing createSlice to define this slice's state, reducers,
// and auto-generated action creators in one place.

// ----------------------------
// INITIAL STATE
// ----------------------------
// The default shape of the wishlist state before any data is loaded.
const initialState = {
  // Array holding all products currently saved in the wishlist.
  // Each item is expected to contain at least a wishlist item "id"
  // and the related "product" object.
  items: [],

  // Total number of items currently in the wishlist.
  // Used mainly to display a badge/counter in the navbar (e.g. a small "3"
  // next to the wishlist icon).
  count: 0,
};

// ----------------------------
// CREATING THE SLICE
// ----------------------------
const wishlistSlice = createSlice({
  // The name used as a prefix for auto-generated action types
  // (e.g. "wishlist/addToWishlist"). This is also what shows up
  // in Redux DevTools when inspecting state changes.
  name: "wishlist",

  // The default state defined above
  initialState,

  // All reducer functions that can modify the wishlist state
  reducers: {
    // --------------------------------------------------
    // REDUCER: setWishlist
    // --------------------------------------------------
    // Called after fetching the wishlist data from the backend —
    // typically when the wishlist page first loads, or after a
    // profile/account fetch that includes wishlist info.
    // This completely overwrites the local wishlist state with
    // the authoritative data coming from the server.
    setWishlist: (state, action) => {
      // Replace the items array with whatever the backend returned
      state.items = action.payload.items;

      // Recalculate the count based on how many items were returned
      state.count = action.payload.items.length;
    },

    // --------------------------------------------------
    // REDUCER: addToWishlist
    // --------------------------------------------------
    // Called when the user clicks the heart icon on a product card
    // or product detail page to add that product to their wishlist.
    addToWishlist: (state, action) => {
      // Check if this exact product already exists in the wishlist
      // by comparing the product's ID against all existing wishlist items.
      // This prevents duplicate entries for the same product.
      const alreadyExists = state.items.find(
        (item) => item.product.id === action.payload.product.id,
      );

      // Only add the product if it isn't already in the wishlist
      if (!alreadyExists) {
        // Push the new wishlist item (expected to include product info,
        // and possibly an id) into the items array
        state.items.push(action.payload);

        // Increase the count by 1 since a new item was added
        state.count += 1;
      }
      // If it already exists, do nothing — prevents duplicate wishlist entries
    },

    // --------------------------------------------------
    // REDUCER: removeFromWishlist
    // --------------------------------------------------
    // Called when the user clicks a FILLED heart icon to remove
    // a product from their wishlist.
    // action.payload here is expected to be the wishlist ITEM's id
    // (not the product id).
    removeFromWishlist: (state, action) => {
      // Keep all items EXCEPT the one whose id matches the payload
      state.items = state.items.filter((item) => item.id !== action.payload);

      // Recalculate count based on the new (shorter) items array
      state.count = state.items.length;
    },

    // --------------------------------------------------
    // REDUCER: clearWishlist
    // --------------------------------------------------
    // Called when the user logs out, to reset the wishlist state
    // back to empty (so the next user who logs in on the same
    // browser doesn't see the previous user's wishlist).
    clearWishlist: (state) => {
      // Empty out the items array completely
      state.items = [];

      // Reset the count back to zero
      state.count = 0;
    },
  },
});

// ----------------------------
// SELECTOR: isInWishlist
// ----------------------------
// A reusable, PURE check function that tells whether a SPECIFIC product
// (identified by productId) currently exists in the wishlist.
//
// IMPORTANT (Redux best practice): this takes the already-selected
// `items` ARRAY, never the full Redux root state. Passing the entire
// root state into a reusable selector is a well-known anti-pattern —
// React-Redux itself will warn "Selector unknown returned the root
// state when called" because a selector like that re-runs (and can
// cause re-renders) on EVERY store update, even ones totally unrelated
// to the wishlist (cart, auth, products, etc). By scoping this to just
// `items`, the component/hook that calls it controls exactly which
// slice of state it subscribes to via useSelector.
//
// Usage: const items = useSelector((state) => state.wishlist.items);
//        const inWishlist = isInWishlist(items, productId);
export const isInWishlist = (items, productId) =>
  items.some((item) => item.product.id === productId);

// ----------------------------
// EXPORTING ACTIONS
// ----------------------------
// These auto-generated action creators can be dispatched from components, e.g.:
// dispatch(setWishlist(backendWishlistData))
// dispatch(addToWishlist(newWishlistItem))
// dispatch(removeFromWishlist(wishlistItemId))
// dispatch(clearWishlist())
export const { setWishlist, addToWishlist, removeFromWishlist, clearWishlist } =
  wishlistSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
// This default export gets imported into the main store.js file
// and registered under the "wishlist" key in the combined reducer object.
export default wishlistSlice.reducer;
