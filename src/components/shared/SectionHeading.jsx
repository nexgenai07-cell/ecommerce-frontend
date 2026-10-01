// ============================================================
// SectionHeading
// ============================================================
// A reusable animated heading block for the sections of a page.
// It is made of a title whose words rise into view one after
// another, a highlighted word with a flowing emerald gradient, an
// animated underline as wide as the title and an optional subtitle.
//
// Props:
//   title     -> the plain part of the heading, for example "Curated"
//   highlight -> the last word or words, drawn with the gradient
//   subtitle  -> supporting sentence under the underline
//   align     -> "center" (default) or "left"
//   action    -> optional element placed at the right edge of the
//                heading on larger screens and below it on phones
//   className -> extra classes for the outer wrapper, such as margins
//
// Behavior notes:
//   - The entrance plays once, when the heading is clearly on screen.
//   - Visitors who prefer reduced motion see the finished heading at once.
//   - The keyframes of the gradient flow live in src/index.css.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion"; // Entrance motion, scroll-visibility detection and the reduced-motion setting

import cn from "../../utils/cn"; // Merges Tailwind class names and resolves conflicts

const EASE_OUT = [0.22, 1, 0.36, 1]; // Soft deceleration shared by every movement

// The wrapper only sequences its children; each child defines its own motion.
const WRAPPER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// The title only sequences its words, which rise one after another.
const TITLE_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

// One word slides up from behind the edge of its own clipping box.
const WORD_VARIANTS = {
  hidden: { y: "115%" },
  visible: { y: "0%", transition: { duration: 0.7, ease: EASE_OUT } },
};

// Underline grows outwards from its anchor point.
const UNDERLINE_VARIANTS = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

// Subtitle fades in while rising slightly.
const SUBTITLE_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

// Action fades in after the title has appeared.
const ACTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT, delay: 0.4 },
  },
};

// Classes of the highlighted words: a looping emerald gradient that flows through the letters.
const HIGHLIGHT_CLASSES =
  "bg-linear-to-r from-primary-dark via-primary-light to-primary-dark bg-size-[200%_auto] bg-clip-text text-transparent animate-[sectionHeadingFlow_4s_linear_infinite] motion-reduce:animate-none";

// Classes of the underline: the same flowing gradient drawn as a rounded bar.
const UNDERLINE_CLASSES =
  "block h-1 w-full rounded-full bg-linear-to-r from-primary-dark via-primary-light to-primary-dark bg-size-[200%_auto] shadow-sm shadow-primary/30 animate-[sectionHeadingFlow_4s_linear_infinite] motion-reduce:animate-none";

const SectionHeading = ({
  title,
  highlight,
  subtitle,
  align = "center",
  action = null,
  className,
}) => {
  const wrapperRef = useRef(null); // Element watched for entering the screen
  const isCentered = align === "center"; // False for the left aligned layout
  const shouldReduceMotion = useReducedMotion(); // True when the visitor asked to minimise motion

  // Becomes true once most of the heading is clearly on screen and stays true afterwards.
  const isInView = useInView(wrapperRef, {
    once: true,
    amount: 0.6,
    margin: "0px 0px -40px 0px",
  });

  const motionState = isInView || shouldReduceMotion ? "visible" : "hidden"; // Variant currently played
  const initialState = shouldReduceMotion ? "visible" : "hidden"; // Variant shown before the first frame

  // Every word with a flag that tells whether it belongs to the highlighted part.
  const words = [
    ...(title
      ? title.split(" ").map((text) => ({ text, isHighlight: false }))
      : []),
    ...(highlight
      ? highlight.split(" ").map((text) => ({ text, isHighlight: true }))
      : []),
  ];

  const fullTitle = [title, highlight].filter(Boolean).join(" "); // Plain heading text for assistive technology

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative isolate flex flex-col gap-2",
        isCentered ? "items-center" : "items-start",
        className,
      )}
    >
      {/* Soft emerald glow behind the heading */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 -z-10 h-20 w-48 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl sm:h-24 sm:w-72",
          isCentered ? "left-1/2 -translate-x-1/2" : "left-0",
        )}
      />

      <motion.div
        variants={WRAPPER_VARIANTS}
        initial={initialState}
        animate={motionState}
        className={cn(
          "flex min-w-0 max-w-full flex-col gap-1.5 sm:gap-2",
          isCentered ? "items-center text-center" : "items-start text-left",
        )}
      >
        {/* Title with its underline; the underline is as wide as the title */}
        <div className="flex w-fit max-w-full flex-col gap-1.5">
          <motion.h2
            variants={TITLE_VARIANTS}
            aria-label={fullTitle}
            className={cn(
              "flex flex-wrap gap-x-[0.28em] text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl lg:text-5xl",
              isCentered ? "justify-center" : "justify-start",
            )}
          >
            {words.map((word, index) => (
              <span
                key={`${word.text}-${index}`}
                aria-hidden="true"
                className="-my-[0.1em] inline-block overflow-hidden py-[0.1em]"
              >
                <motion.span
                  variants={WORD_VARIANTS}
                  className={cn(
                    "inline-block",
                    word.isHighlight && HIGHLIGHT_CLASSES,
                  )}
                >
                  {word.text}
                </motion.span>
              </span>
            ))}
          </motion.h2>

          <motion.span
            variants={UNDERLINE_VARIANTS}
            aria-hidden="true"
            className={cn(
              UNDERLINE_CLASSES,
              isCentered ? "origin-center" : "origin-left",
            )}
          />
        </div>

        {/* Supporting sentence */}
        {subtitle && (
          <motion.p
            variants={SUBTITLE_VARIANTS}
            className={cn(
              "text-sm text-gray-500 sm:text-base",
              isCentered ? "max-w-md" : "max-w-xl",
            )}
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>

      {/* Optional element: below the heading on phones, at the right edge on larger screens */}
      {action && (
        <motion.div
          variants={ACTION_VARIANTS}
          initial={initialState}
          animate={motionState}
          className="sm:absolute sm:bottom-1 sm:right-0"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
};

export default SectionHeading;
