import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { QUERY_KEYS } from "../../constants/queryKeys";
import { getProductById } from "../../api/products.api";

import Container from "../../components/layouts/Container";
import ProductBreadcrumb from "../../components/product-detail/ProductBreadcrumb";
import ProductImageGallery from "../../components/product-detail/ProductImageGallery";
import ProductInfo from "../../components/product-detail/ProductInfo";
import ProductTabs from "../../components/product-detail/ProductTabs";
import RelatedProducts from "../../components/product-detail/RelatedProducts";

import { SkeletonProductDetail } from "../../components/ui/Skeleton";
import ErrorState from "../../components/ui/ErrorState";

const ProductDetail = () => {
  const { id } = useParams();

  const {
    data: productData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const rawProduct = productData?.data || null;

  // ─────────────────────────────────────────────
  // NORMALIZATION LAYER
  // ─────────────────────────────────────────────
  // The API doc specifies `category` as a nested object: { id, name }.
  // The current backend implementation instead sends `category` as a
  // plain numeric ID, with the name in a separate `category_name` field.
  // Rather than rewriting every child component around this backend
  // quirk, we normalize the shape once, right here at the data boundary.
  // This means: if the backend team later fixes it to match the docs,
  // this still works unchanged (no double-breaking later).
  const product = rawProduct
    ? {
        ...rawProduct,
        category:
          rawProduct.category && typeof rawProduct.category === "object"
            ? rawProduct.category
            : {
                id: rawProduct.category,
                name: rawProduct.category_name || "",
              },
      }
    : null;

  if (isLoading) {
    return (
      // Same outer wrapper the real (loaded) page uses below — background
      // color and md:px-35 horizontal padding included. Without this, the
      // skeleton sat on a plain white background with no extra side
      // padding, then the real page snapped in with a gray-tinted
      // background AND shifted inward on desktop the moment the product
      // finished loading — a visible layout jump on every single visit.
      <div className="bg-gray-50/50 min-h-screen md:px-35">
        <Container className="py-6 sm:py-10 max-w-6xl mx-auto">
          <SkeletonProductDetail />
        </Container>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <Container className="py-16 max-w-6xl mx-auto">
        <ErrorState
          title="Product not found"
          message="The product you're looking for doesn't exist or has been removed."
          onRetry={() => refetch()}
          retryLabel="Try Again"
        />
      </Container>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-50/50 min-h-screen md:px-35"
    >
      <Container className="py-6 sm:py-10 max-w-6xl mx-auto">
        <div className="flex flex-col gap-8 sm:gap-10">
          <ProductBreadcrumb
            category={product.category}
            productName={product.name}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
            <div className="relative">
              {/* Numeric conversion is required here — product.original_price
                  and product.price arrive from the API as decimal strings
                  (e.g. "10000.00"), and comparing raw strings with > does a
                  lexicographic comparison instead of a numeric one, which
                  silently breaks whenever the original price's leading
                  digit is smaller than the sale price's leading digit (e.g.
                  "10000.00" > "9000.00" evaluates to false as strings, even
                  though 10000 is numerically larger). */}
              {Number(product.original_price) > Number(product.price) && (
                <div className="absolute -top-2 -left-2 z-10 ">
                  <span className="px-3 py-1.5 bg-danger text-white text-xs font-bold rounded-xl shadow-lg shadow-danger/30">
                    {Math.round(
                      ((Number(product.original_price) -
                        Number(product.price)) /
                        Number(product.original_price)) *
                        100,
                    )}
                    % OFF
                  </span>
                </div>
              )}

              <ProductImageGallery
                images={product.images || []}
                productName={product.name}
              />
            </div>

            <ProductInfo product={product} />
          </div>

          <ProductTabs product={product} />

          <RelatedProducts
            categoryId={product.category?.id}
            currentProductId={product.id}
          />
        </div>
      </Container>
    </motion.div>
  );
};

export default ProductDetail;
