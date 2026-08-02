import { useRef } from "react"; // useRef to attach a DOM reference to the section, used for scroll-visibility detection
import { motion, useInView } from "framer-motion"; // useInView tells us the exact moment this section scrolls onto the screen (already installed in the project)
import { FiUsers, FiStar, FiTruck, FiRefreshCw } from "react-icons/fi";
import Container from "../layouts/Container"; // Wrapper component for consistent max-width/padding
import useCountUp from "../../hooks/useCountUp"; // Our custom hook that animates a number counting up once it's visible

// =============================================
// STATS DATA
// Each entry carries the pieces needed to drive the count-up animation
// instead of one hardcoded display string:
//   target      -> the final NUMBER to count up to (null if the stat has no number, e.g. "FREE")
//   decimals    -> how many decimal places to keep (0 for whole numbers, 1 for "4.9")
//   suffix      -> text glued AFTER the animated number (e.g. "k+", "/5", "-Day")
//   staticValue -> used only when target is null, rendered as-is with no counting
// =============================================
const STATS = [
  {
    icon: FiUsers,
    target: 120, // counts 0 -> 120 quickly when this section scrolls into view
    decimals: 0, // whole number, no decimal places
    suffix: "k+", // appended after the number finishes counting, e.g. "120k+"
    label: "Active Customers",
    iconBg: "bg-gradient-to-br from-primary to-primary-dark",
  },
  {
    icon: FiStar,
    target: 4.9, // counts 0 -> 4.9
    decimals: 1, // keep one decimal place so it lands exactly on "4.9"
    suffix: "/5", // appended after the number, e.g. "4.9/5"
    label: "Average Rating",
    iconBg: "bg-gradient-to-br from-primary-light to-primary",
  },
  {
    icon: FiTruck,
    target: null, // "FREE" is not a number, so this stat is never passed through the count-up hook
    staticValue: "FREE", // shown as-is, no counting animation for this one
    label: "Delivery on Rs.5000+",
    iconBg: "bg-gradient-to-br from-primary to-primary-dark",
  },
  {
    icon: FiRefreshCw,
    target: 30, // counts 0 -> 30
    decimals: 0, // whole number
    suffix: "-Day", // appended after the number, e.g. "30-Day"
    label: "Easy Returns",
    iconBg: "bg-gradient-to-br from-primary-light to-primary",
  },
];

// =============================================================================
// getHoloFontSize
// The original uiverse.io reference card was built for ONE fixed giant digit
// ("6") inside a fixed 140px square box. Our stats show variable-length text
// like "120k+" or "30-Day", so the font-size must shrink as the string gets
// longer, otherwise longer stats would overflow their card. This keeps every
// stat visually balanced regardless of how many characters it has.
// =============================================================================
const getHoloFontSize = (text) => {
  const len = text.length; // how many characters we need to fit
  if (len <= 3) return 42; // short strings like "4.9" (rare) get the biggest size
  if (len === 4) return 36; // e.g. "FREE"
  if (len === 5) return 31; // e.g. "120k+", "4.9/5"
  return 26; // e.g. "30-Day" (6 characters) gets the smallest size
};

