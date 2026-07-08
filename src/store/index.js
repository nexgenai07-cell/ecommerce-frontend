// ============================================================
// REDUX STORE CONFIGURATION
// ============================================================
// This is the main Redux store file for the entire application.
// It combines all individual "slices" (separate pieces of state logic)
// into one single, centralized store.
//
// HOW IT'S USED:
// - This store is provided to the whole app via the <Provider> component
//   (usually wrapped around <App /> in main.jsx or App.jsx).
// - Once provided, any component in the app can access this state
//   using hooks like useSelector() and dispatch actions using useDispatch().

import { configureStore } from "@reduxjs/toolkit";

// Importing each individual slice's reducer.
// Each slice manages its own piece of state + its own actions/reducers,
// keeping the codebase modular and organized.

import authReducer from "./slices/authSlice"; // Handles authentication state (user info, login status, tokens, etc.)
import cartReducer from "./slices/cartSlice"; // Handles shopping cart state (items, quantities, totals, etc.)
import wishlistReducer from "./slices/wishlistSlice"; // Handles wishlist state (saved/favorited products)
import uiReducer from "./slices/uiSlice"; // Handles general UI state (e.g. modals, sidebars, loaders, theme, etc.)

// Creating the actual Redux store using Redux Toolkit's configureStore().
// configureStore() automatically sets up good defaults like:
// - Redux DevTools support
// - Thunk middleware for async logic
// - Basic immutability/serializability checks in development

export const store = configureStore({
  // The "reducer" object maps each slice's reducer to a specific
  // key in the global state tree. For example:
  // state.auth      -> managed by authReducer
  // state.cart      -> managed by cartReducer
  // state.wishlist  -> managed by wishlistReducer
  // state.ui        -> managed by uiReducer
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    ui: uiReducer,
  },
});
