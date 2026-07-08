// Main Product Detail page — fully centered, card-based, modern layout
// Coordinator only — fetches data, passes it down. No static/fake content anywhere.

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

import { SkeletonDetail } from "../../components/ui/Skeleton";
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
      <Container className="py-8 max-w-6xl mx-auto">
        <SkeletonDetail />
      </Container>
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
              {product.original_price > product.price && (
                <div className="absolute -top-2 -left-2 z-10">
                  <span className="px-3 py-1.5 bg-danger text-white text-xs font-bold rounded-xl shadow-lg shadow-danger/30">
                    {Math.round(
                      ((product.original_price - product.price) /
                        product.original_price) *
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
