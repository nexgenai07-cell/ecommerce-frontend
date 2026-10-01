import { useEffect, useRef, useState } from "react"; // Refs for gestures and scroll detection, state for the focused slice and the entrance
import { Link } from "react-router-dom"; // Client-side navigation link (no full page reload)
import { useQuery } from "@tanstack/react-query"; // Data fetching + caching for the categories list
import { AiOutlineArrowRight } from "react-icons/ai"; // Arrow icon used on the call-to-action of the focused slice

import { ROUTES } from "../../constants/routes"; // Central list of app route paths
import { QUERY_KEYS } from "../../constants/queryKeys"; // Central list of react-query cache keys
import { getCategories } from "../../api/categories.api"; // API call to fetch all product categories
import extractListData from "../../utils/extractListData"; // Normalizes the categories response whether it is a flat array or a paginated object
import Container from "../layouts/Container"; // Wrapper that centers content and applies consistent side padding
import SectionHeading from "../shared/SectionHeading"; // Animated heading block shared by the home sections
import cn from "../../utils/cn"; // Merges conditional Tailwind class names

// =============================================
// CAROUSEL SETTINGS
// =============================================
const MAX_SLICES = 6; // Largest number of categories shown as slices
const LOADING_SLICES = 5; // Number of placeholder slices drawn while data loads
const SWIPE_THRESHOLD_PX = 50; // Minimum horizontal finger or mouse travel that counts as a swipe
const SWIPE_DIRECTION_RATIO = 1.5; // Horizontal travel must exceed vertical travel by this factor, so page scrolling is never mistaken for a swipe
const WHEEL_THRESHOLD = 20; // Minimum horizontal wheel or trackpad movement that changes the focused slice
const NAVIGATION_LOCK_MS = 600; // Pause after each wheel step, so one long trackpad gesture moves a single slice
const ENTRANCE_VISIBLE_RATIO = 0.25; // Share of the carousel that must be on screen before the slices fly in
const ENTRANCE_VARIANTS = 6; // Number of different fly-in directions defined in src/index.css

// Used whenever a category has no image or its image fails to load,
// so the slice still looks intentional instead of showing an empty box.
const FALLBACK_GRADIENTS = [
  "bg-linear-to-br from-gray-700 to-gray-900",
  "bg-linear-to-br from-primary-dark to-gray-900",
  "bg-linear-to-br from-gray-600 to-gray-950",
  "bg-linear-to-br from-gray-800 to-primary-dark",
];

// Overall size and direction of the carousel, shared by the loading state and the real carousel.
// Slices stack vertically on phones and sit side by side from tablets upward.
const CAROUSEL_LAYOUT_CLASSES =
  "flex h-88 flex-col gap-2 sm:gap-3 md:h-72 md:flex-row lg:h-80";

// Shared sizing and motion classes of every slice, real or placeholder.
// The width (or height on phones) of a slice comes from its flex-grow value,
// which animates smoothly when the focused slice changes.
const SLICE_BASE_CLASSES =
  "relative block min-h-0 min-w-0 basis-0 overflow-hidden rounded-2xl sm:rounded-3xl transition-[flex-grow] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

