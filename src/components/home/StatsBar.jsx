import { useId, useRef } from "react"; // useId gives every ring gradient its own id; useRef holds the section reference
import { motion, useInView, useReducedMotion } from "framer-motion"; // Entrance motion, scroll-visibility detection and the visitor's reduced-motion setting
import { FiUsers, FiStar, FiTruck, FiRefreshCw } from "react-icons/fi"; // One icon per highlight
import Container from "../layouts/Container"; // Wrapper component for consistent max-width/padding
import useCountUp from "../../hooks/useCountUp"; // Animates a number counting up once it is allowed to start

// =============================================
// STATS DATA
//   icon         -> icon component shown inside the circle
//   target       -> the final NUMBER to count up to (null when the stat has no number, e.g. "FREE")
//   decimals     -> how many decimal places to keep (0 for whole numbers, 1 for "4.9")
//   suffix       -> smaller text shown right after the number (e.g. "k+", "/5", "-Day")
//   staticValue  -> shown as-is when target is null, without counting
//   label        -> description shown under the value
//   ringEndClass -> where the ring stops drawing: 0 offset is a full circle, 2 offset is 98% of it
// The class names are written out in full so Tailwind can detect them.
// =============================================
const STATS = [
  {
    icon: FiUsers,
    target: 120,
    decimals: 0,
    suffix: "k+",
    label: "Active Customers",
    ringEndClass: "[stroke-dashoffset:0]",
  },
  {
    icon: FiStar,
    target: 4.9,
    decimals: 1,
    suffix: "/5",
    label: "Average Rating",
    ringEndClass: "[stroke-dashoffset:2]", // 4.9 out of 5 fills 98% of the ring
  },
  {
    icon: FiTruck,
    target: null,
    staticValue: "FREE",
    suffix: "",
    label: "Delivery on Rs.5000+",
    ringEndClass: "[stroke-dashoffset:0]",
  },
  {
    icon: FiRefreshCw,
    target: 30,
    decimals: 0,
    suffix: "-Day",
    label: "Easy Returns",
    ringEndClass: "[stroke-dashoffset:0]",
  },
];

// Length of the count-up in milliseconds; long enough for every step to be seen
const COUNT_DURATION_MS = 2000;

// Gap between the start of one card and the next, in milliseconds
const STAGGER_MS = 150;

// Transition delays of the rings, one per card. They match STAGGER_MS (0, 150, 300, 450),
// so each ring starts drawing at the same moment as its number starts counting.
const RING_DELAY_CLASSES = [
  "[transition-delay:0ms]",
  "[transition-delay:150ms]",
  "[transition-delay:300ms]",
  "[transition-delay:450ms]",
];

