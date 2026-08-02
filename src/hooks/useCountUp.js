// Custom hook that animates a number counting up from 0 to a target value —
// but ONLY once it is allowed to start (we tie this to "is the element
// currently visible on screen"). This creates the "numbers rush upward
// quickly the moment this section scrolls into view" effect.
// =============================================================================

import { useEffect, useRef, useState } from "react"; // React hooks: local state, mutable refs that don't trigger re-render, and side-effects

/**
 * useCountUp
 * @param {number|null} target - The final number to land on (e.g. 120, 4.9). Pass null for non-numeric stats like "FREE" — the hook will simply do nothing for these.
 * @param {boolean} start      - Whether the animation is allowed to begin. Normally this is tied to a scroll-into-view flag from the parent component.
 * @param {number} duration    - Total animation length in milliseconds. Kept short/fast on purpose, per the "numbers should move quickly" requirement.
 * @param {number} decimals    - Number of decimal places to keep on the animated value (0 for whole numbers like 120, 1 for values like 4.9).
 * @returns {number} the current in-progress (or final) animated number, to be rendered directly in JSX
 */
const useCountUp = (target, start, duration = 1100, decimals = 0) => {
  // Holds the number currently displayed on screen while the animation is running
  const [value, setValue] = useState(0);

  // Remembers whether the animation has already played once, so scrolling
  // the section out and back into view again does NOT restart the count
  const hasAnimated = useRef(false);

  // Stores the current requestAnimationFrame id so it can be cancelled on unmount (avoids memory leaks / setting state on an unmounted component)
  const rafId = useRef(null);

  useEffect(() => {
    // Do nothing if: this stat has no number to animate (target is null),
    // the section is not yet visible (start is false), or we already ran this once before
    if (target === null || !start || hasAnimated.current) return;

    // Lock the animation so it can only ever run a single time per page load
    hasAnimated.current = true;

    // Timestamp marking the exact moment the animation begins — used to calculate progress on every frame
    const startTime = performance.now();

    // This runs on every animation frame (roughly 60 times per second)
    const tick = (now) => {
      // Milliseconds elapsed since the animation started
      const elapsed = now - startTime;

      // Progress through the animation as a 0 → 1 fraction, clamped so it never exceeds 1 (i.e. never overshoots the target)
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out-expo curve — animation starts very fast and decelerates sharply near the end, giving that quick "rushing up" feel the user asked for
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      // Work out this frame's in-between number and round it to the requested decimal precision
      const currentValue = Number((eased * target).toFixed(decimals));

      // Push the new number into state so React re-renders the counter with the updated figure
      setValue(currentValue);

      // Keep animating until progress reaches 1 (i.e. the target value has been fully reached)
      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    // Kick off the first animation frame
    rafId.current = requestAnimationFrame(tick);

    // Cleanup function — cancels any pending frame if the component unmounts mid-animation
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, start, duration, decimals]); // Re-run only if any of these actually change

  return value; // Hand back the current animated number for the caller to render
};

export default useCountUp; // Export so it can be imported inside StatsBar.jsx
