// This file contains ALL API calls related to the Auth module.
// The base URL is automatically handled by axiosInstance (no need to repeat it here).
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// API  - Register a new customer account
// ----------------------------
// The request body carries name, email, phone, password and
// confirm_password, plus the "Primary Address" typed on the registration
// form. The address fields are:
// - address: the street address (at least 8 characters, at most 500)
// - city: optional — letters and spaces only, at most 30 characters
// - postal_code: optional — 4 to 6 digits
// When address is sent, the backend saves it as the new customer's
// default saved address (label "Primary") in the Address Book, using the
// registration phone as the address phone. If city is omitted the
// backend tries to detect a known Pakistani city inside the address text;
// when none is found the address is saved with an empty city, which the
// customer must complete before checking out with that address.
//
// A 400 response can carry field-keyed errors under "address", "city" or
// "postal_code" in addition to the errors of the other fields.
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
// API 3 - Log out the current user
// ----------------------------
// UPDATED (API Changes Addendum, Sep 2026): logging out now ALSO
// deletes this device's matching UserSession row (matched server-side
// by the refresh token's own jti), on top of blacklisting the token
// as before. Previously the token was blacklisted but the stale
// session row stayed in getMySessions() above until revokeAllSessions()
// was used — a normal logout now removes this device from that list
// immediately. The request/response shape sent here is unchanged.
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
  return axiosInstance.post("/api/v1/auth/password-reset/confirm/", data, {
    signal,
  });
};

// ----------------------------
// API 7 - Get the currently logged-in user's profile
// ----------------------------
// Response now also includes profile_picture (an image URL, or null)
// and addresses (the user's full saved address list, read-only here —
// manage individual addresses via the Address Book endpoints instead).
// This single endpoint serves BOTH the customer account profile page
// AND the admin profile page — role is simply a field on the
// response, there is no separate admin-only profile endpoint.
export const getMyProfile = (signal) => {
  return axiosInstance.get("/api/v1/auth/me/", { signal });
};

// ----------------------------
// API 8 - Update the logged-in user's profile
// ----------------------------
// Accepts a plain JSON body of { name, phone } when no picture is
// being changed. When a new profile picture is attached, the request
// is automatically switched to multipart/form-data instead so the
// image file can actually be uploaded alongside the text fields.
//
// email is permanently read-only on this endpoint — changing it now
// requires the two-step OTP flow below (requestEmailChange() /
// confirmEmailChange(), API 8.1 / API 8.2) instead of ever being a
// plain field on this form.
export const updateMyProfile = (data, signal) => {
  // No picture in this update — send plain JSON, the simplest and
  // lightest request shape, exactly as before.
  if (!data.profile_picture) {
    return axiosInstance.put("/api/v1/auth/me/update/", data, { signal });
  }

  // A picture file is attached — the request body must be built as
  // FormData so the browser can send it as multipart/form-data.
  const formData = new FormData();
  if (data.name !== undefined) formData.append("name", data.name);
  if (data.phone !== undefined) formData.append("phone", data.phone);
  formData.append("profile_picture", data.profile_picture);

  // IMPORTANT: axiosInstance has a default "Content-Type: application/json"
  // header set at the instance level (see lib/axiosInstance.js). Axios only
  // auto-detects FormData and generates the correct multipart boundary when
  // NO Content-Type has already been set — since one IS already set here
  // (at the instance level), we must explicitly clear it for this request by
  // setting it to `undefined`. That lets axios/browser take over and attach
  // the correct "multipart/form-data; boundary=..." header automatically.
  // Do NOT hardcode "multipart/form-data" yourself — without the boundary
  // parameter the backend can't parse the body and will silently fall back
  // to default field values (or reject the file entirely).
  return axiosInstance.put("/api/v1/auth/me/update/", formData, {
    signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API 8.1 - Request an email address change (Step 1 of 2)
// ----------------------------
// Verifies the user's current password, then emails a 6-digit code to
// the NEW address to confirm the user actually controls it. The
// account's email is NOT changed by this call — only after
// confirmEmailChange() (API 8.2) succeeds with the correct code.
//
// A best-effort heads-up notice is also sent to the OLD (current)
// address at this step, in case this request wasn't made by the
// actual account owner.
//
// Request shape: { password: string, new_email: string }
// Response (200): { message: string }
// Possible 400 errors (returned under an "error" key):
// - "password and new_email are required."
// - "Incorrect password."
// - "That is already your current email address."
// - "A user with this email already exists."
export const requestEmailChange = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/me/email/change/", data, {
    signal,
  });
};

