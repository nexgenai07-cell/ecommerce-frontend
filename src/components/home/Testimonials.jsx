import { useState, useEffect, useRef, useCallback } from "react"; // Importing React hooks: useState for component state, useEffect for side-effects (autoplay + resize listener), useRef for values that don't need re-render, useCallback to memoize functions
import { AiFillStar, AiOutlineLeft, AiOutlineRight } from "react-icons/ai"; // Importing the filled star icon (for ratings) and left/right arrow icons (for carousel navigation buttons)
import { BsQuote } from "react-icons/bs"; // Importing the big decorative quotation-mark icon shown on each testimonial card
import Container from "../layouts/Container"; // Importing the shared layout wrapper that centers content and adds consistent horizontal padding
import cn from "../../utils/cn"; // Importing the Tailwind class-merging helper used to conditionally combine class names

// Static array holding all testimonial data — this never changes at runtime, so no API call is needed
const TESTIMONIALS = [
  {
    name: "Sarah Johnson", // Reviewer's display name
    role: "Fashion Enthusiast", // Reviewer's role/title shown under their name
    text: "The curation is so precise, it feels like they know me better than I know myself. Every recommendation has been spot on.", // The actual testimonial quote text
    rating: 5, // Number of filled stars to render for this reviewer
    initials: "SJ", // Two-letter initials shown inside the circular avatar (no real photo used)
    color: "bg-primary/10 text-primary", // Tailwind classes controlling the avatar circle's background + text color
  },
  {
    name: "Michael Chen",
    role: "Tech Professional",
    text: "Finally, an AI that actually understands my aesthetic. I've discovered so many unique pieces I never would have found on my own.",
    rating: 5,
    initials: "MC",
    color: "bg-blue-50 text-blue-600",
  },
  {
    name: "Priya Sharma",
    role: "Interior Designer",
    text: "The delivery was incredibly fast and the product quality exceeded my expectations. Will definitely be a regular customer.",
    rating: 5,
    initials: "PS",
    color: "bg-purple-50 text-purple-600",
  },
  {
    name: "Ahmed Raza",
    role: "Small Business Owner",
    text: "Ordering in bulk for my store has never been this smooth. Packaging is solid and nothing ever arrives damaged.",
    rating: 5,
    initials: "AR",
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "Emily Davis",
    role: "Frequent Shopper",
    text: "I love how the site remembers my style preferences. It genuinely feels like shopping with a friend who gets my taste.",
    rating: 4,
    initials: "ED",
    color: "bg-rose-50 text-rose-600",
  },
  {
    name: "Hassan Ali",
    role: "Graphic Designer",
    text: "Clean checkout, fast support, and the product photos actually match what arrives at my door. Rare to find all three together.",
    rating: 5,
    initials: "HA",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    name: "Fatima Noor",
    role: "College Student",
    text: "Budget-friendly without feeling cheap. I've recommended this to literally every one of my roommates at this point.",
    rating: 5,
    initials: "FN",
    color: "bg-pink-50 text-pink-600",
  },
  {
    name: "David Kim",
    role: "Photographer",
    text: "Returns were painless the one time I needed to exchange a size. That alone earned my trust for future orders.",
    rating: 4,
    initials: "DK",
    color: "bg-indigo-50 text-indigo-600",
  },
]; // End of the TESTIMONIALS array

// Constant controlling how long (in milliseconds) each slide stays visible before auto-advancing
const AUTOPLAY_MS = 4000;

// Base peek-offset percentage used on large screens; smaller screens get a reduced
// value at runtime (see the responsive logic below) so the side cards don't get
// pushed too far off-screen on narrow devices, keeping the carousel fully responsive.
const PEEK_OFFSET_PERCENT_DESKTOP = 62; // How far (in % of a card's own width) neighbor cards shift on desktop
const PEEK_OFFSET_PERCENT_TABLET = 50; // Slightly smaller shift for tablet-sized screens
const PEEK_OFFSET_PERCENT_MOBILE = 40; // Smallest shift for phones so neighbors stay closer/visible without overflowing

