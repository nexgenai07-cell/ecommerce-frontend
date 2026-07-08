// ============================================================
// WISHLIST API MODULE
// ============================================================
// This file contains ALL API calls related to the Wishlist module.
// These endpoints handle everything needed to manage a customer's
// wishlist — viewing saved products, adding new products to it,
// and removing products from it.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.
// After these mutations succeed, the wishlist should typically be
// re-synced with Redux (via the setWishlist action) so the UI
// reflects the latest backend state.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 39 - Get the full wishlist data
// ----------------------------
// Fetches the complete list of products the logged-in customer has
// saved to their wishlist. Typically called when the wishlist page
// loads, or when the app needs to know which products are saved
// (e.g. to show filled/empty heart icons on product cards).
//
// Backend now returns the documented nested shape directly
// (product: { id, name, price, primary_image, in_stock, stock, category })
// — matching Cart's pattern, so no frontend-side normalization is
// needed anymore.
export const getWishlist = () => {
  return axiosInstance.get("/api/v1/wishlist/");
};

// ----------------------------
// API 40 - Add a product to the wishlist
// ----------------------------
// Used when the customer clicks an EMPTY heart icon on a product
// card or product detail page, indicating they want to save that
// product to their wishlist. The "data" payload is expected to
// contain:
// - product_id: which product to add to the wishlist
export const addToWishlist = (data) => {
  return axiosInstance.post("/api/v1/wishlist/add/", data);
};

// ----------------------------
// API 41 - Remove a product from the wishlist
// ----------------------------
// Used when the customer clicks a FILLED heart icon (meaning the
// product is already saved), indicating they want to remove it from
// their wishlist. "itemId" identifies which specific wishlist entry
// to delete (this is the wishlist ITEM's id, not the product's id).
export const removeFromWishlist = (itemId) => {
  return axiosInstance.delete(`/api/v1/wishlist/remove/${itemId}/`);
};
