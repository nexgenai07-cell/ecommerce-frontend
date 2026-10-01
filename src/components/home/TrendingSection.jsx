import { useEffect, useRef, useState } from "react"; // Local state for the active category and the entrance, a ref and an effect to watch the section enter the screen
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

// Share of the section that must be on screen before the chips and cards start moving in
const ENTRANCE_VISIBLE_RATIO = 0.15;

// Shrinks the area used for the check at its bottom edge, so the entrance starts
// only once the section is clearly inside the screen and is seen from the start
const ENTRANCE_ROOT_MARGIN = "0px 0px -10% 0px";

// =============================================
// CARD ENTRANCE
// The cards slide in one after another and settle into their own place:
// the first two travel in from the left, the last two from the right.
// Each class plays the keyframes defined in src/index.css, and the
// last animation value is the delay that creates the one-by-one order.
// The classes are written out in full so Tailwind can detect them.
// =============================================
const CARD_ENTRANCE_CLASSES = [
  "animate-[trendingFromLeft_900ms_cubic-bezier(0.22,1,0.36,1)_0ms_backwards] motion-reduce:animate-none", // 1st card, from the left, first to arrive
  "animate-[trendingFromLeft_900ms_cubic-bezier(0.22,1,0.36,1)_160ms_backwards] motion-reduce:animate-none", // 2nd card, from the left
  "animate-[trendingFromRight_900ms_cubic-bezier(0.22,1,0.36,1)_320ms_backwards] motion-reduce:animate-none", // 3rd card, from the right
  "animate-[trendingFromRight_900ms_cubic-bezier(0.22,1,0.36,1)_480ms_backwards] motion-reduce:animate-none", // 4th card, from the right, last to arrive
];

// =============================================
// CHIP ENTRANCE
// The category chips arrive one after another as well, alternating between
// the left and the right side. Chips beyond the last entry reuse its delay,
// so a long list of categories never makes the row wait too long.
// =============================================
const CHIP_ENTRANCE_CLASSES = [
  "animate-[trendingPillFromLeft_700ms_cubic-bezier(0.22,1,0.36,1)_0ms_backwards] motion-reduce:animate-none", // 1st chip ("All"), from the left
  "animate-[trendingPillFromRight_700ms_cubic-bezier(0.22,1,0.36,1)_60ms_backwards] motion-reduce:animate-none", // 2nd chip, from the right
  "animate-[trendingPillFromLeft_700ms_cubic-bezier(0.22,1,0.36,1)_120ms_backwards] motion-reduce:animate-none", // 3rd chip, from the left
  "animate-[trendingPillFromRight_700ms_cubic-bezier(0.22,1,0.36,1)_180ms_backwards] motion-reduce:animate-none", // 4th chip, from the right
  "animate-[trendingPillFromLeft_700ms_cubic-bezier(0.22,1,0.36,1)_240ms_backwards] motion-reduce:animate-none", // 5th chip, from the left
  "animate-[trendingPillFromRight_700ms_cubic-bezier(0.22,1,0.36,1)_300ms_backwards] motion-reduce:animate-none", // 6th chip, from the right
  "animate-[trendingPillFromLeft_700ms_cubic-bezier(0.22,1,0.36,1)_360ms_backwards] motion-reduce:animate-none", // 7th chip, from the left
  "animate-[trendingPillFromRight_700ms_cubic-bezier(0.22,1,0.36,1)_420ms_backwards] motion-reduce:animate-none", // 8th chip, from the right
];

