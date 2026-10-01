// ============================================================
// HeroSection - COMPONENT (homepage hero)
// ============================================================
// A scroll driven, full screen showcase of up to three real store
// categories. The hero pins itself below the navbar while the visitor
// scrolls:
//   1. The category name appears in the middle. Its silver letters, and
//      the category's products scattered around it like sprinkles, fly in
//      from all directions and settle into their places.
//   2. Scrolling on makes the content scatter away while a WebGL silver
//      "dissolve" (the Vengeance UI scroll-dissolve-reveal effect) opens
//      from the centre and reveals the next category's backdrop.
//   3. The next category then flies in with the very same effect.
// Data comes from the real categories and products APIs.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react"; // React hooks used below
import { Link } from "react-router-dom"; // Client side navigation for the fallback call-to-action
import { useQuery, useQueries } from "@tanstack/react-query"; // Server state fetching and caching
import { useScroll } from "framer-motion"; // Scroll progress of the hero track

import { ROUTES } from "../../constants/routes"; // Central route paths
import { QUERY_KEYS } from "../../constants/queryKeys"; // Central TanStack Query keys
import { searchProducts } from "../../api/products.api"; // Product search/filter endpoint (API 29)
import { getCategories } from "../../api/categories.api"; // List categories endpoint (API 23)
import extractListData from "../../utils/extractListData"; // Normalises list responses into plain arrays
import {
  HERO_MAX_CATEGORIES,
  HERO_NAVBAR_OFFSET_PX,
  resolveHeroFrame,
} from "../../utils/heroScrollMap"; // Scroll progress -> hero frame state
import {
  createHeroBackdrop,
  readHeroColor,
} from "../../utils/createHeroBackdrop"; // Paints the WebGL backdrop artwork
import cn from "../../utils/cn"; // Joins class names conditionally
import Container from "../layouts/Container"; // Shared max width wrapper
import HeroCategoryScene, { HERO_MAX_SPARKS } from "./hero/HeroCategoryScene"; // One category scene
import HeroDissolveCanvas from "./hero/HeroDissolveCanvas"; // WebGL dissolve backdrop

// Fallback colours used only if the CSS custom properties are missing.
const FALLBACK_BASE = [5, 8, 12];
const FALLBACK_TINTS = [
  [16, 185, 129],
  [99, 102, 241],
  [245, 158, 11],
];

// How long fetched hero data stays fresh before it is refetched (10 minutes).
const HERO_STALE_TIME = 1000 * 60 * 10;

