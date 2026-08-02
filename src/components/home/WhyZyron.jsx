import { useState, useEffect, useRef, useCallback } from "react"; // React hooks: state, side-effects (autoplay), refs, memoized callbacks
import { motion, AnimatePresence } from "framer-motion"; // Animation library used for the stacked-image transitions and the fade/slide text transitions
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai"; // Arrow icons for the prev/next navigation buttons
import { BsRobot, BsTruck, BsHeadset } from "react-icons/bs"; // Small badge icons shown next to each feature's text (kept separate from the card image)
import Container from "../layouts/Container"; // Shared layout wrapper that centers content and adds consistent horizontal padding
import cn from "../../utils/cn"; // Tailwind class-merging helper used to conditionally combine class names safely

// =============================================
// FEATURE DATA — same 3 features as the original "Why Choose Zyron" section.
// Each points to a real, topic-related, high-quality photo for the card image,
// plus a small icon that sits next to the text on the right — icon and photo
// are intentionally kept separate.
// =============================================
const FEATURES = [
  {
    id: 1, // Unique id — used as the React list key instead of the title
    label: "Feature 01", // Small eyebrow tag shown above the icon on the text side
    title: "AI Recommendations",
    description:
      "Our proprietary AI learns your style and curates a personalized selection just for you, getting smarter with every interaction.",
    // Real, high-resolution photo related to AI/circuit technology, sharply
    // cropped and centered so it fills the frame cleanly at any card size
    image:
      "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=85&auto=format&fit=crop&crop=entropy",
    Icon: BsRobot, // Small badge icon shown beside the title on the text side
  },
  {
    id: 2,
    label: "Feature 02",
    title: "Lightning Fast Delivery",
    description:
      "Logistics optimized for maximum speed. Most orders arrive within 2-3 business days with real-time tracking.",
    // Real, high-resolution photo of a shipping/delivery package
    image:
      "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?w=1200&q=85&auto=format&fit=crop&crop=entropy",
    Icon: BsTruck,
  },
  {
    id: 3,
    label: "Feature 03",
    title: "24/7 AI Support",
    description:
      "Intelligent assistance available around the clock. Get instant answers to any question, anytime you need help.",
    // Real, high-resolution photo of a customer-support headset
    image:
      "https://images.unsplash.com/photo-1553775282-20af80779df7?w=1200&q=85&auto=format&fit=crop&crop=entropy",
    Icon: BsHeadset,
  },
]; // End of the FEATURES array

const AUTOPLAY_MS = 5000; // How long (in ms) each slide stays visible before automatically advancing

// A small fixed set of "random-looking" rotation angles, one per feature — this
// gives the stacked-photo deck its slightly messy, hand-placed look instead of
// a perfectly neat stack. Declared OUTSIDE the component as a plain constant
// (not via Math.random during render) so the component stays pure.
const STACK_ROTATIONS = [-6, 4, -3];

