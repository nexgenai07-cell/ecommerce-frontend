// ============================================================
// useUI - CUSTOM HOOK
// ============================================================
// This is a custom React hook that acts as a SHORTCUT for accessing
// and controlling global UI state from the Redux store — specifically
// the sidebar, modals, and drawers.
//
// WHY THIS HOOK EXISTS:
// Without it, every component that needs to open/close a modal or
// drawer would have to manually write useSelector/useDispatch calls
// and import all the UI actions individually. This hook bundles
// everything together so components can simply do:
//   const { isModalOpen, handleOpenModal } = useUI();
// This keeps components clean and centralizes UI control logic.

import { useSelector, useDispatch } from "react-redux";
// useSelector -> lets us READ data from the Redux store
// useDispatch -> lets us DISPATCH actions to update the Redux store

import {
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  openDrawer,
  closeDrawer,
} from "../store/slices/uiSlice";
// Importing the specific action creators defined in uiSlice.js,
// so we can dispatch them from inside this hook.

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
const useUI = () => {
  // --------------------------------------------------
  // READING STATE FROM REDUX
  // --------------------------------------------------
  // Pulling out sidebarOpen, activeModal, drawerOpen, and drawerType
  // from the "ui" branch of the Redux store, so components can use
  // them directly without writing their own useSelector calls.
  const { sidebarOpen, activeModal, drawerOpen, drawerType } = useSelector(
    (state) => state.ui, // Access the "ui" branch of the Redux store
  );

  // --------------------------------------------------
  // GETTING THE DISPATCH FUNCTION
  // --------------------------------------------------
  // useDispatch gives us the "dispatch" function, used to send
  // actions to the Redux store so the UI reducers can run.
  const dispatch = useDispatch();

  // --------------------------------------------------
  // FUNCTION: handleToggleSidebar
  // --------------------------------------------------
  // Dispatches the "toggleSidebar" action, which flips the sidebar's
  // current open/closed state to its opposite value.
  // Useful for a simple toggle button (e.g. a hamburger icon).
  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  // --------------------------------------------------
  // FUNCTION: handleSetSidebar
  // --------------------------------------------------
  // Dispatches the "setSidebarOpen" action to forcefully set the
  // sidebar to a SPECIFIC state (true = open, false = closed),
  // instead of just toggling it. Useful for cases like closing the
  // sidebar when the user clicks outside of it on mobile.
  const handleSetSidebar = (value) => {
    dispatch(setSidebarOpen(value));
  };

  // --------------------------------------------------
  // FUNCTION: handleOpenModal
  // --------------------------------------------------
  // Dispatches the "openModal" action to open a specific modal,
  // identified by its name (e.g. "deleteProduct", "confirmOrder").
  // The matching modal component elsewhere checks this name to decide
  // whether to render itself.
  const handleOpenModal = (modalName) => {
    dispatch(openModal(modalName));
  };

  // --------------------------------------------------
  // FUNCTION: handleCloseModal
  // --------------------------------------------------
  // Dispatches the "closeModal" action to close whichever modal
  // is currently open, resetting activeModal back to null.
  const handleCloseModal = () => {
    dispatch(closeModal());
  };

  // --------------------------------------------------
  // FUNCTION: handleOpenDrawer
  // --------------------------------------------------
  // Dispatches the "openDrawer" action to open a specific drawer,
  // identified by its type (e.g. "cart", "mobileMenu", "filter").
  // Sets drawerOpen to true and stores which drawer type should show.
  const handleOpenDrawer = (drawerType) => {
    dispatch(openDrawer(drawerType));
  };

  // --------------------------------------------------
  // FUNCTION: handleCloseDrawer
  // --------------------------------------------------
  // Dispatches the "closeDrawer" action to close whichever drawer
  // is currently open, resetting both drawerOpen and drawerType.
  const handleCloseDrawer = () => {
    dispatch(closeDrawer());
  };

  // --------------------------------------------------
  // FUNCTION: isModalOpen
  // --------------------------------------------------
  // A helper function to check whether a SPECIFIC modal (by name)
  // is currently the active one. Compares the given modalName
  // against the current activeModal value in state.
  // Usage: isModalOpen("deleteProduct") -> returns true/false
  const isModalOpen = (modalName) => {
    return activeModal === modalName;
  };

  // --------------------------------------------------
  // FUNCTION: isDrawerOpen
  // --------------------------------------------------
  // A helper function to check whether a SPECIFIC drawer (by type)
  // is currently open. It checks BOTH that some drawer is open
  // (drawerOpen is true) AND that its type matches the given type.
  // Usage: isDrawerOpen("cart") -> returns true/false
  const isDrawerOpen = (type) => {
    return drawerOpen && drawerType === type;
  };

  // --------------------------------------------------
  // RETURNING VALUES & FUNCTIONS
  // --------------------------------------------------
  // Whatever this hook returns becomes available to any component
  // that calls useUI(). This bundles together both the current
  // UI STATE and the FUNCTIONS to control/check that state.
  return {
    sidebarOpen, // Whether the sidebar is currently open or closed
    activeModal, // The name of the currently active modal (or null)
    drawerOpen, // Whether a drawer is currently open or closed
    drawerType, // The type of the currently open drawer (or null)
    handleToggleSidebar, // Function to toggle the sidebar open/closed
    handleSetSidebar, // Function to forcefully set the sidebar's state
    handleOpenModal, // Function to open a specific modal by name
    handleCloseModal, // Function to close whichever modal is open
    handleOpenDrawer, // Function to open a specific drawer by type
    handleCloseDrawer, // Function to close whichever drawer is open
    isModalOpen, // Function to check if a specific modal is open
    isDrawerOpen, // Function to check if a specific drawer is open
  };
};

// ----------------------------
// EXPORTING THE HOOK
// ----------------------------
// Default export so it can be imported in any component like:
// import useUI from "../hooks/useUI";
// const { isModalOpen, handleOpenModal } = useUI();
export default useUI;
