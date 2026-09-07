// This file contains ALL API calls related to the Auth module.
// The base URL is automatically handled by axiosInstance (no need to repeat it here).
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// API  - Register a new customer account
// ----------------------------
export const registerUser = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/register/", data, { signal });
};

// ----------------------------
// API - Log in an existing user
// ----------------------------
// UPDATED: the response can now ALSO come back as
// { account_deactivated: true, email, message } when the account was
// soft-deleted (is_delete: true / is_active: false) via API 11 below.
// This check happens on the backend AFTER email_not_verified and
// BEFORE require_2fa — see Login.jsx for how the frontend branches on
// it. The request shape sent here is completely unchanged.
export const loginUser = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/login/", data, { signal });
};

// ----------------------------
// API - Log out the current user
// ----------------------------
export const logoutUser = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/logout/", data, { signal });
};

// ----------------------------
// API - Refresh the access token
// ----------------------------
export const refreshToken = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/token/refresh/", data, { signal });
};

// ----------------------------
// API - Request a password reset link
// ----------------------------
export const forgotPassword = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/password-reset/", data, { signal });
};

// ----------------------------
// API - Confirm and set a new password
// ----------------------------
export const resetPassword = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/password-reset/confirm/", data, { signal });
};

// ----------------------------
// API - Get the currently logged-in user's profile
// ----------------------------
export const getMyProfile = (signal) => {
  return axiosInstance.get("/api/v1/auth/me/", { signal });
};

// ----------------------------
// API - Update the logged-in user's profile
// ----------------------------
export const updateMyProfile = (data, signal) => {
  return axiosInstance.put("/api/v1/auth/me/update/", data, { signal });
};

// ----------------------------
// API - Change Password ★ NEW (v2 backend doc)
// ----------------------------
// Sends current_password (for verification) + new_password.
// Backend returns 400 with { error: "Current password is incorrect." } if current_password is wrong.
export const changePassword = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/change-password/", data, { signal });
};

// ----------------------------
// API  - Complete 2FA Login (Step 2 of login when 2FA is on) ★ NEW
// ----------------------------
// Called after API 2 (login) returns { require_2fa: true, user_id }.
// Sends the 6-digit OTP code along with user_id to receive the real tokens.
export const verify2FALogin = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/2fa/login-verify/", data, { signal });
};

// ----------------------------
// API  - Delete My Account ★ NEW
// ----------------------------
// Soft-deletes (deactivates) the logged-in user's account. Requires password
// as confirmation. Backend returns 400 with { error: "Incorrect password." } on failure.
// UPDATED BEHAVIOR: the backend now sets BOTH is_delete = true AND
// is_active = false on success (previously only deactivated with no
// separate is_delete flag). No data is erased — orders, addresses,
// cart, and wishlist are all preserved untouched. The account can now
// be brought back WITHOUT an admin, purely by the user themself, via
// the reactivation flow below (API 11-B / API 11-C) — this request/
// response shape itself is unchanged.
export const deleteMyAccount = (data, signal) => {
  // axiosInstance.delete's second argument is the config object, not the body —
  // DELETE requests need the body passed inside { data: ... }.
  return axiosInstance.delete("/api/v1/auth/me/delete/", { signal, data });
};

// ----------------------------
// API  - List Active Sessions ★ NEW
// ----------------------------
export const getMySessions = (signal) => {
  return axiosInstance.get("/api/v1/auth/sessions/", { signal });
};

// ----------------------------
// API  - Sign Out All Sessions ★ NEW
// ----------------------------
export const revokeAllSessions = (signal) => {
  return axiosInstance.post("/api/v1/auth/sessions/revoke-all/", undefined, { signal });
};

// ----------------------------
// API  - Enable 2FA — Step 1 ★ NEW
// ----------------------------
// Generates a TOTP secret and returns a QR code (base64 image) + manual entry key.
// 2FA is NOT active yet at this point — must be confirmed via verify2FAEnable (API 15).
export const enable2FA = (signal) => {
  return axiosInstance.post("/api/v1/auth/2fa/enable/", undefined, { signal });
};

// ----------------------------
// API  - Verify & Activate 2FA — Step 2 ★ NEW
// ----------------------------
export const verify2FAEnable = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/2fa/verify/", data, { signal });
};

// ----------------------------
// API  - Disable 2FA ★ NEW
// ----------------------------
export const disable2FA = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/2fa/disable/", data, { signal });
};

// ----------------------------
// API - Send / Resend Verification Email
// Backend confirmed (double opt-in flow): this endpoint works WITHOUT auth —
// it takes the email directly, since it must also be callable from the
// Login screen's "email not verified" block-state, where the user has no
// access token yet (login itself was blocked). Same pattern as
// forgot-password: identify the user by email, not by session.
// ----------------------------
export const sendVerificationEmail = (email, signal) => {
  return axiosInstance.post("/api/v1/auth/send-verification-email/", {
    email,
  }, { signal });
};

// ----------------------------
// API - Verify Email Address ★ NEW
// ----------------------------
// token comes from the query string in the emailed link: /verify-email?token=xxx
export const verifyEmail = (token, signal) => {
  return axiosInstance.get("/api/v1/auth/verify-email/", { signal,
    params: { token },
  });
};

// ----------------------------
// API  - Request Account Reactivation ★ BRAND NEW
// ----------------------------
// For a deactivated/deleted account (is_delete: true), sends a
// reactivation link to that account's registered email — same
// pattern as forgotPassword() above (API 5). Always returns a generic
// 200 success message regardless of whether the email actually
// belongs to a deactivated account, so the response never discloses
// whether a given email exists on the platform (security-by-design,
// same reasoning as the password-reset request flow).
// Request shape: { email: string }
export const requestAccountReactivation = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/reactivate/request/", data, { signal });
};

// ----------------------------
// API - Confirm Account Reactivation ★ BRAND NEW
// ----------------------------
// Called when the user clicks the link from their reactivation email
// (see ReactivateAccount.jsx, which auto-calls this on mount once a
// token is present in the URL). On success, the backend flips
// is_delete back to false and is_active back to true — no data is
// touched, every order/address/cart/wishlist record the account had
// before deletion comes back exactly as it was. The token is
// single-use and expires after 24 hours per the backend spec.
// Request shape: { token: string }
export const confirmAccountReactivation = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/reactivate/confirm/", data, { signal });
};
