// useCustomerLogout - CUSTOM HOOK
// ============================================================
// WHY THIS HOOK EXISTS:
// The "log the customer out" sequence (call the logout API, clear
// Redux auth state, reset cached cart/wishlist/notifications data, show
// a toast, redirect home) needs to be identical everywhere it's
// triggered from. Centralizing it here mirrors the existing
// useAdminLogout hook, so both sides of the app follow the same
// pattern: a component only owns its own trigger UI, never the
// underlying logout mechanics.

import { useState } from "react";
// useState — controls whether the "Are you sure?" confirmation modal
// is currently open

import { useQueryClient } from "@tanstack/react-query";
// useQueryClient — lets us reset the cached cart/wishlist/notifications
// data on logout, so nothing from this customer's session lingers on
// screen — or leaks into the next customer's session on a shared
// device — until a manual refresh

import { useNavigate } from "react-router-dom";

import useAuth from "./useAuth";
// useAuth — wraps the Redux auth slice; its "logoutUser" action clears
// user/token/refreshToken/role from both Redux state and localStorage

import useCart from "./useCart";
import useWishlist from "./useWishlist";

import { showSuccess } from "../components/ui/Toast";

import { logoutUser as logoutApi } from "../api/auth.api";
// Renamed to logoutApi to avoid clashing with the "logoutUser" action
// useAuth() also returns — this one calls POST /api/v1/auth/logout/,
// which blacklists the refresh token on the backend

import { QUERY_KEYS } from "../constants/queryKeys";
import { ROUTES } from "../constants/routes";

const useCustomerLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logoutUser } = useAuth();
  const { handleClearCart } = useCart();
  const { handleClearWishlist } = useWishlist();

  // Whether the "Are you sure you want to log out?" confirmation modal
  // is currently showing — logging out ends the customer's session, so
  // it gets the same confirm-before-destructive-action treatment used
  // elsewhere in the app (cancelling an order, deleting an address).
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const performLogout = async () => {
    try {
      // The backend logout call specifically needs the REFRESH token
      // (not the access token) — it's the refresh token that gets
      // blacklisted server-side.
      const refreshToken = localStorage.getItem("refreshToken");
      await logoutApi({ refresh: refreshToken });
    } catch {
      // INTENTIONALLY SWALLOWED: even if this network call fails, the
      // customer must still be logged out of this browser/device — a
      // failed backend call should never trap them in a broken
      // "can't log out" state.
    } finally {
      setIsConfirmOpen(false);
      logoutUser();

      // Reset local Redux state immediately so the heart/cart icons
      // don't keep showing the previous account's items for a split
      // second before the queries below settle.
      handleClearCart();
      handleClearWishlist();

      // Notifications are logged-in-only data — drop them from cache so
      // the badge count goes back to hidden right away instead of
      // staying stale until a refresh.
      queryClient.removeQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      // The wishlist still works for guests, so it is reset rather than
      // removed: the cached account data is discarded immediately (it
      // must never linger on a shared device) and any active wishlist
      // query then fetches whatever guest wishlist now applies.
      queryClient.resetQueries({ queryKey: QUERY_KEYS.WISHLIST });
      // Cart works for guests too, so re-fetch (not remove) — this pulls
      // whatever guest cart now applies instead of just zeroing it.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });

      showSuccess("Logged out successfully");
      navigate(ROUTES.HOME);
    }
  };

  // requestLogout only opens the confirmation modal — the actual
  // logout only runs once the customer confirms inside it.
  const requestLogout = () => setIsConfirmOpen(true);

  const confirmModalProps = {
    isOpen: isConfirmOpen,
    onClose: () => setIsConfirmOpen(false),
    onConfirm: performLogout,
    title: "Are you sure?",
    message: "You'll need to log in again to access your account.",
    confirmLabel: "Log Out",
    cancelLabel: "Cancel",
    variant: "danger",
  };

  return { requestLogout, confirmModalProps };
};

export default useCustomerLogout;