// ----------------------------
// API 8.2 - Confirm an email address change (Step 2 of 2)
// ----------------------------
// Validates the 6-digit code sent to the new address by
// requestEmailChange() above. Only on a valid, unexpired code does
// the account's email actually change — email_verified is set to
// true at the same time, since receiving and re-entering this code
// already proves the new address is reachable.
//
// Request shape: { otp: string (6 digits) }
// Response (200): { message: string, user: {...} } — "user" is the
// full profile object, same shape as getMyProfile(), with the new
// email already reflected. Refresh the profile query on success so
// the UI shows the new, now-verified email immediately.
// Possible 400 errors (returned under an "error" key):
// - "otp is required."
// - "No pending email change found. Call /me/email/change/ first."
// - "Invalid code."
// - "Code has expired. Please request a new one."
// - "That email is no longer available." (someone else registered it
//   between step 1 and step 2)
export const confirmEmailChange = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/me/email/confirm/", data, {
    signal,
  });
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
  return axiosInstance.post("/api/v1/auth/sessions/revoke-all/", undefined, {
    signal,
  });
};

// ----------------------------
// API 15.1 - Sign Out a Single Session ★ NEW (API Changes Addendum, Sep 2026)
// ----------------------------
// Signs out ONE specific session/device by its id (the "id" field from
// getMySessions() above), leaving every other active session
// untouched — unlike revokeAllSessions() above, which is all-or-nothing.
// Works for devices other than the one the customer is currently on,
// as well as for the current device itself (which behaves the same as
// a normal logout when revoked this way).
// Ownership is enforced server-side: a sessionId belonging to another
// user, or one that doesn't exist, returns a 404 without revealing
// which — surfaced here as a generic "Session not found." error.
export const revokeSession = (sessionId, signal) => {
  return axiosInstance.post(
    `/api/v1/auth/sessions/${sessionId}/revoke/`,
    undefined,
    { signal },
  );
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
  return axiosInstance.post(
    "/api/v1/auth/send-verification-email/",
    {
      email,
    },
    { signal },
  );
};

// ----------------------------
// API - Verify Email Address ★ NEW
// ----------------------------
// token comes from the query string in the emailed link: /verify-email?token=xxx
export const verifyEmail = (token, signal) => {
  return axiosInstance.get("/api/v1/auth/verify-email/", {
    signal,
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
  return axiosInstance.post("/api/v1/auth/reactivate/request/", data, {
    signal,
  });
};

// ----------------------------
// API - Google OAuth Sign In / Sign Up ★ NEW
// ----------------------------
// Called after Google Identity Services successfully authenticates the
// user in the browser and hands us back a signed ID token
// (response.credential in the Google callback). We forward that raw
// token to the backend, which independently verifies it with Google,
// creates the account automatically the first time a given Google
// account is used (sign-up), or simply logs the existing account in on
// every later visit (sign-in) — both cases are handled by this single
// endpoint on the backend side.
//
// Request shape:  { id_token: string }
// Response shape: { user: {...}, tokens: { access, refresh } } — the
// exact same shape returned by loginUser() above, so the calling code
// (see useGoogleSignIn.js) can reuse the normal login() flow without
// any special-casing.
export const googleAuth = (data, signal) => {
  return axiosInstance.post("/api/v1/auth/google/", data, { signal });
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
  return axiosInstance.post("/api/v1/auth/reactivate/confirm/", data, {
    signal,
  });
};
