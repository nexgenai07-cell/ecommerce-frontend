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
//                      above. UPDATED (16 Sep 2026, Filtering Fix
//                      pass, API 29): now also accepts MULTIPLE
//                      values in a single request — comma-separated
//                      ("out_of_stock,low_stock") or repeated
//                      (?status=out_of_stock&status=low_stock) — so
//                      the Inventory Alerts page sends every selected
//                      status tab together as one request instead of
//                      looping per-status and merging in the browser
//                      (see InventoryAlerts.jsx).
//   - ordering     -> e.g. "-created_at", "price", "-price", "name"
//   - min_price / max_price -> filters by product price range.
//     UPDATED (Sep 2026, API 29 backend fix): the backend now rejects
//     a negative min_price/max_price OR a min_price greater than
//     max_price with a 400 under an "error" key (e.g. "min_price
//     cannot be negative.", "min_price cannot be greater than
//     max_price."). The customer-facing price slider (ProductsFilters.jsx)
//     already clamps its own inputs so it can never produce either
//     case; the admin panel's RangeFilterChip does not, so ProductList.jsx
//     surfaces this 400 as an inline error toast instead of a silent
//     empty result grid.
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
// UPDATED (Sep 2026, API 31 backend fix): sku now has a hard
// 15-character cap enforced server-side — a longer value gets a 400
// ("SKU cannot be longer than 15 characters."). Validated client-side
// too, see the sku field in ProductAdd.jsx's Zod schema.
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
// UPDATED (Sep 2026, API 32 backend fix): same 15-character sku cap as
// createProduct() above now applies here too.
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
// API 34.1 - Delete multiple products in one request (Admin only)
// ----------------------------
// Soft-deletes several products in a single call. Replaces the old
// pattern of calling deleteProduct() once per selected row — each id
// in the batch is still processed independently on the backend using
// the exact same rules as deleteProduct(), so one id failing never
// blocks the rest of the batch.
//
// ids — a non-empty array of product ids, maximum 100 per call. A
// selection larger than 100 rows must be split into batches of 100
// and sent as separate calls (see chunkArray in utils/chunkArray.js).
//
// The response is always 200 OK for a well-formed request, even if
// some ids could not be deleted, so the result must be read from the
// response body rather than the HTTP status:
//   deleted_ids — ids that were deleted successfully
//   missing_ids — ids that no longer exist (already deleted, or
//                 stale in the current selection); these should be
//                 dropped from the table and the selection quietly,
//                 without showing an error
//   failed      — present only when something unexpected happened
//                 for a specific id; each entry is { id, error }
//   message     — a ready-made summary sentence, suitable for a toast
//
// A 400 response means the request itself was invalid (empty ids,
// invalid ids, or more than 100 ids) and nothing was processed.
export const bulkDeleteProducts = (ids, signal) => {
  return axiosInstance.post(
    "/api/v1/products/bulk-delete/",
    { ids },
    { signal },
  );
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
// API 38 - Get a list of low-stock products (Admin only)
// ----------------------------
// UPDATED (16 Sep 2026, Filtering Fix pass, API 38): this endpoint now
// also accepts optional query params — q (matches name/description/
// sku/category name), category_id (single or comma-separated), and
// OPT-IN real pagination (page, page_size). Pagination only activates
// when `page` is explicitly sent:
//   - params omitted (or page left out) -> response is UNCHANGED, the
//     same complete plain array as always. The admin dashboard's small
//     red-alert widget relies on exactly this behavior and needs no
//     changes.
//   - page sent -> response becomes the standard paginated shape
//     { count, next, previous, results }. Used by the fuller "Low
//     Stock" view on the admin Product Management table (see
//     ProductList.jsx) so it can offer real server-side search,
//     category filtering, and pagination instead of fetching the
//     complete low-stock list and filtering it in the browser.
export const getLowStockProducts = (params, signal) => {
  return axiosInstance.get("/api/v1/products/low-stock/", { signal, params });
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