const WhyZyron = () => {
  const [activeIndex, setActiveIndex] = useState(0); // Index of the feature currently shown on both the image stack and the text side
  const total = FEATURES.length; // Total number of features — used for wraparound math below

  const isPausedRef = useRef(false); // Ref (not state) so hovering doesn't trigger re-renders — only read inside the autoplay interval
  const autoplayIntervalRef = useRef(null); // Holds the autoplay interval ID so it can be cleared on unmount

  // goTo() moves to any target index, wrapping around circularly using the
  // "positive modulo" trick so negative indices correctly loop to the end
  const goTo = useCallback(
    (targetIndex) => setActiveIndex(((targetIndex % total) + total) % total),
    [total],
  );

  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]); // Advances to the next feature
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]); // Goes back to the previous feature

  // ---- Autoplay effect — automatically advances the slide, pausable on hover ----
  useEffect(() => {
    if (total <= 1) return undefined; // No autoplay needed if there's nothing to cycle through

    autoplayIntervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveIndex((current) => (current + 1) % total); // Advance to the next slide, wrapping back to 0 at the end
      }
    }, AUTOPLAY_MS);

    return () => clearInterval(autoplayIntervalRef.current); // Clean up the interval on unmount or when "total" changes
  }, [total]);

  const activeFeature = FEATURES[activeIndex]; // Convenience reference to the currently active feature object
  const ActiveIcon = activeFeature.Icon; // Pull out the active feature's icon component so it can be rendered as <ActiveIcon />

  return (
    // Outer <section> wrapper — a soft gradient backdrop (rather than plain
    // white) so the raised white card below visually pops out and reads as
    // its own distinct block instead of blending into the page
    <section className="py-16 sm:py-10 px-4 sm:px-6 lg:px-10 bg-linear-to-b from-gray-50 via-primary-50/40 to-gray-50">
      <Container>
        {/* ============ SECTION HEADER ============ */}
        <div className="flex flex-col items-center text-center gap-3 mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-gray-900">
            Why Choose Zyron
          </h2>
          <p className="text-sm sm:text-base text-gray-500 max-w-md">
            Built different. Designed for the modern shopper.
          </p>
        </div>

        {/* ============ RAISED, CENTERED CARD ============ */}
        {/* Wrapping the whole layout in its own white, shadowed, rounded
            card makes this block visually distinct from the sections above
            and below it, and gives it a "lifted up" appearance — as if it's
            floating above the gradient backdrop rather than sitting flush */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 sm:p-8 md:p-10">
          {/* ============ ANIMATED IMAGE + CONTENT LAYOUT ============ */}
          {/* Two-column layout on desktop: framed photo deck on the left,
              richly-styled feature text + icon + navigation on the right. */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 items-center"
            onMouseEnter={() => (isPausedRef.current = true)} // Pause autoplay while the user is hovering the whole block
            onMouseLeave={() => (isPausedRef.current = false)} // Resume autoplay once the mouse leaves
          >
            {/* ---- LEFT: framed, stacked photo deck ---- */}
            <div
              className="relative h-55 sm:h-65 md:h-70 max-w-75 sm:max-w-85 md:max-w-none mx-auto w-full why-zyron-perspective" // why-zyron-perspective now defined in index.css instead of an inline style object
            >
              {/* Every feature's photo is rendered at all times (not just the
                  active one) so the "deck of photos" behind the top card stays
                  visible — only their rotation/scale/opacity animate as the
                  active index changes */}
              {FEATURES.map((feature, i) => {
                const isActive = i === activeIndex; // Whether this photo is the currently-focused one on top of the stack

                return (
                  <motion.div
                    key={feature.id} // Stable key based on the feature's id, required for React list rendering
                    initial={false} // Skip the mount-in animation — cards should already be in their resting position on first paint
                    animate={{
                      // Active card sits perfectly straight and fully visible on
                      // top; inactive cards get their pre-computed tilt and sit
                      // slightly behind/smaller/faded, creating the "deck" illusion
                      rotate: isActive
                        ? 0
                        : STACK_ROTATIONS[i % STACK_ROTATIONS.length],
                      scale: isActive ? 1 : 0.9,
                      opacity: isActive ? 1 : 0.45,
                      zIndex: isActive
                        ? total
                        : total - Math.abs(i - activeIndex), // Active card always renders above the rest
                      y: isActive ? 0 : 14, // Inactive cards sit slightly lower, peeking out from behind the active one
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth, moderately quick transition between states
                    className={cn(
                      "absolute inset-0 rounded-2xl p-2 bg-white transition-shadow duration-300", // "Photo frame" padding around every card, like a mounted print
                      isActive
                        ? "shadow-[0_25px_50px_-12px_rgba(16,185,129,0.35)] ring-1 ring-primary/20" // Active card gets a soft emerald glow + hairline ring
                        : "shadow-lg", // Inactive cards keep a plainer shadow so the active one visually leads
                    )}
                  >
                    {/* Inner rounded photo — the frame (parent) provides the
                        white border margin, this fills the rest with the image */}
                    <div className="relative w-full h-full rounded-xl overflow-hidden">
                      {/* Real, topic-related photograph — NOT an icon — filling the whole inner frame */}
                      <img
                        src={feature.image} // The feature's related photo URL
                        alt={feature.title} // Descriptive alt text for accessibility, based on the feature title
                        className="w-full h-full object-cover object-center" // Fills the frame completely, cropping evenly from the center so nothing important gets cut off
                        loading="lazy" // Defers loading off-screen images until they're needed, for performance
                      />
                      {/* Subtle bottom-to-top dark gradient so the image edge always reads cleanly, regardless of the photo's own colors */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/15 via-transparent to-transparent" />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ---- RIGHT: icon + feature text + navigation, redesigned to feel richer and more intentional ---- */}
            <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left">
              {/* AnimatePresence lets the outgoing text fade/slide out while the
                  incoming text fades/slides in, instead of snapping instantly */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex} // Changing the key forces AnimatePresence to treat this as a new element to transition
                  initial={{ opacity: 0, y: 16 }} // Starts slightly lower and invisible
                  animate={{ opacity: 1, y: 0 }} // Settles into place at full opacity
                  exit={{ opacity: 0, y: -16 }} // Exits by fading out while drifting slightly upward
                  transition={{ duration: 0.3, ease: "easeInOut" }} // Quick, smooth transition timing
                  className="flex flex-col items-center md:items-start"
                >
                  {/* LINE 1 — small uppercase eyebrow label in the brand green, giving the block a sense of structure/numbering */}
                  <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-3">
                    {activeFeature.label}
                  </span>

                  {/* LINE 2 — icon sits directly in front of the heading, on the same row, instead of stacked above it */}
                  <div className="flex items-center gap-3 mb-4">
                    {/* Icon badge — gradient-filled with its own soft shadow so it reads as a deliberate design element rather than a plain flat icon */}
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-linear-to-br from-primary to-primary-dark text-white flex items-center justify-center shadow-lg shadow-primary/30">
                      <ActiveIcon className="w-5 h-5" />{" "}
                      {/* The active feature's icon, rendered in white on the gradient badge */}
                    </div>
                    {/* Feature title — large, bold, tight tracking for a premium display-heading feel, aligned right next to the icon */}
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 text-left">
                      {activeFeature.title}
                    </h3>
                  </div>

                  {/* LINE 3 — description in its own distinct callout format (soft tinted card with a colored left bar and a large decorative quote mark) instead of plain flat paragraph text */}
                  <div className="relative w-full max-w-sm bg-primary-50/70 border-l-4 border-primary rounded-r-xl rounded-l-sm px-4 py-3">
                    {/* Large decorative quote mark, purely stylistic, sitting behind the text to give the callout more visual character */}
                    <span className="absolute -top-2 left-2 text-4xl font-serif text-primary/20 select-none leading-none">
                      "
                    </span>
                    <p className="relative text-sm sm:text-base text-gray-700 leading-relaxed font-medium">
                      {activeFeature.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* ---- Prev / Next navigation buttons + a small progress counter ---- */}
              <div className="flex items-center gap-4 pt-7">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={prev} // Moves to the previous feature
                    aria-label="Previous feature" // Accessible label for screen readers
                    className="w-10 h-10 rounded-full bg-white border border-primary/30 hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] text-primary flex items-center justify-center transition-all duration-200 group"
                  >
                    <AiOutlineArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />{" "}
                    {/* Left arrow icon, nudges slightly further left on hover for a subtle interactive feel */}
                  </button>
                  <button
                    type="button"
                    onClick={next} // Moves to the next feature
                    aria-label="Next feature" // Accessible label for screen readers
                    className="w-10 h-10 rounded-full bg-white border border-primary/30 hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] text-primary flex items-center justify-center transition-all duration-200 group"
                  >
                    <AiOutlineArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />{" "}
                    {/* Right arrow icon, nudges slightly further right on hover */}
                  </button>
                </div>
                {/* Small "1 / 3" style counter, giving the navigation a bit more polish and context */}
                <span className="text-xs font-medium text-gray-400 tracking-wide">
                  {String(activeIndex + 1).padStart(2, "0")} /{" "}
                  {String(total).padStart(2, "0")}
                </span>
              </div>

              {/* ---- Small dot indicators showing progress through the features ---- */}
              <div className="flex items-center gap-1.5 pt-4">
                {FEATURES.map((feature, i) => (
                  <button
                    key={feature.id} // Unique key per dot, based on the feature's stable id
                    type="button"
                    onClick={() => goTo(i)} // Clicking a dot jumps straight to that feature
                    aria-label={`Go to feature ${i + 1}`} // Accessible label describing which slide this dot jumps to
                    aria-current={i === activeIndex} // Marks the currently active dot for assistive technology
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300", // Shared base styling for every dot
                      i === activeIndex
                        ? "w-6 bg-primary" // Active dot: wider emerald pill
                        : "w-1.5 bg-gray-300 hover:bg-gray-400", // Inactive dots: small, subtle gray circles
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default WhyZyron; // Exporting the component so it can be imported and used elsewhere in the app (Home.jsx imports this as "WhyZyron")
