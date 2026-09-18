// PRODUCT REVIEWS API MODULE
// ============================================================
// This file contains ALL API calls related to the Product Reviews
// feature . Reviews are addressed two different ways — scoped to
// a single product for listing/creating, and by their own id for
// editing/deleting — so both live together here rather than being
// split across products.api.js.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 30.1 - Get a paginated list of reviews for one product
// ----------------------------
// No authentication required — every visitor can read reviews, logged
// in or not. Returns the standard DRF-paginated shape PLUS an extra
// "summary" object on top: { average_rating, review_count, breakdown }
// — "breakdown" is a { "5": pct, "4": pct, ... "1": pct } map of what
// percentage of all reviews gave each star rating, used to draw the
// 5-star-down-to-1-star bar chart. This summary is recalculated fresh
// on every request, so it always matches the product's current review
// count exactly (unlike the average_rating/review_count fields on the
// product detail response itself, which are only as fresh as that
// endpoint's own last fetch).
//
// params: { page?: number }
export const getProductReviews = (productId, params, signal) => {
  return axiosInstance.get(`/api/v1/products/${productId}/reviews/`, {
    signal,
    params,
  });
};

// ----------------------------
// API 30.1 - Submit a new review for a product (Customer only)
// ----------------------------
// One review per customer per product — posting a second time for the
// same product returns a 400 with an "already reviewed" message (see
// ProductReviews.jsx, which checks the currently-loaded review list
// for the customer's own review BEFORE showing this form, so this
// 400 should only ever be hit in a genuine race — e.g. two open tabs).
//
// data shape: { rating: 1-5, comment?: string }
// is_verified_purchase is computed entirely server-side (whether this
// customer has a DELIVERED order containing this product) — it is
// never sent from here, and can't be spoofed by the frontend.
export const addProductReview = (productId, data, signal) => {
  return axiosInstance.post(`/api/v1/products/${productId}/reviews/`, data, {
    signal,
  });
};

// ----------------------------
// API 30.2 - Update the logged-in customer's own review (Customer only)
// ----------------------------
// Ownership is enforced server-side — a review id belonging to another
// customer returns a 404, never revealing whether it exists. Partial
// updates are supported by the backend (PATCH), and that's exactly
// what's used here since the edit form always sends both fields anyway.
// data shape: { rating: 1-5, comment: string }
export const updateProductReview = (reviewId, data, signal) => {
  return axiosInstance.patch(`/api/v1/reviews/${reviewId}/`, data, {
    signal,
  });
};

// ----------------------------
// API 30.2 - Delete the logged-in customer's own review (Customer only)
// ----------------------------
// Soft delete on the backend (is_delete: true) — the review simply
// stops appearing in getProductReviews() above from this point on;
// there is no restore path from the frontend.
export const deleteProductReview = (reviewId, signal) => {
  return axiosInstance.delete(`/api/v1/reviews/${reviewId}/`, { signal });
};