const HeroSection = () => {
  // Outer scroll track element; its height creates the scroll distance.
  const trackRef = useRef(null);

  // ---- Categories (same cache entry as the other homepage sections) ----
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // Shared cache key, so no duplicate request is made
    queryFn: ({ signal }) => getCategories(undefined, signal), // Fetch the full category list
    staleTime: HERO_STALE_TIME, // Keep the result fresh for a while
  });

  // Only the first few categories are presented in the hero.
  const categories = useMemo(
    () => extractListData(categoriesData).slice(0, HERO_MAX_CATEGORIES),
    [categoriesData],
  );

  // ---- Products of every presented category ----
  const productQueries = useQueries({
    queries: categories.map((category) => ({
      queryKey: [...QUERY_KEYS.PRODUCTS, "hero-category", category.id], // One cache entry per category
      queryFn: ({ signal }) =>
        searchProducts(
          {
            category_id: category.id, // Only products of this category
            ordering: "-created_at", // Newest products first
            page: 1, // First page is enough for the sprinkles
            page_size: HERO_MAX_SPARKS, // Ask for exactly as many as fit around the title
          },
          signal,
        ),
      staleTime: HERO_STALE_TIME, // Keep the result fresh for a while
    })),
  });

  // Plain product arrays in the same order as the categories.
  const productsByCategory = productQueries.map((query) =>
    extractListData(query.data),
  );

  // ---- Backdrop artwork for the WebGL dissolve ----
  // Identifies the current category set so artwork is repainted only when it changes.
  const categoryKey = categories.map((category) => category.id).join(",");

  const backdrops = useMemo(() => {
    // Nothing to paint until categories exist.
    if (categories.length === 0) return [];

    // Colours come from the CSS custom properties defined in index.css.
    const root = document.documentElement;
    const base = readHeroColor(root, "--hero-base", FALLBACK_BASE);

    // One artwork per category, tinted with its own accent colour.
    return categories.map((category, index) =>
      createHeroBackdrop({
        tint: readHeroColor(
          root,
          `--hero-tint-${index % FALLBACK_TINTS.length}`,
          FALLBACK_TINTS[index % FALLBACK_TINTS.length],
        ),
        base,
        seed: Number(category.id) * 7919 + index * 104729 + 13,
      }),
    );
    // categoryKey changes exactly when the category list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey]);

  // ---- Scroll tracking ----
  // Overall progress (0 to 1) from the moment the hero pins until it releases.
  const { scrollYProgress } = useScroll({
    target: trackRef, // The tall outer track
    offset: [`start ${HERO_NAVBAR_OFFSET_PX}px`, "end end"], // Starts when the stage pins under the navbar
  });

  // Number of categories actually presented.
  const count = categories.length;

  // Lets React subscribe to the scroll progress value from outside React.
  const subscribeToScroll = useCallback(
    (onChange) => scrollYProgress.on("change", onChange), // Returns the unsubscribe function
    [scrollYProgress],
  );

  // Index of the category whose content is currently visible (-1 between two).
  // It is derived straight from the live scroll progress, so it also stays
  // correct when the category count changes after the data finishes loading,
  // and React re-renders only when this number actually changes.
  const visibleIndex = useSyncExternalStore(
    subscribeToScroll, // How to listen for scroll progress changes
    () => resolveHeroFrame(scrollYProgress.get(), count).visibleIndex, // Current snapshot
  );

  // Track height class: one scroll segment per category transition.
  const trackSize = Math.min(Math.max(count, 1), HERO_MAX_CATEGORIES);

  // True while data is still loading and no category is known yet.
  const showSkeleton = categoriesLoading && count === 0;

  // True once loading finished and the store has no categories.
  const showEmptyState = !categoriesLoading && count === 0;

  return (
    // Tall outer track: its height provides the scroll distance for the transitions.
    <section
      ref={trackRef}
      className={cn("hero-track", `hero-track-${trackSize}`)}
      aria-label="Featured categories"
    >
      {/* Page level heading for assistive technology; the visual titles are per category */}
      <h1 className="sr-only">Shop by category at Zyron</h1>

      {/* Pinned wrapper that stays below the navbar while the track scrolls */}
      <div className="hero-sticky">
        <Container className="h-full">
          {/* The rounded stage that holds the backdrop and every scene */}
          <div
            className={cn("hero-stage", showSkeleton && "hero-stage-loading")}
          >
            {/* WebGL silver dissolve backdrop, only once artwork exists */}
            {backdrops.length > 0 && (
              <HeroDissolveCanvas
                backdrops={backdrops}
                progress={scrollYProgress}
                count={count}
              />
            )}

            {/* Dark gradient over the backdrop that keeps text and tiles readable */}
            <div className="hero-shade" aria-hidden="true" />

            {/* One scene per category; only the active one is visible and focusable */}
            {categories.map((category, index) => (
              <HeroCategoryScene
                key={category.id}
                category={category}
                products={productsByCategory[index] || []}
                index={index}
                total={count}
                isActive={visibleIndex === index}
              />
            ))}

            {/* Friendly static message when the store has no categories yet */}
            {showEmptyState && (
              <div className="hero-center">
                <p className="hero-kicker">Zyron</p>
                <h2 className="hero-title hero-title-md">
                  <span className="hero-letter-face">Shop the Future</span>
                </h2>
                <Link to={ROUTES.PRODUCTS} className="hero-cta">
                  <span>Browse Products</span>
                </Link>
              </div>
            )}

            {/* Progress dots showing which of the categories is on screen */}
            {count > 1 && (
              <ol className="hero-progress" aria-hidden="true">
                {categories.map((category, index) => (
                  <li
                    key={category.id}
                    className={cn(
                      "hero-progress-dot",
                      visibleIndex === index && "is-current",
                    )}
                  />
                ))}
              </ol>
            )}

            {/* Scroll hint, shown only on the first category */}
            {count > 1 && (
              <div
                className={cn(
                  "hero-scroll-hint",
                  visibleIndex !== 0 && "is-hidden",
                )}
                aria-hidden="true"
              >
                <span className="hero-scroll-hint-text">Scroll</span>
                <span className="hero-scroll-hint-line" />
              </div>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
};

export default HeroSection; // Make the component available to Home.jsx
