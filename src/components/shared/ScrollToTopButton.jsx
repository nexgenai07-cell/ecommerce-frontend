// ============================================================
// ScrollToTopButton — FLOATING "BACK TO TOP" BUTTON
// ============================================================
// A small circular button fixed to the bottom-right corner of every
// page. It stays hidden while the user is near the top of the page,
// fades/slides in once they scroll down past a threshold, and — when
// clicked — smoothly scrolls the page back to the very top.
// Deliberately positioned ABOVE the floating ChatIcon (which also
// lives at bottom-6 right-6) so the two floating buttons stack
// vertically instead of overlapping each other.

import { useState, useEffect } from "react";
// useState  — tracks whether the button should currently be visible
// useEffect — attaches/removes the window scroll listener

import { motion, AnimatePresence } from "framer-motion";
// motion        — animates the button's entrance/exit (fade + slide up)
// AnimatePresence — lets the button play an exit animation before being
//                   removed from the DOM, instead of just vanishing instantly

import { HiArrowUp } from "react-icons/hi2";
// HiArrowUp — solid up-arrow icon from the same "hi2" icon set already
//             used by ChatIcon (HiSparkles), keeping the icon style consistent

import cn from "../../utils/cn";
// cn — merges Tailwind class strings and resolves conflicts cleanly

// Scroll distance (in pixels) the user must scroll down before the
// button appears. 400px means roughly "past the first screenful" on
// most devices, so it doesn't show up immediately on short pages.
const SCROLL_SHOW_THRESHOLD = 400;

const ScrollToTopButton = () => {
  // isVisible — true once the user has scrolled past SCROLL_SHOW_THRESHOLD
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reads the current vertical scroll position and updates visibility.
    // Only calls setState when the visibility actually needs to flip,
    // so this doesn't trigger a re-render on every single scroll pixel.
    const handleScroll = () => {
      const shouldShow = window.scrollY > SCROLL_SHOW_THRESHOLD;
      setIsVisible((currentlyVisible) => {
        if (currentlyVisible === shouldShow) return currentlyVisible;
        return shouldShow;
      });
    };

    // passive: true tells the browser this listener will never call
    // preventDefault(), so scrolling stays smooth/performant
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Run once on mount too — covers the case where the page is
    // reloaded while already scrolled down (e.g. browser scroll
    // restoration on refresh), so the button shows immediately if needed
    handleScroll();

    // Cleanup — removes the listener when the component unmounts,
    // preventing a memory leak / stale closure warning
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // empty dependency array — attach the listener only once

  // Click handler — smoothly animates the scroll position back to the top.
  // Smooth (not instant) is intentional here: this is a deliberate user
  // action, so an animated scroll gives clear visual feedback that the
  // click worked, unlike the route-change reset which is instant on purpose.
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    // AnimatePresence watches its direct child — when isVisible flips to
    // false, it lets the motion.button play its "exit" animation first
    // instead of ripping it out of the DOM instantly
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={handleScrollToTop}
          aria-label="Scroll back to top"
          // Screen readers announce this button's purpose even though it
          // has no visible text label — same accessibility pattern as ChatIcon
          initial={{ opacity: 0, y: 16 }}
          // initial — starting state when the button first mounts:
          // invisible and offset 16px downward (so it slides up into place)
          animate={{ opacity: 1, y: 0 }}
          // animate — the resting, fully-visible state it animates to
          exit={{ opacity: 0, y: 16 }}
          // exit — mirrors "initial", so it fades/slides back down when hidden
          transition={{ duration: 0.2, ease: "easeOut" }}
          // transition — quick 200ms animation so it feels snappy, not sluggish
          className={cn(
            "fixed right-6 z-modal",
            // fixed + right-6: 24px from the right edge, matches ChatIcon's
            //   right-side alignment so both buttons line up vertically
            // z-modal: uses the project's shared --z-index-modal token, the
            //   same layer ChatIcon uses, so this sits above normal page
            //   content and scrolls-with-viewport correctly everywhere
            "bottom-24",
            // bottom-24 (96px): stacked directly above ChatIcon, which sits
            //   at bottom-6 (24px) and is 56px tall (24px + 56px = 80px),
            //   leaving a clean 16px gap between the two floating buttons
            "w-12 h-12 rounded-full",
            // 48px circular button — intentionally smaller than ChatIcon's
            //   56px, since this is a secondary/utility action, not the
            //   primary floating action (the AI assistant)
            "bg-linear-to-br from-primary to-primary-dark",
            // Same emerald brand gradient as ChatIcon and the rest of the
            //   site's primary actions — keeps all floating buttons on-brand
            "shadow-lg hover:shadow-xl",
            // Soft elevation at rest, slightly stronger on hover — matches
            //   ChatIcon's elevation behavior
            "flex items-center justify-center",
            // Perfectly centers the arrow icon inside the circle
            "transition-shadow duration-150 hover:scale-105 active:scale-95",
            // Subtle press/hover feedback; only "shadow" is Tailwind-transitioned
            //   here since opacity/position are already owned by Framer Motion above
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            // Accessible keyboard focus ring, identical style to ChatIcon
          )}
        >
          {/* Up-arrow icon, white so it stands out against the green gradient */}
          <HiArrowUp className="w-5 h-5 text-white" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTopButton;
// Default export — imported in CustomerLayout.jsx and AdminLayout.jsx as:
// import ScrollToTopButton from "../shared/ScrollToTopButton"
