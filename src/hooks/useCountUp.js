// Custom hook that animates a number counting up from 0 to a target value,
// but only once it is allowed to start (normally tied to "the element is
// currently visible on screen"). The count is slow enough at the start for
// every step to be seen, and it settles gently on the final value.
// =============================================================================

import { useEffect, useState } from "react"; // React hooks: local state and side effects

// Ease-out cubic: moves quickly at first and slows down smoothly towards the end,
// while still passing through many visible in-between numbers
const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

/**
 * useCountUp
 * @param {number|null} target - The final number to land on (e.g. 120, 4.9). Pass null for non-numeric stats such as "FREE"; the hook then does nothing.
 * @param {boolean} start      - Whether the animation may begin. The count runs once when this turns true.
 * @param {number} duration    - Length of the count in milliseconds.
 * @param {number} decimals    - Number of decimal places kept on the animated value (0 for whole numbers, 1 for values like 4.9).
 * @param {number} delay       - Time in milliseconds to wait after start becomes true before counting begins, used to stagger several counters.
 * @returns {number} the current in-progress (or final) animated number, to be rendered directly in JSX
 */
const useCountUp = (
  target,
  start,
  duration = 2000,
  decimals = 0,
  delay = 0,
) => {
  // Number currently displayed while the animation is running
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Nothing to animate for non-numeric stats, and nothing to do until the section is visible
    if (target === null || !start) return undefined;

    let frameId = null; // Id of the pending animation frame, kept so it can be cancelled
    let startTime = 0; // Moment the counting itself begins, measured after the delay

    // Runs on every animation frame (about 60 times per second)
    const tick = (now) => {
      if (startTime === 0) startTime = now; // The first frame marks the beginning of the count

      // Progress through the animation as a 0 → 1 fraction, clamped so it never overshoots
      const progress = Math.min((now - startTime) / duration, 1);

      // This frame's in-between number, rounded to the requested precision
      setValue(Number((easeOutCubic(progress) * target).toFixed(decimals)));

      // Keep going until the target value has been reached
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    // Waits for the stagger delay, then starts the frame loop
    const timeoutId = setTimeout(() => {
      frameId = requestAnimationFrame(tick);
    }, delay);

    // Cancels the pending delay and frame if the component unmounts mid-animation
    return () => {
      clearTimeout(timeoutId);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [target, start, duration, decimals, delay]);

  return value; // Current animated number for the caller to render
};

export default useCountUp;
