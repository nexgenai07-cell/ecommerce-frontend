import { useState, useEffect, useRef } from "react";

// Client-side navigation link — used for the "Shop All Deals" CTA and
// for making each product tile itself a clickable link
import { Link } from "react-router-dom";

// Data-fetching hook from React Query — gives us caching, loading state,
// and error state for free instead of managing them by hand
import { useQuery } from "@tanstack/react-query";

// Animation library — powers the gentle scroll-reveal on the left column
// and the staggered reveal of the product tiles on the right
import { motion } from "framer-motion";

// Fire icon used on the urgency badge and discount tag, arrow icon used
// on the CTA button
import { AiFillFire, AiOutlineArrowRight } from "react-icons/ai";

// Centralized route constants — always reference routes from here instead
// of hardcoding raw URL strings across the app
import { ROUTES } from "../../constants/routes";

// Centralized React Query cache-key constants, so cache keys stay
// consistent everywhere they're used
import { QUERY_KEYS } from "../../constants/queryKeys";

// API call that fetches the product list, including real discount pricing
import { searchProducts } from "../../api/products.api";

// Shared max-width/centering wrapper used across the whole site's sections
import Container from "../layouts/Container";

// Shared price component — renders sale price, strikethrough original
// price, and an optional discount badge
import PriceDisplay from "../shared/PriceDisplay";

// Tailwind class-merging helper, used to combine conditional classes safely
import cn from "../../utils/cn";

// Formats a raw number into a "Rs. X,XXX" style string for the "You save" line
import formatPrice from "../../utils/formatPrice";

// Local fallback image shown whenever a product has no image, or its
// real image URL fails to load
const FALLBACK_IMAGE = "/placeholder-product.png";

// =============================================
// COUNTDOWN TIMER HOOK
// Takes the total countdown length directly in SECONDS (not hours), so
// it's trivial to swap between a short test duration and the real deal
// length. Also tracks "percent" — how much of the total duration is still
// left — so the sand timer's sand levels stay perfectly in sync with the
// digits. Both come from the exact same diff calculation on the exact
// same tick, so they can never drift apart or disagree.
// =============================================
const useCountdown = (totalSeconds) => {
  // Total countdown length in milliseconds — calculated once and never
  // recalculated, so "percent" always measures against the same baseline
  const totalMsRef = useRef(totalSeconds * 1000);

  // The fixed future timestamp the countdown counts down to — calculated
  // once on mount (via the lazy useState initializer) so it doesn't reset
  // itself on every re-render
  const [target] = useState(() => new Date(Date.now() + totalMsRef.current));

  // The live displayed values: hours/minutes/seconds for the digits,
  // percent for the sand levels, and isExpired to know when to stop
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    percent: 100, // 100 = full time remaining, 0 = fully expired
    isExpired: false,
  });

  useEffect(() => {
    // Recomputes everything from scratch on every tick, using the same
    // "diff" value for both the digits and the percent
    const calculate = () => {
      const diff = target - new Date(); // Milliseconds remaining until target

      if (diff <= 0) {
        // Time's up — lock the digits at zero AND the sand at fully-drained,
        // in the same state update, so nothing can ever show "00:00:00"
        // while the sand timer still has grains left in the top bulb
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          percent: 0,
          isExpired: true,
        });
        return;
      }

      // What fraction of the original countdown is still left, as a 0-100
      // percentage — this single number drives both bulbs of the sand timer
      const percent = Math.max(
        0,
        Math.min(100, (diff / totalMsRef.current) * 100),
      );

      // Convert the remaining milliseconds into whole hours/minutes/seconds
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        percent,
        isExpired: false,
      });
    };

    calculate(); // Run once immediately so there's no 1-second delay on mount
    const interval = setInterval(calculate, 1000); // Then tick every second
    return () => clearInterval(interval); // Cleanup on unmount
  }, [target]);

  return timeLeft;
};

