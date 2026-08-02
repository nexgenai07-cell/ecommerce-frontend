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
// Reads the persisted user object out of localStorage safely.
// We wrap this in try/catch because localStorage can contain corrupted
// or manually-edited JSON (or be unavailable in some browser privacy
// modes), and a JSON.parse crash here would white-screen the entire app
// before React even renders anything.
const getStoredUser = () => {
  try {
    // Look up the raw string we saved the last time the user logged in
    // or their profile was refreshed (see setUser reducer below).
    const stored = localStorage.getItem("user");
    // If nothing was ever saved, return null (same as the old default).
    // Otherwise parse the JSON string back into a real object.
    return stored ? JSON.parse(stored) : null;
  } catch {
    // Corrupted/unreadable value — fail safe instead of crashing the app.
    return null;
  }
};

const initialState = {
  // Holds the logged-in user's full profile data (name, email, etc.)
  //
  // IMPORTANT FIX: previously this always started as `null`, even when
  // the person was already logged in with a valid token in localStorage.
  // That caused the navbar avatar to show "?" and the dropdown email to
  // go blank on every page refresh, because React had to wait for some
  // other part of the app to re-fetch the profile — which never actually
  // happened anywhere in the codebase.
  //
  // Now we hydrate `user` directly from localStorage on app boot, exactly
  // the same way `token` and `refreshToken` already do below. This keeps
  // the navbar showing the correct name/initials/email immediately after
  // a refresh, with zero network round-trip delay.
  user: getStoredUser(),

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
  //
  // BUG FIX: this used to be hardcoded to `null` here, even though
  // `user` right above is correctly hydrated from localStorage (and
  // that stored user object already contains a "role" field inside
  // it). Because this top-level `role` stayed null until the NEXT
  // login, every page refresh reset it back to null for an already
  // logged-in admin. AdminProtectedRoute checks this exact `role`
  // field (via useAuth()), so on refresh it always saw role !== "admin"
  // and redirected an admin straight back to the customer homepage —
  // even though `user.role` itself was still correctly "admin".
  //
  // Now we derive it from the exact same getStoredUser() call used for
  // `user` above, so both fields are always in sync — on first load,
  // after a refresh, and after login — instead of only `user` being
  // hydrated and `role` silently lagging behind as null.
  role: getStoredUser()?.role || null,
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

      // FIX: also persist the user object itself (name, email, avatar, role...).
      // Without this line, a page refresh always lost the user's name/email
      // even though the tokens survived — that's exactly what was causing the
      // navbar avatar to fall back to "?" and the dropdown email to go blank.
      // JSON.stringify is required because localStorage only stores strings.
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },

    // --------------------------------------------------
    // REDUCER: updateUser
    // --------------------------------------------------
    // Called whenever the user's profile is updated elsewhere in the app
    // (e.g. after a successful "Edit Profile" save on the Settings page),
    // so the navbar avatar/name/email reflect the latest data immediately
    // without requiring a full logout/login cycle. Keeps Redux state AND
    // localStorage in sync with each other, the same way setUser does.
    updateUser: (state, action) => {
      // Merge the incoming fields on top of the existing user object,
      // so a partial update (e.g. just { name }) doesn't wipe out other
      // fields like email or avatar that weren't part of this update.
      state.user = { ...state.user, ...action.payload };

      // Keep the top-level `role` field in sync with `state.user.role`
      // here too — same reasoning as the initialState fix above. This
      // update is very unlikely to ever change role in practice, but
      // guarding it here means the two can never silently drift apart
      // again the way they did before this bug fix.
      state.role = state.user.role;

      // Re-persist the merged object so a refresh right after an edit
      // still shows the freshly updated info instead of stale data.
      localStorage.setItem("user", JSON.stringify(state.user));
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

      // FIX: also remove the persisted user object on logout — otherwise
      // the old user's name/email would still be sitting in localStorage
      // and could briefly flash on the next person's session on a shared
      // device before they log in themselves.
      localStorage.removeItem("user");
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
export const { setUser, logout, setToken, updateUser } = authSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
// This default export is the actual reducer function for this slice.
// It gets imported into the main store.js file and registered under
// the "auth" key in the combined reducer object.
export default authSlice.reducer;
