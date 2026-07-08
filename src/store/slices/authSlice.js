// ============================================================
// AUTH SLICE (Redux Toolkit)
// ============================================================
// This slice manages everything related to authentication:
// - The currently logged-in user's data
// - Access token and refresh token
// - Whether the user is authenticated or not
// - The user's role (customer/admin)
//
// Tokens are also persisted in localStorage so that even after
// a page refresh, the user stays logged in (until they explicitly
// log out or the token becomes invalid).

import { createSlice } from "@reduxjs/toolkit";
// Importing createSlice from Redux Toolkit.
// createSlice automatically generates action creators and action types
// for us, based on the reducers we define below — saving boilerplate.

// ----------------------------
// INITIAL STATE
// ----------------------------
// This defines the default shape of the auth state when the app first loads.
const initialState = {
  // Holds the logged-in user's full profile data (name, email, etc.)
  // Initially null because no user is loaded until login/profile fetch happens.
  user: null,

  // The access token used to authenticate API requests.
  // We try to read it from localStorage first — this way, if the user
  // already had a valid token saved from a previous session, they
  // remain logged in even after refreshing the page.
  // If nothing is found in localStorage, it defaults to null.
  token: localStorage.getItem("token") || null,

  // The refresh token, used to get a new access token when the current
  // one expires. Same logic — read from localStorage if available.
  refreshToken: localStorage.getItem("refreshToken") || null,

  // A boolean flag indicating whether the user is currently authenticated.
  // We calculate this immediately based on whether a token exists in
  // localStorage. The "!!" converts the value to a strict true/false
  // (e.g. "!!null" becomes false, "!!'sometoken'" becomes true).
  isAuthenticated: !!localStorage.getItem("token"),

  // Stores the role of the logged-in user (e.g. "customer" or "admin").
  // Initially null because we don't know the role until login/profile
  // data is loaded.
  role: null,
};

// ----------------------------
// CREATING THE SLICE
// ----------------------------
// createSlice() takes a name, the initial state, and a set of "reducers"
// (functions that describe how the state changes in response to actions).
const authSlice = createSlice({
  // The "name" is used as a prefix for the auto-generated action types
  // (e.g. "auth/setUser", "auth/logout", "auth/setToken")
  name: "auth",

  // The default state defined above
  initialState,

  // The reducers object — each key here becomes both:
  // 1. A reducer function that updates the state
  // 2. An auto-generated action creator with the same name
  reducers: {
    // --------------------------------------------------
    // REDUCER: setUser
    // --------------------------------------------------
    // Called right after a successful login (or registration + auto-login).
    // It saves the user's data and both tokens into Redux state,
    // and also persists the tokens into localStorage for future sessions.
    setUser: (state, action) => {
      // Save the user object (name, email, etc.) coming from the API response
      state.user = action.payload.user;

      // Save the access token from the response into Redux state
      state.token = action.payload.tokens.access;

      // Save the refresh token from the response into Redux state
      state.refreshToken = action.payload.tokens.refresh;

      // Mark the user as authenticated now that login succeeded
      state.isAuthenticated = true;

      // Extract and store the user's role (e.g. "admin" or "customer")
      // directly from the user object in the payload
      state.role = action.payload.user.role;

      // Persist the access token in localStorage so it survives page refreshes
      localStorage.setItem("token", action.payload.tokens.access);

      // Persist the refresh token in localStorage as well, for the same reason
      localStorage.setItem("refreshToken", action.payload.tokens.refresh);
    },

    // --------------------------------------------------
    // REDUCER: logout
    // --------------------------------------------------
    // Called when the user logs out (manually, or automatically due to
    // an expired/invalid token, e.g. triggered by the 401 interceptor).
    // Clears all auth-related data from both Redux state and localStorage.
    logout: (state) => {
      // Clear the user data from state
      state.user = null;

      // Clear the access token from state
      state.token = null;

      // Clear the refresh token from state
      state.refreshToken = null;

      // Mark the user as no longer authenticated
      state.isAuthenticated = false;

      // Clear the stored role since there's no logged-in user anymore
      state.role = null;

      // Remove the access token from localStorage
      localStorage.removeItem("token");

      // Remove the refresh token from localStorage
      localStorage.removeItem("refreshToken");
    },

    // --------------------------------------------------
    // REDUCER: setToken
    // --------------------------------------------------
    // Called when the access token is refreshed (e.g. using the
    // refreshToken API after the old access token expired).
    // Only updates the access token — refresh token and user data
    // remain unchanged here.
    setToken: (state, action) => {
      // Update the access token in Redux state with the new one
      state.token = action.payload;

      // Also update it in localStorage so it persists across refreshes
      localStorage.setItem("token", action.payload);
    },
  },
});

// ----------------------------
// EXPORTING ACTIONS
// ----------------------------
// Redux Toolkit automatically generates action creators matching
// the reducer names above. We destructure and export them here so
// they can be dispatched from components, e.g.:
// dispatch(setUser({ user, tokens }))
// dispatch(logout())
// dispatch(setToken(newAccessToken))
export const { setUser, logout, setToken } = authSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
// This default export is the actual reducer function for this slice.
// It gets imported into the main store.js file and registered under
// the "auth" key in the combined reducer object.
export default authSlice.reducer;
