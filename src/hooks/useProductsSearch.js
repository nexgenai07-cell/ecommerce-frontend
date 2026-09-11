import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchProducts } from "../api/products.api";

// Selectable "rows per page" values for the product grid/list, shown in
// the Pagination control's "Rows per page" dropdown on the Products
// page. The first option is also the default UI page size, matching
// what the page always showed before this dropdown existed.
export const UI_PAGE_SIZE_OPTIONS = [21, 50, 100];
export const DEFAULT_UI_PAGE_SIZE = UI_PAGE_SIZE_OPTIONS[0];

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
const useProductsSearch = ({
  filters,
  sortBy,
  uiPage,
  // How many products make up one UI page. Driven by the customer's
  // "Rows per page" selection on the Products page; defaults to the
  // original fixed page size for any caller that doesn't pass one.
  pageSize = DEFAULT_UI_PAGE_SIZE,
}) => {
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
    queryKey: ["products-list", filters, sortBy, uiPage, pageSize],
    queryFn: async () => {
      // Fetches ONE backend page, with its own cache key (category
      // selection + params + page), so the exact same page is never
      // re-requested while the customer navigates back and forth.
      const fetchBackendPage = (backendPage) => {
        const params = {
          ...baseParams,
          category_id: categoryIdParam,
          page: backendPage,
        };
        return queryClient.fetchQuery({
          queryKey: ["products-backend-page", params],
          queryFn: ({ signal }) =>
            searchProducts(params, signal).then((res) => res.data),
          staleTime: 1000 * 60 * 3,
        });
      };

      // Only fetches exactly as many backend pages as this UI page
      // actually needs — never the entire matching result set, no
      // matter how many categories are selected or how large the
      // customer's chosen "rows per page" value is.
      const first = await fetchBackendPage(1);
      const backendPageSize = first.results.length || pageSize;
      const totalCount = first.count;

      const startIndex = (uiPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalCount) - 1;

      if (totalCount === 0 || endIndex < startIndex) {
        return { results: [], count: totalCount };
      }

      const backendPageStart = Math.floor(startIndex / backendPageSize) + 1;
      const backendPageEnd = Math.floor(endIndex / backendPageSize) + 1;

      const neededPages = [];
      for (let p = backendPageStart; p <= backendPageEnd; p++)
        neededPages.push(p);

      // When the customer picks a large "rows per page" value (e.g. 100)
      // and the backend's own page size is smaller, this naturally fetches
      // several backend pages in parallel to fill one UI page — the same
      // mechanism that already handled multi-category merges above.
      const pageResponses = await Promise.all(
        neededPages.map((p) =>
          p === 1 ? Promise.resolve(first) : fetchBackendPage(p),
        ),
      );

      const combined = pageResponses.flatMap((r) => r.results);
      const offset = startIndex - (backendPageStart - 1) * backendPageSize;

      return {
        results: combined.slice(offset, offset + pageSize),
        count: totalCount,
      };
    },
    staleTime: 1000 * 60 * 3,
    keepPreviousData: true,
  });
};

export default useProductsSearch;