// =============================================
// SAND TIMER (HOURGLASS) — real SVG glass shape
// Compact size, kept from the previous pass. Two curved "shield" bulbs
// (rounded shoulders tapering to a flat neck), connected by a short glass
// tube, sitting inside a gold frame — a proper hourglass silhouette.
// =============================================
const SandTimer = ({ percent, isExpired }) => {
  // ---- Shared geometry constants (SVG user units, viewBox is 0 0 100 170) ----
  const TOP_BULB_TOP = 12; // Inner top edge of the top bulb, just below the top cap
  const TOP_BULB_NECK = 74; // Where the top bulb tapers down to the neck
  const BOTTOM_BULB_NECK = 96; // Where the bottom bulb starts tapering up from the neck
  const BOTTOM_BULB_BOTTOM = 158; // Inner bottom edge of the bottom bulb, just above the bottom cap

  const topBulbSpan = TOP_BULB_NECK - TOP_BULB_TOP; // Full height available for sand in the top bulb
  const bottomBulbSpan = BOTTOM_BULB_BOTTOM - BOTTOM_BULB_NECK; // Full height available for sand in the bottom bulb

  const topSandHeight = (percent / 100) * topBulbSpan; // Shrinks toward 0 as time drains away
  const bottomSandHeight = ((100 - percent) / 100) * bottomBulbSpan; // Grows toward full as time passes

  const isUrgent = !isExpired && percent > 0 && percent <= 15; // Last 15% of the countdown — triggers the red urgency glow

  // The exact same curved path is reused for the visible glass outline AND
  // as the clip boundary for the sand, so the sand can never spill outside
  // the glass no matter what height value it's given
  const topBulbPath =
    "M22,12 H78 C78,34 74,56 54,74 L46,74 C26,56 22,34 22,12 Z";
  const bottomBulbPath =
    "M22,158 H78 C78,136 74,114 54,96 L46,96 C26,114 22,136 22,158 Z";

  return (
    <div
      className={cn(
        "relative w-9 sm:w-11 md:w-13 aspect-100/170 shrink-0", // Compact hourglass size
        "transition-all duration-700 ease-in-out hover:rotate-360", // On hover, spins one full 360° turn (like flipping the hourglass) and settles back at its normal upright position
        isUrgent && "drop-shadow-[0_0_16px_rgba(239,68,68,0.55)]", // Soft red glow around the whole glass once time is nearly up
      )}
    >
      {/* Falling sand stream overlay — a tiny animated line placed exactly
          over the neck region of the SVG below, using percentages so it
          always lines up regardless of the rendered size. Only shown while
          the countdown is still running, so it stops the instant it expires */}
      {!isExpired && (
        <>
          {/* NOTE: the "sandStreamFall" keyframes, plus this element's
              top/height positioning, used to be an inline <style> tag +
              inline style={{}} right here — both have been moved to
              src/index.css (see the "HOME PAGE COMPONENT STYLES" section)
              and merged into the single ".sand-stream-drop" class below,
              so the CSS lives in the project's global stylesheet and isn't
              re-declared into the DOM every second when the countdown ticks. */}
          {/* The actual falling grain element, centered over the neck */}
          <span className="sand-stream-drop absolute left-1/2 -translate-x-1/2 w-px bg-linear-to-b from-amber-200 via-amber-400 to-transparent" />
        </>
      )}

      <svg
        viewBox="0 0 100 170" // Fixed internal coordinate space for all the shapes below
        className="w-full h-full" // Scales to whatever size the parent div gives it
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Warm gold gradient shared by the top cap, bottom cap, and side posts */}
          <linearGradient id="frameGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
          {/* Sand gradient — lighter grains on top catching the light, darker toward the bottom for depth */}
          <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          {/* Clip paths — restrict the sand rectangles to exactly the curved bulb shapes above */}
          <clipPath id="topBulbClip">
            <path d={topBulbPath} />
          </clipPath>
          <clipPath id="bottomBulbClip">
            <path d={bottomBulbPath} />
          </clipPath>
        </defs>

        {/* ---- FRAME: top cap, bottom cap, side posts ---- */}
        <rect
          x="18"
          y="3"
          width="64"
          height="7"
          rx="3.5"
          fill="url(#frameGold)"
        />
        <rect
          x="18"
          y="160"
          width="64"
          height="7"
          rx="3.5"
          fill="url(#frameGold)"
        />
        <rect
          x="17"
          y="8"
          width="2.5"
          height="154"
          fill="url(#frameGold)"
          opacity="0.85"
        />
        <rect
          x="80.5"
          y="8"
          width="2.5"
          height="154"
          fill="url(#frameGold)"
          opacity="0.85"
        />

        {/* ---- NECK TUBE: short glass tube visually joining the two bulbs ---- */}
        <rect
          x="46"
          y="72"
          width="8"
          height="26"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.6"
        />

        {/* ---- TOP BULB: faint glass tint first, so the sand + outline sit on top of it ---- */}
        <path d={topBulbPath} fill="rgba(255,255,255,0.05)" />
        {/* Sand inside the top bulb — anchored to the neck (bottom of this shape), height shrinks as time drains */}
        <rect
          x="22"
          y={TOP_BULB_NECK - topSandHeight}
          width="56"
          height={topSandHeight}
          fill="url(#sandGrad)"
          clipPath="url(#topBulbClip)"
          className="sand-fill-rect" // Smooth y/height transition class, now defined once in index.css instead of an inline style object
        />
        {/* Glass outline — drawn last (within this bulb's stack) so the curved edge always reads clearly over the sand */}
        <path
          d={topBulbPath}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.4"
        />
        {/* Glass shine — a soft diagonal streak of light on the left side of the bulb */}
        <path
          d="M28,18 C26,32 27,46 34,58"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* ---- BOTTOM BULB: same layering as the top bulb, mirrored ---- */}
        <path d={bottomBulbPath} fill="rgba(255,255,255,0.05)" />
        {/* Sand inside the bottom bulb — anchored to the bottom cap, height grows as time passes */}
        <rect
          x="22"
          y={BOTTOM_BULB_BOTTOM - bottomSandHeight}
          width="56"
          height={bottomSandHeight}
          fill="url(#sandGrad)"
          clipPath="url(#bottomBulbClip)"
          className="sand-fill-rect" // Smooth y/height transition class, now defined once in index.css instead of an inline style object
        />
        <path
          d={bottomBulbPath}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.4"
        />
        <path
          d="M28,152 C26,138 27,124 34,112"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// =============================================