const Testimonials = () => {
  // activeIndex holds the index of the testimonial currently centered/active in the carousel
  const [activeIndex, setActiveIndex] = useState(0);

  // windowWidth tracks the current viewport width so we can compute a responsive peek-offset
  // (this makes the "how far the side cards peek in" behavior adapt live to screen size,
  // instead of using one fixed percentage for every device).
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280, // Fallback width of 1280 for server-side rendering safety
  );

  const total = TESTIMONIALS.length; // Total number of testimonials — used everywhere for wraparound math

  // isPausedRef is a ref (not state) because toggling it should NOT trigger a re-render —
  // it is only read inside the autoplay interval callback below
  const isPausedRef = useRef(false);

  // Ref holding the autoplay interval ID so it can be cleared on unmount or dependency change
  const autoplayIntervalRef = useRef(null);

  // Ref used to remember the X position where a touch/swipe gesture started (mobile support)
  const touchStartXRef = useRef(null);

  // ---- Responsive resize listener ----
  useEffect(() => {
    // Handler function that updates windowWidth state whenever the browser window is resized
    const handleResize = () => setWindowWidth(window.innerWidth);

    window.addEventListener("resize", handleResize); // Start listening for resize events as soon as the component mounts

    return () => window.removeEventListener("resize", handleResize); // Clean up the listener when the component unmounts, to avoid memory leaks
  }, []); // Empty dependency array — this effect only needs to run once, on mount

  // Derived value: pick the correct peek-offset percentage based on the current window width,
  // so the carousel's spacing between cards feels natural on phones, tablets, and desktops alike
  const peekOffsetPercent =
    windowWidth < 480
      ? PEEK_OFFSET_PERCENT_MOBILE // Very small phones get the smallest offset
      : windowWidth < 768
        ? PEEK_OFFSET_PERCENT_TABLET // Small/medium tablets get a medium offset
        : PEEK_OFFSET_PERCENT_DESKTOP; // Anything larger uses the full desktop offset

  // goTo() safely moves the carousel to any target index, wrapping around circularly
  // (e.g. going "previous" from index 0 lands on the last slide, and vice versa)
  const goTo = useCallback(
    (targetIndex) => {
      // The (% total + total) % total pattern is the standard JS trick for a
      // "positive modulo", since plain "%" can return negative results in JS
      setActiveIndex(((targetIndex % total) + total) % total);
    },
    [total], // Recreate this function only if "total" changes
  );

  // Convenience helper that moves the carousel forward by one slide
  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  // Convenience helper that moves the carousel backward by one slide
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  // ---- Autoplay effect — automatically advances the carousel, pauses on hover/touch/focus ----
  useEffect(() => {
    // No point auto-playing if there's only one (or zero) testimonials to show
    if (total <= 1) return undefined;

    // Start an interval that fires every AUTOPLAY_MS milliseconds
    autoplayIntervalRef.current = setInterval(() => {
      // Only advance automatically if the user isn't currently hovering/touching/focusing the carousel
      if (!isPausedRef.current) {
        setActiveIndex((current) => (current + 1) % total); // Move to the next slide, wrapping back to 0 at the end
      }
    }, AUTOPLAY_MS);

    // Cleanup function: stops the interval when the component unmounts or "total" changes
    return () => clearInterval(autoplayIntervalRef.current);
  }, [total]); // Re-run this effect only if the total number of testimonials changes

  // ---- Keyboard navigation handler (left/right arrow keys) when the carousel has focus ----
  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") next(); // Right arrow key moves to the next slide
    if (e.key === "ArrowLeft") prev(); // Left arrow key moves to the previous slide
  };

  // ---- Touch-swipe start handler for mobile devices ----
  const handleTouchStart = (e) => {
    isPausedRef.current = true; // Pause autoplay while the user's finger is on the carousel
    touchStartXRef.current = e.touches[0].clientX; // Record the starting X coordinate of the touch
  };

  // ---- Touch-swipe end handler for mobile devices ----
  const handleTouchEnd = (e) => {
    if (touchStartXRef.current !== null) {
      // Calculate how far (horizontally) the finger moved between touch-start and touch-end
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;

      // Only treat it as an intentional swipe if the finger moved more than 50px
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0)
          next(); // Finger moved left -> advance to the next slide
        else prev(); // Finger moved right -> go back to the previous slide
      }
    }
    touchStartXRef.current = null; // Reset the stored touch start position
    isPausedRef.current = false; // Resume autoplay once the touch gesture has ended
  };

  // getOffset() calculates how far a given testimonial index is from the currently
  // active one, taking the SHORTEST circular direction. For example, with 8 items,
  // going from index 0 to index 7 is treated as "-1" instead of "+7", because
  // stepping backward is the visually shorter path around the loop.
  const getOffset = (i) => {
    let diff = i - activeIndex; // Raw difference between this card's index and the active index
    if (diff > total / 2) diff -= total; // If the raw difference is more than half the loop, wrap it backward
    if (diff < -total / 2) diff += total; // If the raw difference is less than minus-half the loop, wrap it forward
    return diff; // Final signed offset: 0 = active card, negative = to the left, positive = to the right
  };

  return (
    // Outer <section> wrapper with vertical padding and a light gray background,
    // used to visually separate this section from the ones above/below it
    <section className="py-14 bg-gray-50">
      {/* NOTE: the "gradientBorderMove" keyframes + ".animate-gradient-border"
          class (the moving gradient border shown only on the ACTIVE card)
          used to be an inline <style> tag right here. It has been moved to
          src/index.css (see the "HOME PAGE COMPONENT STYLES" section) so the
          CSS lives in the project's single global stylesheet instead of
          inside JSX, and so it's declared once instead of being re-inserted
          into the DOM on every render of this carousel. The class name
          below is unchanged, so the animation still looks/behaves the same. */}

      <Container>
        {/* ============ SECTION HEADER ============ */}
        {/* Centered eyebrow-less header block: main heading + supporting subtitle text */}
        <div className="flex flex-col items-center text-center gap-3 mb-10">
          {/* Main section heading — font size scales up from mobile (text-2xl) to desktop (text-4xl) for responsiveness */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Our Stories
          </h2>
          {/* Supporting subtitle text under the heading, max-width capped so it never stretches too wide on large screens */}
          <p className="text-sm sm:text-base text-gray-500 max-w-md">
            Real experiences from real Zyron shoppers
          </p>
        </div>

        {/* ============ TESTIMONIAL PEEK-CAROUSEL ============ */}
        {/* Shows ONE centered/active card, with the previous and next cards peeking
            in partially from the left and right edges (clipped by overflow-hidden),
            sliding/moving smoothly between slides. */}
        <div className="flex flex-col items-center gap-8">
          {/* Relative wrapper so decorative glow blobs can sit BEHIND the carousel
              without affecting its layout or its overflow-hidden clipping.
              Horizontal padding keeps the whole carousel — including peeking side
              cards — away from the outer container's edges on every screen size. */}
          <div className="relative w-full px-4 sm:px-10 md:px-14">
            {/* Decorative soft glow shapes placed near the CENTER of the carousel,
                kept small and subtle so they support the active card rather than
                overpowering it. These are unrelated to the side-card corner glow
                that was removed below, so they are left untouched. */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-48 h-48 bg-primary-light/10 rounded-full blur-2xl pointer-events-none" />

            {/* NOTE: The extra bright green "side glow" blobs that used to sit at the
                far left/right edges (behind the peeking neighbor cards) have been
                REMOVED here, as requested — the left/right cards no longer show that
                green glowing effect around their corners. Only the plain gray-bordered
                neighbor cards remain, without any colored glow behind them. */}

            <div
              // Carousel viewport: fixed-per-breakpoint height with overflow hidden so
              // cards further than the immediate neighbors are visually clipped off
              className="relative w-full overflow-hidden h-80 xs:h-[300px] sm:h-67.5 md:h-62.5 outline-none select-none"
              tabIndex={0} // Makes the carousel focusable so keyboard arrow-key navigation works
              role="region" // Accessibility role identifying this as a distinct region of the page
              aria-roledescription="carousel" // Tells assistive technology this region behaves like a carousel
              aria-label="Customer testimonials" // Descriptive label read out by screen readers
              onKeyDown={handleKeyDown} // Wires up left/right arrow-key navigation
              onMouseEnter={() => (isPausedRef.current = true)} // Pause autoplay while the mouse hovers over the carousel
              onMouseLeave={() => (isPausedRef.current = false)} // Resume autoplay once the mouse leaves
              onFocus={() => (isPausedRef.current = true)} // Pause autoplay while the carousel has keyboard focus
              onBlur={() => (isPausedRef.current = false)} // Resume autoplay once focus leaves the carousel
              onTouchStart={handleTouchStart} // Wires up the touch-swipe start handler for mobile
              onTouchEnd={handleTouchEnd} // Wires up the touch-swipe end handler for mobile
            >
              {TESTIMONIALS.map((testimonial, i) => {
                // How far this specific card sits from the active/center card
                // (0 = active/center, -1 = one step left, 1 = one step right, etc.)
                const offset = getOffset(i);
                const absOffset = Math.abs(offset); // Distance from active, ignoring direction — used below for blur intensity

                // Only the active card and its immediate left/right neighbors should
                // be visibly readable — anything further away is faded to fully
                // transparent so it doesn't clutter the carousel visually
                const isActive = offset === 0;
                const isNeighbor = absOffset === 1;

                // Blur amount scales with distance from the active card: the active
                // card stays perfectly sharp (0px), the immediate neighbor gets a
                // light 3px blur, and anything further gets 6px (already invisible
                // anyway via opacity, but kept for consistency)
                const blurPx = isActive ? 0 : isNeighbor ? 3 : 6;

                return (
                  <div
                    key={testimonial.name} // Unique React key required for list items, using the reviewer's name
                    className={cn(
                      // Base positioning: absolutely placed and horizontally centered by default;
                      // the real left/right shift comes from the inline transform style below
                      "absolute top-0 left-1/2 w-[78%] xs:w-[72%] sm:w-[58%] md:w-115 lg:w-125 h-full transition-all duration-500 ease-out",
                      // Pointer cursor on every card so it's clear neighbor cards are clickable too
                      "cursor-pointer",
                    )}
                    style={{
                      // translateX combines two pieces: "-50%" re-centers the card on its
                      // own left edge (since left:50% only aligns the card's LEFT edge to
                      // the container's center), then "offset * peekOffsetPercent%" shifts
                      // it further left/right depending on how many steps it is from active.
                      // "peekOffsetPercent" is now computed responsively above, based on
                      // the current window width, instead of one fixed value for all screens.
                      transform: `translateX(calc(-50% + ${offset * peekOffsetPercent}%)) scale(${isActive ? 1 : 0.86})`,
                      // Neighbor cards are kept clearly visible (0.55 opacity); anything
                      // further away is fully invisible (0 opacity)
                      opacity: isActive ? 1 : isNeighbor ? 0.55 : 0,
                      // The active card renders above the overlapping neighbor cards
                      zIndex: isActive ? 20 : 10 - absOffset,
                      // Neighbors remain clickable (to jump to them); fully-hidden cards do not intercept clicks
                      pointerEvents: isActive || isNeighbor ? "auto" : "none",
                      // Applies the distance-based blur calculated above as a CSS filter,
                      // making non-active cards look like they're gently receding into the background
                      filter: `blur(${blurPx}px)`,
                    }}
                    // Clicking on a peeking side card jumps the carousel straight to it
                    onClick={() => {
                      if (!isActive) goTo(i); // Only jump if this card isn't already the active one
                    }}
                  >
                    {/* ============ GRADIENT-BORDER WRAPPER ============ */}
                    {/* This padded outer div creates the "glowing border" illusion: a 2px
                        gap filled with a gradient background shows through as a colored
                        border around the solid white card sitting inside it. Only the
                        ACTIVE card gets the vivid emerald gradient, glow shadow, and the
                        slow moving-gradient animation; the left/right neighbor cards now
                        get ONLY a plain, quiet gray border with NO colored glow at all —
                        this is the change that removes the green glow from their corners. */}
                    <div
                      className={cn(
                        "h-full rounded-2xl p-0.5 transition-all duration-500",
                        isActive
                          ? "bg-linear-to-br from-primary via-primary-light to-emerald-300 shadow-[0_0_55px_-10px_rgba(16,185,129,0.6)] animate-gradient-border" // Active card: green gradient border + glow shadow + animation
                          : "bg-linear-to-br from-gray-200 to-gray-100", // Neighbor cards: plain neutral gray border only, no green glow shadow at all
                      )}
                    >
                      {/* The actual visible card content, sitting inside the gradient/gray border */}
                      <div className="h-full bg-white rounded-[calc(1rem-2px)] p-4 sm:p-6 lg:p-7 flex flex-col shadow-lg gap-2 sm:gap-3">
                        {/* Top row of the card: decorative quote icon on the left, star rating on the right */}
                        <div className="flex items-start justify-between">
                          {/* Decorative quote icon — colored green with a soft glow only when this card is active,
                              plain gray with no glow when it's a neighbor card */}
                          <BsQuote
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 shrink-0", // Responsive icon sizing: slightly bigger on small+ screens
                              isActive
                                ? "text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]" // Active card: green icon with glow
                                : "text-gray-300", // Neighbor cards: plain light-gray icon, no glow
                            )}
                          />
                          {/* Star-rating row, rendered dynamically based on this testimonial's rating value */}
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: testimonial.rating }).map(
                              (_, starIndex) => (
                                <AiFillStar
                                  key={starIndex} // Index-based key is safe here since this inner list never reorders
                                  className={cn(
                                    "w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400", // Responsive star sizing + consistent yellow color
                                    isActive &&
                                      "drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]", // Extra glow on stars only for the active card
                                  )}
                                />
                              ),
                            )}
                          </div>
                        </div>

                        {/* Testimonial quote text — clamped to 3 lines on mobile and 4 lines on small+ screens
                            so long quotes never break the card's fixed height */}
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed italic line-clamp-3 sm:line-clamp-4">
                          "{testimonial.text}"
                        </p>

                        {/* Reviewer identity row: avatar circle with initials, plus name and role */}
                        <div className="flex items-center gap-3 pt-2 sm:pt-3 border-t border-gray-100">
                          {/* Circular avatar showing the reviewer's initials, colored per-testimonial via the "color" field */}
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${testimonial.color}`}
                          >
                            {testimonial.initials}
                          </div>

                          <div className="min-w-0">
                            {/* Reviewer's name — shown with a green gradient + glow ONLY when the
                                card is active, so the centered card visually stands out as the focal point */}
                            <p
                              className={cn(
                                "text-sm font-semibold truncate", // Truncates with ellipsis if the name is too long for the card width
                                isActive
                                  ? "bg-linear-to-r from-primary-dark via-primary to-primary-light bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]" // Active: gradient text + glow
                                  : "text-gray-800", // Neighbor: plain dark gray text, no glow
                              )}
                            >
                              {testimonial.name}
                            </p>
                            {/* Reviewer's role/title, shown in smaller muted gray text under their name */}
                            <p className="text-xs text-gray-400 truncate">
                              {testimonial.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ============ ARROWS + DOT PAGINATION ============ */}
          {/* Navigation controls only render if there's more than one testimonial to move between */}
          {total > 1 && (
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Previous-slide arrow button, styled with a subtle green ring/glow on hover to match the active-card theme */}
              <button
                type="button"
                onClick={prev} // Clicking this button moves the carousel one step backward
                aria-label="Previous testimonial" // Accessible label for screen readers
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-primary/30 bg-white hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] text-primary flex items-center justify-center transition-all duration-200 shrink-0"
              >
                <AiOutlineLeft className="w-4 h-4" />{" "}
                {/* Left-pointing chevron icon */}
              </button>

              {/* Dot indicators — one dot per testimonial; the active dot is wider, gradient-filled, and glowing */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center max-w-55 sm:max-w-none">
                {TESTIMONIALS.map((testimonial, i) => (
                  <button
                    key={testimonial.name} // Unique key per dot, based on the reviewer's name
                    type="button"
                    onClick={() => goTo(i)} // Clicking a dot jumps straight to that testimonial
                    aria-label={`Go to testimonial ${i + 1}`} // Accessible label describing which slide this dot jumps to
                    aria-current={i === activeIndex} // Marks the currently active dot for assistive technology
                    className={cn(
                      "h-2 rounded-full transition-all duration-300", // Shared base styling for every dot
                      i === activeIndex
                        ? "w-6 bg-linear-to-r from-primary-dark to-primary-light shadow-[0_0_10px_rgba(16,185,129,0.6)]" // Active dot: wider glowing green gradient pill
                        : "w-2 bg-gray-300 hover:bg-gray-400", // Inactive dots: small plain gray circles
                    )}
                  />
                ))}
              </div>

              {/* Next-slide arrow button, same hover glow treatment as the previous button */}
              <button
                type="button"
                onClick={next} // Clicking this button moves the carousel one step forward
                aria-label="Next testimonial" // Accessible label for screen readers
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-primary/30 bg-white hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] text-primary flex items-center justify-center transition-all duration-200 shrink-0"
              >
                <AiOutlineRight className="w-4 h-4" />{" "}
                {/* Right-pointing chevron icon */}
              </button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
};

export default Testimonials; // Exporting the component so it can be imported and used elsewhere in the app
