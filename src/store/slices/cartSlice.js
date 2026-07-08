// ============================================================
// CART SLICE (Redux Toolkit)
// ============================================================
// This slice manages the shopping cart state on the frontend:
// - The list of items in the cart
// - Total item count
// - Pricing details (subtotal, discount, total)
// - Applied coupon info
//
// IMPORTANT BEHAVIOR:
// The UI updates IMMEDIATELY when these reducers run (optimistic update),
// giving the user instant feedback. The actual syncing with the backend
// (saving the cart to the database) happens separately via API calls
// (e.g. inside a useMutation), and once the backend responds, "syncCart"
// is used to make sure Redux state matches the real backend data exactly.

import { createSlice } from "@reduxjs/toolkit";
// Importing createSlice to define this slice's state, reducers,
// and auto-generated action creators in one place.

// ----------------------------
// INITIAL STATE
// ----------------------------
// The default shape of the cart state when the app first loads
// (i.e. before any cart data has been fetched or modified).
const initialState = {
  // Array holding all items currently in the cart.
  // Each item is expected to have its own id, product info, quantity, etc.
  items: [],

  // Total number of distinct items/lines in the cart
  // (Note: this seems to track number of cart entries, not total quantity).
  count: 0,

  // The final total price after applying discounts
  // (this is what the customer will actually pay).
  total: 0,

  // The price of all items combined BEFORE any discount is applied.
  subtotal: 0,

  // The amount of money deducted due to an applied discount/coupon.
  discountAmount: 0,

  // Holds the currently applied coupon/discount code details (if any).
  // Null means no coupon is currently applied.
  coupon: null,
};

// ----------------------------
// CREATING THE SLICE
// ----------------------------
const cartSlice = createSlice({
  // Prefix used for auto-generated action types (e.g. "cart/addItem")
  name: "cart",

  // The default state defined above
  initialState,

  // All the reducer functions that can modify cart state
  reducers: {
    // --------------------------------------------------
    // REDUCER: syncCart
    // --------------------------------------------------
    // Called after fetching the latest cart data from the backend
    // (e.g. on page load, or right after the backend confirms a cart change).
    // This OVERWRITES the entire cart state with the authoritative
    // data coming from the server, ensuring frontend and backend stay in sync.
    syncCart: (state, action) => {
      // Replace the items array with the backend's version of cart items
      state.items = action.payload.items;

      // Recalculate count based on how many items the backend returned
      state.count = action.payload.items.length;

      // Update subtotal (pre-discount total) from backend response
      state.subtotal = action.payload.subtotal;

      // Update discount amount from backend response
      // (Note: backend uses snake_case "discount_amount", mapped to camelCase here)
      state.discountAmount = action.payload.discount_amount;

      // Update the final total (after discount) from backend response
      state.total = action.payload.total;

      // Update the currently applied coupon info from backend response
      state.coupon = action.payload.coupon;
    },

    // --------------------------------------------------
    // REDUCER: addItem
    // --------------------------------------------------
    // Called when the user adds a product to their cart.
    // Handles two cases:
    // 1. If the product already exists in the cart -> just increase its quantity
    // 2. If it's a new product -> push it as a new item in the cart array
    addItem: (state, action) => {
      // Check if this product is already present in the cart
      // by comparing product IDs of existing items vs the incoming payload
      const existingItem = state.items.find(
        (item) => item.product.id === action.payload.product.id,
      );

      if (existingItem) {
        // Product already in cart -> just increase its quantity
        // by the quantity specified in the action payload
        existingItem.quantity += action.payload.quantity;
      } else {
        // Product not in cart yet -> add it as a brand new cart item
        state.items.push(action.payload);

        // Increase the item count since this is a new distinct item
        state.count += 1;
      }
      // NOTE: total/subtotal/discountAmount are NOT recalculated here.
      // This reducer only updates the items array locally for instant UI feedback;
      // accurate pricing totals are expected to come from the backend via syncCart.
    },

    // --------------------------------------------------
    // REDUCER: removeItem
    // --------------------------------------------------
    // Called when the user removes an item from their cart.
    // action.payload here is expected to be the cart item's ID (not product ID).
    removeItem: (state, action) => {
      // Filter out the item whose id matches the payload,
      // keeping everything else in the cart
      state.items = state.items.filter((item) => item.id !== action.payload);

      // Recalculate count based on the new (shorter) items array
      state.count = state.items.length;
    },

    // --------------------------------------------------
    // REDUCER: updateQuantity
    // --------------------------------------------------
    // Called when the user changes the quantity of a specific cart item
    // (e.g. using +/- buttons or a quantity input field).
    updateQuantity: (state, action) => {
      // Find the specific cart item by its id (matching payload.itemId)
      const item = state.items.find(
        (item) => item.id === action.payload.itemId,
      );

      // If found, update its quantity to the new value provided
      if (item) {
        item.quantity = action.payload.quantity;
      }
      // If not found, nothing happens (silently ignored)
    },

    // --------------------------------------------------
    // REDUCER: clearCart
    // --------------------------------------------------
    // Called when the entire cart needs to be emptied
    // (e.g. after a successful checkout/order placement).
    // Resets the cart state back to its default empty values.
    clearCart: (state) => {
      state.items = [];
      state.count = 0;
      state.total = 0;
      state.subtotal = 0;
      state.discountAmount = 0;
      state.coupon = null;
    },
  },
});

// ----------------------------
// EXPORTING ACTIONS
// ----------------------------
// These auto-generated action creators can be dispatched from components, e.g.:
// dispatch(addItem({ product, quantity }))
// dispatch(removeItem(itemId))
// dispatch(updateQuantity({ itemId, quantity }))
// dispatch(clearCart())
// dispatch(syncCart(backendCartData))
export const { syncCart, addItem, removeItem, updateQuantity, clearCart } =
  cartSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
// This default export is registered in the main store.js file
// under the "cart" key in the combined reducer object.
export default cartSlice.reducer;
