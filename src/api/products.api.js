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

import extractListData from "../utils/extractListData";
// extractListData — normalizes a product-list response into a plain
// array regardless of whether the backend returned a flat array or a
// DRF-paginated object ({ count, next, previous, results }). Needed
// below by fetchAllProducts, which has to read `.results` and `.next`
// off of every page it follows.

// ----------------------------
// API  - Get a paginated list of all products
// ----------------------------
export const getProducts = (params) => {
  return axiosInstance.get("/api/v1/products/", { params });
};

// ----------------------------
// API - Search and filter products
// ----------------------------
export const searchProducts = (params) => {
  return axiosInstance.get("/api/v1/products/search/", { params });
};

// ----------------------------
// API  - Get full details of a single product
// ----------------------------
export const getProductById = (id) => {
  return axiosInstance.get(`/api/v1/products/${id}/`);
};

// ----------------------------
// API - Create a new product (Admin only)
// ----------------------------
export const createProduct = (data) => {
  return axiosInstance.post("/api/v1/products/", data, {
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
export const checkProductNameExists = (name, excludeId) => {
  return axiosInstance.get("/api/v1/products/check-name/", {
    params: { name, exclude_id: excludeId },
  });
};

// ----------------------------
// API 31.2 - Check whether a SKU is already taken (Admin only)
// ----------------------------
// Same pattern as checkProductNameExists above, for the sku field.
export const checkProductSkuExists = (sku, excludeId) => {
  return axiosInstance.get("/api/v1/products/check-sku/", {
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
export const updateProduct = (id, data) => {
  return axiosInstance.put(`/api/v1/products/${id}/`, data);
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
export const deleteProduct = (id) => {
  return axiosInstance.delete(`/api/v1/products/${id}/`);
};

// ----------------------------
// API - Upload an image for a product
// ----------------------------
export const uploadProductImage = (id, data) => {
  return axiosInstance.post(`/api/v1/products/${id}/images/`, data, {
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API  - Delete a specific product image (Admin only)
// ----------------------------
export const deleteProductImage = (productId, imageId) => {
  return axiosInstance.delete(
    `/api/v1/products/${productId}/images/${imageId}/`,
  );
};

// ----------------------------
// API - Set an image as the primary image (Admin only)
// ----------------------------
export const setPrimaryImage = (productId, imageId) => {
  return axiosInstance.put(
    `/api/v1/products/${productId}/images/${imageId}/set-primary/`,
  );
};

// ----------------------------
// API - Get a list of low-stock products (Admin only)
// ----------------------------
export const getLowStockProducts = () => {
  return axiosInstance.get("/api/v1/products/low-stock/");
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
// Response shape: { id, stock, previous_stock, delta_applied }
export const adjustProductStock = (id, data) => {
  return axiosInstance.post(`/api/v1/products/${id}/stock/adjust/`, data);
};

// ----------------------------
// Fetch EVERY product across ALL pages (used by Inventory Alerts)
// ----------------------------
// WHY THIS EXISTS:
// The Inventory Alerts page used to fetch products ONE SERVER PAGE at
// a time (getProducts({ page: currentPage })) and then filter that
// single page client-side by status tab (Out of Stock / Low Stock /
// Healthy). That broke pagination — e.g. "Out of Stock" would only
// ever be filtered from whatever 12 products happened to be on the
// CURRENT page, instead of the real, complete set of out-of-stock
// products across the entire catalog. Page 1 showed a different,
// incomplete slice than page 2, and the tab counts never matched the
// real totals.
//
// fetch the COMPLETE product catalog once (following the
// `next` pagination link until it's null, so this works correctly no
// matter how many products exist or what page size the backend
// uses), then do ALL filtering (search, category, status tab) and
// pagination entirely on the frontend, against the real, complete
// list — exactly the same pattern already used for the admin
// Customers page (see fetchAllCustomers in customers.api.js).
//
// USAGE:
//   const allProducts = await fetchAllProducts();
//   // allProducts is a plain array — every product in the catalog,
//   // not just the first page.
export const fetchAllProducts = async () => {
  const allResults = [];
  // Accumulates every product object from every page into one array

  // Fetch the first page using the normal getProducts() call above
  let response = await getProducts({ page: 1 });
  allResults.push(...extractListData(response));
  // Spreads this page's results into the accumulator array

  // response.data.next is the FULL absolute URL for the next page,
  // exactly as returned by DRF's standard pagination.
  let nextUrl = response?.data?.next;

  while (nextUrl) {
    // axiosInstance.get() accepts a full absolute URL here — Axios
    // uses it as-is instead of prefixing baseURL, and the auth
    // interceptor still attaches the Bearer token automatically
    // since the interceptor doesn't check the URL, only the config.
    response = await axiosInstance.get(nextUrl);
    allResults.push(...extractListData(response));
    nextUrl = response?.data?.next;
    // Keeps looping until the backend eventually returns next: null
  }

  return allResults;
  // Returns a plain flat array — the calling component does not need
  // to know or care how many pages it took to gather this
};
