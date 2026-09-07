import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { searchProducts } from "../../api/products.api";
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData";
import Container from "../layouts/Container";
import cn from "../../utils/cn";

const FALLBACK_IMAGE = "/placeholder-product.svg";
const AUTOPLAY_MS = 6000;

// =============================================
// DATA HOOK — builds slide objects from real API data
// (no local state here, purely derived from query results)
// =============================================
const useHeroSlides = () => {
  // Same queryKey + queryFn as FlashSaleSection -> shares its cache,
  // so this does NOT trigger a duplicate network request.
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "flash-sale"],
    queryFn: ({ signal }) => searchProducts({ ordering: "-created_at", page: 1 }, signal),
    staleTime: 1000 * 60 * 5,
  });

  // Same queryKey + queryFn as CollectionsGrid -> shares its cache too.
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 1000 * 60 * 10,
  });

  // extractListData handles the documented-flat-array vs actual-paginated-object
  // drift on this endpoint (same normalizer CollectionsGrid uses).
  const categories = extractListData(categoriesData).slice(0, 3);

  // Same per-category thumbnail queryKey pattern as CollectionsGrid -> shares cache.
  const categoryImageQueries = useQueries({
    queries: categories.map((category) => ({
      queryKey: [...QUERY_KEYS.PRODUCTS, "collection-thumbnail", category.id],
      queryFn: ({ signal }) => searchProducts({
          category_id: category.id,
          ordering: "-created_at",
          page: 1,
        }, signal),
      enabled: categories.length > 0,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const isLoading =
    productsLoading ||
    categoriesLoading ||
    categoryImageQueries.some((q) => q.isLoading);

  const slides = (() => {
    const built = [];

    // ---- Flash sale slide — only if REAL discounted stock exists ----
    // (never show a "Sale" banner when nothing is actually discounted)
    const results = productsData?.data?.results || [];
    const discounted = results.filter(
      (p) => parseFloat(p.original_price) > parseFloat(p.price),
    );

    const discountPercentOf = (p) =>
      ((parseFloat(p.original_price) - parseFloat(p.price)) /
        parseFloat(p.original_price)) *
      100;

    if (discounted.length > 0) {
      const topDiscount = discounted.reduce((max, p) =>
        discountPercentOf(p) > discountPercentOf(max) ? p : max,
      );

      built.push({
        id: "flash-sale",
        badge: "Flash Sale",
        badgeColor: "bg-danger",
        title: `Up to ${Math.round(discountPercentOf(topDiscount))}% Off`,
        subtitle: "On selected items — while stock lasts.",
        image: topDiscount.primary_image || FALLBACK_IMAGE,
        ctaLabel: "Shop the Sale",
        ctaTo: ROUTES.PRODUCTS,
      });
    }

    // ---- Featured category slides — real category + real product photo ----
    categories.forEach((category, index) => {
      const firstProduct =
        categoryImageQueries[index]?.data?.data?.results?.[0];

      built.push({
        id: `category-${category.id}`,
        badge: "Collection",
        badgeColor: "bg-primary",
        title: category.name,
        subtitle:
          category.description || `Discover our ${category.name} collection.`,
        image: firstProduct?.primary_image || FALLBACK_IMAGE,
        ctaLabel: `Shop ${category.name}`,
        ctaTo: `${ROUTES.PRODUCTS}?category_id=${category.id}`,
      });
    });

    // ---- Absolute fallback — hero should never render blank ----
    if (built.length === 0 && !isLoading) {
      built.push({
        id: "welcome",
        badge: "Zyron",
        badgeColor: "bg-primary",
        title: "Discover Quality, Curated for You",
        subtitle: "Shop the latest products across every category.",
        image: FALLBACK_IMAGE,
        ctaLabel: "Shop Now",
        ctaTo: ROUTES.PRODUCTS,
      });
    }

    return built;
  })();

  return { slides, isLoading };
};

// =============================================
// FRAMER MOTION VARIANTS — direction-aware crossfade + slide
// =============================================
const slideVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction >= 0 ? 40 : -40,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction >= 0 ? -40 : 40,
  }),
};

// =============================================
// MAIN COMPONENT
// =============================================
const HeroSection = () => {
  const { slides, isLoading } = useHeroSlides();
  const slideCount = slides.length;

  // [index, direction] kept together so Framer Motion knows which
  // way to animate (1 = forward/next, -1 = backward/prev)
  const [[index, direction], setSlideState] = useState([0, 0]);

  const isPausedRef = useRef(false);
  const touchStartXRef = useRef(null);
  const autoplayIntervalRef = useRef(null);

  const goTo = useCallback(
    (targetIndex, dir) => {
      if (slideCount === 0) return;
      const wrapped = (targetIndex + slideCount) % slideCount;
      setSlideState([wrapped, dir]);
    },
    [slideCount],
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  // Reset to the first slide whenever the underlying slide set changes
  // size (e.g. real data just finished loading in)
  useEffect(() => {
    setSlideState([0, 0]);
  }, [slideCount]);

  // ---- Autoplay — pauses on hover / keyboard focus / active touch ----
  useEffect(() => {
    if (slideCount <= 1) return undefined;

    autoplayIntervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setSlideState(([currentIndex]) => [(currentIndex + 1) % slideCount, 1]);
      }
    }, AUTOPLAY_MS);

    return () => clearInterval(autoplayIntervalRef.current);
  }, [slideCount]);

  // ---- Keyboard navigation ----
  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  // ---- Touch swipe navigation (mobile) ----
  const handleTouchStart = (e) => {
    isPausedRef.current = true;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current !== null) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0) next();
        else prev();
      }
    }
    touchStartXRef.current = null;
    isPausedRef.current = false;
  };

  // ---- Loading skeleton (only while there's truly nothing to show yet) ----
  if (isLoading && slideCount === 0) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 pt-6">
        <Container className="px-0">
          <div className="h-90 sm:h-110 lg:h-130 rounded-2xl bg-gray-100 animate-pulse" />
        </Container>
      </section>
    );
  }

  const activeSlide = slides[index];
  if (!activeSlide) return null;

  return (
    <section className="px-2  lg:px-5 pt-6 pb-2">
      <Container className="px-0">
        <div
          className="relative h-90 sm:h-110 lg:h-130 rounded-2xl overflow-hidden group outline-none select-none"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Promotional slider"
          onKeyDown={handleKeyDown}
          onMouseEnter={() => (isPausedRef.current = true)}
          onMouseLeave={() => (isPausedRef.current = false)}
          onFocus={() => (isPausedRef.current = true)}
          onBlur={() => (isPausedRef.current = false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={activeSlide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {/* Real product/category photo as the slide background */}
              <img
                src={activeSlide.image}
                alt={activeSlide.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="w-full h-full object-cover"
              />

              {/* Bottom-anchored dark gradient — keeps white text readable over any photo */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/10" />

              {/* Slide content */}
              <div className="absolute inset-0 flex flex-col justify-end sm:justify-center px-6 sm:px-12 lg:px-16 pb-12 sm:pb-0">
                <span
                  className={cn(
                    "inline-flex w-fit px-2.5 py-1 text-white text-xs font-bold rounded-md uppercase tracking-wide mb-3",
                    activeSlide.badgeColor,
                  )}
                >
                  {activeSlide.badge}
                </span>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-lg">
                  {activeSlide.title}
                </h1>

                <p className="text-sm sm:text-base text-white/80 mt-2 max-w-md">
                  {activeSlide.subtitle}
                </p>

                <Link
                  to={activeSlide.ctaTo}
                  className="inline-flex w-fit items-center gap-2 mt-5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                >
                  {activeSlide.ctaLabel}
                  <AiOutlineRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Prev / Next arrows + dot pagination — only when there's more than 1 slide */}
          {slideCount > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
              >
                <AiOutlineLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
              >
                <AiOutlineRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i, i > index ? 1 : -1)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === index
                        ? "w-6 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/70",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Container>
    </section>
  );
};

// Exporting this component so it can be imported and used in Home.jsx
// (same export name/path as before — nothing else needs to change)
export default HeroSection;
