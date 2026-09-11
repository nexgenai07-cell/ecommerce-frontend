import { useState, useEffect } from "react";
// Reads the ?category_id= query param (used when arriving from a category link)
import { useSearchParams, Link } from "react-router-dom";
// Framer Motion — smooth fade/slide transitions between filter/sort/view changes
import { motion, AnimatePresence } from "framer-motion";
// Icons used in the mobile filter button and the page header badge
import { AiOutlineFilter, AiOutlineShop } from "react-icons/ai";
// Custom hook that fetches + client-side paginates the product search results
import useProductsSearch, {
  UI_PAGE_SIZE_OPTIONS,
  DEFAULT_UI_PAGE_SIZE,
} from "../../hooks/useProductsSearch";
// Shared max-width content wrapper used on every page
import Container from "../../components/layouts/Container";
// Sidebar filter panel + its default (empty) filter state
import ProductsFilters, {
  DEFAULT_FILTERS,
} from "../../components/products/ProductsFilters";
// Results count / sort dropdown / grid-list toggle / active filter chips
import ProductsToolbar from "../../components/products/ProductsToolbar";
// Single row used in "list view" mode
import ProductListItem from "../../components/products/ProductListItem";
// Responsive card grid used in "grid view" mode (also handles loading + empty states)
import ProductGrid from "../../components/shared/ProductGrid";
// Page number navigation control
import Pagination from "../../components/ui/Pagination";
// "No products found" placeholder, shown in list view when there's no data
import EmptyState from "../../components/ui/EmptyState";
// App route path constants
import { ROUTES } from "../../constants/routes";

