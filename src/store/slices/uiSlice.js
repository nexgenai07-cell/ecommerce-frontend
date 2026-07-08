// ============================================================
// UI SLICE (Redux Toolkit)
// ============================================================
// This slice manages GLOBAL UI state that isn't tied to any specific
// data/domain — things like whether the sidebar is open, which modal
// (if any) is currently active, and which drawer (if any) is open.
//
// Any component anywhere in the app can dispatch these actions to
// control shared UI elements, without needing to pass props down
// through multiple component layers (avoids "prop drilling").

import { createSlice } from "@reduxjs/toolkit";
// Importing createSlice to define this slice's state, reducers,
// and auto-generated action creators in one place.

// ----------------------------
// INITIAL STATE
// ----------------------------
// The default shape of the UI state when the app first loads.
const initialState = {
  // Controls whether the admin sidebar is expanded/visible.
  // Defaults to TRUE — meaning the sidebar is open by default
  // when the admin panel first loads.
  sidebarOpen: true,

  // Tracks which modal (if any) is currently open.
  // null means NO modal is currently showing.
  // When a modal needs to open, this will be set to a string
  // identifying which modal it is (e.g. "deleteProduct").
  activeModal: null,

  // Controls whether a drawer (slide-in panel) is currently open.
  // Defaults to FALSE — drawers are closed by default.
  drawerOpen: false,

  // Tracks WHICH drawer is currently open (since there can be
  // multiple types of drawers, e.g. cart drawer, filter drawer,
  // mobile menu drawer). null means no drawer is open.
  drawerType: null,
};

// ----------------------------
// CREATING THE SLICE
// ----------------------------
const uiSlice = createSlice({
  // Prefix used for auto-generated action types (e.g. "ui/toggleSidebar").
  // This name is also what appears in Redux DevTools for easy debugging.
  name: "ui",

  // The default state defined above
  initialState,

  // All reducer functions that can modify the UI state
  reducers: {
    // --------------------------------------------------
    // REDUCER: toggleSidebar
    // --------------------------------------------------
    // Flips the sidebar's open/closed state to its opposite value.
    // If it was open, it becomes closed, and vice versa.
    // Useful for a simple toggle button (e.g. a hamburger icon)
    // where you don't need to know the current state beforehand.
    toggleSidebar: (state) => {
      // The "!" flips true to false and false to true
      state.sidebarOpen = !state.sidebarOpen;
    },

    // --------------------------------------------------
    // REDUCER: setSidebarOpen
    // --------------------------------------------------
    // Forcefully sets the sidebar to a SPECIFIC open/closed state,
    // rather than toggling it. Useful in cases like:
    // - Closing the sidebar when the user clicks outside of it on mobile
    // - Programmatically opening it under certain conditions
    setSidebarOpen: (state, action) => {
      // Directly set sidebarOpen to whatever boolean value (true/false)
      // is passed in as the action's payload
      state.sidebarOpen = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: openModal
    // --------------------------------------------------
    // Opens a specific modal by storing its identifying name/key
    // in state. The actual modal component elsewhere in the app
    // checks this value to decide whether to render itself.
    // action.payload is expected to be a string identifying the modal,
    // e.g. "deleteProduct" or "confirmOrder".
    openModal: (state, action) => {
      // Save the modal's name/key so the matching modal component
      // knows it should now render/show itself
      state.activeModal = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: closeModal
    // --------------------------------------------------
    // Closes whichever modal is currently open by resetting
    // activeModal back to null (meaning "no modal is open").
    closeModal: (state) => {
      state.activeModal = null;
    },

    // --------------------------------------------------
    // REDUCER: openDrawer
    // --------------------------------------------------
    // Opens a specific drawer (a slide-in side panel) and remembers
    // WHICH type of drawer it is, since there can be multiple kinds
    // (e.g. "cart", "filter", "mobileMenu").
    // action.payload is expected to be a string identifying the drawer type.
    openDrawer: (state, action) => {
      // Mark the drawer as open
      state.drawerOpen = true;

      // Remember which specific drawer type should be shown
      state.drawerType = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: closeDrawer
    // --------------------------------------------------
    // Closes whichever drawer is currently open, and clears
    // the drawerType back to null since no drawer is active anymore.
    closeDrawer: (state) => {
      // Mark the drawer as closed
      state.drawerOpen = false;

      // Clear the drawer type since nothing is open now
      state.drawerType = null;
    },
  },
});

// ----------------------------
// EXPORTING ACTIONS
// ----------------------------
// These auto-generated action creators can be dispatched from components, e.g.:
// dispatch(toggleSidebar())
// dispatch(setSidebarOpen(false))
// dispatch(openModal("deleteProduct"))
// dispatch(closeModal())
// dispatch(openDrawer("cart"))
// dispatch(closeDrawer())
export const {
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  openDrawer,
  closeDrawer,
} = uiSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
// This default export gets imported into the main store.js file
// and registered under the "ui" key in the combined reducer object.
export default uiSlice.reducer;
