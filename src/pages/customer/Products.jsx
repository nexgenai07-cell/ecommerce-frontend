import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineFilter, AiOutlineShop } from "react-icons/ai";
import useProductsSearch, { UI_PAGE_SIZE } from "../../hooks/useProductsSearch";
import Container from "../../components/layouts/Container";
import ProductsFilters, {
  DEFAULT_FILTERS,
} from "../../components/products/ProductsFilters";
import ProductsToolbar from "../../components/products/ProductsToolbar";
import ProductListItem from "../../components/products/ProductListItem";
import ProductGrid from "../../components/shared/ProductGrid";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import { ROUTES } from "../../constants/routes";

// Page size ab poori tarah frontend control mein hai — backend jo bhi
// de, useProductsSearch hook ise 21-21 ke groups mein re-slice karta hai
const PER_PAGE = UI_PAGE_SIZE;

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const Products = () => {
  const [searchParams] = useSearchParams();

  const categoryFromUrl = searchParams.get("category_id");
  const sortFromUrl = searchParams.get("sort") || "-created_at";

  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    categories: categoryFromUrl ? [parseInt(categoryFromUrl)] : [],
  });
  const [sortBy, setSortBy] = useState(sortFromUrl);
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (categoryFromUrl) {
      setFilters((prev) => ({
        ...prev,
        categories: [parseInt(categoryFromUrl)],
      }));
      setCurrentPage(1);
      scrollToTop();
    }
  }, [categoryFromUrl]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    scrollToTop();
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setCurrentPage(1);
    scrollToTop();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    scrollToTop();
  };

  // =============================================
  // PRODUCTS SEARCH — client-side re-paginated to
  // exactly PER_PAGE (21) items per UI page
  // =============================================
  const { data: productsData, isLoading } = useProductsSearch({
    filters,
    sortBy,
    uiPage: currentPage,
  });

  const products = productsData?.results || [];
  const totalResults = productsData?.count || 0;
  const totalPages = Math.ceil(totalResults / PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8 sm:py-10 px-5 sm:px-8 lg:px-14 xl:px-20">
        <div className="flex flex-col gap-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link
              to={ROUTES.HOME}
              className="hover:text-gray-600 transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-600 font-medium">Shop</span>
          </nav>

          {/* ===== PAGE HEADER ===== */}
          <div className="relative overflow-hidden rounded-3xl shadow bg-white border border-gray-100 px-6 py-7 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary-50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-primary-50/70 blur-3xl" />

            <div className="relative flex items-center gap-4">
              <div className="hidden sm:flex w-14 h-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/20">
                <AiOutlineShop className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  All Products
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {totalResults.toLocaleString()} products found
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== MAIN LAYOUT ===== */}
          <div className="flex gap-6 lg:gap-8 items-start">
            <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24 shadow rounded-2xl">
              <ProductsFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </aside>

            <div className="flex-1 min-w-0 flex flex-col gap-5 shadow rounded-2xl">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden self-start flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:border-primary hover:text-primary transition-all"
                >
                  <AiOutlineFilter className="w-4 h-4" />
                  Filters
                </button>

                <ProductsToolbar
                  totalResults={totalResults}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  sortBy={sortBy}
                  onSortChange={handleSortChange}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  currentPage={currentPage}
                  perPage={PER_PAGE}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${currentPage}-${JSON.stringify(filters)}-${sortBy}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {viewMode === "grid" ? (
                    <ProductGrid
                      products={products}
                      isLoading={isLoading}
                      skeletonCount={PER_PAGE}
                      emptyVariant="noProducts"
                      cols={{ default: 2, sm: 2, md: 3, lg: 3 }}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex gap-4 p-4 bg-white rounded-3xl border border-gray-100 animate-pulse"
                          >
                            <div className="w-28 h-28 bg-gray-100 rounded-2xl shrink-0" />
                            <div className="flex-1 flex flex-col gap-2 py-1">
                              <div className="h-3 bg-gray-100 rounded w-16" />
                              <div className="h-4 bg-gray-100 rounded w-3/4" />
                              <div className="h-3 bg-gray-100 rounded w-24" />
                            </div>
                            <div className="flex flex-col items-end gap-3 shrink-0">
                              <div className="h-6 bg-gray-100 rounded w-20" />
                              <div className="h-8 bg-gray-100 rounded w-28" />
                            </div>
                          </div>
                        ))
                      ) : products.length > 0 ? (
                        products.map((product) => (
                          <ProductListItem key={product.id} product={product} />
                        ))
                      ) : (
                        <EmptyState variant="noProducts" />
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {!isLoading && totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* ===== MOBILE FILTER DRAWER ===== */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/50 z-drawer lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-modal lg:hidden overflow-y-auto p-5 shadow-xl"
            >
              <ProductsFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClose={() => setMobileFiltersOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
