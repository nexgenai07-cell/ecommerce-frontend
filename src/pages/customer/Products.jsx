import { useState, useEffect, useMemo } from "react";
// Reads and writes the URL query string, which holds the customer's
// filter, sort, view and pagination selections
import { useSearchParams } from "react-router-dom";
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

// Smoothly scrolls back to the top of the page — called on every filter,
// sort, or page change so the user always sees the new results from the top
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Query-string keys that hold the page's state in the URL. The category,
// price and stock keys use the same names as the backend search endpoint.
const PARAM = {
  CATEGORY: "category_id",
  MIN_PRICE: "min_price",
  MAX_PRICE: "max_price",
  IN_STOCK: "in_stock",
  SORT: "sort",
  PAGE: "page",
  PAGE_SIZE: "page_size",
  VIEW: "view",
  // Free-text query, e.g. from the navbar's "View All Results", Recent
  // Searches, or mobile search Enter key — matches the backend search
  // endpoint's own "search" param name (see products.api.js).
  SEARCH: "search",
};

// Sort order applied when the URL does not specify one (newest first)
const DEFAULT_SORT = "-created_at";

// Returns the number for a query-string value made only of digits and
// greater than zero; returns null for anything else
const parsePositiveInt = (value) =>
  /^\d+$/.test(value || "") && Number(value) > 0 ? Number(value) : null;

// Parses a comma-separated category list such as "5,8" into [5, 8],
// skipping duplicates and any entry that is not a positive whole number
const parseCategoryIds = (value) => [
  ...new Set(
    (value || "")
      .split(",")
      .map((part) => parsePositiveInt(part.trim()))
      .filter((id) => id !== null),
  ),
];