// =============================================================================
// Holo3DNumber
// This is a faithful recreation of the uiverse.io "Animated 3D Layered 6"
// card by Thomas-Cabrit — three stacked text layers at different simulated
// depths (translateZ), wrapped in a wobbling rotateX/rotateY container, with
// a holographic gradient fill on the text itself. The ONLY changes from the
// original source are: (1) every blue color value swapped for the project's
// emerald brand colors, (2) the layers are explicitly centered with
// top/left/translate so it works correctly with variable-length text instead
// of a single fixed digit, and (3) font-size is now dynamic (see above).
// =============================================================================
const Holo3DNumber = ({ text }) => {
  const fontSize = getHoloFontSize(text); // pick a font-size that comfortably fits this specific stat's text length

  return (
    // Perspective wrapper — gives the 3D rotation below a "3D space" to rotate within, exactly like the reference card's outer .card-6 wrapper
    <div className="stats-holo-perspective">
      {/* The element that actually wobbles in 3D via rotateX/rotateY, and holds all three stacked text layers on top of each other */}
      <div className="stats-holo-6">
        {/* Back layer — furthest simulated depth (translateZ -70px), most transparent and blurred, creates the "glow behind the number" illusion */}
        <div
          className="stats-holo-layer stats-holo-layer--back"
          style={{ fontSize: `${fontSize}px` }} // inline font-size since it's calculated dynamically per stat, not a fixed value that CSS classes could hardcode
        >
          {text}
        </div>
        {/* Mid layer — halfway depth (translateZ -34px), medium opacity/blur, fills the visual gap between back and front layers */}
        <div
          className="stats-holo-layer stats-holo-layer--mid"
          style={{ fontSize: `${fontSize}px` }}
        >
          {text}
        </div>
        {/* Front layer — sits at translateZ 0 (closest to viewer), fully sharp and opaque — this is the layer that's mainly readable */}
        <div
          className="stats-holo-layer stats-holo-layer--front"
          style={{ fontSize: `${fontSize}px` }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// StatCard — one full stat block: icon badge on top, the 3D holo number in
// the middle (with count-up), and the descriptive label at the bottom.
// Split into its own component so useCountUp is called cleanly once per
// card, following the Rules of Hooks (can't call hooks conditionally inside
// a .map() callback in a fragile way).
// =============================================================================
const StatCard = ({ stat, isInView, index }) => {
  const Icon = stat.icon; // grab this stat's icon component so it can be rendered as JSX below

  // Animate the numeric part of this stat. If stat.target is null (the
  // "FREE" card), the hook does nothing and just returns 0 — irrelevant
  // since we never use that value for static stats.
  const animatedNumber = useCountUp(
    stat.target,
    isInView,
    1100,
    stat.decimals || 0,
  );

  // Build the exact string to show inside the 3D holo number: either the
  // live counting number (rounded/fixed to the right decimal places) plus
  // its suffix, or the static text for stats that have no number (e.g. "FREE")
  const displayValue =
    stat.target === null
      ? stat.staticValue
      : `${stat.decimals ? animatedNumber.toFixed(stat.decimals) : Math.round(animatedNumber)}${stat.suffix || ""}`;

  return (
    // motion.div fades + slides each card in on mount, staggered by index, purely for the entrance — the wobble/holo effect itself is pure CSS below
    <motion.div
      initial={{ opacity: 0, y: 16 }} // start slightly lower and invisible
      animate={isInView ? { opacity: 1, y: 0 } : {}} // animate up into place once the section scrolls into view
      transition={{ duration: 0.5, delay: index * 0.08 }} // slight stagger per card so all four don't pop in at the exact same instant
      className="flex flex-col items-center gap-1 text-center transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Icon badge — brand-emerald gradient circle, unchanged from the original design */}
      <div
        className={`
          w-11 h-11 sm:w-13 sm:h-13 rounded-full
          flex items-center justify-center
          text-white shadow-md
          ${stat.iconBg}
        `}
      >
        <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
      </div>

      {/* The 3D holographic layered number — replaces the old plain <p> number, this is the uiverse-inspired centerpiece */}
      <Holo3DNumber text={displayValue} />

      {/* Descriptive label below the value — pulled up slightly (-mt-2) since the holo number's perspective wrapper already carries its own vertical margin */}
      <p className="text-xs sm:text-sm text-gray-600 -mt-2">{stat.label}</p>
    </motion.div>
  );
};

const StatsBar = () => {
  // Ref attached to the section wrapper below — framer-motion's useInView watches this DOM node's position relative to the viewport
  const sectionRef = useRef(null);

  // Flips to true the first time at least 30% of the section is visible on screen, and — because of `once: true` — stays true forever after that. This single flag triggers every card's count-up animation at the same moment.
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    // Full-width section — NOT wrapped in Container at the section
    // level, so the light-mint background stretches edge to edge
    // across the entire viewport. Container is only applied to the
    // inner content below, to keep the stats themselves centered
    // and consistently padded with the rest of the page.
    <section
      ref={sectionRef} // attach the visibility-tracking ref to the section itself
      className="w-full bg-primary-50 py-10 border-y border-primary-100"
    >
      <Container>
        {/* Grid layout for the stats:
            - grid-cols-2: 2 columns by default (mobile)
            - md:grid-cols-4: switches to 4 columns on medium screens and above (desktop)
            - gap-8: spacing between grid items */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Loop through each stat in the STATS array and render a card with the 3D holo number for it */}
          {STATS.map((stat, index) => (
            <StatCard
              key={stat.label}
              stat={stat}
              isInView={isInView}
              index={index}
            />
          ))}
        </div>
      </Container>

      {/* NOTE: the "Animated 3D Layered Number" CSS (stats-holo-perspective,
          stats-holo-6, stats-holo-layer, wobble keyframes, responsive +
          reduced-motion media queries) used to be an inline <style> tag
          right here. It has been moved to src/index.css (see the
          "HOME PAGE COMPONENT STYLES" section) so the CSS lives in the
          project's single global stylesheet instead of inside JSX, and
          so it's declared once instead of being re-inserted into the DOM
          on every mount of this section. The class names below are
          unchanged, so nothing about how they look/behave has changed. */}
    </section>
  );
};

export default StatsBar;
