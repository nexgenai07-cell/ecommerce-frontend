// ============================================================================
// useGoogleSignIn — shared "Sign in with Google" logic for Login and Register
// ============================================================================
//
// This hook wraps Google Identity Services (GIS), the current official
// library from Google for "Sign in with Google" buttons. It is written once
// here and used identically on both the Login page and the Register page, so
// there is exactly one place that talks to Google and exactly one place that
// talks to our backend's Google endpoint.
//
// What this hook does, step by step:
//   1. Waits for the GIS script (loaded in index.html) to finish loading,
//      because that script tag uses async/defer and may not be ready yet at
//      the exact moment this component mounts.
//   2. Initializes GIS with our Google OAuth Client ID and registers a
//      callback function that Google will call once the user finishes
//      signing in on Google's side.
//   3. Renders the real, official Google Sign-In button inside whatever
//      empty <div> the calling page points it at (via containerId).
//   4. When Google calls our callback with a signed ID token, this hook
//      sends that token to our backend endpoint (POST /api/v1/auth/google/),
//      receives back { user, tokens } — the exact same shape a normal
//      email/password login returns — and completes the login using the
//      app's existing useAuth() flow (Redux + localStorage), so every other
//      part of the app treats a Google login exactly like a normal login.
//
// Usage (identical on both Login.jsx and Register.jsx):
//
//   useGoogleSignIn("google-signin-button-login");
//
//   return (
//     ...
//     <div id="google-signin-button-login" className="w-full flex justify-center" />
//   );
//
// Each page must use its OWN unique containerId (e.g. one for Login, a
// different one for Register) so the two pages never try to render a Google
// button into the same DOM element.
// ============================================================================

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { googleAuth } from "../api/auth.api";
import useAuth from "./useAuth";
import { showSuccess, showError } from "../components/ui/Toast";
import { ROUTES } from "../constants/routes";
import { QUERY_KEYS } from "../constants/queryKeys";

// Read once from the environment. Vite only exposes variables prefixed with
// VITE_ to client-side code, and only variables that exist at build time —
// this is why the Client ID must live in .env as VITE_GOOGLE_CLIENT_ID
// rather than being written directly into this file.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// How long we are willing to wait for the Google script to finish loading
// before giving up and leaving the button container empty. This only
// matters on a very slow connection or if the script fails to load at all
// (for example, because a browser extension blocked it).
const GOOGLE_SCRIPT_POLL_INTERVAL_MS = 250;
const GOOGLE_SCRIPT_MAX_POLL_ATTEMPTS = 40; // 40 * 250ms = 10 seconds total

/**
 * Initializes Google Identity Services and renders the Google Sign-In
 * button into the DOM element identified by containerId.
 *
 * @param {string} containerId - id of the empty <div> the Google button
 *   should be rendered into. Must be unique per page/component instance.
 */
const useGoogleSignIn = (containerId) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useAuth();

  // Guards against rendering the Google button twice into the same
  // container — this can otherwise happen under React StrictMode, which
  // intentionally runs effects twice during development.
  const hasRenderedButton = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      // This is a configuration problem, not a user-facing error, so it is
      // logged to the console rather than shown as a toast. It means the
      // VITE_GOOGLE_CLIENT_ID variable is missing from the .env file.
      console.error(
        "Google Sign-In is not configured: VITE_GOOGLE_CLIENT_ID is missing from the environment.",
      );
      return undefined;
    }

    let isCancelled = false;
    let pollTimerId = null;

    // --------------------------------------------------------------------
    // Called by Google once the user has picked a Google account and
    // approved the sign-in popup. response.credential is a signed JWT
    // (the "ID token") that proves the user's identity — we do not decode
    // or trust it ourselves; it is sent as-is to the backend, which is the
    // only party able to verify its signature against Google.
    // --------------------------------------------------------------------
    const handleGoogleCredentialResponse = async (response) => {
      try {
        const { data } = await googleAuth({ id_token: response.credential });

        // Same guest-cart cleanup performed by a normal login (see
        // Login.jsx completeLogin): if a guest cart session existed, the
        // backend has already merged it into the user's account cart as
        // part of this response, so the local guest session key and any
        // cached (pre-merge) cart data are now stale and must be dropped.
        localStorage.removeItem("cartSessionKey");
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });

        login({ user: data.user, tokens: data.tokens });
        showSuccess(`Welcome, ${data.user.name}!`);

        // Same role-based redirect rule used everywhere else in the auth
        // flow: admin accounts go to the admin dashboard, everyone else
        // goes to the storefront home page.
        const destination =
          data.user.role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME;
        navigate(destination, { replace: true });
      } catch (error) {
        const backendErrorMessage =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Google sign-in failed. Please try again.";
        showError(backendErrorMessage);
      }
    };

    // --------------------------------------------------------------------
    // Attempts to initialize GIS and render the button. Returns true once
    // this has actually happened, or false if the GIS script has not
    // finished loading yet (window.google is not available yet).
    // --------------------------------------------------------------------
    const tryInitializeAndRenderButton = () => {
      if (isCancelled || hasRenderedButton.current) {
        return true;
      }

      const googleIdentityServices = window.google?.accounts?.id;
      if (!googleIdentityServices) {
        return false;
      }

      googleIdentityServices.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      const container = document.getElementById(containerId);
      if (!container) {
        // The container is not in the DOM yet (rare, but can happen with
        // fast route transitions). We simply skip rendering this cycle;
        // the effect's cleanup/re-run on the next render will retry.
        return false;
      }

      googleIdentityServices.renderButton(container, {
        theme: "outline",
        size: "large",
        // Matches the visual width of the rest of the form's buttons —
        // falls back to a sensible fixed width if the container has not
        // been laid out yet.
        width: container.offsetWidth || 320,
      });

      hasRenderedButton.current = true;
      return true;
    };

    // First attempt happens immediately (covers the common case where the
    // GIS script already finished loading before this component mounted).
    // If it is not ready yet, we poll on a short interval until it is, or
    // until we give up after GOOGLE_SCRIPT_MAX_POLL_ATTEMPTS tries.
    if (!tryInitializeAndRenderButton()) {
      let attemptCount = 0;
      pollTimerId = setInterval(() => {
        attemptCount += 1;
        const succeeded = tryInitializeAndRenderButton();
        if (succeeded || attemptCount >= GOOGLE_SCRIPT_MAX_POLL_ATTEMPTS) {
          clearInterval(pollTimerId);
        }
      }, GOOGLE_SCRIPT_POLL_INTERVAL_MS);
    }

    // Cleanup: stop polling if the component unmounts (e.g. the user
    // navigates away) before the Google script finishes loading.
    return () => {
      isCancelled = true;
      if (pollTimerId) {
        clearInterval(pollTimerId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);
};

export default useGoogleSignIn;
