// This file contains ALL API calls related to the Auth module.
// The base URL is automatically handled by axiosInstance (no need to repeat it here).
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// API 1 - Register a new customer account
// ----------------------------
export const registerUser = (data) => {
  return axiosInstance.post("/api/v1/auth/register/", data);
};

// ----------------------------
// API 2 - Log in an existing user
// ----------------------------
export const loginUser = (data) => {
  return axiosInstance.post("/api/v1/auth/login/", data);
};

// ----------------------------
// API 3 - Log out the current user
// ----------------------------
export const logoutUser = (data) => {
  return axiosInstance.post("/api/v1/auth/logout/", data);
};

// ----------------------------
// API 4 - Refresh the access token
// ----------------------------
export const refreshToken = (data) => {
  return axiosInstance.post("/api/v1/auth/token/refresh/", data);
};

// ----------------------------
// API 5 - Request a password reset link
// ----------------------------
export const forgotPassword = (data) => {
  return axiosInstance.post("/api/v1/auth/password-reset/", data);
};

// ----------------------------
// API 6 - Confirm and set a new password
// ----------------------------
export const resetPassword = (data) => {
  return axiosInstance.post("/api/v1/auth/password-reset/confirm/", data);
};

// ----------------------------
// API 7 - Get the currently logged-in user's profile
// ----------------------------
export const getMyProfile = () => {
  return axiosInstance.get("/api/v1/auth/me/");
};

// ----------------------------
// API 8 - Update the logged-in user's profile
// ----------------------------
export const updateMyProfile = (data) => {
  return axiosInstance.put("/api/v1/auth/me/update/", data);
};

// ----------------------------
// API 9 - Change Password ★ NEW (v2 backend doc)
// ----------------------------
// Sends current_password (for verification) + new_password.
// Backend returns 400 with { error: "Current password is incorrect." } if current_password is wrong.
export const changePassword = (data) => {
  return axiosInstance.post("/api/v1/auth/change-password/", data);
};

// ----------------------------
// API 10 - Complete 2FA Login (Step 2 of login when 2FA is on) ★ NEW
// ----------------------------
// Called after API 2 (login) returns { require_2fa: true, user_id }.
// Sends the 6-digit OTP code along with user_id to receive the real tokens.
export const verify2FALogin = (data) => {
  return axiosInstance.post("/api/v1/auth/2fa/login-verify/", data);
};

// ----------------------------
// API 11 - Delete My Account ★ NEW
// ----------------------------
// Soft-deletes (deactivates) the logged-in user's account. Requires password
// as confirmation. Backend returns 400 with { error: "Incorrect password." } on failure.
export const deleteMyAccount = (data) => {
  // axiosInstance.delete's second argument is the config object, not the body —
  // DELETE requests need the body passed inside { data: ... }.
  return axiosInstance.delete("/api/v1/auth/me/delete/", { data });
};

// ----------------------------
// API 12 - List Active Sessions ★ NEW
// ----------------------------
export const getMySessions = () => {
  return axiosInstance.get("/api/v1/auth/sessions/");
};

// ----------------------------
// API 13 - Sign Out All Sessions ★ NEW
// ----------------------------
export const revokeAllSessions = () => {
  return axiosInstance.post("/api/v1/auth/sessions/revoke-all/");
};

// ----------------------------
// API 14 - Enable 2FA — Step 1 ★ NEW
// ----------------------------
// Generates a TOTP secret and returns a QR code (base64 image) + manual entry key.
// 2FA is NOT active yet at this point — must be confirmed via verify2FAEnable (API 15).
export const enable2FA = () => {
  return axiosInstance.post("/api/v1/auth/2fa/enable/");
};

// ----------------------------
// API 15 - Verify & Activate 2FA — Step 2 ★ NEW
// ----------------------------
export const verify2FAEnable = (data) => {
  return axiosInstance.post("/api/v1/auth/2fa/verify/", data);
};

// ----------------------------
// API 16 - Disable 2FA ★ NEW
// ----------------------------
export const disable2FA = (data) => {
  return axiosInstance.post("/api/v1/auth/2fa/disable/", data);
};

// ----------------------------
// API 17 - Send / Resend Verification Email
// Backend confirmed (double opt-in flow): this endpoint works WITHOUT auth —
// it takes the email directly, since it must also be callable from the
// Login screen's "email not verified" block-state, where the user has no
// access token yet (login itself was blocked). Same pattern as
// forgot-password: identify the user by email, not by session.
// ----------------------------
export const sendVerificationEmail = (email) => {
  return axiosInstance.post("/api/v1/auth/send-verification-email/", {
    email,
  });
};

// ----------------------------
// API 18 - Verify Email Address ★ NEW
// ----------------------------
// token comes from the query string in the emailed link: /verify-email?token=xxx
export const verifyEmail = (token) => {
  return axiosInstance.get("/api/v1/auth/verify-email/", {
    params: { token },
  });
};