// COUNTDOWN DIGIT UNIT
// One pill — a two-digit box plus a small label underneath (Hrs/Min/Sec)
// =============================================
const CountdownUnit = ({ value, label, urgent }) => (
  <div className="flex flex-col items-center gap-1">
    {/* The digit pill itself — background and border swap to red once urgent */}
    <div
      className={cn(
        "border rounded-lg px-2.5 sm:px-3 py-1.5 min-w-12 sm:min-w-13 text-center transition-colors duration-300",
        urgent
          ? "bg-danger/15 border-danger/40 animate-pulse" // Once under 15% time left, the digits pulse red to match the sand timer's glow
          : "bg-white/10 border-white/10", // Normal, calm glassy look the rest of the time
      )}
    >
      <p
        className={cn(
          "text-lg sm:text-xl md:text-2xl font-bold tabular-nums leading-none", // tabular-nums keeps digit width consistent so the pill never jitters
          urgent ? "text-danger" : "text-white",
        )}
      >
        {String(value).padStart(2, "0")}{" "}
        {/* Always shows two digits, e.g. "05" instead of "5" */}
      </p>
    </div>
    <p className="text-[10px] sm:text-[11px] text-gray-500">{label}</p>
  </div>
);

// =============================================
// FLASH SALE PRODUCT TILE
// Every tile shares the exact same TOTAL pixel height, enforced with
// overflow-hidden at every level, so all three cards in the row always
// line up perfectly no matter how much text a product has.
// =============================================
const FlashSaleTile = ({ product }) => {
  const [imageFailed, setImageFailed] = useState(false); // Tracks whether the real product image failed to load
  const hasDiscount = product.original_price > product.price; // True only when there's a genuine price drop
  const savedAmount = hasDiscount
    ? parseFloat(product.original_price) - parseFloat(product.price) // Real rupee amount saved, never fabricated
    : 0;
  const imageSrc =
    !product.primary_image || imageFailed
      ? FALLBACK_IMAGE // Use the fallback if there's no image, or the real one already failed
      : product.primary_image;

  return (
    <Link
      to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)} // Whole card is clickable, links to that product's detail page
      className="relative flex flex-col w-full h-53.75 sm:h-63.75 bg-white rounded-xl overflow-hidden shadow-lg hover:-translate-y-1.5 hover:shadow-2xl hover:ring-2 hover:ring-primary/40 transition-all duration-300 group"
    >
      {/* Fixed-height image area — shrink-0 stops it from ever being squeezed
          or stretched by its flex-column parent, so it's always identical
          across every card regardless of the image's own aspect ratio */}
      <div className="relative w-full h-30 sm:h-37.5 shrink-0 bg-gray-50 overflow-hidden">
        <img
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)} // Swap to the fallback image the instant the real one fails
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" // object-cover crops instead of stretching
        />

        {/* Hover overlay — a soft dark gradient plus a "View Deal" prompt,
            fades in only on hover so the card feels interactive */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
          <span className="text-white text-[11px] font-semibold tracking-wide translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            View Deal →
          </span>
        </div>

        {/* Discount flame badge — only rendered when there's a real discount to show */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-linear-to-r from-danger to-red-600 text-white text-[11px] font-bold rounded-md shadow-md">
            <AiFillFire className="w-3 h-3" />-
            {Math.round(
              ((product.original_price - product.price) /
                product.original_price) *
                100,
            )}
            %
          </div>
        )}
      </div>

      {/* Remaining space fills the rest of the card's fixed height —
          flex-1 + min-h-0 lets it shrink safely, min-w-0 stops any inline
          child from forcing horizontal overflow, and overflow-hidden
          guarantees extra text can never push the card taller than its
          neighbors */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden p-2.5 sm:p-3 flex flex-col justify-center gap-1">
        {/* Product name — clamped to one line, break-words as a second
            safety net for very long single words with no spaces */}
        <p className="text-xs font-medium text-gray-800 line-clamp-1 wrap-break-word">
          {product.name}
        </p>

        {/* Wrapped in its own overflow-hidden box so PriceDisplay can never
            push this row taller even if it ever renders extra content */}
        <div className="min-w-0 overflow-hidden">
          <PriceDisplay
            price={parseFloat(product.price)}
            originalPrice={parseFloat(product.original_price)}
            size="sm"
            showDiscount={false} // Already shown as the flame badge above, so avoid repeating the same number
          />
        </div>

        {/* Real, computed savings amount — only shown when there's an
            actual discount, never a fabricated number */}
        {hasDiscount && (
          <p className="text-[10px] text-primary font-medium line-clamp-1 wrap-break-word">
            You save {formatPrice(savedAmount)}
          </p>
        )}
      </div>
    </Link>
  );
};

