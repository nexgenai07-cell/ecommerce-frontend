// ==========================================================
// postLoginRedirect - UTILITY FUNCTIONS
//
// Remembers the page that sent a visitor to the sign-in flow, so
// they can be returned to it after signing in, even when they
// first go through registration and email verification.
//
// Router state alone is not enough for this: it is lost as soon
// as the visitor moves to the Register page, and the email
// verification link opens in a new tab. The target is therefore
// kept in localStorage for a limited time and removed as soon as
// a sign-in completes.
// ==========================================================

import { ROUTES } from "../constants/routes";

const STORAGE_KEY = "postLoginRedirect";

// How long a remembered target stays valid. It has to be long enough
// for the visitor to register and open the verification email.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Pages that must never be remembered as a place to return to
const IGNORED_PATH_PREFIXES = ["/login", "/register", "/admin"];

// Accepts only a path inside this application. Anything that could lead
// to another site ("//host", "https://host", backslashes) is rejected, so
// a tampered value can never turn the sign-in redirect into an open
// redirect.
const isInternalPath = (pathname) =>
  typeof pathname === "string" &&
  pathname.startsWith("/") &&
  !pathname.startsWith("//") &&
  !pathname.includes("\\") &&
  !/^\/[a-z][a-z0-9+.-]*:/i.test(pathname);

// Remembers where the visitor was headed.
// `from` has the shape { pathname, search, hash, state }.
export const savePostLoginRedirect = (from) => {
  if (!isInternalPath(from?.pathname)) return;
  if (IGNORED_PATH_PREFIXES.some((prefix) => from.pathname.startsWith(prefix)))
    return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pathname: from.pathname,
        search: from.search ?? "",
        hash: from.hash ?? "",
        state: from.state ?? null,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Storage is unavailable or the state could not be serialised;
    // the router state still covers the direct sign-in case.
  }
};

// Returns the remembered target, or null when there is none or it has
// expired. Reading never removes it, so a failed sign-in attempt can be
// retried without losing it.
export const readPostLoginRedirect = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw);
    if (
      !isInternalPath(saved?.pathname) ||
      Date.now() - saved.savedAt > MAX_AGE_MS
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      pathname: saved.pathname,
      search: saved.search ?? "",
      hash: saved.hash ?? "",
      state: saved.state ?? undefined,
    };
  } catch {
    return null;
  }
};

// Forgets the remembered target. Called once a sign-in has completed.
export const clearPostLoginRedirect = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable
  }
};

// Joins a location object into a single path with its query and hash
export const toFullPath = (location) =>
  location?.pathname
    ? `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`
    : null;

// Turns a requested return path into the page a customer is actually sent
// to after signing in.
//
// A regular cart checkout goes to the Cart page first, because signing in
// merges the guest cart into the account cart and the customer should
// review the combined items before checking out again. A Buy Now checkout
// does not use the cart, so it returns straight to Checkout. Admin pages
// are never a customer destination.
export const resolveSafeRedirect = (from, fromState) => {
  const isCartCheckout =
    from.split(/[?#]/)[0] === ROUTES.CHECKOUT && !fromState?.buyNow;

  if (isCartCheckout) return ROUTES.CART;
  if (from.startsWith("/admin")) return ROUTES.HOME;
  return from;
};
