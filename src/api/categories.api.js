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
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API - Get a list of all categories
// ----------------------------
// Fetches every category currently available. Used by CUSTOMERS
// for browsing/filtering products by category (e.g. a category
// dropdown or sidebar filter), and used by ADMINS to view and
// manage the list of categories in the admin panel.
// UPDATED BEHAVIOR: the backend now silently excludes any category
// whose internal is_delete flag is true — this endpoint will simply
// never include a soft-deleted category in its response, for either
// customers or admins. That internal flag itself is never sent back
// in this response, so the frontend has no way to detect "this used
// to exist and was deleted" — it just quietly stops appearing.
export const getCategories = (signal) => {
  return axiosInstance.get("/api/v1/categories/", { signal });
};

// ----------------------------
// API- Create a new category (Admin only)
// ----------------------------
// Used by admins to add a brand new category. "data" can include:
// { name: string, description: string, image: File | undefined }
// image is OPTIONAL on create — most categories will still be
// created via plain JSON, so we only pay the FormData overhead when
// an actual File object is present.
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
  return axiosInstance.post("/api/v1/categories/", formData, { signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// API 24.1 - Check whether a category name is already taken (Admin only)
// ----------------------------
// Used by the Add/Edit Category form to show an inline "already exists"
// error the moment the admin leaves the Name field, instead of only
// finding out after Submit. excludeId is passed only in edit mode, so
// a category doesn't get flagged as a duplicate of itself.
// Response shape (confirmed with backend): { exists: boolean }
export const checkCategoryNameExists = (name, excludeId, signal) => {
  return axiosInstance.get("/api/v1/categories/check-name/", { signal,
    params: { name, exclude_id: excludeId },
  });
};

// ----------------------------
// API  - Get details of a single category
// ----------------------------
// Fetches the full details of one specific category, identified by
// its ID. This is mainly used to PRE-FILL the edit form when an
// admin clicks "Edit" on a category — so the form already shows
// the existing name/description/image instead of being blank.
// UPDATED BEHAVIOR: if this category's internal is_delete flag is
// true, the backend now returns a plain 404 Not Found instead of the
// category object — there is no soft-deleted "ghost" state to render
// here anymore, it behaves exactly like a category that never existed.
export const getCategoryById = (id, signal) => {
  return axiosInstance.get(`/api/v1/categories/${id}/`, { signal });
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API - Update an existing category (Admin only)
// ----------------------------
// Used by admins to edit/update a category's details, identified
// by its ID. "data.image" can be in THREE distinct states, and each
// one means something different to the backend:
//   - a File object -> a new image was picked, upload and replace it
//   - null           -> the admin explicitly clicked "Remove Image",
//                        so clear whatever image currently exists
//   - undefined       -> image field was left untouched entirely,
//                        don't send it so the existing value survives
export const updateCategory = (id, data, signal) => {
  // Case 1: a new image file was picked — same multipart handling as create
  if (data.image instanceof File) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("image", data.image);

    return axiosInstance.put(`/api/v1/categories/${id}/`, formData, { signal,
      headers: { "Content-Type": undefined },
      // Same boundary reasoning as createCategory() above
    });
  }

  // Case 2: image was explicitly removed — send image: null as plain
  // JSON so the backend clears the field instead of leaving it as-is
  if (data.image === null) {
    return axiosInstance.put(`/api/v1/categories/${id}/`, {
      name: data.name,
      description: data.description || "",
      image: null,
    }, { signal });
  }

  // Case 3: image untouched — plain JSON, exactly as this worked
  // before the image feature existed. Strips out an "undefined" image
  // key so it isn't sent at all.
  const { image, ...jsonPayload } = data;
  return axiosInstance.put(`/api/v1/categories/${id}/`, jsonPayload, { signal });
};

// ----------------------------
// API - Delete a category (Admin only)
// ----------------------------
// SOFT delete on the backend — this sets an internal is_delete flag
// to true on this category's database row instead of removing the
// row (the row itself, and every product's link to it, is fully
// preserved for data integrity). That flag is never exposed to the
// frontend in any response, and every list/detail endpoint above now
// filters it out automatically.
//
// PRACTICAL EFFECT FOR THE UI: once this call succeeds, the category
// disappears from EVERY list — the customer-facing navbar/filters AND
// this admin table — in exactly the same way. There is no "Inactive"
// state to show here anymore, and no restore endpoint exists for
// categories (unlike a user account, which does get a reactivation
// flow — see auth.api.js). Products that were assigned to this
// category are NOT affected — their category_id is untouched, and
// their own listing/detail pages keep working normally.
// A confirmation popup is still shown before calling this (see
// CategoryManagement.jsx) since the action can no longer be undone
// from the UI.
export const deleteCategory = (id, signal) => {
  return axiosInstance.delete(`/api/v1/categories/${id}/`, { signal });
};
