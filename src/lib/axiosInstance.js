// Central HTTP client for the entire project
// Every API call goes through this axios instance — no raw fetch calls anywhere
// Base URL is read automatically from the .env file
// Access token is attached to every outgoing request automatically
// When the token expires, it is silently refreshed in the background without logging the user out

import axios from "axios"; // axios library — used to create a configurable HTTP client instance

// Create a single shared axios instance used across the whole app
// baseURL comes from Vite's environment variable so it can differ between dev/staging/production
// timeout — any request taking longer than 15 seconds is automatically aborted
// headers — default Content-Type for all requests; can be overridden per-request if needed
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// =============================================
// GUEST CART SESSION BOOTSTRAP LOCK
// =============================================
// Problem this solves: if two or more requests go out at nearly the same
// moment (e.g. the navbar's GET /cart/ on page load racing a customer's
// "Add to Cart" click) and NEITHER has a cartSessionKey yet, both leave
// with no X-Cart-Session header. The backend then treats EACH one as a
// brand-new guest and hands back two DIFFERENT session keys — whichever
// response's session_key is saved last "wins", silently orphaning
// whatever the other request just did (e.g. an item that was just added
// vanishes from the cart moments later).
//
// Fix (same lock/queue shape as isRefreshing/failedQueue below, just for
// session bootstrapping instead of token refreshing): only the FIRST
// sessionless request in a burst is allowed to actually leave right
// away. Any other sessionless request that fires while that first one
// is still in flight waits here until the first one's response has been
// handled (and its session_key, if any, saved) — then re-reads
// localStorage so every request in the burst ends up on the SAME guest
// cart, instead of racing each other into separate ones.
let sessionBootstrapInFlight = null; // Promise that resolves once the in-flight bootstrap request has settled; null when no bootstrap is currently underway
let releaseSessionBootstrap = null; // resolve() for the promise above — called from the response interceptor (success or error) once that request settles

// =============================================
// REQUEST INTERCEPTOR
// Runs before every outgoing request leaves the app
// Reads the access token from localStorage and attaches it as a Bearer header if present
// =============================================
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token"); // read the current access token from storage

    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // attach it so the backend can authenticate the request
    }

    // Guest cart support (backend v3.0): while the customer is browsing/
    // shopping without an account, the cart lives server-side under an
    // anonymous "cart session" identified by this header. It's stored in
    // localStorage the moment the backend first hands one out (see the
    // response interceptor below) and is attached to EVERY request from
    // then on — not just cart calls — because Login (POST /auth/login/)
    // and Google Login (POST /auth/google/) both read it too, to merge
    // the guest cart into the account cart in that same request. It's
    // cleared from localStorage right after a successful login (see
    // Login.jsx's completeLogin), so a logged-in user never sends a
    // stale guest session once they have real tokens.
    let cartSessionKey = localStorage.getItem("cartSessionKey");

    // Only real guests with no session key yet need the bootstrap lock —
    // a logged-in user (has a token) never sends X-Cart-Session at all,
    // and a guest who already has a session key just attaches it below
    // like normal, no waiting required.
    if (!token && !cartSessionKey) {
      if (sessionBootstrapInFlight) {
        // Another sessionless request is already out there establishing
        // the guest session — wait for it to settle before sending this
        // one, then pick up whatever session key it (hopefully) got.
        await sessionBootstrapInFlight;
        cartSessionKey = localStorage.getItem("cartSessionKey");
      } else {
        // First sessionless request in this burst — let it go immediately,
        // but open the lock so anything fired right behind it waits for
        // THIS one to finish instead of also going out sessionless.
        sessionBootstrapInFlight = new Promise((resolve) => {
          releaseSessionBootstrap = resolve;
        });
        config._isSessionBootstrap = true; // flags this request so the response interceptor knows to release the lock once it settles
      }
    }

    if (cartSessionKey) {
      config.headers["X-Cart-Session"] = cartSessionKey;
    }

    return config; // always return the (possibly modified) config so the request can proceed
  },
  (error) => Promise.reject(error), // pass through any request-building errors unchanged
);

// =============================================
// REFRESH STATE MANAGEMENT
// Multiple requests can fail with 401 at the same time (e.g. several components fetching in parallel)
// Only ONE refresh call should ever be made; every other failed request should wait for that single refresh to finish
// =============================================

let isRefreshing = false; // tracks whether a token refresh is currently in progress
let failedQueue = []; // holds the resolve/reject handlers of requests waiting for the in-progress refresh to finish

// processQueue — once the single refresh call completes (success or failure),
// this resolves or rejects every queued request accordingly
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error); // refresh failed — every waiting request should also fail
    } else {
      promise.resolve(token); // refresh succeeded — give every waiting request the new token
    }
  });
  failedQueue = []; // clear the queue now that all promises have been settled
};

