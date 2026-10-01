// ============================================================
// WISHLIST API MODULE
// ============================================================
// Every API call for the wishlist lives in this file.
//
// The wishlist works for both signed-in customers and guests:
// - A signed-in customer's requests carry the Authorization header and
//   operate on the account wishlist.
// - A guest's requests carry the X-Cart-Session header and operate on a
//   guest wishlist. The guest session key is shared with the cart, and
//   the shared axios instance stores and attaches it automatically.
//   When the guest signs in, the guest wishlist is merged into the
//   account wishlist by the login request itself.
//
// These functions are meant to be used as query and mutation functions
// with TanStack Query. After a mutation succeeds, the wishlist query is
// invalidated so every screen reflects the latest server state.

import axiosInstance from "../lib/axiosInstance";
// Pre-configured axios instance: base URL, auth token, guest session
// header and global 401 handling are all applied here.

// ----------------------------
// Get the full wishlist
// ----------------------------
// Fetches every product saved to the wishlist. Called by the navbar to
// keep the heart icons and the badge in sync, and by the Wishlist page.
//
// Response shape: { items: [{ id, product: { id, name, price,
// primary_image, in_stock, total_stock, reserved_stock, available_stock,
// rating, review_count, category } }] }
// For a guest the response also carries a session_key.
export const getWishlist = (signal) => {
  return axiosInstance.get("/api/v1/wishlist/", { signal });
};

// ----------------------------
// Add a product to the wishlist
// ----------------------------
// Used when the customer taps an empty heart icon.
//
// Request shape: { product_id: number }
// Response (200): the updated wishlist plus a message. Adding a product
// that is already saved is not an error: the response has the same shape
// with a message saying so, so callers should display the returned
// message instead of assuming a new item was created.
export const addToWishlist = (data, signal) => {
  return axiosInstance.post("/api/v1/wishlist/add/", data, { signal });
};

// ----------------------------
// Remove one item from the wishlist
// ----------------------------
// Used when the customer taps a filled heart icon or a remove button.
// "itemId" is the wishlist ITEM id, not the product id.
export const removeFromWishlist = (itemId, signal) => {
  return axiosInstance.delete(`/api/v1/wishlist/remove/${itemId}/`, { signal });
};

// ----------------------------
// Remove several items in one request
// ----------------------------
// Used by the multi-select delete flow on the Wishlist page so the
// selected cards leave together instead of one request per item.
//
// Request shape: { item_ids: number[] }, wishlist ITEM ids.
// Response (200): { message, removed_count, wishlist }. Ids that do not
// exist or belong to another wishlist are ignored silently, so
// removed_count can be smaller than the number of ids sent.
export const bulkRemoveFromWishlist = (itemIds, signal) => {
  return axiosInstance.post(
    "/api/v1/wishlist/bulk-remove/",
    { item_ids: itemIds },
    { signal },
  );
};

// ----------------------------
// Clear the entire wishlist
// ----------------------------
// Removes every saved product in a single request. Used by the
// "Clear Wishlist" action on the Wishlist page.
//
// No request body. Response (200): { message }.
export const clearWishlist = (signal) => {
  return axiosInstance.delete("/api/v1/wishlist/clear/", { signal });
};
