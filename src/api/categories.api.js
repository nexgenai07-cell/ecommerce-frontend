// ============================================================
// CATEGORIES API MODULE
// ============================================================
// This file contains ALL API calls related to the Categories module.
// Categories are used to organize products (e.g. "Electronics",
// "Clothing", "Footwear"). This module covers:
// - A list endpoint usable by BOTH customers (for browsing/filtering)
//   and admins (for managing categories)
// - Full CRUD (Create, Read, Update, Delete) operations restricted
//   to admins only
// - A lightweight Active / Inactive switch for a single category
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

// Pre-configured Axios instance that attaches the base URL and the auth
// token and handles 401 errors globally
import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// Get a list of all categories
// ----------------------------
// Fetches every category currently available. Used by CUSTOMERS
// for browsing/filtering products by category (e.g. a category
// dropdown or sidebar filter), and used by ADMINS to view and
// manage the list of categories in the admin panel.
//
// Visibility rules:
//   - Soft-deleted categories are never returned, for anyone.
//   - Customers and guests only receive ACTIVE categories.
//   - Admins receive both active and inactive categories, each row
//     carrying its own is_active flag.
//
// Optional query params:
//   - search     -> matches the category name
//   - start_date / end_date -> range filter on created_at
//   - ordering   -> name, -name, created_at, -created_at,
//                   product_count, -product_count
//   - page, page_size -> OPT-IN pagination
//
// Pagination only activates when `page` is explicitly sent:
//   - params omitted (or page left out) -> the response is a plain
//     array. Every call site that just wants the complete category
//     list (navbar, footer, shop-page filter checkboxes, every
//     dropdown in this project) calls this with no params at all.
//   - page sent -> the response becomes the standard paginated shape
//     { count, next, previous, results }. Only the admin Category
//     Management table uses this, so it can offer real server-side
//     search, date range, sorting and pagination instead of filtering
//     the full list in the browser (see CategoryManagement.jsx).
export const getCategories = (params, signal) => {
  return axiosInstance.get("/api/v1/categories/", { signal, params });
};