// =============================================
// RESPONSE INTERCEPTOR
// Runs after every response comes back from the server
// On a 401 Unauthorized, attempts a silent token refresh; if that fails, logs the user out
// Anonymous requests (no token ever present, e.g. guest chatbot usage) are left alone —
// they are rejected normally without forcing a redirect to /login
// =============================================
axiosInstance.interceptors.response.use(
  (response) => {
    // Guest cart support (backend v3.0): the very first guest cart call
    // (no Authorization header, no X-Cart-Session sent yet) gets back a
    // fresh session_key from the backend. Persist it so every request
    // from here on — via the request interceptor above — identifies the
    // same guest cart, including across tabs/page reloads.
    const sessionKey = response?.data?.session_key;
    if (sessionKey) {
      localStorage.setItem("cartSessionKey", sessionKey);
    }

    // Session bootstrap lock (see above): this was the request holding the
    // lock — release it now that its session_key (if any) has been saved,
    // so any requests that were waiting on it can proceed.
    if (response.config?._isSessionBootstrap && releaseSessionBootstrap) {
      releaseSessionBootstrap();
      sessionBootstrapInFlight = null;
      releaseSessionBootstrap = null;
    }

    return response; // successful responses pass straight through untouched
  },

  async (error) => {
    const originalRequest = error.config; // the request config that triggered this error — needed to retry it later

    // Session bootstrap lock (see above): release it here too if the
    // bootstrap request itself failed (network error, 4xx, etc.) — even
    // with no session_key to save, requests waiting on this lock must
    // never be stuck forever just because the first request errored out.
    if (originalRequest?._isSessionBootstrap && releaseSessionBootstrap) {
      releaseSessionBootstrap();
      sessionBootstrapInFlight = null;
      releaseSessionBootstrap = null;
    }

    // If the error isn't a 401, or this exact request has already been retried once,
    // there's nothing more we can do — reject immediately to avoid infinite retry loops
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If the user was never logged in to begin with (no access token present),
    // this 401 belongs to an anonymous request — reject it without redirecting to /login
    const hasExistingToken = localStorage.getItem("token");
    if (!hasExistingToken) {
      return Promise.reject(error);
    }

    // If the 401 came from the refresh endpoint itself or the login endpoint,
    // retrying would create an infinite loop — instead, force a full logout immediately
    if (
      originalRequest.url?.includes("/auth/token/refresh/") ||
      originalRequest.url?.includes("/auth/login/")
    ) {
      localStorage.removeItem("token"); // clear the invalid access token
      localStorage.removeItem("refreshToken"); // clear the invalid refresh token
      window.location.href = "/login"; // hard redirect to the login page
      return Promise.reject(error);
    }

    // If a refresh is already in progress (triggered by another simultaneous request),
    // queue this request instead of starting a second redundant refresh call
    // Once the in-progress refresh resolves, this request automatically retries with the new token
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject }); // park this request's promise handlers until the refresh finishes
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`; // attach the freshly refreshed token
          return axiosInstance(originalRequest); // retry the original request with the new token
        })
        .catch((err) => Promise.reject(err)); // if the refresh ultimately failed, propagate that failure here too
    }

    // Mark this request so it's never retried more than once (prevents infinite loops)
    originalRequest._retry = true;
    isRefreshing = true; // lock — signals to any other concurrent 401s that a refresh is now underway

    const refreshToken = localStorage.getItem("refreshToken"); // read the long-lived refresh token from storage

    // No refresh token available at all — there's nothing to refresh with, so log out immediately
    if (!refreshToken) {
      isRefreshing = false;
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      // API 4 — request a new access token using the refresh token
      // Uses the raw axios import (not axiosInstance) to avoid triggering this same interceptor recursively
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/token/refresh/`,
        { refresh: refreshToken },
      );

      const newAccessToken = response.data.access; // extract the new access token from the refresh response

      // Persist the new access token so future requests use it automatically via the request interceptor
      localStorage.setItem("token", newAccessToken);

      // Release every request that was queued while this refresh was in progress, giving them the new token
      processQueue(null, newAccessToken);

      // Retry the original request that triggered this whole refresh flow, now with the new token attached
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      isRefreshing = false; // unlock — future 401s can trigger a fresh refresh cycle if needed

      return axiosInstance(originalRequest); // re-send the original failed request
    } catch (refreshError) {
      // The refresh token itself has expired or is invalid — there's no way to recover, so log out
      processQueue(refreshError, null); // reject every queued request with this same error
      isRefreshing = false;

      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login"; // hard redirect to the login page

      return Promise.reject(refreshError);
    }
  },
);

export default axiosInstance; // exported as the single shared HTTP client used throughout the entire app
