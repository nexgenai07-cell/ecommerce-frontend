import { useState, useEffect, useRef, useCallback, useId } from "react";

// Client-side navigation link — used for the "Shop the Sale" CTA
import { Link } from "react-router-dom";

// Data-fetching hook from React Query — gives us caching, loading state,
// and error state for free instead of managing them by hand
import { useQuery } from "@tanstack/react-query";

// Animation library — powers the gentle scroll-reveal on the sale content, and the
// drag / spring-back / idle swing of the hanging hourglass
import {
  motion,
  useAnimationControls,
  useInView,
  useReducedMotion,
} from "framer-motion";

// Icons for the scrolling ribbon (discount seal, flame, sun, clock)
import { TbRosetteDiscount } from "react-icons/tb";
import { AiFillFire } from "react-icons/ai";
import { FiClock, FiSun } from "react-icons/fi";

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

// Compact 3D folder that holds the flash sale product cards and slides
// them out when it opens
import FlashSaleFolder from "./FlashSaleFolder";

// Tailwind class-merging helper, used to combine conditional classes safely
import cn from "../../utils/cn";

// =============================================
// PROMO CARD COPY
// The three text lines shown at the top of the left section. Kept as named
// constants so the campaign wording can be edited in one place without
// touching the layout markup.
// =============================================
const SALE_TITLE = "Summer Sale is Live!"; // Small first line above the headline
const SALE_HEADLINE = "Flat 40% OFF"; // Large, bold headline of the campaign
const SALE_SUBTEXT = "Limited time only. Shop before it's gone!"; // Small urgency line under the headline

// =============================================
// SCROLLING RIBBON CONTENT
// The short phrases that loop across the ribbon at the top of the section.
// Each entry pairs a label with its icon. The list is repeated
// MARQUEE_REPEATS times inside every half of the ribbon so one half is
// always wider than the screen and the loop never shows a gap.
// =============================================
const MARQUEE_ITEMS = [
  { id: "flash", label: "Flash Sale", Icon: AiFillFire },
  { id: "discount", label: SALE_HEADLINE, Icon: TbRosetteDiscount },
  { id: "season", label: "Summer Sale", Icon: FiSun },
  { id: "limited", label: "Limited time only", Icon: FiClock },
];
const MARQUEE_REPEATS = 4; // How many times the phrase list is repeated inside one half of the ribbon

// Flat list of ribbon entries with unique keys, built once at module load
const MARQUEE_ENTRIES = Array.from({ length: MARQUEE_REPEATS }, (_, repeat) =>
  MARQUEE_ITEMS.map((item) => ({ ...item, key: `${repeat}-${item.id}` })),
).flat();

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
  // Total countdown length in milliseconds — the baseline that "percent"
  // is measured against
  const totalMs = totalSeconds * 1000;

  // The fixed future timestamp the countdown counts down to — calculated
  // once on mount (via the lazy useState initializer) so it doesn't reset
  // itself on every re-render
  const [target] = useState(() => new Date(Date.now() + totalMs));

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
      const percent = Math.max(0, Math.min(100, (diff / totalMs) * 100));

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
  }, [target, totalMs]);

  return timeLeft;
};

