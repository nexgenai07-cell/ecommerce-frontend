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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"; // React hooks used below
import { Link } from "react-router-dom"; // Client side navigation for the fallback call-to-action
import { useQuery, useQueries } from "@tanstack/react-query"; // Server state fetching and caching
import { animate, useMotionValue, useScroll } from "framer-motion"; // Scroll progress of the hero track + autoplay progress

import { ROUTES } from "../../constants/routes"; // Central route paths
import extractListData from "../../utils/extractListData"; // Normalises list responses into plain arrays
import {
  heroCategoriesQueryOptions,
  heroProductsQueryOptions,
  readHeroCache,
  writeHeroCache,
} from "../../utils/heroData"; // Shared query options + instant-paint cache
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
import HeroCategoryScene from "./hero/HeroCategoryScene"; // One category scene
import HeroDissolveCanvas from "./hero/HeroDissolveCanvas"; // WebGL dissolve backdrop

// Fallback colours used only if the CSS custom properties are missing.
const FALLBACK_BASE = [5, 8, 12];
const FALLBACK_TINTS = [
  [16, 185, 129],
  [99, 102, 241],
  [245, 158, 11],
];

// Screens up to this width (phones and tablets) get a compact hero: a normal
// height block whose categories change by themselves, instead of a full screen
// that stays pinned while the visitor scrolls. Keep in sync with the
// "max-width: 1023px" rules in index.css.
const COMPACT_QUERY = "(max-width: 1023px)";

// Autoplay timing for the compact hero (milliseconds / seconds).
const AUTOPLAY_INTERVAL_MS = 5000; // How long each category rests on screen
const AUTOPLAY_TRANSITION_S = 1.6; // How long the dissolve between two categories takes

// Lets React follow the compact media query as the window is resized or rotated.
const subscribeCompact = (onChange) => {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange); // Unsubscribe
};
const getCompactSnapshot = () => window.matchMedia(COMPACT_QUERY).matches;

