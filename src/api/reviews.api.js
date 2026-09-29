// ============================================================
// PRODUCT REVIEWS API MODULE
// ============================================================
// This file contains every API call related to product reviews.
// It covers two areas:
//   1. Customer-facing calls scoped to a single product (list and
//      create), and calls addressed by the review's own id (edit and
//      delete).
//   2. Admin moderation calls (list the moderation queue and approve or
//      reject a review).
//
// A review goes through a moderation lifecycle:
//   - pending  : the state of every review a customer submits, and again
//                after a customer edits a review. It is hidden from the
//                product page until an admin approves it.
//   - approved : shown on the product page and counted in the rating
//                summary.
//   - rejected : never shown and never counted, but kept so an admin can
//                still find it and change the decision later.
// A review written by an admin is approved automatically.
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Pre-configured Axios instance: attaches the base URL and the auth
// token, and handles expired tokens globally.

// ----------------------------
// Request body builder
// ----------------------------
// Builds the request body for creating or editing a review.
//
// data shape: { rating?: number, comment?: string, profilePicture?: File }
//   - rating and comment are only included when they are not undefined,
//     so a partial update sends just the fields that changed.
//   - When a profile picture file is present the request must be sent as
//     multipart/form-data, because a file is involved. The Content-Type
//     header is removed in that case so the browser can set it together
//     with the multipart boundary.
//   - Without a picture a plain JSON body is sent.
const buildReviewRequest = ({ rating, comment, profilePicture }) => {
  if (profilePicture instanceof File) {
    const formData = new FormData();

    if (rating !== undefined) formData.append("rating", String(rating));
    if (comment !== undefined) formData.append("comment", comment);
    formData.append("profile_picture", profilePicture);

    return { body: formData, headers: { "Content-Type": undefined } };
  }

  const body = {};
  if (rating !== undefined) body.rating = rating;
  if (comment !== undefined) body.comment = comment;

  return { body, headers: undefined };
};

// ----------------------------
// Get a paginated list of approved reviews for one product
// ----------------------------
// No authentication is required. Only approved, non-deleted reviews are
// returned (newest first), in the standard paginated shape plus a
// "summary" object: { average_rating, review_count, breakdown }.
// "breakdown" maps each star rating ("5" to "1") to the percentage of
// reviews that gave it and is used to draw the rating bar chart. The
// summary only counts approved reviews, so it always matches the list.
//
// Each review in the list contains: id, user_name, profile_picture_url
// (null when the reviewer did not add a picture), rating, comment,
// is_verified_purchase and created_at.
//
// params: { page?: number }
export const getProductReviews = (productId, params, signal) => {
  return axiosInstance.get(`/api/v1/products/${productId}/reviews/`, {
    signal,
    params,
  });
};

// ----------------------------
// Submit a new review for a product (Customer only)
// ----------------------------
// One review per customer per product; posting a second time returns a
// 400 "already reviewed" error. A customer can only review a product
// they have received: without a delivered order containing the product
// the server answers with a 403 and an explanatory message.
//
// data shape: { rating: 1-5, comment?: string, profilePicture?: File }
// is_verified_purchase is computed entirely on the server.
//
// A customer's review is saved as pending. The response contains the new
// review plus a "message" telling the customer it is awaiting approval,
// and the review is NOT part of the list returned by getProductReviews
// until an admin approves it.
export const addProductReview = (productId, data, signal) => {
  const { body, headers } = buildReviewRequest(data);

  return axiosInstance.post(`/api/v1/products/${productId}/reviews/`, body, {
    signal,
    headers,
  });
};

// ----------------------------
// Update the logged-in customer's own review (Customer only)
// ----------------------------
// Ownership is enforced on the server: a review belonging to another
// customer returns 404 and never reveals whether it exists. The update
// is partial, so only the supplied fields change. Sending a new
// profilePicture replaces the current picture; omitting it keeps the
// current one.
//
// Editing sends the review back to pending: it disappears from the
// product page until an admin approves it again. The response contains
// the updated review plus a "message" explaining this.
//
// data shape: { rating?: 1-5, comment?: string, profilePicture?: File }
export const updateProductReview = (reviewId, data, signal) => {
  const { body, headers } = buildReviewRequest(data);

  return axiosInstance.patch(`/api/v1/reviews/${reviewId}/`, body, {
    signal,
    headers,
  });
};

// ----------------------------
// Delete the logged-in customer's own review (Customer only)
// ----------------------------
// Soft delete on the server: the review simply stops appearing anywhere
// from this point on. After deleting, the customer may post a new review
// for the same product.
export const deleteProductReview = (reviewId, signal) => {
  return axiosInstance.delete(`/api/v1/reviews/${reviewId}/`, { signal });
};

// ----------------------------
// List reviews for moderation (Admin only)
// ----------------------------
// Returns reviews newest first in the standard paginated shape. Unlike
// the public list, each item exposes the reviewer's real name and email,
// the product the review belongs to, the reviewer's profile picture and
// the review's current status. Reviews deleted by their author never
// appear.
//
// params (all optional):
//   status     - "pending" (default) | "approved" | "rejected" | "all".
//                Any other value is treated as "pending" by the server,
//                so only these four values should ever be sent.
//   product_id - only reviews of this product
//   page       - page number
export const getAdminReviews = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/reviews/", { signal, params });
};

// ----------------------------
// Approve or reject a review (Admin only)
// ----------------------------
// action must be "approve" or "reject".
//   - approve: the review becomes visible on the product page at once
//              and is counted in the product's rating summary.
//   - reject : the review is hidden from customers and not counted, but
//              stays stored and can be found again under the rejected
//              status.
// The decision is not final: a review can be approved or rejected again
// at any time, whatever its current status. A review the customer has
// deleted returns 404.
//
// Returns the updated review in the same shape as one item of
// getAdminReviews.
export const moderateReview = (reviewId, action, signal) => {
  return axiosInstance.patch(
    `/api/v1/admin/reviews/${reviewId}/moderate/`,
    { action },
    { signal },
  );
};
