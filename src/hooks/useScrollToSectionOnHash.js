import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// How often, and for how long, to look for the section while it renders.
// A section that loads its data first (for example a table behind a loading
// skeleton) may not be on screen yet when the page opens, so the hook keeps
// checking briefly before giving up.
const CHECK_INTERVAL_MS = 100;
const MAX_CHECKS = 30;

/**
 * useScrollToSectionOnHash
 *
 * Lets a link such as "/account/returns#previous-returns" open a page and
 * scroll straight down to one section of it.
 *
 * The section's component calls this hook with the id used in the URL hash
 * and attaches the returned ref to its outermost element. When the current
 * URL hash matches the id, the page scrolls smoothly until that section is
 * at the top of the screen.
 *
 * Usage:
 *   const sectionRef = useScrollToSectionOnHash("previous-returns", !isLoading);
 *   return <div ref={sectionRef} className="scroll-mt-28">...</div>;
 *
 * The scroll-mt-* class on the section keeps its heading from hiding
 * underneath the fixed navbar.
 *
 * @param {string}  sectionId - The hash value to react to, without the "#".
 * @param {boolean} isReady   - Set to false while the section's data is still
 *                              loading, so the scroll waits until the section
 *                              has its final content and height.
 * @returns {React.RefObject} Ref to attach to the section's outermost element.
 */
const useScrollToSectionOnHash = (sectionId, isReady = true) => {
  const sectionRef = useRef(null);
  const { hash, key } = useLocation();

  useEffect(() => {
    // Only act when the URL is actually pointing at this section.
    if (hash !== `#${sectionId}` || !isReady) return undefined;

    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      const section = sectionRef.current;

      // The section is rendered and has a real height — scroll to it.
      if (section && section.offsetHeight > 0) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        clearInterval(timer);
      } else if (checks >= MAX_CHECKS) {
        // The section never appeared (for example the list is empty).
        clearInterval(timer);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [hash, key, sectionId, isReady]);

  return sectionRef;
};

export default useScrollToSectionOnHash;
