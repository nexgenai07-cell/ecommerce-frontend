import { useState } from "react"; // React hook to store local component state (e.g. which category filter is active)
import { Link } from "react-router-dom"; // Client-side navigation link (no full page reload)
import { useQuery } from "@tanstack/react-query"; // Handles fetching, caching, and loading state for API calls
import { AiOutlineArrowRight } from "react-icons/ai"; // Small arrow icon used next to "View All"

import { ROUTES } from "../../constants/routes"; // Central list of app route paths
import { QUERY_KEYS } from "../../constants/queryKeys"; // Central list of react-query cache keys
import { searchProducts } from "../../api/products.api"; // /search/ endpoint — the only documented one that supports category_id + ordering filters
import { getCategories } from "../../api/categories.api"; // API call to fetch all product categories
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import ProductGrid from "../shared/ProductGrid"; // Reusable grid that renders product cards (and their loading skeletons)
import CategoryPills from "../shared/CategoryPills"; // Reusable row of clickable category filter buttons
import Container from "../layouts/Container"; // Wrapper that centers content and applies consistent side padding

// Only ever show a single row of 4 cards on the Home page —
// the full catalog is available via "View All"
const TRENDING_LIMIT = 4;

const TrendingSection = () => {
  // Stores which category is currently selected for filtering.
  // null means "no filter" / "show all categories"
  const [activeCategory, setActiveCategory] = useState(null);

  // =============================================
  // CATEGORIES API CALL — for the filter pills
  // =============================================
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // Cache key used by react-query to store/retrieve this request's result
    queryFn: ({ signal }) => getCategories(signal), // Function that actually performs the API call
    staleTime: 1000 * 60 * 10, // fresh for 10 minutes
  });

  // API_Documentation_Final.pdf (API 11) documents this endpoint as
  // returning a flat array, but the real Network response shows a
  // DRF-paginated object instead — a backend/docs contract mismatch.
  // extractListData() safely handles either shape.
  const categories = extractListData(categoriesData); // Normalized array of category objects, safe to map over

  // =============================================
  // TRENDING PRODUCTS API CALL
  // Re-runs automatically whenever "activeCategory" changes,
  // because activeCategory is part of the queryKey below.
  // =============================================
  const { data: productsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "trending", activeCategory], // Unique cache key per selected category
    queryFn: ({ signal }) => searchProducts({
        category_id: activeCategory || undefined, // omit entirely if no category selected
        ordering: "-created_at", // newest first
        page: 1,
      }, signal),
    staleTime: 1000 * 60 * 5,
  });

  // Only ever take the first 4 results — keeps the section to a single row
  const products = productsData?.data?.results?.slice(0, TRENDING_LIMIT) || []; // Fallback to empty array while data is still loading

  return (
    // Outer section wrapper — vertical padding above/below, extra horizontal padding on large screens
    <section className="py-14 lg:px-19">
      {/* Container centers the whole section and applies consistent
          left/right padding at every breakpoint, including extra
          room on very large screens (xl:px-12) so the section never
          reads as "edge to edge" on wide monitors */}
      <Container className="xl:px-12">
        {/* Vertical stack: header, filter pills, product grid — spaced evenly apart */}
        <div className="flex flex-col gap-8">
          {/* ============ SECTION HEADER ============ */}
          {/* Heading block on the left, "View All" link on the right, aligned to the bottom */}
          <div className="flex items-end justify-between gap-4">
            {/* Left side: eyebrow label + main heading + supporting subtitle */}
            <div className="flex flex-col gap-2">
              {/* Main section title — scales up from mobile (text-2xl) to desktop (text-4xl) for a bold, responsive look */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Trending Now
              </h2>
              {/* Supporting subtitle text under the heading */}
              <p className="text-sm sm:text-base text-gray-500">
                Curated picks updated daily
              </p>
            </div>
            {/* "View All" link — navigates to the full products page; arrow nudges right on hover */}
            <Link
              to={ROUTES.PRODUCTS}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 hover:underline shrink-0 transition-all duration-200"
            >
              View All
              <AiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ============ CATEGORY FILTER PILLS ============ */}
          {/* Row of clickable pills to filter trending products by category */}
          <CategoryPills
            categories={categories} // List of categories to render as pills
            activeCategory={activeCategory} // Currently selected category (controls highlighted pill)
            onCategoryChange={setActiveCategory} // Called when the user clicks a different pill
            showAll={true} // Also show an "All" pill to clear the filter
          />

          {/* ============ PRODUCTS GRID — single row of 4 ============ */}
          {/* Renders product cards, or skeleton placeholders while loading, or an empty state */}
          <ProductGrid
            products={products} // Product data to display
            isLoading={isLoading} // Whether the API call is still in flight
            skeletonCount={TRENDING_LIMIT} // Number of skeleton placeholders to show while loading
            cols={{ default: 2, sm: 2, md: 2, lg: 4 }} // Responsive column counts at each breakpoint
            emptyVariant="noProducts" // Which empty-state message/illustration to show if there are 0 products
          />
        </div>
      </Container>
    </section>
  );
};

export default TrendingSection;
