// Related Products — resilient version
// Primary path: API 17 search with category_id filter (per API doc)
// Fallback path: if the backend doesn't actually honor category_id (common
// real-world mismatch between docs and implementation), fetch the general
// product list and filter by category on the frontend instead — so the
// section never silently stays empty due to a backend quirk

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineArrowRight } from "react-icons/ai";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { searchProducts, getProducts } from "../../api/products.api";

import ProductGrid from "../shared/ProductGrid";

const RelatedProducts = ({ categoryId, currentProductId }) => {
  const { data: productsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "related", categoryId],
    queryFn: async ({ signal }) => {
      // Step 1 — try the documented, filtered endpoint first
      const searchRes = await searchProducts({
        category_id: categoryId,
        page: 1,
      }, signal);
      const searchResults = searchRes?.data?.results || [];

      // Only useful if it actually returned items OTHER than the current product
      const usableFromSearch = searchResults.filter(
        (p) => p.id !== currentProductId,
      );
      if (usableFromSearch.length > 0) {
        return usableFromSearch;
      }

      // Step 2 — fallback: fetch the general product list and filter
      // by category on the frontend (covers backends that don't actually
      // apply the category_id query param yet)
      const allRes = await getProducts({ page: 1 }, signal);
      const allResults = allRes?.data?.results || [];

      return allResults.filter(
        (p) =>
          p.id !== currentProductId &&
          (p.category?.id === categoryId || p.category === categoryId),
      );
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });

  const relatedProducts = (productsData || []).slice(0, 4);

  // Hide the whole section only once loading is finished AND there's
  // genuinely nothing to show (no fake/empty placeholder box)
  if (!isLoading && relatedProducts.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            You May Also Like
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            More products from the same category
          </p>
        </div>

        <Link
          to={`${ROUTES.PRODUCTS}?category_id=${categoryId}`}
          className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline shrink-0 mx-auto sm:mx-0"
        >
          View All
          <AiOutlineArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ProductGrid
        products={relatedProducts}
        isLoading={isLoading}
        skeletonCount={4}
        cols={{ default: 2, sm: 2, md: 4, lg: 4 }}
      />
    </section>
  );
};

export default RelatedProducts;