// ----------------------------
// Create a new category (Admin only)
// ----------------------------
// Used by admins to add a brand new category. "data" can include:
// { name: string, description: string, image: File | undefined }
// image is OPTIONAL on create — most categories will still be
// created via plain JSON, so we only pay the FormData overhead when
// an actual File object is present.
//
// A name that belongs to a soft-deleted category is treated as
// available again, so the duplicate-name check below only reports
// names used by categories that are still live.
export const createCategory = (data, signal) => {
  // No image attached — send plain JSON, simplest case, no need for
  // FormData overhead
  if (!(data.image instanceof File)) {
    const { image, ...jsonPayload } = data;
    // Destructuring strips "image" out (it would only ever be
    // undefined/null here) so we never send a stray image key
    return axiosInstance.post("/api/v1/categories/", jsonPayload, { signal });
  }

  // Image attached — must send as multipart/form-data so the file's
  // raw bytes travel correctly (a JSON body can't carry binary data)
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("description", data.description || "");
  formData.append("image", data.image);

  // IMPORTANT: axiosInstance has a default "Content-Type: application/json"
  // header set at the instance level (see lib/axiosInstance.js). Axios only
  // auto-detects FormData and generates the correct multipart boundary when
  // NO Content-Type has already been set — since one IS already set here
  // (at the instance level), we must explicitly clear it for this request by
  // setting it to `undefined`. That lets axios/browser take over and attach
  // the correct "multipart/form-data; boundary=..." header automatically.
  // Do NOT hardcode "multipart/form-data" yourself — without the boundary
  // parameter the backend can't parse the body and will silently fall back
  // to default field values (or reject the file entirely). Same pattern as
  // submitComplaint() in complaints.api.js.
  return axiosInstance.post("/api/v1/categories/", formData, {
    signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// Check whether a category name is already taken (Admin only)
// ----------------------------
// Used by the Add/Edit Category form to show an inline "already exists"
// error the moment the admin leaves the Name field, instead of only
// finding out after Submit. excludeId is passed only in edit mode, so
// a category doesn't get flagged as a duplicate of itself.
// Response shape (confirmed with backend): { exists: boolean }
export const checkCategoryNameExists = (name, excludeId, signal) => {
  return axiosInstance.get("/api/v1/categories/check-name/", {
    signal,
    params: { name, exclude_id: excludeId },
  });
};

// ----------------------------
// Get details of a single category
// ----------------------------
// Fetches the full details of one specific category, identified by
// its ID. This is mainly used to PRE-FILL the edit form when an
// admin clicks "Edit" on a category — so the form already shows
// the existing name/description/image instead of being blank.
// A soft-deleted category returns a plain 404 Not Found, exactly like
// a category that never existed. Customers and guests also receive a
// 404 for an inactive category.
export const getCategoryById = (id, signal) => {
  return axiosInstance.get(`/api/v1/categories/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// Update an existing category (Admin only)
// ----------------------------
// Used by admins to edit/update a category's details, identified
// by its ID. "data.image" can be in THREE distinct states, and each
// one means something different to the backend:
//   - a File object -> a new image was picked, upload and replace it
//   - null           -> the admin explicitly clicked "Remove Image",
//                        so clear whatever image currently exists
//   - undefined       -> image field was left untouched entirely,
//                        don't send it so the existing value survives
//
// "data.is_active" is OPTIONAL. It is only sent when it is a real
// boolean; when it is missing the backend keeps the category's current
// status, so editing only the name or the image never changes whether
// the category is active.
export const updateCategory = (id, data, signal) => {
  // Case 1: a new image file was picked — same multipart handling as create
  if (data.image instanceof File) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("image", data.image);

    // Multipart bodies carry text only, so the boolean is sent as the
    // text "true" or "false", and only when it was actually provided
    if (typeof data.is_active === "boolean") {
      formData.append("is_active", String(data.is_active));
    }

    return axiosInstance.put(`/api/v1/categories/${id}/`, formData, {
      signal,
      headers: { "Content-Type": undefined },
      // Same boundary reasoning as createCategory() above
    });
  }

  // Case 2: image was explicitly removed — send image: null as plain
  // JSON so the backend clears the field instead of leaving it as-is
  if (data.image === null) {
    const removeImagePayload = {
      name: data.name,
      description: data.description || "",
      image: null,
    };

    // Include the status only when the caller provided a real boolean
    if (typeof data.is_active === "boolean") {
      removeImagePayload.is_active = data.is_active;
    }

    return axiosInstance.put(`/api/v1/categories/${id}/`, removeImagePayload, {
      signal,
    });
  }

  // Case 3: image untouched — plain JSON. The "image" key is stripped
  // out so it isn't sent at all, and is_active is pulled out so it can
  // be added back only when it is a real boolean.
  const { image, is_active: isActive, ...jsonPayload } = data;
  if (typeof isActive === "boolean") {
    jsonPayload.is_active = isActive;
  }
  return axiosInstance.put(`/api/v1/categories/${id}/`, jsonPayload, {
    signal,
  });
};

// ----------------------------
// Switch a category between Active and Inactive (Admin only)
// ----------------------------
// Quick toggle used by the Status switch in the admin Categories table.
// It uses PATCH with ONLY { is_active } because a PATCH needs no other
// field, while a PUT would also require the category name.
//
// Inactive categories stay visible to admins, but customers and guests
// stop receiving them from the list endpoint (and get a 404 on the
// single-category endpoint).
//
// Response (200): the full updated category, including its new
// is_active value, so the table row can be refreshed straight from it.
export const setCategoryActive = (id, isActive, signal) => {
  return axiosInstance.patch(
    `/api/v1/categories/${id}/`,
    { is_active: isActive },
    { signal },
  );
};

// ----------------------------
// Delete a category (Admin only)
// ----------------------------
// SOFT delete on the backend — this sets an internal is_delete flag
// to true on this category's database row instead of removing the
// row (the row itself, and every product's link to it, is fully
// preserved for data integrity). That flag is never exposed to the
// frontend in any response, and every list/detail endpoint above
// filters it out automatically.
//
// PRACTICAL EFFECT FOR THE UI: once this call succeeds, the category
// disappears from EVERY list — the customer-facing navbar/filters AND
// this admin table — in exactly the same way. Deleting is different
// from marking a category Inactive: an inactive category stays in the
// admin table and can be switched back on, while a deleted category has
// no restore endpoint (unlike a user account, which does get a
// reactivation flow — see auth.api.js). Products that were assigned to
// this category are NOT affected — their category_id is untouched, and
// their own listing/detail pages keep working normally.
// A confirmation popup is still shown before calling this (see
// CategoryManagement.jsx) since the action can no longer be undone
// from the UI.
export const deleteCategory = (id, signal) => {
  return axiosInstance.delete(`/api/v1/categories/${id}/`, { signal });
};
