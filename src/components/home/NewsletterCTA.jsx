import { Link } from "react-router-dom"; // Client-side navigation link (no full page reload)
import { motion, useReducedMotion } from "framer-motion"; // Entrance animation of the tiles and detection of the reduced-motion setting
import { useQuery } from "@tanstack/react-query"; // Data fetching + caching for the categories list
import { AiOutlineArrowRight } from "react-icons/ai"; // Arrow icon inside the call-to-action button
import { HiOutlineSparkles } from "react-icons/hi2"; // Sparkle icon inside the small badge above the heading

import { ROUTES } from "../../constants/routes"; // Central list of app route paths
import { QUERY_KEYS } from "../../constants/queryKeys"; // Central list of react-query cache keys
import { getCategories } from "../../api/categories.api"; // API call to fetch all product categories
import extractListData from "../../utils/extractListData"; // Normalizes the categories response into a plain array
import cn from "../../utils/cn"; // Helper for conditionally joining Tailwind class names
import Container from "../layouts/Container"; // Wrapper that centers content and applies consistent side padding

// =============================================
// TILE LAYOUT SETTINGS
// =============================================
// The tiles form a honeycomb-style cluster of three rows. The middle
// row holds three tiles and the rows above and below it hold two each,
// so the two-tile rows sit centered between the tiles of the middle row.
const ROW_SIZES = [2, 3, 2]; // Number of tiles in each row, from top to bottom
const MAX_TILES = ROW_SIZES.reduce((total, size) => total + size, 0); // Total tiles that fit the cluster (7)

// Placeholder items rendered while the categories are still loading, so
// the cluster keeps exactly the same shape once the real tiles arrive
const SKELETON_TILES = Array.from({ length: MAX_TILES }, (_, index) => ({
  id: `skeleton-${index}`,
}));

// Animation delay classes (defined in index.css) that stagger the floating
// motion so the tiles drift out of sync instead of moving as one block
const FLOAT_DELAY_CLASSES = [
  "",
  "cta-tile-delay-1",
  "cta-tile-delay-2",
  "cta-tile-delay-3",
];

// =============================================
// TILE ENTRANCE ANIMATION
// =============================================
// Every tile starts from its own position outside the cluster, tilted and
// small, and flies into its place when the section scrolls into view.
// x / y are the starting offsets in pixels, rotate is the starting tilt in
// degrees and delay is the wait in seconds before that tile starts moving.
const TILE_START_POSITIONS = [
  { x: -150, y: -100, rotate: -30, delay: 0 }, // Top row, left tile: arrives from the top left
  { x: 150, y: -120, rotate: 28, delay: 0.1 }, // Top row, right tile: arrives from the top right
  { x: -200, y: 10, rotate: -22, delay: 0.2 }, // Middle row, left tile: arrives from the far left
  { x: 0, y: -160, rotate: -45, delay: 0.45 }, // Middle row, center tile: drops in from above and lands last
  { x: 200, y: -10, rotate: 22, delay: 0.3 }, // Middle row, right tile: arrives from the far right
  { x: -140, y: 130, rotate: 26, delay: 0.35 }, // Bottom row, left tile: arrives from the bottom left
  { x: 160, y: 120, rotate: -26, delay: 0.25 }, // Bottom row, right tile: arrives from the bottom right
];

// Animation states of a single tile. The tile index is passed through the
// "custom" prop so each tile reads its own starting position and delay.
const tileVariants = {
  hidden: (index) => {
    const start = TILE_START_POSITIONS[index % TILE_START_POSITIONS.length];
    return {
      opacity: 0,
      x: start.x,
      y: start.y,
      rotate: start.rotate,
      scale: 0.3,
    };
  },
  visible: (index) => ({
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: {
      type: "spring", // Soft settle into the final position
      stiffness: 90,
      damping: 13,
      mass: 0.9,
      delay: TILE_START_POSITIONS[index % TILE_START_POSITIONS.length].delay,
    },
  }),
};

// =============================================
// CONTENT ENTRANCE ANIMATION
// =============================================
// The badge, heading, description and button each fly in from their own
// direction, one after another, when the section scrolls into view.
// x / y are the starting offsets in pixels and rotate is the starting tilt in degrees.
const CONTENT_START_POSITIONS = {
  badge: { x: -70, y: -40, rotate: -8 }, // Arrives from the top left
  heading: { x: 120, y: -30, rotate: 4 }, // Arrives from the right, slightly above
  text: { x: 140, y: 20, rotate: -3 }, // Arrives from the far right
  button: { x: 0, y: 70, rotate: 0 }, // Rises up from below
};

// Parent state — does not move by itself, it only staggers its children
const contentContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14, // Gap between each element's start time
      delayChildren: 0.1, // Wait before the first element starts
    },
  },
};