// =============================================
// SINGLE SLICE
// Focused slice: shows the full photo with title, description and a call-to-action.
// Other slices: stay narrow, dimmed, and show only the category name.
// Clicking a narrow slice focuses it; clicking the focused slice opens its products.
// =============================================
const CarouselSlice = ({
  category,
  index,
  total,
  isActive,
  isRevealed,
  onSelect,
  swipeHandledRef,
}) => {
  const [imageFailed, setImageFailed] = useState(false); // True when the category image could not be loaded

  const showImage = Boolean(category.image_url) && !imageFailed; // Only draw the photo when it exists and loads

  const handleClick = (event) => {
    // A swipe that ends on top of a slice must not also count as a click
    if (swipeHandledRef.current) {
      event.preventDefault();
      swipeHandledRef.current = false;
      return;
    }

    // First click on a narrow slice only moves the focus to it
    if (!isActive) {
      event.preventDefault();
      onSelect(index);
    }
  };

  return (
    <Link
      to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
      onClick={handleClick}
      draggable={false}
      aria-label={
        isActive ? `Browse ${category.name}` : `Show ${category.name}`
      }
      aria-current={isActive ? "true" : undefined}
      className={cn(
        SLICE_BASE_CLASSES,
        isActive ? "grow-[6]" : "grow",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        !showImage && FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
        // Hidden until the carousel is on screen, then flies in from this slice's own direction
        isRevealed
          ? `collection-slice-enter collection-slice-enter-${index % ENTRANCE_VARIANTS}`
          : "collection-slice-hidden",
      )}
    >
      {/* The category's own photo fills the whole slice and settles in as the slice gains focus */}
      {showImage && (
        <img
          src={category.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setImageFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none",
            isActive ? "scale-100" : "scale-110",
          )}
        />
      )}

      {/* Dimming layer that pushes narrow slices back so the focused one stands out */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-black transition-opacity duration-700 motion-reduce:transition-none",
          isActive ? "opacity-0" : "opacity-35",
        )}
      />

      {/* Bottom-anchored shade that keeps the text readable over any photo */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />

      {/* Category name of a narrow slice: vertical on tablets and desktops, horizontal on phones */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center px-4 transition-opacity duration-500 motion-reduce:transition-none md:items-end md:justify-center md:px-0 md:pb-6",
          isActive ? "opacity-0" : "opacity-100 delay-300",
        )}
      >
        <span className="whitespace-nowrap text-sm font-semibold text-white md:rotate-180 md:[writing-mode:vertical-rl]">
          {category.name}
        </span>
      </div>

      {/* Details of the focused slice */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex min-w-64 flex-col items-start gap-1.5 p-4 transition-all duration-500 motion-reduce:transition-none sm:gap-2 sm:p-6 lg:p-7",
          isActive
            ? "translate-y-0 opacity-100 delay-300"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {/* Position indicator, for example "02 / 06" */}
        <span className="hidden rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wider text-white backdrop-blur-sm sm:inline-flex">
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </span>

        {/* Category name — scales from mobile to desktop */}
        <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
          {category.name}
        </h3>

        {/* Category description — only drawn when the category has one */}
        {category.description && (
          <p className="line-clamp-1 max-w-md text-sm text-white/75 sm:line-clamp-2 sm:text-base">
            {category.description}
          </p>
        )}

        {/* Call-to-action pill; the whole slice is the real link */}
        <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-colors duration-200 group-hover:bg-primary group-hover:text-white sm:text-sm">
          Explore collection
          <AiOutlineArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
};

// =============================================
// LOADING SLICE
// Same footprint as a real slice, so the carousel keeps its exact size while data loads.
// =============================================
const LoadingSlice = ({ isActive }) => (
  <div
    className={cn(
      SLICE_BASE_CLASSES,
      isActive ? "grow-[6]" : "grow",
      "animate-pulse bg-gray-100",
    )}
  />
);