// Keeps a price value only when it is made of digits alone
const parsePrice = (value) => (/^\d+$/.test(value || "") ? value : "");

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL query string is the single source of truth for everything the
  // customer selects on this page: categories, price range, stock toggle,
  // sort order, grid/list view, page number and rows per page. Keeping it
  // there means the selections survive leaving the page (for example a
  // sign-in redirect) and come back exactly as they were, and a link to a
  // filtered view opens with those filters applied.
  const paramsKey = searchParams.toString();

  // Parsed once per URL change so the filters object keeps a stable
  // identity between renders (the filter panel resets its draft whenever
  // that object changes).
  const { filters, sortBy, viewMode, currentPage, pageSize, search } =
    useMemo(() => {
      const params = new URLSearchParams(paramsKey);
      const requestedPageSize = parsePositiveInt(params.get(PARAM.PAGE_SIZE));

      return {
        filters: {
          ...DEFAULT_FILTERS,
          categories: parseCategoryIds(params.get(PARAM.CATEGORY)),
          minPrice: parsePrice(params.get(PARAM.MIN_PRICE)),
          maxPrice: parsePrice(params.get(PARAM.MAX_PRICE)),
          inStock: params.get(PARAM.IN_STOCK) === "true",
        },
        // Sort order (e.g. "-price", "price", "-created_at")
        sortBy: params.get(PARAM.SORT) || DEFAULT_SORT,
        // "grid" or "list" — controls which layout renders the product results
        viewMode: params.get(PARAM.VIEW) === "list" ? "list" : "grid",
        // Current page number for pagination
        currentPage: parsePositiveInt(params.get(PARAM.PAGE)) || 1,
        // How many products are shown per UI page, controlled by the "Rows per
        // page" dropdown in the Pagination control below
        pageSize: UI_PAGE_SIZE_OPTIONS.includes(requestedPageSize)
          ? requestedPageSize
          : DEFAULT_UI_PAGE_SIZE,
        // Free-text search query from the navbar, trimmed; empty string
        // when the page was opened without one (normal browsing/filtering)
        search: (params.get(PARAM.SEARCH) || "").trim(),
      };
    }, [paramsKey]);

  // Whether the mobile filter drawer is currently open
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Writes the page state back to the URL. Any value not passed in
  // "changes" keeps its current value, defaults are left out of the query
  // string to keep URLs short, and query parameters this page does not
  // manage are preserved. The history entry is replaced rather than added,
  // so the browser Back button leaves the page instead of stepping through
  // every filter change.
  const updateUrl = (changes) => {
    const next = {
      filters,
      sortBy,
      viewMode,
      currentPage,
      pageSize,
      search,
      ...changes,
    };
    const params = new URLSearchParams(searchParams);
    Object.values(PARAM).forEach((key) => params.delete(key));

    const categories = next.filters.categories || [];
    if (categories.length > 0) {
      params.set(PARAM.CATEGORY, categories.join(","));
    }
    if (next.filters.minPrice) {
      params.set(PARAM.MIN_PRICE, String(next.filters.minPrice));
    }
    if (next.filters.maxPrice) {
      params.set(PARAM.MAX_PRICE, String(next.filters.maxPrice));
    }
    if (next.filters.inStock) {
      params.set(PARAM.IN_STOCK, "true");
    }
    if (next.sortBy && next.sortBy !== DEFAULT_SORT) {
      params.set(PARAM.SORT, next.sortBy);
    }
    if (next.viewMode === "list") {
      params.set(PARAM.VIEW, "list");
    }
    if (next.currentPage > 1) {
      params.set(PARAM.PAGE, String(next.currentPage));
    }
    if (next.pageSize !== DEFAULT_UI_PAGE_SIZE) {
      params.set(PARAM.PAGE_SIZE, String(next.pageSize));
    }
    if (next.search) {
      params.set(PARAM.SEARCH, next.search);
    }

    setSearchParams(params, { replace: true });
  };

  // When the page is opened or re-targeted through a category link, bring
  // the results back into view from the top
  const categoryParam = searchParams.get(PARAM.CATEGORY);
  const searchParam = searchParams.get(PARAM.SEARCH);
  useEffect(() => {
    if (categoryParam || searchParam) {
      scrollToTop();
    }
  }, [categoryParam, searchParam]);

  // Called whenever any filter changes (from the sidebar, toolbar chips, etc.)
  const handleFiltersChange = (newFilters) => {
    updateUrl({ filters: newFilters, currentPage: 1 }); // New filters mean a new result set — start from page 1
    scrollToTop();
  };

  // Called when the sort dropdown changes
  const handleSortChange = (sort) => {
    updateUrl({ sortBy: sort, currentPage: 1 });
    scrollToTop();
  };

  // Called when the grid/list toggle changes
  const handleViewModeChange = (mode) => {
    updateUrl({ viewMode: mode });
  };

  // Called when a pagination button is clicked
  const handlePageChange = (page) => {
    updateUrl({ currentPage: page });
    scrollToTop();
  };

  // Called when the customer picks a different "rows per page" value.
  // Resets back to page 1 as well, since staying on a deep page number
  // could land past the end of the newly-sized result set.
  const handlePageSizeChange = (size) => {
    updateUrl({ pageSize: size, currentPage: 1 });
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
    search,
  });

  // Extract the current page's products, defaulting to an empty array
  const products = productsData?.results || [];
  // Total number of products matching the current filters
  const totalResults = productsData?.count || 0;
  // Total number of pages, derived from the total result count
  const totalPages = Math.ceil(totalResults / pageSize);

  // A page number in the URL can point past the end of the results (an
  // edited link, or a filter that now matches fewer products). Once the
  // results have loaded, move back to the last page that exists.
  const lastPage = Math.max(totalPages, 1);
  useEffect(() => {
    if (productsData && currentPage > lastPage) {
      updateUrl({ currentPage: lastPage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsData, currentPage, lastPage]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* flex flex-col added alongside the existing min-h-screen: turns
          the page root into a flex column so the height below can flow
          all the way down to the Pagination control, letting it sit
          pinned at the bottom of the screen instead of hugging right
          under the product list when only a page or two of results. */}
      <Container className="py-6 sm:py-8 px-5 sm:px-8 lg:px-14 xl:px-20 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-5 flex-1 min-h-0">
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
                  {search ? `Results for "${search}"` : "All Products"}
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
          <div className="flex gap-6 lg:gap-8 items-start flex-1 min-h-0">
            {/* flex-1 min-h-0: lets this row grow to fill the remaining
                page height, so the results column below can stretch down
                to the bottom of the screen. items-start is left as-is so
                the sticky sidebar still sizes to its own content instead
                of being stretched to match — only the results column
                opts into the extra height, via self-stretch below. */}

            {/* Desktop sidebar — sticky so it stays visible while scrolling,
                and internally scrollable (see ProductsFilters) so it never
                stretches the page taller than the viewport */}
            <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24">
              <ProductsFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </aside>

            <div className="flex-1 min-w-0 flex flex-col gap-4 self-stretch min-h-0">
              {/* self-stretch: overrides the row's items-start just for
                  this column, so it grows to the row's full height (which
                  is now itself flex-1) instead of shrink-wrapping to the
                  product list's content height. */}
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
                  onViewModeChange={handleViewModeChange}
                  currentPage={currentPage}
                  perPage={pageSize}
                />
              </div>

              {/* Animated swap between grid/list layouts and between filter/sort changes.
                  flex-1 min-h-0 wraps this whole block so it (not the
                  Pagination control below) absorbs any extra vertical
                  space, which is what pins Pagination to the bottom of
                  the screen even when only one page of results exists. */}
              <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${viewMode}-${currentPage}-${JSON.stringify(filters)}-${sortBy}-${search}`}
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
                            <ProductListItem
                              key={product.id}
                              product={product}
                            />
                          ))
                        ) : (
                          // Reuses the shared EmptyState component for consistency
                          <EmptyState variant="noProducts" />
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

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
