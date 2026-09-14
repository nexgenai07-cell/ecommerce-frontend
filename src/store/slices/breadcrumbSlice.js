// ============================================================
// BREADCRUMB SLICE (Redux Toolkit)
// ============================================================
// This slice exists to solve ONE specific problem: the global
// <Breadcrumbs /> component (mounted once inside CustomerLayout and
// once inside AdminLayout — see those two files) builds its trail
// automatically from the current URL, using the static route-to-label
// map defined in src/constants/breadcrumbs.config.js.
//
// That works perfectly for every "list" style page (Products, Orders,
// Categories, Audit Logs, etc.) because their breadcrumb label never
// changes — it's always just "Products", always just "Orders".
//
// It does NOT work on its own for "detail" style pages reached via a
// dynamic URL segment, e.g.:
//   /products/:id        -> should show the REAL product name, not "Product"
//   /account/orders/:id  -> should show the REAL order number, not "Order"
//   /admin/orders/:id    -> same, on the admin side
//
// Those pages don't know their own real title until their own API
// call (useQuery) resolves. So this slice gives them a single shared
// place to publish that title once it's known — "dynamicLabel" — and
// the <Breadcrumbs /> component swaps its generic fallback label for
// this one whenever it's set.
//
// This mirrors the exact same "small global slice, one hook, one
// component" pattern already used for sidebar/modal/drawer state in
// uiSlice.js — kept consistent with the rest of this codebase instead
// of introducing a separate React Context just for this one feature.

import { createSlice } from "@reduxjs/toolkit";
// Importing createSlice to define this slice's state, reducers,
// and auto-generated action creators in one place.

// ----------------------------
// INITIAL STATE
// ----------------------------
const initialState = {
  // The real, human-readable title for whichever dynamic-detail page
  // is currently on screen (e.g. "Wireless Headphones Pro", "#ORD-1042").
  // null means "no page has published a dynamic title yet" — in that
  // case <Breadcrumbs /> simply falls back to the generic static label
  // from breadcrumbs.config.js (e.g. "Product Details").
  dynamicLabel: null,
};

// ----------------------------
// CREATING THE SLICE
// ----------------------------
const breadcrumbSlice = createSlice({
  // Prefix used for auto-generated action types (e.g. "breadcrumb/setLabel").
  // Also what shows up in Redux DevTools for easy debugging.
  name: "breadcrumb",

  // The default state defined above
  initialState,

  // All reducer functions that can modify the breadcrumb state
  reducers: {
    // --------------------------------------------------
    // REDUCER: setDynamicLabel
    // --------------------------------------------------
    // Publishes the real title for the current detail page.
    // action.payload is expected to be a non-empty string, e.g. the
    // product's name or the order's human-readable number.
    setDynamicLabel: (state, action) => {
      state.dynamicLabel = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: clearDynamicLabel
    // --------------------------------------------------
    // Resets the dynamic label back to null. This is dispatched
    // automatically by <Breadcrumbs /> itself on every route change
    // (see its useEffect keyed on location.pathname) — this is what
    // stops a stale product name from "leaking" onto the very next
    // page the admin/customer navigates to, for the brief moment
    // before that next page's own data has finished loading.
    clearDynamicLabel: (state) => {
      state.dynamicLabel = null;
    },
  },
});

// ----------------------------
// EXPORTING ACTIONS
// ----------------------------
// These auto-generated action creators can be dispatched from
// components (in practice, always via the useBreadcrumb hook below
// rather than directly), e.g.:
// dispatch(setDynamicLabel("Wireless Headphones Pro"))
// dispatch(clearDynamicLabel())
export const { setDynamicLabel, clearDynamicLabel } = breadcrumbSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
// This default export gets imported into the main store/index.js file
// and registered under the "breadcrumb" key in the combined reducer object.
export default breadcrumbSlice.reducer;