// =============================================
// SLICE CAROUSEL
// Holds the focused slice and every way of changing it:
// click, horizontal swipe, horizontal wheel or trackpad, and the left and right arrow keys.
// =============================================
const SliceCarousel = ({ categories }) => {
  const [activeIndex, setActiveIndex] = useState(0); // Index of the focused slice
  const carouselRef = useRef(null); // The carousel element watched for entering the screen
  // Browsers without IntersectionObserver skip the wait and show the slices at once
  const [isRevealed, setIsRevealed] = useState(
    () => typeof IntersectionObserver === "undefined",
  ); // True once the carousel has scrolled into view and the entrance has started
  const swipeStartRef = useRef(null); // Pointer position where the current gesture began
  const swipeHandledRef = useRef(false); // True after a swipe, so the click that follows it is ignored
  const lastWheelStepRef = useRef(0); // Time of the last wheel step, used to rate-limit wheel navigation

  // Starts the entrance the first time enough of the carousel is visible
  useEffect(() => {
    const node = carouselRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect(); // The entrance plays only once
        }
      },
      { threshold: ENTRANCE_VISIBLE_RATIO },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const lastIndex = categories.length - 1; // Index of the final slice
  const safeActiveIndex = Math.min(activeIndex, lastIndex); // Keeps the focus valid if the category list shrinks

  // Moves the focus one slice forward (+1) or backward (-1) and stops at both ends
  const step = (direction) => {
    setActiveIndex((current) =>
      Math.min(
        Math.max(Math.min(current, lastIndex) + direction, 0),
        lastIndex,
      ),
    );
  };

  const handlePointerDown = (event) => {
    swipeHandledRef.current = false; // A new gesture starts with a clean state
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    // Only a clearly horizontal movement counts as a swipe
    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_DIRECTION_RATIO
    ) {
      swipeHandledRef.current = true;
      step(deltaX < 0 ? 1 : -1); // Swiping left reveals the next slice
    }
  };

  const handlePointerCancel = () => {
    swipeStartRef.current = null; // The browser took over the gesture, for example to scroll the page
  };

  const handleWheel = (event) => {
    // Vertical wheel movement is left alone so the page always scrolls normally
    if (
      Math.abs(event.deltaX) <= Math.abs(event.deltaY) ||
      Math.abs(event.deltaX) < WHEEL_THRESHOLD
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastWheelStepRef.current < NAVIGATION_LOCK_MS) return;

    lastWheelStepRef.current = now;
    step(event.deltaX > 0 ? 1 : -1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };

  return (
    <div
      ref={carouselRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Curated collections"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      className={cn(CAROUSEL_LAYOUT_CLASSES, "touch-pan-y select-none")}
    >
      {categories.map((category, index) => (
        <CarouselSlice
          key={category.id}
          category={category}
          index={index}
          total={categories.length}
          isActive={index === safeActiveIndex}
          isRevealed={isRevealed}
          onSelect={setActiveIndex}
          swipeHandledRef={swipeHandledRef}
        />
      ))}
    </div>
  );
};

const CollectionsGrid = () => {
  // =============================================
  // CATEGORIES API CALL
  // Each category already carries its own image_url, so no extra
  // per-category lookups are needed to get a photo.
  // =============================================
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // Cache key for this request, shared with other home sections
    queryFn: ({ signal }) => getCategories(undefined, signal), // Function that performs the API call
    staleTime: 1000 * 60 * 10, // Data considered fresh for 10 minutes
  });

  // Normalized list, capped to the number of slices the carousel can show
  const categories = extractListData(categoriesData).slice(0, MAX_SLICES);

  return (
    // Outer section — vertical padding around the whole block.
    // overflow-x-clip stops slices that start beyond the screen edge from widening the page during the entrance.
    <section className="overflow-x-clip py-6 sm:py-8">
      <Container>
        {/* Vertical stack: header block, then the carousel */}
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* ============ SECTION HEADER ============ */}
          <SectionHeading
            title="Curated"
            highlight="Collections"
            subtitle="Hand-picked edits across every category, refreshed regularly"
          />

          {isLoading ? (
            // ---- LOADING STATE ----
            <div className={CAROUSEL_LAYOUT_CLASSES}>
              {Array.from({ length: LOADING_SLICES }, (_, index) => (
                <LoadingSlice key={index} isActive={index === 0} />
              ))}
            </div>
          ) : categories.length > 0 ? (
            // ---- DATA LOADED STATE ----
            <SliceCarousel categories={categories} />
          ) : (
            // ---- EMPTY STATE: no categories returned ----
            <div className="py-6 text-center text-sm text-gray-400">
              Collections coming soon
            </div>
          )}
        </div>
      </Container>
    </section>
  );
};

export default CollectionsGrid;
