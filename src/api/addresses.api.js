// ============================================================
// ADDRESSES API MODULE
// ============================================================
// This file contains ALL API calls related to the customer Address
// Book — the module that replaced the old single-address checkout
// prefill/save endpoints (formerly GET /orders/checkout/prefill/ and
// PUT /orders/save-address/, both now deprecated and removed on the
// backend). A customer can now store MULTIPLE saved addresses, pick
// one as the default, and choose exactly which one to ship an order
// to at checkout time.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API — Get all saved addresses for the logged-in customer
// ----------------------------
// Fetches every address this customer has saved to their Address
// Book. Response shape: { results: [ { id, label, shipping_address,
// city, postal_code, phone, is_default } ] }. Exactly one address in
// this list will have is_default: true at any given time.
export const getAddresses = (signal) => {
  return axiosInstance.get("/api/v1/addresses/", { signal });
};

// ----------------------------
// API — Create a new saved address
// ----------------------------
// Always creates a brand new entry — never overwrites an existing
// address, even if the label matches one already saved. The "data"
// payload is expected to include:
// - label: a short name for this address (e.g. "Home", "Office")
// - shipping_address: the street address
// - city: the city name
// - postal_code: optional
// - phone: optional
// - is_default: whether this should immediately become the default
//   shipping address
export const createAddress = (data, signal) => {
  return axiosInstance.post("/api/v1/addresses/", data, { signal });
};

// ----------------------------
// API — Update one existing saved address
// ----------------------------
// Edits only the address identified by "id" — every other saved
// address is left untouched. Accepts the same fields as
// createAddress() above.
export const updateAddress = (id, data, signal) => {
  return axiosInstance.put(`/api/v1/addresses/${id}/`, data, { signal });
};

// ----------------------------
// API — Delete a saved address
// ----------------------------
export const deleteAddress = (id, signal) => {
  return axiosInstance.delete(`/api/v1/addresses/${id}/`, { signal });
};

// ----------------------------
// API — Set one address as the default shipping address
// ----------------------------
// No request body — the backend automatically unsets whichever
// address was previously the default, so exactly one address is
// ever marked is_default: true at a time. This is the endpoint the
// "Set as default" action on an address card calls; it is separate
// from updateAddress() so switching the default never risks
// accidentally changing the address's other fields.
export const setDefaultAddress = (id, signal) => {
  return axiosInstance.put(`/api/v1/addresses/${id}/set-default/`, undefined, {
    signal,
  });
};