const TrendingSection = () => {
  // Stores which category is currently selected for filtering.
  // null means "no filter" / "show all categories"
  const [activeCategory, setActiveCategory] = useState(null);

  // The block holding the heading, the chips and the grid, watched to find out when it scrolls into view
  const contentRef = useRef(null);

  // True once the section has been seen on screen; the chips and cards stay invisible until then.
  // Browsers without IntersectionObserver skip the wait and show everything at once.
  const [isRevealed, setIsRevealed] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  // Starts the entrance the first time enough of the section is visible
  useEffect(() => {
    const node = contentRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect(); // Watching is only needed until the first reveal
        }
      },
      { threshold: ENTRANCE_VISIBLE_RATIO, rootMargin: ENTRANCE_ROOT_MARGIN },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // =============================================
  // CATEGORIES API CALL — for the filter pills
  // =============================================
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // Cache key used by react-query to store/retrieve this request's result
    queryFn: ({ signal }) => getCategories(undefined, signal), // Function that actually performs the API call
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
    queryFn: ({ signal }) =>
      searchProducts(
        {
          category_id: activeCategory || undefined, // omit entirely if no category selected
          ordering: "-created_at", // newest first
          page: 1,
        },
        signal,
      ),
    staleTime: 1000 * 60 * 5,
  });

  // Only ever take the first 4 results — keeps the section to a single row
  const products = productsData?.data?.results?.slice(0, TRENDING_LIMIT) || []; // Fallback to empty array while data is still loading

  // Picks the classes of one card from its position in the grid:
  // invisible before the grid is on screen, then the entrance of that position.
  // Cards that load later (for example after choosing another category)
  // mount into an already revealed grid, so they play the entrance as well.
  const getCardClassName = (index) =>
    isRevealed
      ? CARD_ENTRANCE_CLASSES[index % CARD_ENTRANCE_CLASSES.length]
      : "opacity-0";

  // Same idea for the category chips: invisible before the section is on screen,
  // then each chip plays the entrance of its position in the row
  const getPillClassName = (index) => {
    if (!isRevealed) return "opacity-0";

    // Chips past the end of the list reuse the last two entries, which keeps
    // both the alternating side and the longest delay
    const lastIndex = CHIP_ENTRANCE_CLASSES.length - 1;
    const entranceIndex =
      index <= lastIndex ? index : lastIndex - 1 + (index % 2);

    return CHIP_ENTRANCE_CLASSES[entranceIndex];
  };

  return (
    // Outer section wrapper — compact vertical padding above and below.
    // overflow-x-clip hides the part of a card that is still outside the section while it slides in,
    // so the page never gains a horizontal scrollbar on narrow screens.
    <section className="overflow-x-clip py-6 sm:py-8">
      {/* Container centers the whole section and applies consistent
          left/right padding at every breakpoint, including extra
          room on very large screens (xl:px-12) so the section never
          reads as "edge to edge" on wide monitors */}
      <Container className="xl:px-12">
        {/* Vertical stack: header, filter pills, product grid — spaced evenly apart.
            It is watched for entering the screen, which starts the chip and card entrances. */}
        <div ref={contentRef} className="flex flex-col gap-3 sm:gap-4">
          {/* ============ SECTION HEADER ============ */}
          {/* Heading block on the left, "View All" link on the right, aligned to the bottom */}
          <div className="flex items-end justify-between gap-4">
            {/* Left side: main heading + supporting subtitle */}
            <div className="flex min-w-0 flex-col gap-0.5">
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
          {/* Row of clickable pills to filter trending products by category.
              It scrolls sideways when the pills do not fit, without a visible scrollbar. */}
          <CategoryPills
            categories={categories} // List of categories to render as pills
            activeCategory={activeCategory} // Currently selected category (controls highlighted pill)
            onCategoryChange={setActiveCategory} // Called when the user clicks a different pill
            showAll={true} // Also show an "All" pill to clear the filter
            hideScrollbar // Keeps the row scrollable but removes the scrollbar
            getPillClassName={getPillClassName} // Gives every chip its own entrance by position
          />

          {/* ============ PRODUCTS GRID — single row of 4 ============ */}
          {/* Renders product cards, skeleton placeholders while loading, or an empty state */}
          <ProductGrid
            products={products} // Product data to display
            isLoading={isLoading} // Whether the API call is still in flight
            skeletonCount={TRENDING_LIMIT} // Number of skeleton placeholders to show while loading
            cols={{ default: 2, sm: 2, md: 2, lg: 4 }} // Responsive column counts at each breakpoint
            className="gap-3 sm:gap-4" // Tighter spacing between the product cards
            emptyVariant="noProducts" // Which empty-state message/illustration to show if there are 0 products
            getCardClassName={getCardClassName} // Gives every card its own entrance by position
          />
        </div>
      </Container>
    </section>
  );
};

export default TrendingSection;