// Animation states of a single content element. The starting position is
// passed through the "custom" prop.
const contentItemVariants = {
  hidden: (start) => ({
    opacity: 0,
    x: start.x,
    y: start.y,
    rotate: start.rotate,
    scale: 0.85,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: {
      type: "spring", // Soft settle into the final position
      stiffness: 90,
      damping: 14,
      mass: 0.9,
    },
  },
};

// Splits a flat list of items into the rows of the cluster. Each row keeps
// the index of its first item so every tile can get a stable animation delay.
const splitIntoRows = (items) => {
  const rows = []; // Collected rows, from top to bottom
  let start = 0; // Index of the first item in the row being built

  ROW_SIZES.forEach((size) => {
    const rowItems = items.slice(start, start + size); // Items that belong to this row
    if (rowItems.length > 0) {
      rows.push({ items: rowItems, offset: start }); // Skip rows that received no items
    }
    start += size;
  });

  return rows;
};

// Returns the grid column class that centers a tile inside its row. Every
// row is a six-column grid and each tile spans two columns, so a row with
// two tiles starts at column 2 and a row with a single tile at column 3.
const getPlacementClass = (rowLength, position) => {
  if (position !== 0) return ""; // Only the first tile of a row needs an explicit start column
  if (rowLength === 2) return "col-start-2";
  if (rowLength === 1) return "col-start-3";
  return "";
};

// =============================================
// SINGLE CATEGORY TILE
// A glowing, glass-like tile that shows the category name and links to
// the products page with that category already selected.
// =============================================
const CategoryTile = ({ category, isCenter }) => (
  <Link
    to={`${ROUTES.PRODUCTS}?category_id=${category.id}`} // The products page reads category_id and pre-selects that category
    title={category.name} // Full name on hover, in case the visible label is clamped
    className={cn(
      // Shared shape, glass effect and hover lift
      "group relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border p-1 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      isCenter
        ? // Center tile — larger, brighter and with a stronger emerald glow
          "scale-105 border-primary/50 bg-linear-to-br from-primary-light/50 via-primary/30 to-primary-dark/40 text-gray-900 shadow-[0_0_28px_-4px_rgba(16,185,129,0.7),inset_0_1px_0_rgba(255,255,255,0.7)] hover:border-primary hover:shadow-[0_0_38px_-2px_rgba(16,185,129,0.9),inset_0_1px_0_rgba(255,255,255,0.8)]"
        : // Regular tile — soft translucent emerald gradient with a gentle glow
          "border-primary/30 bg-linear-to-br from-primary-light/30 via-white/50 to-primary/25 text-gray-800 shadow-[0_6px_16px_-6px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.7)] hover:border-primary/60 hover:shadow-[0_10px_24px_-6px_rgba(16,185,129,0.75),inset_0_1px_0_rgba(255,255,255,0.8)]",
    )}
  >
    {/* Glossy highlight across the top half of the tile */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/50 to-transparent"
    />

    {/* Emerald light that rises from the bottom edge when the tile is hovered */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(52,211,153,0.55),transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    />

    {/* Category name — small text that is clamped to two lines */}
    <span className="relative line-clamp-2 break-words text-[9px] font-semibold leading-tight sm:text-[10px]">
      {category.name}
    </span>
  </Link>
);

const NewsletterCTA = () => {
  // =============================================
  // CATEGORIES API CALL
  // Uses the same query key and request as the Curated Collections section,
  // so both sections share one cached response and only one request is made.
  // =============================================
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // Cache key for this request
    queryFn: ({ signal }) => getCategories(undefined, signal), // Function that performs the API call
    staleTime: 1000 * 60 * 10, // Data considered fresh for 10 minutes
  });

  // Users who prefer reduced motion see the tiles in place right away
  const prefersReducedMotion = useReducedMotion();

  // The entrance animation is skipped for loading placeholders and for reduced motion
  const skipEntrance = isLoading || prefersReducedMotion;

  // Real categories, capped to the number of tiles the cluster can hold
  const categories = extractListData(categoriesData).slice(0, MAX_TILES);

  // The tile side is shown while loading and whenever at least one category exists.
  // If the request fails or returns nothing, only the content side is rendered.
  const hasTiles = isLoading || categories.length > 0;

  // Items to draw: loading placeholders first, then the real categories
  const rows = splitIntoRows(isLoading ? SKELETON_TILES : categories);

  return (
    <section className="py-4 sm:py-6">
      {/* Narrow container so the card stays compact on wide screens */}
      <Container className="max-w-6xl">
        {/* Floating rounded card — a translucent emerald gradient with a soft glow around it.
            Margins on the left and right come from Container's own padding, so the card
            never touches the screen edges */}
        <div className="cta-gradient-border relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/15 via-primary/5 to-primary-light/15 px-4 py-6 shadow-[0_12px_40px_-16px_rgba(16,185,129,0.45)] backdrop-blur-xl sm:px-8 sm:py-8 lg:px-10">
          {/* Decorative soft glow shapes behind the content */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -bottom-16 h-44 w-44 rounded-full bg-primary-light/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
          />

          {/* Category tiles and content sit side by side as one centered group, so
              there is no empty space between them. On screens below lg they stack,
              with the content on top */}
          <div className="relative flex flex-col items-center gap-5 lg:flex-row lg:justify-center lg:gap-8">
            {/* ============ TILES SIDE ============ */}
            {hasTiles && (
              // Cluster wrapper — starts the tile entrance the first time it is scrolled into view.
              // The key restarts it when the real tiles replace the loading placeholders.
              <motion.div
                key={isLoading ? "loading" : "ready"}
                initial={skipEntrance ? "visible" : "hidden"}
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="order-2 mx-auto flex w-full max-w-48 shrink-0 flex-col gap-1.5 sm:max-w-52 lg:order-1 lg:mx-0"
              >
                {rows.map((row, rowIndex) => (
                  // One row of tiles — a six-column grid so rows with fewer tiles stay centered
                  <div key={rowIndex} className="grid grid-cols-6 gap-1.5">
                    {row.items.map((item, position) => {
                      // A row that holds three tiles has a middle tile, which is highlighted
                      const isCenter = row.items.length === 3 && position === 1;

                      return (
                        // Outer wrapper — keeps every tile square and plays the fly-in entrance
                        <motion.div
                          key={item.id}
                          variants={tileVariants}
                          custom={row.offset + position}
                          className={cn(
                            "relative isolate col-span-2 aspect-square",
                            getPlacementClass(row.items.length, position),
                            isCenter && "z-10", // Keeps the enlarged center tile above its neighbours
                          )}
                        >
                          {/* Inner wrapper — hosts the continuous floating motion, kept separate so
                              it never conflicts with the entrance transform of the outer wrapper */}
                          <div
                            className={cn(
                              "relative isolate h-full w-full",
                              !isLoading && "cta-tile-float", // Floating motion only for real tiles
                              !isLoading &&
                                FLOAT_DELAY_CLASSES[
                                  (row.offset + position) %
                                    FLOAT_DELAY_CLASSES.length
                                ],
                            )}
                          >
                            {isLoading ? (
                              // Loading placeholder with the same shape as a real tile
                              <div className="h-full w-full animate-pulse rounded-xl border border-primary/20 bg-primary/10" />
                            ) : (
                              <>
                                {/* Pulsing emerald halo behind the center tile */}
                                {isCenter && (
                                  <span
                                    aria-hidden="true"
                                    className="cta-glow-pulse pointer-events-none absolute -inset-2 -z-10 rounded-2xl bg-primary/40 blur-xl"
                                  />
                                )}
                                <CategoryTile
                                  category={item}
                                  isCenter={isCenter}
                                />
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            )}

            {/* ============ CONTENT SIDE ============ */}
            {/* Starts the content entrance the first time it is scrolled into view */}
            <motion.div
              initial={prefersReducedMotion ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={contentContainerVariants}
              className={cn(
                "order-1 mx-auto flex min-w-0 max-w-xl flex-col items-center gap-4 text-center",
                hasTiles && "lg:order-2 lg:mx-0 lg:items-start lg:text-left",
              )}
            >
              {/* Small badge above the heading */}
              <motion.span
                variants={contentItemVariants}
                custom={CONTENT_START_POSITIONS.badge}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-linear-to-r from-white/80 via-primary-50 to-white/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-dark shadow-[0_0_22px_-4px_rgba(16,185,129,0.65)] backdrop-blur-md"
              >
                <HiOutlineSparkles className="h-4 w-4 text-primary" />
                Join The Movement
              </motion.span>

              <div className="flex flex-col gap-2.5">
                <motion.h2
                  variants={contentItemVariants}
                  custom={CONTENT_START_POSITIONS.heading}
                  className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl"
                >
                  Join the {/* Gradient-filled brand name */}
                  <span className="animate-gradient-border bg-linear-to-r from-primary-dark via-primary-light to-primary-dark bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(16,185,129,0.35)]">
                    Zyron Community
                  </span>
                </motion.h2>
                <motion.p
                  variants={contentItemVariants}
                  custom={CONTENT_START_POSITIONS.text}
                  className="text-base leading-relaxed text-gray-600 sm:text-lg"
                >
                  <span className="font-semibold text-gray-800">
                    Curated drops, exclusive deals, and style inspiration
                  </span>{" "}
                  — delivered straight to your feed. Be part of something
                  different.
                </motion.p>
              </div>

              {/* Real, working CTA — opens the products page. The wrapper plays the
                  entrance so the button's own hover scale is never affected */}
              <motion.div
                variants={contentItemVariants}
                custom={CONTENT_START_POSITIONS.button}
                className="relative isolate"
              >
                {/* Pulsing emerald glow behind the button */}
                <span
                  aria-hidden="true"
                  className="cta-glow-pulse pointer-events-none absolute -inset-1 -z-10 rounded-full bg-primary/40 blur-lg"
                />
                <Link
                  to={ROUTES.PRODUCTS}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-primary-dark via-primary to-primary-dark px-9 py-3.5 text-base font-bold text-white shadow-[0_10px_28px_-8px_rgba(16,185,129,0.8)] ring-1 ring-white/30 transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_14px_36px_-6px_rgba(16,185,129,1)] active:scale-[0.98]"
                >
                  {/* Light sweep that glides across the button when it is hovered */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-full w-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-[200%]"
                  />
                  <span className="relative">Start Shopping</span>
                  <AiOutlineArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default NewsletterCTA;