// =============================================
// MAIN SECTION
// =============================================
const FlashSaleSection = () => {
  // TEMPORARY: set to 60 seconds (1 minute) for testing/demo purposes.
  // Change back to 48 * 60 * 60 (48 hours in seconds) once ready to go live.
  const countdown = useCountdown(60);

  // =============================================
  // FLASH SALE PRODUCTS API CALL
  // =============================================
  const { data: productsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "flash-sale"], // Unique cache key for this specific query
    queryFn: () =>
      searchProducts({
        ordering: "-created_at", // Newest products first
        page: 1,
      }),
    staleTime: 1000 * 60 * 5, // Cache is considered fresh for 5 minutes
  });

  // Picks exactly 3 products to show, preferring genuinely discounted ones
  const products = (() => {
    const results = productsData?.data?.results || [];
    const discounted = results.filter(
      (p) => parseFloat(p.original_price) > parseFloat(p.price),
    );
    // Prefer genuinely discounted products; only backfill with regular
    // products if there aren't at least 3 discounted ones available yet
    const chosen = discounted.length >= 3 ? discounted : results;
    return chosen.slice(0, 3);
  })();

  return (
    <section className="relative overflow-hidden bg-[#0d1b2a] py-10 sm:py-20 lg:py-14">
      {/* Decorative blurred glow blobs — pure ambience, matches the premium
          "raised card on a soft backdrop" feel used elsewhere on the site,
          adapted for this section's dark background */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 bg-danger/10 rounded-full blur-3xl" />

      <Container>
        {/* ============ TWO-COLUMN LAYOUT ============ */}
        {/* max-w-6xl + mx-auto: keeps the whole row narrower than the full
            container width, so there's generous empty space on both the
            left and right edges and the section reads as centered.
            Padding also increased (px-4 sm:px-10 lg:px-24) for the same reason */}
        {/* Mobile: stacked (left content on top, cards below) */}
        {/* lg+: side by side — left column is 40%, right column is 60% */}
        <div className="relative flex flex-col max-w-8xl mx-auto px-4 sm:px-10 lg:px-24 lg:flex-row lg:items-center gap-10 lg:gap-16">
          {/* ============ LEFT COLUMN (40%): badge + heading + description + timer + CTA ============ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} // Starts slightly lower and invisible
            whileInView={{ opacity: 1, y: 0 }} // Settles into place once it scrolls into view
            viewport={{ once: true, amount: 0.4 }} // Only animate the first time it's seen, once 40% is visible
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center lg:items-start lg:text-left gap-2 lg:w-[40%] w-full" // Explicit 40% share of the row on large screens
          >
            {/* Eyebrow badge with a live pulsing dot for extra urgency */}
            <span className="inline-flex items-center gap-2 w-fit px-3 py-1.5 bg-danger/15 border border-danger/30 text-danger text-xs font-bold rounded-full uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
              <AiFillFire className="w-3.5 h-3.5" />
              Limited Offers
            </span>

            {/* Heading — compact size */}
            <h2 className="text-xl sm:text-2xl lg:text-2xl font-extrabold text-white leading-snug">
              Don't Miss These <span className="text-primary">Deals</span>
            </h2>

            <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
              Prices this good never last long. Grab these hand-picked deals
              before the timer runs out and stock disappears.
            </p>

            {/* Digits FIRST (left), sand timer SECOND (right) — both still
                share the exact same countdown state, so they can never
                disagree */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Digit row sits on the left side of this group */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CountdownUnit
                  value={countdown.hours}
                  label="Hrs"
                  urgent={countdown.percent <= 15 && !countdown.isExpired}
                />
                <span className="text-white/20 font-bold text-lg mb-5">:</span>
                <CountdownUnit
                  value={countdown.minutes}
                  label="Min"
                  urgent={countdown.percent <= 15 && !countdown.isExpired}
                />
                <span className="text-white/20 font-bold text-lg mb-5">:</span>
                <CountdownUnit
                  value={countdown.seconds}
                  label="Sec"
                  urgent={countdown.percent <= 15 && !countdown.isExpired}
                />
              </div>

              {/* Hourglass sits on the right side of the digit row */}
              <SandTimer
                percent={countdown.percent}
                isExpired={countdown.isExpired}
              />
            </div>

            {/* Shown only once the countdown actually reaches zero */}
            {countdown.isExpired && (
              <p className="text-xs text-danger font-semibold">
                This deal has ended — check back soon for the next one.
              </p>
            )}

            {/* CTA — sends shoppers to the full product catalog */}
            <Link
              to={ROUTES.PRODUCTS}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-200 group"
            >
              Shop All Deals
              <AiOutlineArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* ============ RIGHT COLUMN (60%): product tiles ============ */}
          <div className="lg:w-[60%] w-full">
            {" "}
            {/* Explicit 60% share of the row on large screens */}
            {isLoading ? (
              // Skeleton placeholders shown while the products are loading,
              // same fixed sizing as the real tiles so nothing jumps around
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-53.75 sm:h-63.75 rounded-xl overflow-hidden flex flex-col"
                  >
                    <div className="h-30 sm:h-37.5 shrink-0 bg-white/10 animate-pulse" />
                    <div className="flex-1 bg-white/5 animate-pulse mt-px" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }} // Slight delay so the left column leads and the tiles follow
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 items-start" // items-start stops CSS grid from stretching any card taller than its own declared height
              >
                {products.map((product) => (
                  <FlashSaleTile key={product.id} product={product} />
                ))}
              </motion.div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">
                Flash sale products coming soon
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FlashSaleSection;
