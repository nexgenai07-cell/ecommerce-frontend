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
// API  - Get a paginated list of all products
// ----------------------------
export const getProducts = (params, signal) => {
  return axiosInstance.get("/api/v1/products/", { signal, params });
};

// ----------------------------
// API - Search and filter products
// ----------------------------
// CONFIRMED WORKING SERVER-SIDE (as of the backend's latest fix):
//   - q            -> matches against BOTH product name AND sku
//   - category_id  -> filters to that exact category. Also now
//                      confirmed to accept MULTIPLE values in one
//                      request as a comma-separated list
//                      (e.g. "category_id=5,8"), returning products in
//                      ANY of those categories, combined and correctly
//                      counted server-side.
//   - in_stock     -> true/false, genuinely filters by real stock status
//   - status       -> "out_of_stock" | "low_stock" | "healthy" —
//                      combines correctly with every other filter
//                      above. NOTE: only single values are confirmed;
//                      sending multiple statuses in one request was
//                      not part of the confirmed contract, so the
//                      Inventory Alerts page fetches each selected
//                      status separately when more than one is active
//                      (see InventoryAlerts.jsx).
//   - ordering     -> e.g. "-created_at", "price", "-price", "name"
//   - page         -> standard pagination
// All of the above now combine correctly in a single request. This
// endpoint is the single source of truth for the admin Product
// Management and Inventory Alerts pages — there is no longer a need
// to fetch the entire catalog and filter it in the browser.
export const searchProducts = (params, signal) => {
  return axiosInstance.get("/api/v1/products/search/", { signal, params });
};

// ----------------------------
// API  - Get full details of a single product
// ----------------------------
export const getProductById = (id, signal) => {
  return axiosInstance.get(`/api/v1/products/${id}/`, { signal });
};

// ----------------------------
// API - Create a new product (Admin only)
// ----------------------------
export const createProduct = (data, signal) => {
  return axiosInstance.post("/api/v1/products/", data, {
    signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API 31.1 - Check whether a product name is already taken (Admin only)
// ----------------------------
// Used by the Add/Edit Product form to show an inline "already exists"
// error the moment the admin leaves the Name field, instead of only
// finding out after Submit. excludeId is passed only in edit mode, so
// a product doesn't get flagged as a duplicate of itself.
// Response shape (confirmed with backend): { exists: boolean }
export const checkProductNameExists = (name, excludeId, signal) => {
  return axiosInstance.get("/api/v1/products/check-name/", {
    signal,
    params: { name, exclude_id: excludeId },
  });
};

// ----------------------------
// API 31.2 - Check whether a SKU is already taken (Admin only)
// ----------------------------
// Same pattern as checkProductNameExists above, for the sku field.
export const checkProductSkuExists = (sku, excludeId, signal) => {
  return axiosInstance.get("/api/v1/products/check-sku/", {
    signal,
    params: { sku, exclude_id: excludeId },
  });
};

// ----------------------------
// API - Update an existing product (Admin only)
// ----------------------------
// NOTE: "stock" is intentionally NOT sent through this endpoint anymore.
// Stock changes (add/remove/correction) now go through the dedicated
// adjustStock() function below, which is atomic and race-condition-safe
// on the backend. This endpoint stays for name/price/category/etc. only.
export const updateProduct = (id, data, signal) => {
  return axiosInstance.put(`/api/v1/products/${id}/`, data, { signal });
};

// ----------------------------
// API - Delete a product (Admin only)
// ----------------------------
// SOFT delete on the backend — sets an internal is_delete flag on
// this product's row instead of removing it (the row itself, and any
// past order line-item referencing it, is fully preserved). That flag
// is never exposed in any response, and every list/search/detail
// endpoint above filters it out automatically from this point on.
//
// IMPORTANT: this is a COMPLETELY SEPARATE flag from is_active above.
// is_active is the admin's own Publish/Draft toggle (set from the
// product form) and stays fully under their control, untouched by
// this call. is_delete is only ever set by this endpoint, is never
// shown in the UI, and has no restore path — once a product is
// deleted here, it's gone from the storefront and admin catalog for
// good (though its historical order references keep working).
export const deleteProduct = (id, signal) => {
  return axiosInstance.delete(`/api/v1/products/${id}/`, { signal });
};

// ----------------------------
// API - Upload an image for a product
// ----------------------------
export const uploadProductImage = (id, data, signal) => {
  return axiosInstance.post(`/api/v1/products/${id}/images/`, data, {
    signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API  - Delete a specific product image (Admin only)
// ----------------------------
export const deleteProductImage = (productId, imageId, signal) => {
  return axiosInstance.delete(
    `/api/v1/products/${productId}/images/${imageId}/`,
    { signal },
  );
};

// ----------------------------
// API - Set an image as the primary image (Admin only)
// ----------------------------
export const setPrimaryImage = (productId, imageId, signal) => {
  return axiosInstance.put(
    `/api/v1/products/${productId}/images/${imageId}/set-primary/`,
    undefined,
    { signal },
  );
};

// ----------------------------
// API - Get a list of low-stock products (Admin only)
// ----------------------------
export const getLowStockProducts = (signal) => {
  return axiosInstance.get("/api/v1/products/low-stock/", { signal });
};

// ----------------------------
// Adjust product stock (Admin only)
// ----------------------------
// Sends only the CHANGE (delta), never the absolute new total. The
// backend applies this atomically (stock = stock + delta at the DB
// level) so it can never be silently overwritten by a simultaneous
// customer checkout reducing the same product's stock. Also logs the
// change (reason/note) into the backend's stock history/audit trail.
//
// data shape: { delta: number, reason: string, note?: string }
//   delta  -> positive to add stock, negative to remove stock
//   reason -> "restock" | "damaged" | "correction" | "return" | "other"
//   note   -> optional free-text explanation
//
// Response shape: { id, total_stock, reserved_stock, available_stock,
// previous_stock, delta_applied }. available_stock is always
// server-computed as total_stock - reserved_stock — this endpoint's
// delta only ever changes total_stock, never reserved_stock directly.
export const adjustProductStock = (id, data, signal) => {
  return axiosInstance.post(`/api/v1/products/${id}/stock/adjust/`, data, {
    signal,
  });
};
