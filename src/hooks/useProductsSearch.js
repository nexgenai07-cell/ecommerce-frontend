// Client-side pagination + multi-category merge layer.
//
// PROBLEM 1: /api/v1/products/search/ apna khud ka fixed page size
// return karta hai — `page_size` param ignore karta hai.
// PROBLEM 2: Backend ek waqt mein sirf EK category_id accept karta hai —
// multiple category IDs ek sath OR karke filter karna support nahi karta.
//
// SOLUTION: Single/zero category select hone par — efficient partial
// fetch (sirf jitne backend pages chahiye utne hi fetch hote hain).
// Multiple categories select hone par — har category ka poora result
// set alag-alag fetch karke, duplicates hata ke, client-side combine +
// sort + re-paginate kiya jata hai, taake UI hamesha ek hi merged list
// dikhaye (5 + 5 = 10 products), bilkul jaisa ek real multi-select
// filter se expect kiya jata hai.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchProducts } from "../api/products.api";

// Yehi single source of truth hai — page size sirf yahan se change hoga
export const UI_PAGE_SIZE = 21;

// sortBy value ko ek comparator function mein convert karta hai, taake
// multi-category merge ke baad combined list ko sahi order mein rakha
// ja sake (backend se aane wala order sirf per-category guaranteed hai,
// combined list ka nahi)
const comparatorFor = (sortBy) => {
  switch (sortBy) {
    case "price":
      return (a, b) => parseFloat(a.price) - parseFloat(b.price);
    case "-price":
      return (a, b) => parseFloat(b.price) - parseFloat(a.price);
    case "-created_at":
    default:
      return (a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // newest first
      };
  }
};

const useProductsSearch = ({ filters, sortBy, uiPage }) => {
  const queryClient = useQueryClient();

  // category_id ke ilawa baaqi filters — inko har request ke sath bhejenge
  const baseParams = {
    min_price: filters.minPrice || undefined,
    max_price: filters.maxPrice || undefined,
    in_stock: filters.inStock || undefined,
    ordering: sortBy || undefined,
  };

  return useQuery({
    queryKey: ["products-list", filters, sortBy, uiPage, UI_PAGE_SIZE],
    queryFn: async () => {
      // Ek backend page fetch karta hai, apni khud ki cache key ke sath
      // (categoryId + params + page ke hisaab se) — taake wahi page
      // dobara request na ho jab UI navigate kare
      const fetchBackendPage = (categoryId, backendPage) => {
        const params = {
          ...baseParams,
          category_id: categoryId,
          page: backendPage,
        };
        return queryClient.fetchQuery({
          queryKey: ["products-backend-page", params],
          queryFn: () => searchProducts(params).then((res) => res.data),
          staleTime: 1000 * 60 * 3,
        });
      };

      // Ek category ka POORA result set fetch karta hai (saare backend
      // pages), multi-category merge ke liye zaroori hai
      const fetchAllForCategory = async (categoryId) => {
        const first = await fetchBackendPage(categoryId, 1);
        const backendPageSize = first.results.length || 1;
        const totalCount = first.count;
        const totalBackendPages = Math.max(
          1,
          Math.ceil(totalCount / backendPageSize),
        );

        if (totalBackendPages <= 1) return first.results;

        const restPages = await Promise.all(
          Array.from({ length: totalBackendPages - 1 }, (_, i) =>
            fetchBackendPage(categoryId, i + 2),
          ),
        );
        return [first.results, ...restPages.map((r) => r.results)].flat();
      };

      const selectedCategories = filters.categories || [];

      // ===== CASE A — 0 ya 1 category selected =====
      // Efficient: sirf jitne backend pages is UI page ke liye chahiye
      // utne hi fetch hote hain, poora dataset fetch nahi karna padta
      if (selectedCategories.length <= 1) {
        const categoryId = selectedCategories[0];
        const first = await fetchBackendPage(categoryId, 1);
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
            p === 1 ? Promise.resolve(first) : fetchBackendPage(categoryId, p),
          ),
        );

        const combined = pageResponses.flatMap((r) => r.results);
        const offset = startIndex - (backendPageStart - 1) * backendPageSize;

        return {
          results: combined.slice(offset, offset + UI_PAGE_SIZE),
          count: totalCount,
        };
      }

      // ===== CASE B — 2+ categories selected =====
      // Backend multiple category_ids ek sath OR karke filter karna
      // support nahi karta, is liye har category ka poora set fetch
      // karke, duplicates hata ke, client-side combine + sort + slice
      // karte hain. (Note: bade catalog ke liye ye zyada requests
      // lagayega — ideal fix backend mein category_id list support
      // add karna hoga.)
      const perCategoryResults = await Promise.all(
        selectedCategories.map((id) => fetchAllForCategory(id)),
      );

      const seen = new Set();
      const combined = perCategoryResults.flat().filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      });

      combined.sort(comparatorFor(sortBy));

      const totalCount = combined.length;
      const startIndex = (uiPage - 1) * UI_PAGE_SIZE;

      return {
        results: combined.slice(startIndex, startIndex + UI_PAGE_SIZE),
        count: totalCount,
      };
    },
    staleTime: 1000 * 60 * 3,
    keepPreviousData: true,
  });
};

export default useProductsSearch;