const HeroSection = () => {
  // Outer scroll track element; its height creates the scroll distance.
  const trackRef = useRef(null);

  // ---- Saved data from the last visit ----
  // Read once. When it exists the hero paints instantly from it while fresh
  // data is fetched quietly in the background (the prefetch started in App.jsx
  // has usually finished by now, so these hooks just pick up its result).
  const [heroCache] = useState(readHeroCache);

  // ---- Categories (same cache entry as the other homepage sections) ----
  const categoriesQuery = useQuery(heroCategoriesQueryOptions(heroCache));
  const categoriesData = categoriesQuery.data;
  const categoriesLoading = categoriesQuery.isLoading;

  // Only the first few categories are presented in the hero.
  const categories = useMemo(
    () => extractListData(categoriesData).slice(0, HERO_MAX_CATEGORIES),
    [categoriesData],
  );

  // ---- Products of every presented category ----
  const productQueries = useQueries({
    queries: categories.map((category) =>
      heroProductsQueryOptions(category.id, heroCache),
    ),
  });

  // Plain product arrays in the same order as the categories.
  const productsByCategory = productQueries.map((query) =>
    extractListData(query.data),
  );

  // ---- Remember what was shown, so the next visit paints instantly ----
  // "dataUpdatedAt" changes only when data really arrives from the network, so
  // data restored from the cache keeps its original age and still gets refreshed.
  const categoriesUpdatedAt = categoriesQuery.dataUpdatedAt;
  const productsStamp = productQueries
    .map((query) => query.dataUpdatedAt)
    .join(",");

  useEffect(() => {
    if (!categoriesData || categories.length === 0) return;

    // Entries for the categories whose products have arrived.
    const products = {};
    categories.forEach((category, index) => {
      const query = productQueries[index];
      if (query?.data) {
        products[category.id] = {
          payload: query.data.data,
          at: query.dataUpdatedAt,
        };
      }
    });

    writeHeroCache({
      categories: { payload: categoriesData.data, at: categoriesUpdatedAt },
      products,
    });
    // The stamps change exactly when new data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesUpdatedAt, productsStamp]);

  // ---- Backdrop artwork for the WebGL dissolve ----
  // Identifies the current category set so artwork is repainted only when it changes.
  const categoryKey = categories.map((category) => category.id).join(",");

  // Painting the artwork is heavy (large canvases with thousands of particles),
  // so it happens AFTER the first paint instead of during render. The title and
  // product cards therefore appear immediately over the stage's CSS fallback
  // background, and the WebGL backdrop fades in a moment later.
  const [backdrops, setBackdrops] = useState([]);

  useEffect(() => {
    // Nothing to paint until categories exist.
    if (categories.length === 0) return undefined;

    let timeoutId = 0;
    // Wait for the browser to paint the content first, then do the heavy work.
    const frameId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        // Colours come from the CSS custom properties defined in index.css.
        const root = document.documentElement;
        const base = readHeroColor(root, "--hero-base", FALLBACK_BASE);

        // One artwork per category, tinted with its own accent colour.
        setBackdrops(
          categories.map((category, index) =>
            createHeroBackdrop({
              tint: readHeroColor(
                root,
                `--hero-tint-${index % FALLBACK_TINTS.length}`,
                FALLBACK_TINTS[index % FALLBACK_TINTS.length],
              ),
              base,
              seed: Number(category.id) * 7919 + index * 104729 + 13,
            }),
          ),
        );
      }, 0);
    });

    // Cancel pending work if the categories change or the hero unmounts.
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
    // categoryKey changes exactly when the category list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey]);

  // ---- Progress tracking ----
  // Overall progress (0 to 1) of the hero. On desktop it follows the scroll
  // position of the hero track; on phones and tablets it is driven by autoplay.
  const { scrollYProgress } = useScroll({
    target: trackRef, // The tall outer track
    offset: [`start ${HERO_NAVBAR_OFFSET_PX}px`, "end end"], // Starts when the stage pins under the navbar
  });

  // True on phones and tablets (see COMPACT_QUERY).
  const isCompact = useSyncExternalStore(
    subscribeCompact,
    getCompactSnapshot,
    () => false,
  );

  // Progress value moved by the autoplay below (compact screens only).
  const autoProgress = useMotionValue(0);

  // The progress value everything else reads from.
  const progress = isCompact ? autoProgress : scrollYProgress;

  // Number of categories actually presented.
  const count = categories.length;

  // Autoplay for the compact hero: every few seconds move on to the next
  // category, and bounce back at the ends so the dissolve always plays smoothly.
  useEffect(() => {
    autoProgress.set(0); // Always restart from the first category
    if (!isCompact || count < 2) return undefined;

    // Visitors who prefer reduced motion keep the first category.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let index = 0; // Category currently shown
    let direction = 1; // 1 = forwards, -1 = backwards
    let controls = null; // Handle of the running animation

    const timer = setInterval(() => {
      if (document.hidden) return; // Do nothing while the tab is in the background
      if (index + direction > count - 1 || index + direction < 0) {
        direction = -direction; // Bounce at either end
      }
      index += direction;
      controls?.stop(); // Never overlap two animations
      controls = animate(autoProgress, index / (count - 1), {
        duration: AUTOPLAY_TRANSITION_S,
        ease: "easeInOut",
      });
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      clearInterval(timer); // Stop autoplay
      controls?.stop(); // Stop any running transition
    };
  }, [isCompact, count, autoProgress]);

  // Lets React subscribe to the progress value from outside React.
  const subscribeToScroll = useCallback(
    (onChange) => progress.on("change", onChange), // Returns the unsubscribe function
    [progress],
  );

  // Index of the category whose content is currently visible (-1 between two).
  // It is derived straight from the live scroll progress, so it also stays
  // correct when the category count changes after the data finishes loading,
  // and React re-renders only when this number actually changes.
  const visibleIndex = useSyncExternalStore(
    subscribeToScroll, // How to listen for scroll progress changes
    () => resolveHeroFrame(progress.get(), count).visibleIndex, // Current snapshot
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
        {/* Full-bleed: no Container, so the stage spans the entire viewport width */}
        {/* The rounded stage that holds the backdrop and every scene */}
        <div className={cn("hero-stage", showSkeleton && "hero-stage-loading")}>
          {/* WebGL silver dissolve backdrop, only once artwork exists */}
          {categories.length > 0 && backdrops.length > 0 && (
            <HeroDissolveCanvas
              backdrops={backdrops}
              progress={progress}
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
              isActive={visibleIndex === index}
            />
          ))}

          {/* Friendly static message when the store has no categories yet */}
          {showEmptyState && (
            <div className="hero-center">
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
      </div>
    </section>
  );
};

export default HeroSection; // Make the component available to Home.jsx
