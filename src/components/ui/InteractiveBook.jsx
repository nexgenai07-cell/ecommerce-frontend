import { useCallback, useEffect, useRef, useState } from "react"; // Hooks for the book state, stable handlers, timers and the scroll observer
import { AiOutlineClose, AiOutlineReload } from "react-icons/ai"; // Icons for the close button and the "read again" button
import cn from "../../utils/cn"; // Tailwind class-merging helper used to combine class names conditionally

// ============================================================
// INTERACTIVE BOOK
// A 3D page-flip book. It rests tilted until it scrolls into view,
// then spins quickly and lands straight. It opens when the cover is
// clicked and turns one page each time a page is clicked.
//
// When the reader reaches the last spread and does nothing for a few
// seconds, all pages immediately turn back in fast motion and the book
// closes again. The "Read Again" button on the back cover runs the same
// fast page turn back to the first spread and keeps the book open.
//
// Page model
//   - Every entry of `pages` is one physical sheet of paper.
//   - `front` is printed on the right-hand side of the sheet.
//   - `back` is printed on the left-hand side once the sheet is turned.
//   - `coverInner` is printed on the inside of the front cover.
//
// Reading spreads (left page | right page)
//   1. coverInner        | pages[0].front
//   2. pages[0].back     | pages[1].front
//   3. pages[n-1].back   | back cover
//
// All static styling lives in index.css under the "zyron-book" classes.
// The book scales itself from the width of its wrapper, so no size
// props or inline styles are required.
// ============================================================

// Stacking values applied to the sheets while they are turning. A
// sheet that has not been turned yet sits above the sheets that come
// after it; a turned sheet sits above the sheets that come before it.
// Tailwind needs to see every class name as a complete string, so the
// values are listed literally. The list supports books of up to 8 sheets.
const PAGE_Z_INDEX_CLASSES = [
  "z-0",
  "z-[1]",
  "z-[2]",
  "z-[3]",
  "z-[4]",
  "z-[5]",
  "z-[6]",
  "z-[7]",
  "z-[8]",
];

// Tags of elements that use the arrow keys themselves. Book shortcuts
// are ignored while one of these has focus so typing is never hijacked.
const EDITABLE_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

const AUTO_REWIND_IDLE_MS = 5000; // Time of inactivity on the last spread before the book turns back by itself
const REWIND_STEP_MS = 150; // Pause between two automatic page turns; much shorter than a turn so the pages flip almost on top of each other
const REWIND_CLOSE_DELAY_MS = 280; // Short wait for the first page to land before the cover starts closing
const REWIND_FINISH_MS = 1100; // Time the fast-motion styling stays active while the cover finishes closing
const REWIND_RESTART_SETTLE_MS = 450; // Time the fast-motion styling stays active while the first page lands after a restart
const REVEAL_THRESHOLD = 0.35; // Share of the book area that must be visible before its entrance spin starts

