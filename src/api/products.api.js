// ============================================================
// PRODUCTS API MODULE
// ============================================================
// This file contains ALL API calls related to the Products module.
// It covers endpoints needed by BOTH customers (browsing, searching,
// viewing product details) AND admins (creating, updating, deleting
// products and managing their images).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 16 - Get a paginated list of all products
// ----------------------------
// Fetches the full product catalog (typically used on the main
// products/shop listing page). Accepts an optional "params" object
// (e.g. { ordering, page, category_id }) which is forwarded as
// query parameters — this was previously missing, which silently
// broke every caller that tried to pass filters/sorting/pagination
// (TrendingSection, RelatedProducts, Cart's "you may also like").
export const getProducts = (params) => {
  return axiosInstance.get("/api/v1/products/", { params });
};

// ----------------------------
// API 17 - Search and filter products
// ----------------------------
// Used for the search/filter functionality on the products page.
// The "params" object can include various filter options such as:
// - q: search keyword/query string
// - category_id: filter by a specific category
// - min_price / max_price: filter by price range
// - in_stock: filter to only show products currently in stock
// - ordering: sort order (e.g. price ascending/descending, newest first)
// - page: which page of results to fetch (for pagination)
export const searchProducts = (params) => {
  return axiosInstance.get("/api/v1/products/search/", { params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
  // (e.g. ?q=shoes&category_id=3&min_price=500)
};

// ----------------------------
// API 18 - Get full details of a single product
// ----------------------------
// Fetches everything about one specific product, identified by its ID —
// including its full image gallery, description, pricing, stock info, etc.
// Used on the product detail page.
export const getProductById = (id) => {
  return axiosInstance.get(`/api/v1/products/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API 19 - Create a new product (Admin only)
// ----------------------------
// Used by admins to add a new product to the catalog.
// The "data" being sent is expected to be FormData (not plain JSON),
// since it may include image files along with text fields like
// name, price, description, etc.
export const createProduct = (data) => {
  return axiosInstance.post("/api/v1/products/", data, {
    headers: { "Content-Type": "multipart/form-data" },
    // Overriding the default "application/json" content type
    // (set globally in axiosInstance) specifically for THIS request,
    // since file uploads require "multipart/form-data" instead.
  });
};

// ----------------------------
// API 20 - Update an existing product (Admin only)
// ----------------------------
// Used by admins to edit/update details of a product that already
// exists, identified by its ID. Sends the updated fields as "data".
export const updateProduct = (id, data) => {
  return axiosInstance.put(`/api/v1/products/${id}/`, data);
};

// ----------------------------
// API 21 - Delete a product (Admin only)
// ----------------------------
// Removes a product from the catalog (soft delete on the backend).
export const deleteProduct = (id) => {
  return axiosInstance.delete(`/api/v1/products/${id}/`);
};

// ----------------------------
// API 22 - Upload an image for a product (Admin only)
// ----------------------------
export const uploadProductImage = (id, data) => {
  return axiosInstance.post(`/api/v1/products/${id}/images/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ----------------------------
// API 23 - Delete a specific product image (Admin only)
// ----------------------------
export const deleteProductImage = (productId, imageId) => {
  return axiosInstance.delete(
    `/api/v1/products/${productId}/images/${imageId}/`,
  );
};

// ----------------------------
// API 24 - Set an image as the primary image (Admin only)
// ----------------------------
export const setPrimaryImage = (productId, imageId) => {
  return axiosInstance.put(
    `/api/v1/products/${productId}/images/${imageId}/set-primary/`,
  );
};

// ----------------------------
// API 25 - Get a list of low-stock products (Admin only)
// ----------------------------
export const getLowStockProducts = () => {
  return axiosInstance.get("/api/v1/products/low-stock/");
};