// Smoothly scrolls back to the top of the page — called on every filter,
// sort, or page change so the user always sees the new results from the top
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const Products = () => {
  // Reads query params from the current URL (e.g. ?category_id=3)
  const [searchParams] = useSearchParams();

  // If the page was opened via a category link, pre-select that category
  const categoryFromUrl = searchParams.get("category_id");
  // If a sort order was passed in the URL, use it; otherwise default to newest first
  const sortFromUrl = searchParams.get("sort") || "-created_at";

  // Active filters (categories, price range, in-stock toggle)
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    categories: categoryFromUrl ? [parseInt(categoryFromUrl)] : [],
  });
  // Current sort order (e.g. "-price", "price", "-created_at")
  const [sortBy, setSortBy] = useState(sortFromUrl);
  // "grid" or "list" — controls which layout renders the product results
  const [viewMode, setViewMode] = useState("grid");
  // Current page number for pagination
  const [currentPage, setCurrentPage] = useState(1);
  // How many products are shown per UI page, controlled by the "Rows per
  // page" dropdown in the Pagination control below
  const [pageSize, setPageSize] = useState(DEFAULT_UI_PAGE_SIZE);
  // Whether the mobile filter drawer is currently open
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // If the category in the URL changes (e.g. user clicks a different
  // category link while already on this page), re-apply it as a filter
  useEffect(() => {
    if (categoryFromUrl) {
      setFilters((prev) => ({
        ...prev,
        categories: [parseInt(categoryFromUrl)],
      }));
      setCurrentPage(1); // Reset back to page 1 for the new filter
      scrollToTop();
    }
  }, [categoryFromUrl]);

  // Called whenever any filter changes (from the sidebar, toolbar chips, etc.)
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // New filters mean a new result set — start from page 1
    scrollToTop();
  };

  // Called when the sort dropdown changes
  const handleSortChange = (sort) => {
    setSortBy(sort);
    setCurrentPage(1);
    scrollToTop();
  };

  // Called when a pagination button is clicked
  const handlePageChange = (page) => {
    setCurrentPage(page);
    scrollToTop();
  };

  // Called when the customer picks a different "rows per page" value.
  // Resets back to page 1 as well, since staying on a deep page number
  // could land past the end of the newly-sized result set.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    scrollToTop();
  };

  // =============================================
  // PRODUCTS SEARCH — client-side re-paginated to
  // exactly pageSize items per UI page
  // =============================================
  const { data: productsData, isLoading } = useProductsSearch({
    filters,
    sortBy,
    uiPage: currentPage,
    pageSize,
  });

  // Extract the current page's products, defaulting to an empty array
  const products = productsData?.results || [];
  // Total number of products matching the current filters
  const totalResults = productsData?.count || 0;
  // Total number of pages, derived from the total result count
  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-6 sm:py-8 px-5 sm:px-8 lg:px-14 xl:px-20">
        <div className="flex flex-col gap-5">
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

          {/* ===== PAGE HEADER — compact banner with product count ===== */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 px-6 py-5 sm:px-7 sm:py-6">
            {/* Decorative soft glow accents — purely visual, sit behind the content */}
            <div className="pointer-events-none absolute -top-14 -right-14 w-48 h-48 rounded-full bg-primary-50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-primary-50/70 blur-3xl" />

            <div className="relative flex items-center gap-4">
              {/* Shop icon chip — hidden on the smallest screens to save space */}
              <div className="hidden sm:flex w-12 h-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-dark text-white shadow-sm shadow-primary/20">
                <AiOutlineShop className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  All Products
                </h1>
                {/* Live result count pill */}
                <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {totalResults.toLocaleString()} products found
                </span>
              </div>
            </div>
          </div>

          {/* ===== MAIN LAYOUT — sidebar filters + results column ===== */}
          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Desktop sidebar — sticky so it stays visible while scrolling,
                and internally scrollable (see ProductsFilters) so it never
                stretches the page taller than the viewport */}
            <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24">
              <ProductsFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </aside>

            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {/* Mobile-only "Filters" button — opens the slide-in drawer below */}
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden self-start flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:border-primary hover:text-primary transition-all"
                >
                  <AiOutlineFilter className="w-4 h-4" />
                  Filters
                </button>

                {/* Results count, sort dropdown, view toggle, active filter chips */}
                <ProductsToolbar
                  totalResults={totalResults}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  sortBy={sortBy}
                  onSortChange={handleSortChange}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  currentPage={currentPage}
                  perPage={pageSize}
                />
              </div>

              {/* Animated swap between grid/list layouts and between filter/sort changes */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${currentPage}-${JSON.stringify(filters)}-${sortBy}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {viewMode === "grid" ? (
                    // Grid view — reuses the shared ProductGrid component
                    // (handles its own loading skeletons + empty state)
                    <ProductGrid
                      products={products}
                      isLoading={isLoading}
                      skeletonCount={pageSize}
                      emptyVariant="noProducts"
                      cols={{ default: 2, sm: 2, md: 3, lg: 3 }}
                    />
                  ) : (
                    // List view — one ProductListItem row per product
                    <div className="flex flex-col gap-3">
                      {isLoading ? (
                        // Loading skeleton rows — rebuilt to match the REAL
                        // ProductListItem.jsx structure element-for-element
                        // (it previously only mocked 3 of its 7 real pieces:
                        // no stock-status row, no wishlist button, wrong
                        // image size, and no mobile stacking. Ratings are
                        // intentionally NOT mocked — ProductListItem.jsx
                        // doesn't render them, matching ProductCard.jsx)
                        //
                        // FIXED: this used to always render exactly 6 rows,
                        // no matter how many products the current page
                        // actually holds. Grid view correctly sizes its
                        // skeleton to pageSize, so list view was the
                        // one place a customer would see 6 placeholder rows
                        // suddenly snap to pageSize real rows the moment the
                        // request finished — a jarring page-length jump.
                        // Using pageSize here keeps both view modes
                        // consistent with each other and with the real data.
                        Array.from({ length: pageSize }).map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 animate-pulse"
                            // flex-col sm:flex-row: stacks image-on-top on
                            // mobile, side-by-side on desktop — exactly like
                            // the real <Link> row does via the same classes
                          >
                            {/* Image — real item is "w-full h-44" on mobile
                                and "sm:w-32 sm:h-32" on desktop, not a fixed
                                square at every breakpoint */}
                            <div className="w-full h-44 sm:w-32 sm:h-32 rounded-xl bg-gray-100 shrink-0" />

                            {/* Middle column — category, 2-line title (the
                                real title uses line-clamp-2, so TWO lines is
                                correct here, unlike the single-line grid card),
                                and stock-status row. NOTE: no rating row —
                                ProductListItem.jsx no longer shows ratings
                                (removed for consistency with ProductCard.jsx
                                and ProductDetail.jsx, which never had one) */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2 py-1">
                              <div className="h-3 bg-gray-100 rounded w-16" />
                              {/* Category label placeholder */}
                              <div className="h-4 bg-gray-100 rounded w-3/4" />
                              <div className="h-4 bg-gray-100 rounded w-1/2" />
                              {/* Two bars: real title can wrap to 2 lines */}
                              <div className="h-3.5 bg-gray-100 rounded w-28" />
                              {/* Stock-status dot + label placeholder */}
                            </div>

                            {/* Right column — price block + the two real
                                action buttons (wishlist heart circle AND
                                Add to Cart), matching the real row's
                                horizontal-on-mobile / vertical-on-desktop swap */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                              <div className="h-7 bg-gray-100 rounded w-24" />
                              {/* Price block placeholder (PriceDisplay size="lg") */}
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                                {/* Wishlist heart button placeholder — the
                                    old skeleton omitted this entirely */}
                                <div className="h-8 bg-gray-100 rounded-md w-28" />
                                {/* Add to Cart button placeholder — sm size,
                                    rounded-md to match the real Button */}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : products.length > 0 ? (
                        products.map((product) => (
                          <ProductListItem key={product.id} product={product} />
                        ))
                      ) : (
                        // Reuses the shared EmptyState component for consistency
                        <EmptyState variant="noProducts" />
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Pagination — shown whenever there's at least one product,
                  not gated on totalPages > 1 any more, so the "rows per
                  page" dropdown stays reachable even while every matching
                  product currently fits on a single page. */}
              {!isLoading && totalResults > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  pageSize={pageSize}
                  pageSizeOptions={UI_PAGE_SIZE_OPTIONS}
                  onPageSizeChange={handlePageSizeChange}
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
            {/* Dark backdrop — clicking it closes the drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/50 z-drawer lg:hidden"
            />
            {/* Slide-in panel from the left. Sized to fit its content (not a
                fixed full-screen height) — this removes the large empty
                white gap that used to sit below the filters card.
                `top-4 bottom-4` keeps a small margin from the screen edges,
                and it scrolls internally (invisibly, via scrollbar-hide)
                only if the content ever needs more room than the viewport. */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-4 bottom-4 w-80 max-w-[85vw] z-modal lg:hidden overflow-y-auto scrollbar-hide"
            >
              {/* ProductsFilters already renders its own white card, rounded
                  corners, border, and padding — no extra wrapper needed here,
                  which is what was causing the doubled-up empty white box */}
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
