// ============================================================
// useAdminLogout - CUSTOM HOOK
// ============================================================
// WHY THIS HOOK EXISTS:
// The exact same "log the admin out" sequence is needed in MORE than
// one place — the AdminSidebar's bottom logout button AND the
// TopHeader's profile dropdown logout item. Before this hook existed,
// that sequence (call the logout API, clear Redux auth state, show a
// toast, redirect to /admin/login) was duplicated inline inside
// AdminSidebar.jsx. Duplicated logic is a maintenance risk — if the
// logout flow ever needs to change (e.g. also clear a specific cache
// key), a duplicated version could easily be missed and left stale.
// Centralizing it here means BOTH places always stay in sync.

import { useNavigate } from "react-router-dom";
// useNavigate — React Router hook, lets us redirect the browser to a
// different route programmatically (not via a clickable <Link>)

import useAuth from "./useAuth";
// useAuth — our own hook that wraps the Redux auth slice, giving us
// access to the "logoutUser" action (clears user/token from Redux +
// localStorage — see authSlice.js for exactly what that reducer does)

import { showSuccess } from "../components/ui/Toast";
// showSuccess — fires a green success toast in the top-right corner,
// confirming to the admin that the logout actually happened

import { logoutUser as logoutApi } from "../api/auth.api";
// logoutUser (renamed to logoutApi here to avoid clashing with the
// "logoutUser" function useAuth() also returns) — calls
// POST /api/v1/auth/logout/ (API 3), which blacklists the refresh
// token on the BACKEND so it can never be reused even if someone
// captured it earlier

import { ROUTES } from "../constants/routes";
// ROUTES — central route path constants, used here for ROUTES.LOGIN
// instead of hardcoding the string "/login". There is no separate
// admin login page anymore — customers and admins share one login
// screen, so an admin who logs out lands back on that same screen.

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
const useAdminLogout = () => {
  const navigate = useNavigate();
  // Grab the navigate function so we can redirect after logout completes

  const { logoutUser } = useAuth();
  // Pull the Redux-clearing logout action out of our auth hook
  // (this is DIFFERENT from logoutApi above — logoutUser here only
  // touches local Redux/localStorage state, it does NOT call the backend)

  // --------------------------------------------------
  // THE ACTUAL LOGOUT HANDLER
  // --------------------------------------------------
  // Returned to whichever component calls useAdminLogout() — that
  // component then wires this function up to its own logout button's
  // onClick handler.
  const handleLogout = async () => {
    try {
      // Read the refresh token straight from localStorage rather than
      // from Redux state, because the backend logout call specifically
      // needs the REFRESH token (not the access token) — it's the
      // refresh token that gets blacklisted server-side.
      const refreshToken = localStorage.getItem("refreshToken");

      // Tell the backend to invalidate this refresh token immediately.
      await logoutApi({ refresh: refreshToken });
    } catch (error) {
      // INTENTIONALLY SWALLOWED: even if this network call fails (e.g.
      // the admin's internet just dropped, or the token was already
      // expired), we still want to log them out of THIS browser/device.
      // A failed backend call should never trap the admin in a broken
      // "can't log out" state — local logout always proceeds below.
    } finally {
      // "finally" guarantees this runs whether the API call above
      // succeeded OR failed — local logout must always happen.
      logoutUser();
      // Clears user, token, refreshToken, isAuthenticated, and role
      // from BOTH Redux state and localStorage (handled inside the
      // authSlice's own "logout" reducer)

      showSuccess("Logged out successfully");
      // Confirms to the admin that the action completed

      navigate(ROUTES.LOGIN);
      // Redirect back to the single shared login screen (used by both
      // customers and admins) — there is no separate admin login page
    }
  };

  // Return just the handler function itself — callers do:
  //   const handleLogout = useAdminLogout();
  //   <button onClick={handleLogout}>Logout</button>
  return handleLogout;
};

export default useAdminLogout;
