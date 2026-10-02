// ============================================================
// productDetailCache
// ============================================================
// Writes changes into the cached detail of a single product, so a screen
// that is showing that product updates without a network request.
//
// The detail response is cached as received from the API client, so the
// product itself lives under `data`. Only the fields given in the changes
// are written; every other field, including the admin-only purchase price,
// keeps the value it already had.

import { QUERY_KEYS } from "../constants/queryKeys";

// Merges the given changes into the cached product detail. `changes` is an
// object, or a function that receives the cached product and returns the
// object to merge. Nothing happens when the product is not cached.
export const patchProductDetail = (queryClient, productId, changes) => {
  queryClient.setQueryData(QUERY_KEYS.PRODUCT_DETAIL(productId), (previous) => {
    if (!previous?.data) return previous;

    const patch =
      typeof changes === "function" ? changes(previous.data) : changes;
    if (!patch) return previous;

    return { ...previous, data: { ...previous.data, ...patch } };
  });
};

// Copies the stock figures returned by the stock adjustment endpoint into
// the cached product detail.
export const patchProductStock = (queryClient, productId, stock) => {
  const patch = {};

  ["total_stock", "reserved_stock", "available_stock"].forEach((field) => {
    if (typeof stock?.[field] === "number") patch[field] = stock[field];
  });

  if (Object.keys(patch).length > 0) {
    patchProductDetail(queryClient, productId, patch);
  }
};