// =============================================
// SAND TIMER (HOURGLASS) — real SVG glass shape
// Two curved "shield" bulbs (rounded shoulders tapering to a flat neck),
// connected by a short glass tube, sitting inside a gold frame — a proper
// hourglass silhouette. The rendered size is controlled by the parent
// through the "className" prop, so the same component can be placed
// anywhere at any size.
// =============================================
const SandTimer = ({ percent, isExpired, className = "" }) => {
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
        "relative aspect-100/170 shrink-0", // Keeps the hourglass proportions locked; width comes from the parent's className
        isUrgent && "drop-shadow-[0_0_16px_rgba(239,68,68,0.55)]", // Soft red glow around the whole glass once time is nearly up
        className, // Size (and any other placement classes) supplied by the parent
      )}
    >
      {/* Falling sand stream overlay — a tiny animated line placed exactly
          over the neck region of the SVG below, using percentages so it
          always lines up regardless of the rendered size. Only shown while
          the countdown is still running, so it stops the instant it expires.
          Its position, height and keyframes live in the ".sand-stream-drop"
          class inside src/index.css. */}
      {!isExpired && (
        <span className="sand-stream-drop absolute left-1/2 -translate-x-1/2 w-px bg-linear-to-b from-amber-200 via-amber-400 to-transparent" />
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
          className="sand-fill-rect" // Smooth y/height transition class defined once in index.css
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
          className="sand-fill-rect" // Smooth y/height transition class defined once in index.css
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
// One small glass tile holding a two-digit number with a tiny label
// underneath (Hrs / Min / Sec). The tile is intentionally compact so the
// whole countdown stays a light accent next to the "Shop the Sale" button.
// Turns red and pulses in the last 15% of the countdown.
// =============================================
const CountdownUnit = ({ value, label, urgent }) => (
  <div
    className={cn(
      "flex min-w-9 flex-col items-center rounded-md px-1.5 py-1 ring-1 backdrop-blur-sm transition-colors duration-300 sm:min-w-10", // Fixed minimum width keeps all three tiles the same size
      urgent ? "bg-danger/15 ring-danger/50" : "bg-white/5 ring-white/10",
    )}
  >
    {/* Two-digit number — padStart guarantees "05" instead of "5", and
        tabular-nums keeps digit width constant so the row never jitters */}
    <p
      className={cn(
        "text-sm font-bold tabular-nums leading-none sm:text-base",
        urgent ? "animate-pulse text-danger" : "text-white",
      )}
    >
      {String(value).padStart(2, "0")}
    </p>
    {/* Tiny unit label under the number */}
    <p className="mt-0.5 text-[9px] font-medium leading-none text-gray-400">
      {label}
    </p>
  </div>
);

// Colon that separates two countdown tiles
const CountdownSeparator = () => (
  <span aria-hidden="true" className="text-sm font-bold text-white/30">
    :
  </span>
);

// =============================================
// HANGING SAND TIMER — rope + draggable hourglass
// The hourglass hangs from a rope tied to the ribbon and can be grabbed and pulled anywhere
// (mouse or touch). While it is pulled, the rope tilts and stretches so it always stays
// attached to the top of the hourglass. When it is let go, the hourglass springs back to its
// resting place with a small wobble, and the rope shrinks back with it.
//
// How the rope follows: the hourglass reports how far it is from its resting place (x, y) on
// every animation frame (onUpdate — while it is dragged AND while it springs back). The rope's
// angle and length are computed from those same two numbers and applied to the rope on that
// same frame, so the rope and the hourglass can never disagree. No inline "style" props are
// used anywhere in this component: all static look lives in Tailwind classes, and the moving
// parts are driven through framer-motion's props and controls.
// Idle: the whole hanging block sways gently like a pendulum. The sway pauses while it is
// being dragged and starts again on release. It is skipped for visitors who prefer reduced
// motion (dragging still works).
// =============================================
const ROPE_OVERLAP_PX = 4; // How far the rope end tucks under the hourglass cap — equals the rope's "-mb-1" below
const SWING_DEGREES = 2.5; // Largest sway angle of the idle pendulum motion, to each side

const HangingSandTimer = ({ percent, isExpired }) => {
  const prefersReducedMotion = useReducedMotion(); // True when the visitor's system asks for less motion
  const swingControls = useAnimationControls(); // Lets us start, pause and restart the idle sway by hand
  const ropeRef = useRef(null); // The rope element, measured to know its resting length
  const ropeRestHeightRef = useRef(0); // Resting (unstretched) rope height in px — a ref, because changing it must not re-render

  const ropeTiltControls = useAnimationControls(); // Sets the rope's angle (outer rope element)
  const ropeStretchControls = useAnimationControls(); // Sets the rope's stretch (inner rope element)

  // Keeps the resting rope length up to date (it changes with the layout height)
  useEffect(() => {
    const rope = ropeRef.current;
    if (!rope) return undefined;

    const measure = () => {
      ropeRestHeightRef.current = rope.offsetHeight; // offsetHeight ignores transforms, so it stays the unstretched length
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(rope);
    return () => observer.disconnect();
  }, []);

  // Called on every frame the hourglass moves, with its offset (x, y in px) from the resting place.
  // Works out where the rope has to point and how long it has to be to reach the hourglass top,
  // and sets both instantly (no animation of its own — the hourglass motion IS the animation).
  const handleHourglassUpdate = (latest) => {
    const rest = ropeRestHeightRef.current; // Unstretched rope length
    if (!rest) return; // Not measured yet
    const dx = Number(latest.x) || 0;
    const dy = Number(latest.y) || 0;
    const hang = Math.max(rest - ROPE_OVERLAP_PX, 1); // Rope top → hourglass top at rest
    const angle = (Math.atan2(-dx, hang + dy) * 180) / Math.PI; // A pull to the right must rotate the rope anticlockwise, hence -dx
    const stretch = (Math.hypot(dx, hang + dy) + ROPE_OVERLAP_PX) / rest; // Current straight-line distance ÷ resting length
    ropeTiltControls.set({ rotate: angle });
    ropeStretchControls.set({ scaleY: stretch });
  };

  // Idle pendulum: 0° → right → 0° → left → 0°, easing so it moves fastest through the middle
  const startSwing = useCallback(() => {
    if (prefersReducedMotion) return;
    swingControls.start({
      rotate: [0, SWING_DEGREES, 0, -SWING_DEGREES, 0],
      transition: {
        duration: 7.2,
        ease: ["easeOut", "easeIn", "easeOut", "easeIn"],
        repeat: Infinity,
      },
    });
  }, [prefersReducedMotion, swingControls]);

  useEffect(() => {
    startSwing();
    return () => swingControls.stop();
  }, [startSwing, swingControls]);

  // While dragging, the sway eases back to straight so it does not fight the pointer
  const handleDragStart = () =>
    swingControls.start({
      rotate: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    });

  // Once released the hourglass springs home by itself, so the sway can start again
  const handleDragEnd = () => startSwing();

  return (
    // Swinging block — pivots around its top-center, the point where the rope is tied
    <motion.div
      animate={swingControls}
      initial={{ rotate: 0 }}
      className="flex h-full origin-top flex-col items-center"
    >
      {/* Light knot the rope is tied to — only needed while stacked, because from md up the rope disappears under the ribbon */}
      <span className="h-2 w-2 rounded-full bg-amber-200 md:hidden" />

      {/* Twisted rope. Two nested elements, on purpose:
          - the OUTER one only rotates (around its fixed top end) and holds the resting length
            (flex-1 fills all the free height at rest);
          - the INNER one only stretches along the rope's own direction and carries the braided
            texture (".hanging-rope" in src/index.css).
          The order matters: if a single element was rotated AND scaled, the browser would stretch it
          along the screen's vertical axis instead of along the rope, and the rope's end would drift
          away from the hourglass whenever it is pulled sideways. Nesting rotates first, stretches
          second, so the rope end always lands exactly on the top of the hourglass. */}
      <motion.span
        ref={ropeRef}
        aria-hidden="true"
        animate={ropeTiltControls}
        className="relative -mb-1 block min-h-5 w-1 flex-1 origin-top md:min-h-20"
      >
        <motion.span
          animate={ropeStretchControls}
          className="hanging-rope absolute inset-0 block origin-top"
        />
      </motion.span>

      {/* The hourglass — free to drag in any direction, no momentum, and it snaps back to its
          resting place (with a springy wobble) when released. Driven by the same countdown as the digits. */}
      <motion.div
        drag
        dragSnapToOrigin
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 150, bounceDamping: 9 }} // Lower damping = more wobble on the way back
        onUpdate={handleHourglassUpdate}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="cursor-grab touch-none select-none active:cursor-grabbing"
      >
        <SandTimer
          percent={percent}
          isExpired={isExpired}
          className="w-14 sm:w-16"
        />
      </motion.div>
    </motion.div>
  );
};

// =============================================
// FLOATING SALE BADGES
// Five red "sale seal" badges — the sharp-pointed starburst shape shops use for offers — that
// pop out of the dark background when the section scrolls into view, and then keep floating
// gently up and down. They are pure decoration: behind all the content, never clickable,
// hidden from screen readers.
// =============================================

// Starburst outline: 28 points on a circle, alternating between a long (tip) and a short (dip)
// radius, which gives 14 sharp spikes. Computed once, in the 0-100 SVG coordinate space.
const buildStarburst = (spikes, tipRadius, dipRadius) =>
  Array.from({ length: spikes * 2 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (spikes * 2) - Math.PI / 2; // Start at the top
    const radius = index % 2 === 0 ? tipRadius : dipRadius;
    return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

const STARBURST_OUTER = buildStarburst(14, 49, 39); // The red seal itself
const STARBURST_INNER = buildStarburst(14, 43, 34); // A thin light line inside it, for a printed-label look

// The five badges. Every badge is placed for each screen size so it never sits on top of the
// hourglass, the copy or the folder. Three placements, all written as Tailwind classes:
//   phones / sm : beside the pill and beside the centred folder (the side areas are empty there)
//   md and lg   : the two-column layout leaves no free side area, so the badges shrink and sit in the
//                 empty strips above and below the content (only 3 of the 5 are shown)
//   xl and up   : the content group is narrower than the screen, so all 5 sit in the wide side margins
// position = left/top classes, size = width classes, visibility = which sizes show the badge.
const SALE_BADGES = [
  {
    id: "sale",
    lines: ["SALE"],
    position:
      "left-[3%] top-[9%] sm:left-[4%] sm:top-[16%] md:left-[20%] md:top-[2.1rem] xl:left-[4%] xl:top-[16%]",
    size: "w-12 sm:w-[4.5rem] md:w-10 xl:w-[4.5rem]",
    visibility: "",
    rotate: -14,
    delay: 0.35,
    floatSeconds: 4.2,
    floatDistance: 9,
  },
  {
    id: "off",
    lines: ["40%", "OFF"],
    position:
      "left-[5%] top-[72%] sm:left-[11%] sm:top-[68%] xl:left-[11%] xl:top-[68%]",
    size: "w-11 sm:w-16",
    visibility: "md:hidden xl:block",
    rotate: 10,
    delay: 0.5,
    floatSeconds: 5.1,
    floatDistance: 9,
  },
  {
    id: "hot",
    lines: ["HOT"],
    position: "md:left-[52%] md:top-[2.1rem] xl:left-[45%] xl:top-[15%]",
    size: "w-10 xl:w-12",
    visibility: "hidden md:block",
    rotate: 16,
    delay: 0.65,
    floatSeconds: 3.8,
    floatDistance: 7,
  },
  {
    id: "deal",
    lines: ["FLASH", "DEAL"],
    position:
      "left-[78%] top-[9%] sm:left-[89%] sm:top-[18%] xl:left-[89%] xl:top-[18%]",
    size: "w-12 sm:w-[4.5rem]",
    visibility: "md:hidden xl:block",
    rotate: 12,
    delay: 0.8,
    floatSeconds: 4.8,
    floatDistance: 10,
  },
  {
    id: "minus",
    lines: ["-40%"],
    position:
      "md:left-[62%] md:top-auto md:bottom-0 xl:left-[83%] xl:top-[70%] xl:bottom-auto",
    size: "w-10 xl:w-14",
    visibility: "hidden md:block",
    rotate: -10,
    delay: 0.95,
    floatSeconds: 4.4,
    floatDistance: 8,
  },
];

// One badge drawing. Font size shrinks with the longest word so the text always fits the seal.
const StarburstBadge = ({ lines }) => {
  const gradientId = useId().replace(/:/g, ""); // Unique per badge; colons removed so url(#id) is always valid
  const longest = Math.max(...lines.map((line) => line.length));
  const fontSize = Math.min(lines.length === 1 ? 26 : 22, 103 / longest);

  return (
    <svg
      viewBox="0 0 100 100"
      className="block h-auto w-full drop-shadow-[0_6px_14px_rgba(239,68,68,0.45)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Lighter red in the middle, darker at the spikes — gives the seal a little depth */}
        <radialGradient id={gradientId} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="60%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
      </defs>
      <polygon
        points={STARBURST_OUTER}
        fill={`url(#${gradientId})`}
        stroke="#fecaca"
        strokeWidth="1"
        strokeLinejoin="miter"
      />
      <polygon
        points={STARBURST_INNER}
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.8"
        strokeLinejoin="miter"
      />
      {lines.map((line, index) => (
        <text
          key={line}
          x="50"
          y={lines.length === 1 ? 50 : 50 + (index - 0.5) * fontSize * 0.98}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontWeight="900"
          fontSize={fontSize}
          letterSpacing="0.5"
        >
          {line}
        </text>
      ))}
    </svg>
  );
};

// The layer holding all badges. isActive turns true once the section is on screen.
const FloatingSaleBadges = ({ isActive }) => {
  const prefersReducedMotion = useReducedMotion(); // Visitors who prefer less motion get badges that fade in but do not float

  return (
    // Own clipping box, so badges never poke out of the section
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {SALE_BADGES.map(
        ({
          id,
          lines,
          position,
          size,
          visibility,
          rotate,
          delay,
          floatSeconds,
          floatDistance,
        }) => (
          // Outer element: the pop-out — grows from a tiny, spun, invisible seal into its place with a springy overshoot
          <motion.div
            key={id}
            className={cn("absolute", position, size, visibility)}
            initial={{
              opacity: 0,
              scale: prefersReducedMotion ? 1 : 0.2,
              rotate: prefersReducedMotion ? rotate : rotate - 50,
            }}
            animate={isActive ? { opacity: 1, scale: 1, rotate } : undefined}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 11,
              delay,
              opacity: { duration: 0.4, delay },
            }}
          >
            {/* Inner element: the endless float — up, down, with a slight sway; every badge has its own pace */}
            <motion.div
              animate={
                isActive && !prefersReducedMotion
                  ? { y: [0, -floatDistance, 0], rotate: [-4, 4, -4] }
                  : undefined
              }
              transition={{
                duration: floatSeconds,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay + 0.8, // Starts floating after the pop-out has settled
              }}
            >
              <StarburstBadge lines={lines} />
            </motion.div>
          </motion.div>
        ),
      )}
    </div>
  );
};

// =============================================
// MAIN SECTION
// A dark promotional band made of two layers:
//   1. RIBBON : a thin emerald strip with looping sale phrases, which marks
//               the band as a special section and is the anchor the
//               hourglass rope is tied to.
//   2. CONTENT: two sections sitting side by side —
//       LEFT  : the promo copy, the compact countdown, the "Shop the Sale"
//               button and the hanging hourglass, all in one column.
//       RIGHT : the compact product folder and nothing else.
// Layout of the content
//   - Below md : one stacked column. The left section comes first, then the
//                folder. Inside the left section the promo copy spans the
//                full width, and the countdown + button sit beside a small
//                hourglass that hangs from a short rope.
//   - md and up: two columns (everything else on the left, folder on the
//                right). The hourglass leaves the flow and hangs from the
//                ribbon at the very start of the content, on the left of
//                the promo copy.
// =============================================
const FlashSaleSection = () => {
  // Length of the sale countdown in seconds — 60 gives a one-minute demo
  // countdown, and 48 * 60 * 60 gives a 48-hour campaign.
  const countdown = useCountdown(60);

  // ONE scroll trigger for the whole section: the moment the section scrolls into view (about a
  // third of it visible), isInView flips to true — once, and stays true — and every block below
  // (promo copy, countdown + button, hourglass, folder) glides into its place together, one after
  // the other with a short stagger. Nothing moves before that.
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  // Distance each block travels while gliding in — 0 for visitors who prefer reduced motion,
  // so they just get a soft fade instead of movement
  const prefersReducedMotion = useReducedMotion();
  const slide = (distance) => (prefersReducedMotion ? 0 : distance);

  // True during the last 15% of the countdown — shared by all three digits
  const isCountdownUrgent = countdown.percent <= 15 && !countdown.isExpired;

  // =============================================
  // FLASH SALE PRODUCTS API CALL
  // =============================================
  const { data: productsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "flash-sale"], // Unique cache key for this specific query
    queryFn: ({ signal }) =>
      searchProducts(
        {
          ordering: "-created_at", // Newest products first
          page: 1,
        },
        signal,
      ),
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
    <section
      ref={sectionRef}
      aria-labelledby="flash-sale-heading"
      className="relative z-20 overflow-x-clip bg-linear-to-br from-[#08121e] via-[#0d1b2a] to-[#0a2a27]"
    >
      {/* Dot grid texture — fades out towards the edges so it never competes with the content */}
      <div
        aria-hidden="true"
        className="flash-sale-grid pointer-events-none absolute inset-0"
      />

      {/* Decorative blurred glow blobs — pure ambience on the dark backdrop. They get their own
          clipping box, because the section itself must NOT clip: the hourglass can be dragged
          outside of it and has to stay visible there. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-danger/10 blur-3xl sm:h-96 sm:w-96" />
      </div>

      {/* Red sale badges that pop out of the background and float — behind the ribbon and the content */}
      <FloatingSaleBadges isActive={isInView} />

      {/* Thin glowing line along the bottom edge that closes the band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent"
      />

      {/* ============ RIBBON ============ */}
      {/* Two identical halves sit side by side and the pair slides left by exactly one half,
          so the loop restarts without any visible jump. Decorative only, hence aria-hidden.
          The motion itself lives in the ".flash-sale-marquee" class in src/index.css. */}
      <div
        aria-hidden="true"
        className="relative overflow-hidden bg-linear-to-r from-primary-dark via-primary to-primary-dark py-1.5 text-xs font-bold text-white shadow-md shadow-black/30 sm:text-[13px]"
      >
        <div className="flash-sale-marquee flex w-max">
          {[0, 1].map((half) => (
            <ul key={half} className="flex shrink-0 items-center">
              {MARQUEE_ENTRIES.map(({ key, label, Icon }) => (
                <li key={key} className="flex items-center gap-2 px-4">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                  <span className="ml-2 h-1 w-1 rounded-full bg-white/60" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      {/* The hanging rope is tied to the top edge of this wrapper (the bottom edge of the ribbon).
          The rope's md offset (-top-10 on the hourglass) must therefore always equal this
          wrapper's md top padding (py-10). */}
      <div className="relative py-6 sm:py-8 md:py-10">
        <Container>
          {/* Two sections side by side.
              Below md : one column, the left section first and the folder under it.
              md and up: the grid shrinks to the width of its content and is centered, so the two
              sections read as one compact group on any screen width. The right track has a fixed
              width that matches the folder (the folder sizes itself from its track, so that track
              cannot be content-sized); the left track takes exactly the width its content needs.
              Both are vertically centered against each other. */}
          <div className="grid grid-cols-1 gap-6 md:mx-auto md:w-fit md:grid-cols-[auto_13rem] md:items-center md:gap-x-12 lg:grid-cols-[auto_15rem] lg:gap-x-36 xl:gap-x-52">
            {/* ============ LEFT SECTION: EVERYTHING ELSE ============ */}
            {/* Below md this is a grid of four tracks: the promo copy spans all four on the first row;
                on the second row the two middle (auto-sized) tracks hold the hourglass and the
                countdown + button, and the two outer 1fr tracks are empty spacers that keep that pair
                centered under the copy. The countdown card keeps its natural width instead of
                stretching across the screen. From md up it becomes a 3-row grid (empty spacer row,
                content row, empty spacer row) whose first column holds the hourglass, so the hourglass
                spans from the ribbon down to the bottom of the countdown + button block while the content
                stays vertically centered. The wrapper itself is
                deliberately not transformed, so that anchor never shifts while the blocks animate. */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 sm:gap-x-6 md:grid md:grid-cols-[4rem_auto] md:grid-rows-[1fr_auto_1fr] md:items-stretch md:gap-x-4 md:gap-y-0 md:self-stretch">
              {/* Content block: promo copy + countdown/button. Below md it uses display: contents, so its
                  children stay direct cells of the mobile grid. From md up it is the middle row of the
                  left section's grid, so the hourglass can be tied to its bottom edge. */}
              <div className="contents md:col-start-2 md:row-start-2 md:flex md:flex-col md:items-start md:gap-4">
                {/* ---- Promo copy ---- */}
                <motion.div
                  initial={{ opacity: 0, x: -slide(48) }} // Starts invisible and shifted away from its place
                  animate={isInView ? { opacity: 1, x: 0, y: 0 } : undefined} // Glides into place once the section is on screen
                  transition={{ duration: 0.6, ease: "easeOut" }} // Promo copy glides in from the left, first
                  className="relative col-span-4 flex w-full flex-col items-center gap-2 text-center md:items-start md:text-left" // Centered while stacked, left-aligned once it sits beside the folder
                >
                  {/* Soft emerald glow behind the headline — gives the copy depth on the dark background */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-40 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl md:left-0 md:translate-x-0" />

                  {/* Live pill — pulsing dot + "Summer Sale is Live!" */}
                  <span className="relative inline-flex w-fit max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary-light">
                    <span aria-hidden="true" className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-light opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-light" />
                    </span>
                    {SALE_TITLE}
                  </span>

                  {/* Big gradient headline — white fading into emerald and warm gold.
                      text-balance splits "Flat 40% / OFF" evenly when the column is narrow. */}
                  <h2
                    id="flash-sale-heading"
                    className="relative text-balance bg-linear-to-r from-white via-primary-light to-amber-300 bg-clip-text text-4xl font-black leading-[1.05] tracking-tight text-transparent drop-shadow-[0_2px_18px_rgba(16,185,129,0.35)] sm:text-5xl md:text-4xl lg:text-5xl"
                  >
                    {SALE_HEADLINE}
                  </h2>

                  {/* Supporting urgency line */}
                  <p className="relative max-w-xs text-sm leading-snug text-gray-300">
                    {SALE_SUBTEXT}
                  </p>
                </motion.div>

                {/* ---- Action panel: countdown card + CTA button ---- */}
                {/* The countdown card comes first, the CTA button second. Stacked full-width below md; from md
                    up they sit side by side, vertically centered against each other so the button keeps
                    its own compact height, and wrap onto two lines only when the column is too narrow
                    for both. */}
                <motion.div
                  initial={{ opacity: 0, y: slide(40) }} // Starts invisible and shifted away from its place
                  animate={isInView ? { opacity: 1, x: 0, y: 0 } : undefined} // Glides into place once the section is on screen
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }} // Countdown + button rise from below, right after the copy
                  className="col-start-3 row-start-2 flex flex-col items-center gap-2.5 md:flex-row md:flex-wrap md:items-center md:gap-3"
                >
                  {/* Countdown card — a glass rectangle holding the caption and the small
                      HRS : MIN : SEC tiles. Its ring turns red once the deal has ended. */}
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 ring-1 backdrop-blur-sm transition-colors duration-300",
                      countdown.isExpired
                        ? "bg-danger/10 ring-danger/40"
                        : "bg-white/5 ring-white/15",
                    )}
                  >
                    {/* Caption — a clock icon with "Offer ends in", replaced by a short notice
                        once the countdown reaches zero */}
                    <p
                      className={cn(
                        "flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none",
                        countdown.isExpired ? "text-danger" : "text-gray-400",
                      )}
                    >
                      <FiClock
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0"
                      />
                      {countdown.isExpired
                        ? "This deal has ended"
                        : "Offer ends in"}
                    </p>

                    <div className="flex items-center gap-1">
                      <CountdownUnit
                        value={countdown.hours}
                        label="Hrs"
                        urgent={isCountdownUrgent}
                      />
                      <CountdownSeparator />
                      <CountdownUnit
                        value={countdown.minutes}
                        label="Min"
                        urgent={isCountdownUrgent}
                      />
                      <CountdownSeparator />
                      <CountdownUnit
                        value={countdown.seconds}
                        label="Sec"
                        urgent={isCountdownUrgent}
                      />
                    </div>
                  </div>

                  {/* CTA — sends shoppers to the full product catalog. The shine that sweeps
                      across it on hover lives in the ".flash-sale-cta" class in src/index.css. */}
                  <Link
                    to={ROUTES.PRODUCTS}
                    className="flash-sale-cta relative inline-flex items-center justify-center self-center md:self-end overflow-hidden whitespace-nowrap rounded-xl bg-linear-to-r from-amber-300 to-amber-500 px-4 py-2 text-sm font-bold text-gray-900 shadow-lg shadow-amber-500/30 ring-1 ring-white/30 transition-all duration-200 hover:shadow-amber-500/50 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span className="relative">Shop the Sale</span>
                  </Link>
                </motion.div>
              </div>

              {/* ---- Hanging hourglass ---- */}
              {/* Below md it is a normal grid cell BEFORE (left of) the countdown + button, hanging from a
                  short rope tied to a small knot. From md up it is a grid item in the first
                  column spanning the top spacer row and the content row, pulled up 2.5rem (so the rope
                  reaches the bottom edge of the ribbon); its bottom is therefore always exactly the
                  bottom of the countdown + button block, whatever the height of the folder. z-30 keeps rope + hourglass above
                  everything else in the section (folder, copy, ribbon) while it is dragged. The hourglass can be grabbed and pulled around (rope stretches, it springs
                  back on release) — see HangingSandTimer above. */}
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0, y: -slide(48) }} // Starts invisible, raised towards the ribbon
                animate={isInView ? { opacity: 1, y: 0 } : undefined} // Drops down to its hanging position with the rest of the section
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.1,
                }}
                className="relative z-30 col-start-2 row-start-2 flex w-14 self-stretch justify-center sm:w-16 md:col-start-1 md:row-start-1 md:row-end-3 md:-mt-10 md:justify-self-start"
              >
                <HangingSandTimer
                  percent={countdown.percent}
                  isExpired={countdown.isExpired}
                />
              </motion.div>
            </div>

            {/* ============ RIGHT SECTION: PRODUCT FOLDER ONLY ============ */}
            {/* While the products load the folder shows as a pulsing placeholder; once they
                arrive it opens and slides the three product cards out. With no products at
                all, a short message takes its place. The wrapper keeps its full width because
                the folder sizes itself from the width of its parent. */}
            <div className="w-full">
              {isLoading || products.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, x: slide(64) }} // Starts invisible and shifted away from its place
                  animate={isInView ? { opacity: 1, x: 0, y: 0 } : undefined} // Glides into place once the section is on screen
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }} // Folder glides in from the right, last
                  className="w-full"
                >
                  <FlashSaleFolder products={products} isLoading={isLoading} />
                </motion.div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">
                  Flash sale products coming soon
                </p>
              )}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
};

export default FlashSaleSection;
