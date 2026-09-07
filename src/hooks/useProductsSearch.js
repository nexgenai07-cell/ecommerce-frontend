import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchProducts } from "../api/products.api";

// Yehi single source of truth hai — page size sirf yahan se change hoga
export const UI_PAGE_SIZE = 21;

// --------------------------------------------------
// BACKEND FIX CONFIRMED: `category_id` now accepts MULTIPLE values in
// a single request (comma-separated, e.g. "category_id=5,8"), and
// returns the correctly combined, correctly counted, correctly
// ordered result set for "products in ANY of these categories" —
// server-side.
//
// This means the old two-path design (an efficient single-page fetch
// for 0-1 categories, vs. a separate "fetch every page for every
// selected category, then merge/dedupe/sort/slice in the browser" path
// for 2+ categories) is no longer needed. ONE simple, efficient path
// now handles 0, 1, or many selected categories identically — this
// hook just joins whatever categories are selected into one
// comma-separated string and sends a single request per backend page,
// exactly like a normal single-category search did before.
// --------------------------------------------------
const useProductsSearch = ({ filters, sortBy, uiPage }) => {
  const queryClient = useQueryClient();

  // category_id ke ilawa baaqi filters — inko har request ke sath bhejenge
  const baseParams = {
    min_price: filters.minPrice || undefined,
    max_price: filters.maxPrice || undefined,
    in_stock: filters.inStock || undefined,
    ordering: sortBy || undefined,
  };

  const selectedCategories = filters.categories || [];
  // categoryIdParam — joins every selected category into one
  // comma-separated string (e.g. "5,8"). undefined when nothing is
  // selected, so no category_id param is sent at all — matching the
  // "browse everything" behavior when no category filter is active.
  const categoryIdParam =
    selectedCategories.length > 0 ? selectedCategories.join(",") : undefined;

  return useQuery({
    queryKey: ["products-list", filters, sortBy, uiPage, UI_PAGE_SIZE],
    queryFn: async () => {
      // Fetches ONE backend page, with its own cache key (category
      // selection + params + page), so the exact same page is never
      // re-requested while the admin navigates back and forth.
      const fetchBackendPage = (backendPage) => {
        const params = {
          ...baseParams,
          category_id: categoryIdParam,
          page: backendPage,
        };
        return queryClient.fetchQuery({
          queryKey: ["products-backend-page", params],
          queryFn: ({ signal }) => searchProducts(params, signal).then((res) => res.data),
          staleTime: 1000 * 60 * 3,
        });
      };

      // Only fetches exactly as many backend pages as this UI page
      // actually needs — never the entire matching result set, no
      // matter how many categories are selected at once.
      const first = await fetchBackendPage(1);
      const backendPageSize = first.results.length || UI_PAGE_SIZE;
      const totalCount = first.count;

      const startIndex = (uiPage - 1) * UI_PAGE_SIZE;
      const endIndex = Math.min(startIndex + UI_PAGE_SIZE, totalCount) - 1;

      if (totalCount === 0 || endIndex < startIndex) {
        return { results: [], count: totalCount };
      }

      const backendPageStart = Math.floor(startIndex / backendPageSize) + 1;
      const backendPageEnd = Math.floor(endIndex / backendPageSize) + 1;

      const neededPages = [];
      for (let p = backendPageStart; p <= backendPageEnd; p++)
        neededPages.push(p);

      const pageResponses = await Promise.all(
        neededPages.map((p) =>
          p === 1 ? Promise.resolve(first) : fetchBackendPage(p),
        ),
      );

      const combined = pageResponses.flatMap((r) => r.results);
      const offset = startIndex - (backendPageStart - 1) * backendPageSize;

      return {
        results: combined.slice(offset, offset + UI_PAGE_SIZE),
        count: totalCount,
      };
    },
    staleTime: 1000 * 60 * 3,
    keepPreviousData: true,
  });
};

export default useProductsSearch;
