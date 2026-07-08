// ============================================================
// useAuth - CUSTOM HOOK
// ============================================================
// This is a custom React hook that acts as a SHORTCUT for accessing
// auth-related state and actions from the Redux store.
//
// WHY THIS HOOK EXISTS:
// Without it, every component that needs auth info would have to write:
//   const user = useSelector((state) => state.auth.user);
//   const dispatch = useDispatch();
//   dispatch(setUser(...));
// ...repeating this boilerplate everywhere.
//
// Instead, components can simply do:
//   const { user, isAuthenticated, login, logoutUser } = useAuth();
// This keeps components cleaner and centralizes auth logic in one place.

import { useSelector, useDispatch } from "react-redux";
// useSelector -> lets us READ data from the Redux store
// useDispatch -> lets us DISPATCH actions to update the Redux store

import { setUser, logout, setToken } from "../store/slices/authSlice";
// Importing the specific action creators we defined in authSlice.js,
// so we can dispatch them from inside this hook.

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
const useAuth = () => {
  // --------------------------------------------------
  // READING STATE FROM REDUX
  // --------------------------------------------------
  // useSelector lets us pull specific pieces of state out of the
  // global Redux store. Here, we're grabbing the entire "auth" slice
  // of state (state.auth) and destructuring out the individual fields
  // we care about: user, token, refreshToken, isAuthenticated, role.
  const { user, token, refreshToken, isAuthenticated, role } = useSelector(
    (state) => state.auth, // Access the "auth" branch of the Redux store
  );

  // --------------------------------------------------
  // GETTING THE DISPATCH FUNCTION
  // --------------------------------------------------
  // useDispatch gives us the "dispatch" function, which we use to
  // send actions to the Redux store so reducers can update the state.
  const dispatch = useDispatch();

  // --------------------------------------------------
  // FUNCTION: login
  // --------------------------------------------------
  // A wrapper function that dispatches the "setUser" action.
  // Called after a successful login API call, passing in the
  // response data (user info + access/refresh tokens).
  // This updates both Redux state AND localStorage (handled inside
  // the setUser reducer itself).
  const login = (data) => {
    dispatch(setUser(data));
  };

  // --------------------------------------------------
  // FUNCTION: logoutUser
  // --------------------------------------------------
  // A wrapper function that dispatches the "logout" action.
  // This clears the user, tokens, and auth status from both
  // Redux state and localStorage (handled inside the logout reducer).
  // Named "logoutUser" here (instead of just "logout") to avoid
  // naming conflicts with the imported "logout" action itself.
  const logoutUser = () => {
    dispatch(logout());
  };

  // --------------------------------------------------
  // FUNCTION: updateToken
  // --------------------------------------------------
  // A wrapper function that dispatches the "setToken" action.
  // Called when the access token is refreshed (e.g. after calling
  // the refreshToken API when the old token expired), so the new
  // token gets saved into both Redux state and localStorage.
  const updateToken = (token) => {
    dispatch(setToken(token));
  };

  // --------------------------------------------------
  // RETURNING VALUES & FUNCTIONS
  // --------------------------------------------------
  // Whatever this hook returns becomes available to any component
  // that calls useAuth(). This bundles together both the current
  // auth STATE and the FUNCTIONS to modify that state, all in one
  // convenient object.
  return {
    user, // The logged-in user's profile data (or null if not logged in)
    token, // Current access token (used for authenticated API requests)
    refreshToken, // Current refresh token (used to get a new access token)
    isAuthenticated, // Boolean — true if logged in, false otherwise
    role, // The user's role — "customer" or "admin"
    login, // Function to call after a successful login to save user/tokens
    logoutUser, // Function to call to log the user out completely
    updateToken, // Function to call to update just the access token
  };
};

// ----------------------------
// EXPORTING THE HOOK
// ----------------------------
// Default export so it can be imported in any component like:
// import useAuth from "../hooks/useAuth";
// const { user, isAuthenticated, login, logoutUser } = useAuth();
export default useAuth;
