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
// API 11 - Get a list of all categories
// ----------------------------
// Fetches every category currently available. Used by CUSTOMERS
// for browsing/filtering products by category (e.g. a category
// dropdown or sidebar filter), and used by ADMINS to view and
// manage the list of categories in the admin panel.
export const getCategories = () => {
  return axiosInstance.get("/api/v1/categories/");
};

// ----------------------------
// API 12 - Create a new category (Admin only)
// ----------------------------
// Used by admins to add a brand new category. The "data" being sent
// likely includes fields like name, slug, description, parent
// category (if nested categories are supported), etc.
export const createCategory = (data) => {
  return axiosInstance.post("/api/v1/categories/", data);
};

// ----------------------------
// API 13 - Get details of a single category
// ----------------------------
// Fetches the full details of one specific category, identified by
// its ID. This is mainly used to PRE-FILL the edit form when an
// admin clicks "Edit" on a category — so the form already shows
// the existing name/description instead of being blank.
export const getCategoryById = (id) => {
  return axiosInstance.get(`/api/v1/categories/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API 14 - Update an existing category (Admin only)
// ----------------------------
// Used by admins to edit/update a category's details, identified
// by its ID. Sends the updated fields as "data".
export const updateCategory = (id, data) => {
  return axiosInstance.put(`/api/v1/categories/${id}/`, data);
};

// ----------------------------
// API 15 - Delete a category (Admin only)
// ----------------------------
// Removes a category entirely. The comment notes that a CONFIRMATION
// POPUP should be shown to the admin BEFORE actually calling this
// function — since deleting a category could affect all products
// currently assigned to it, this should not happen accidentally.
// (This confirmation logic happens in the UI/component, not here —
// this function just performs the actual delete request.)
export const deleteCategory = (id) => {
  return axiosInstance.delete(`/api/v1/categories/${id}/`);
};