// =============================================================================
// StatCard
// One highlight: an emerald icon circle wrapped by a progress ring that draws
// itself, and next to it the value and its label. It is a separate component so
// useCountUp is called exactly once per card, as the Rules of Hooks require.
// =============================================================================
const StatCard = ({ stat, isInView, index, shouldReduceMotion }) => {
  const Icon = stat.icon; // Icon component of this stat, rendered as JSX below
  const isNumeric = stat.target !== null; // False for stats such as "FREE" that never count
  const gradientId = `stat-ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`; // Unique, URL-safe id for this ring's gradient
  const isActive = isInView || Boolean(shouldReduceMotion); // Visitors who prefer reduced motion see the finished state at once

  // Live number while the count-up runs; stays 0 and unused for non-numeric stats
  const animatedNumber = useCountUp(
    stat.target,
    isInView && !shouldReduceMotion,
    COUNT_DURATION_MS,
    stat.decimals || 0,
    index * STAGGER_MS,
  );

  // Number the card shows right now: the final value when motion is reduced, the counting value otherwise
  const currentNumber = shouldReduceMotion ? stat.target : animatedNumber;

  // Number part shown on screen: the counting value for numeric stats, the fixed text otherwise
  const visibleNumber = isNumeric
    ? currentNumber.toFixed(stat.decimals || 0)
    : stat.staticValue;

  // Final value read by screen readers, so they never announce the intermediate counting numbers
  const finalValue = isNumeric
    ? `${stat.target.toFixed(stat.decimals || 0)}${stat.suffix}`
    : stat.staticValue;

  return (
    // The wrapper carries the entrance motion; the card inside carries the hover effects,
    // so the two transforms never compete with each other
    <motion.li
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }} // Starts slightly lower and invisible
      animate={isInView ? { opacity: 1, y: 0 } : undefined} // Settles into place once the section is on screen
      transition={{
        duration: 0.5,
        delay: (index * STAGGER_MS) / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="list-none"
    >
      <div className="group flex h-full items-center gap-2.5 rounded-2xl border border-primary-100 bg-white/80 p-2.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/15 sm:gap-3.5 sm:p-3.5">
        {/* Circle: a progress ring that draws itself around an emerald icon disc */}
        <div className="relative size-10 shrink-0 sm:size-14">
          <svg
            aria-hidden="true"
            viewBox="0 0 56 56"
            className="absolute inset-0 size-full -rotate-90"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop
                  offset="0%"
                  className="[stop-color:var(--color-primary-light)]"
                />
                <stop
                  offset="100%"
                  className="[stop-color:var(--color-primary-dark)]"
                />
              </linearGradient>
            </defs>
            {/* Faint full circle the ring is drawn on */}
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              strokeWidth="3.5"
              className="stroke-primary/15"
            />
            {/* The ring itself: it starts empty and draws clockwise once the section is on screen */}
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              pathLength="100"
              stroke={`url(#${gradientId})`}
              className={[
                "[stroke-dasharray:100_200] transition-[stroke-dashoffset,opacity] duration-[2000ms] ease-out motion-reduce:transition-none",
                RING_DELAY_CLASSES[index],
                isActive
                  ? `${stat.ringEndClass} opacity-100`
                  : "[stroke-dashoffset:100] opacity-0",
              ].join(" ")}
            />
          </svg>

          {/* Emerald disc with the icon, centred inside the ring */}
          <div className="absolute inset-1 flex items-center justify-center rounded-full bg-linear-to-br from-primary-light to-primary-dark text-white shadow-md shadow-primary/30 transition-transform duration-300 group-hover:scale-105 sm:inset-1.5">
            <Icon aria-hidden="true" className="size-4 sm:size-5" />
          </div>
        </div>

        {/* Value and label */}
        <div className="flex min-w-0 flex-col">
          {/* Value: a dark-to-emerald gradient number followed by a smaller suffix */}
          <p className="flex items-baseline gap-0.5 whitespace-nowrap leading-none tabular-nums">
            <span
              aria-hidden="true"
              className="bg-linear-to-br from-gray-900 via-primary-dark to-primary bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl lg:text-3xl"
            >
              {visibleNumber}
            </span>
            {stat.suffix && (
              <span
                aria-hidden="true"
                className="text-xs font-bold text-primary sm:text-sm lg:text-base"
              >
                {stat.suffix}
              </span>
            )}
            <span className="sr-only">{finalValue}</span>
          </p>

          {/* Label under the value */}
          <p className="mt-1 text-[11px] font-medium leading-tight text-gray-500 sm:text-xs lg:text-sm">
            {stat.label}
          </p>
        </div>
      </div>
    </motion.li>
  );
};

const StatsBar = () => {
  // Ref attached to the section; framer-motion's useInView watches its position relative to the viewport
  const sectionRef = useRef(null);

  // Becomes true the first time most of the section is clearly inside the screen and stays true afterwards,
  // which starts every card's entrance, ring and count-up. The bottom margin keeps the start from
  // happening while the section is only peeking in at the screen edge, so the counting is seen from 0.
  const isInView = useInView(sectionRef, {
    once: true,
    amount: 0.6,
    margin: "0px 0px -60px 0px",
  });

  // True when the visitor asked their system to minimise motion
  const shouldReduceMotion = useReducedMotion();

  return (
    // Full-width band so the soft mint background reaches both screen edges;
    // only the content inside is limited by the Container
    <section
      ref={sectionRef}
      aria-label="Store highlights"
      className="w-full border-y border-primary-100 bg-linear-to-b from-primary-50 to-white py-5 sm:py-7"
    >
      <Container>
        {/* Two columns from phones up to tablets, four columns on desktops */}
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <StatCard
              key={stat.label}
              stat={stat}
              isInView={isInView}
              index={index}
              shouldReduceMotion={shouldReduceMotion}
            />
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default StatsBar;