const InteractiveBook = ({
  title, // Main title printed on the front cover
  subtitle, // Small uppercase line printed under the title
  coverImage, // Optional cover photo URL; a brand gradient artwork is drawn when omitted
  coverImageAlt = "", // Alternative text for the cover photo
  coverEmblem, // Optional node shown on the front cover and on the back cover
  coverInner, // Node printed on the inside of the front cover (left page of the first spread)
  pages, // Array of { id, front, back } objects, one per sheet
  endTitle = "The End", // Heading printed on the back cover
  endSubtitle, // Optional sentence printed under the back cover heading
  restartLabel = "Read Again", // Label of the button that returns to the first spread
  className, // Extra classes for the outer wrapper
}) => {
  const [isOpen, setIsOpen] = useState(false); // Whether the cover has been opened
  const [currentPageIndex, setCurrentPageIndex] = useState(-1); // Index of the last turned sheet; -1 means no sheet has been turned yet
  const [isRevealed, setIsRevealed] = useState(
    () => typeof IntersectionObserver === "undefined",
  ); // True once the book has scrolled into view; browsers without the observer skip the tilted state
  const [rewindMode, setRewindMode] = useState(null); // Null when idle; "close" while the book turns back and closes by itself; "restart" while it turns back to the first spread and stays open
  const sceneRef = useRef(null); // The element watched by the scroll observer
  const lastActivityRef = useRef(0); // Timestamp of the latest reader activity, used by the idle timer
  const totalPages = pages.length; // Number of sheets in the book

  // Records reader activity and stops any automatic rewind in progress
  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setRewindMode(null); // Any reader action cancels an automatic rewind
  }, []);

  // Opens the front cover
  const openBook = useCallback(() => {
    markActivity();
    setIsRevealed(true); // An opened book is always straight
    setIsOpen(true);
  }, [markActivity]);

  // Closes the book and returns every sheet to its unturned position
  const closeBook = useCallback(
    (event) => {
      event?.stopPropagation(); // Prevents the click from also triggering the page underneath
      markActivity();
      setIsOpen(false);
      setCurrentPageIndex(-1);
    },
    [markActivity],
  );

  // Turns the next sheet from right to left, stopping at the last one
  const goToNextPage = useCallback(
    (event) => {
      event?.stopPropagation(); // Prevents the click from bubbling to other page handlers
      markActivity();
      setCurrentPageIndex((current) => Math.min(current + 1, totalPages - 1));
    },
    [markActivity, totalPages],
  );

  // Turns the previous sheet back from left to right, stopping at the cover
  const goToPreviousPage = useCallback(
    (event) => {
      event?.stopPropagation(); // Prevents the click from bubbling to other page handlers
      markActivity();
      setCurrentPageIndex((current) => Math.max(current - 1, -1));
    },
    [markActivity],
  );

  // Turns every page back in fast motion to the first spread and keeps the book open
  const restartBook = useCallback((event) => {
    event?.stopPropagation(); // Keeps the click local to the button
    lastActivityRef.current = Date.now();
    setRewindMode("restart");
  }, []);

  // Lets keyboard users open the cover with Enter or Space
  const handleCoverKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // Stops Space from scrolling the page
      openBook();
    }
  };

  // Straightens the book the first time it scrolls into view
  useEffect(() => {
    const scene = sceneRef.current;
    if (isRevealed || !scene) return undefined; // Nothing to observe once the book is revealed

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect(); // The reveal happens only once
        }
      },
      { threshold: REVEAL_THRESHOLD },
    );

    observer.observe(scene);
    return () => observer.disconnect(); // Stops observing when the book unmounts
  }, [isRevealed]);

  // Starts the automatic rewind after a period of inactivity on the last spread
  useEffect(() => {
    if (!isOpen || rewindMode !== null || currentPageIndex !== totalPages - 1)
      return undefined; // The timer only runs while the last spread is showing

    lastActivityRef.current = Date.now(); // The idle period starts the moment the last spread appears
    let timerId;

    const checkIdle = () => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= AUTO_REWIND_IDLE_MS) {
        setRewindMode("close");
      } else {
        timerId = setTimeout(checkIdle, AUTO_REWIND_IDLE_MS - idleFor); // Recent activity: wait for the remaining time
      }
    };

    timerId = setTimeout(checkIdle, AUTO_REWIND_IDLE_MS);
    return () => clearTimeout(timerId); // Cancels the timer when anything changes
  }, [isOpen, rewindMode, currentPageIndex, totalPages]);

  // Turns the pages back in fast motion. In "close" mode the cover then closes as well; in "restart" mode the book stays open on the first spread.
  useEffect(() => {
    if (rewindMode === null) return undefined;

    let delay; // Wait before the next step
    let step; // Action performed after the wait

    if (currentPageIndex > -1) {
      delay = REWIND_STEP_MS;
      step = () => setCurrentPageIndex((current) => Math.max(current - 1, -1)); // Turns one more page back
    } else if (rewindMode === "close" && isOpen) {
      delay = REWIND_CLOSE_DELAY_MS;
      step = () => setIsOpen(false); // Every page is back, so the cover closes
    } else {
      delay =
        rewindMode === "close" ? REWIND_FINISH_MS : REWIND_RESTART_SETTLE_MS;
      step = () => setRewindMode(null); // The last movement has landed, so normal timing returns
    }

    const timerId = setTimeout(step, delay);
    return () => clearTimeout(timerId); // Cancels the pending step if the reader interrupts
  }, [rewindMode, isOpen, currentPageIndex]);

  // Keyboard shortcuts while the book is open: arrows turn pages, Escape closes
  useEffect(() => {
    if (!isOpen) return undefined; // Shortcuts are only active for an open book

    const handleKeyDown = (event) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return; // Leave browser and app shortcuts alone
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || EDITABLE_TAGS.includes(target.tagName))
      ) {
        return; // The user is typing in a field
      }

      if (event.key === "ArrowRight") goToNextPage();
      else if (event.key === "ArrowLeft") goToPreviousPage();
      else if (event.key === "Escape") closeBook();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown); // Removes the listener when the book closes or unmounts
  }, [isOpen, goToNextPage, goToPreviousPage, closeBook]);

  return (
    <div className={cn("zyron-book-stage", className)}>
      {/* The scene provides the 3D perspective and reserves vertical room for the book, its shadow and the controls. Any pointer activity inside it counts as reader activity. */}
      <div
        ref={sceneRef}
        className="zyron-book-scene"
        role="group"
        aria-label={title}
        onPointerDown={markActivity}
        onPointerMove={markActivity}
      >
        {/* The book itself; it slides sideways when opened so the two-page spread stays centered */}
        <div className="zyron-book-tilt" data-revealed={isRevealed}>
          <div
            className="zyron-book"
            data-open={isOpen}
            data-rewinding={rewindMode !== null}
          >
            {/* ---------- FRONT COVER ---------- */}
            <div className="zyron-book__cover">
              {/* Outside of the cover */}
              <div
                className="zyron-book__face zyron-book__face--front group cursor-pointer rounded-l-sm rounded-r-md shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                role="button"
                tabIndex={isOpen ? -1 : 0}
                aria-label={`Open the book: ${title}`}
                aria-hidden={isOpen}
                onClick={isOpen ? undefined : openBook}
                onKeyDown={handleCoverKeyDown}
              >
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={coverImageAlt}
                    className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    draggable={false}
                  />
                ) : (
                  // Generated brand artwork used when no cover photo is supplied
                  <div className="absolute inset-0 overflow-hidden bg-linear-to-br from-emerald-900 via-primary-dark to-primary transition-transform duration-700 group-hover:scale-105">
                    <div className="absolute -right-[30cqw] -top-[30cqw] size-[90cqw] rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-[25cqw] -left-[25cqw] size-[80cqw] rounded-full bg-black/20 blur-2xl" />
                    <div className="absolute -right-[45cqw] -top-[45cqw] size-[120cqw] rounded-full border border-white/15" />
                    <div className="absolute -right-[65cqw] -top-[65cqw] size-[160cqw] rounded-full border border-white/10" />
                  </div>
                )}

                {/* Dark gradient that keeps the title readable on any artwork */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                {/* Optional emblem in the top corner */}
                {coverEmblem && (
                  <div className="absolute left-[11cqw] top-[9cqw]">
                    {coverEmblem}
                  </div>
                )}

                {/* Title block at the bottom of the cover */}
                <div className="absolute inset-x-[9cqw] bottom-[9cqw] text-left text-white">
                  <h3 className="mb-[2.5cqw] font-serif text-[clamp(1.05rem,8.5cqw,2rem)] font-bold leading-tight tracking-wide drop-shadow-md">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="inline-block border-t border-white/30 pt-[2cqw] font-sans text-[clamp(0.55rem,3cqw,0.75rem)] uppercase tracking-widest opacity-90">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Spine highlight and the hinge crease of the cover */}
                <div className="absolute inset-y-0 left-0 w-[5%] bg-linear-to-r from-white/30 to-transparent opacity-40" />
                <div className="absolute inset-y-0 left-[4%] w-px bg-black/30" />
              </div>

              {/* Inside of the cover; it becomes the left page of the first spread */}
              <div
                className="zyron-book__face zyron-book__face--back zyron-book__face--paper zyron-book__face--left rounded-l-md rounded-r-sm shadow-xl"
                onClick={goToPreviousPage}
              >
                {coverInner}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-[9%] bg-linear-to-l from-black/10 to-transparent" />
              </div>
            </div>

            {/* ---------- SHEETS AND BACK COVER ---------- */}
            <div className="zyron-book__pages">
              {pages.map((page, index) => {
                const isFlipped = index <= currentPageIndex; // Sheets up to the current index have been turned to the left
                const stackOrder = isFlipped ? index + 1 : totalPages - index; // Stacking rule described next to PAGE_Z_INDEX_CLASSES

                return (
                  <div
                    key={page.id}
                    className={cn(
                      "zyron-book__page",
                      PAGE_Z_INDEX_CLASSES[
                        Math.min(stackOrder, PAGE_Z_INDEX_CLASSES.length - 1)
                      ],
                    )}
                    data-flipped={isFlipped}
                  >
                    {/* Right-hand side of the sheet; clicking it turns the sheet forward */}
                    <div
                      className="zyron-book__face zyron-book__face--front zyron-book__face--paper"
                      onClick={goToNextPage}
                    >
                      {page.front}
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-[9%] bg-linear-to-r from-black/10 to-transparent" />
                    </div>

                    {/* Left-hand side of the sheet; clicking it turns the sheet back */}
                    <div
                      className="zyron-book__face zyron-book__face--back zyron-book__face--paper zyron-book__face--left"
                      onClick={goToPreviousPage}
                    >
                      {page.back}
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-[9%] bg-linear-to-l from-black/10 to-transparent" />
                    </div>
                  </div>
                );
              })}

              {/* Plain outside of the back cover, only visible when the book is seen from behind */}
              <div className="zyron-book__rear" aria-hidden="true" />

              {/* Back cover, revealed on the right once every sheet has been turned */}
              <div className="zyron-book__back-cover">
                {/* Decorative circles that echo the front cover artwork */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -left-[30cqw] -top-[30cqw] size-[90cqw] rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-[30cqw] -right-[30cqw] size-[90cqw] rounded-full bg-black/25 blur-2xl" />
                  <div className="absolute -bottom-[45cqw] -right-[45cqw] size-[120cqw] rounded-full border border-white/15" />
                  <div className="absolute -bottom-[65cqw] -right-[65cqw] size-[160cqw] rounded-full border border-white/10" />
                  {/* Glossy light band sweeping across the cover */}
                  <div className="zyron-book__shine absolute inset-y-0 left-0 w-[30%] bg-linear-to-r from-transparent via-white/15 to-transparent" />
                </div>

                {/* Fine embossed frame inside the cover edge */}
                <div className="pointer-events-none absolute inset-[4.5cqw] rounded-[3cqw] border border-white/25" />

                {/* Shadow that follows the spine */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-[8%] bg-linear-to-r from-black/35 to-transparent" />

                {/* Message and restart button */}
                <div className="zyron-book__pad zyron-book__type relative flex size-full flex-col items-center justify-center gap-[1em] text-center text-white">
                  {coverEmblem}
                  <p className="font-serif text-[1.55em] font-bold leading-tight tracking-wide drop-shadow-md">
                    {endTitle}
                  </p>
                  <span
                    className="h-px w-[3em] bg-white/40"
                    aria-hidden="true"
                  />
                  {endSubtitle && (
                    <p className="max-w-[16em] font-sans text-[0.85em] leading-[1.5] text-white/80">
                      {endSubtitle}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={restartBook}
                    className="mt-[0.4em] flex cursor-pointer items-center gap-[0.6em] whitespace-nowrap rounded-full border border-white/40 bg-white/15 px-[1.4em] py-[0.7em] font-sans text-[0.9em] font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <AiOutlineReload aria-hidden="true" />
                    {restartLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Close button, attached to the top-right corner of the open book */}
        <button
          type="button"
          onClick={closeBook}
          disabled={!isOpen}
          aria-label="Close the book"
          className={cn(
            "zyron-book__close flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-gray-900 hover:text-white hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-10",
            isOpen
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-50 opacity-0",
          )}
        >
          <AiOutlineClose className="size-4 sm:size-5" aria-hidden="true" />
        </button>

        {/* Hint below the closed book; removed while the book is open */}
        {!isOpen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <button
              type="button"
              onClick={openBook}
              className="zyron-book__hint pointer-events-auto cursor-pointer font-sans text-xs font-medium uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
            >
              <span className="sm:hidden">Tap to Open</span>
              <span className="hidden sm:inline">Click to Open</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveBook; // Exported so any section can render its own book
