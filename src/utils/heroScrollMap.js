// ============================================================
// heroScrollMap - UTILITY MODULE
// ============================================================
// Single source of truth that translates the scroll progress of the
// homepage hero (a number between 0 and 1) into the exact visual state
// of the hero: which category backdrop pair is on screen, how far the
// dissolve transition has progressed, and which category's content
// (title + product sprinkles) should currently be visible.
// Both the WebGL backdrop and the DOM content read from this one
// function, so they can never get out of sync with each other.

// Maximum number of categories the hero presents one after another.
export const HERO_MAX_CATEGORIES = 3;

// Height in pixels of the sticky site navbar that sits above the pinned
// hero stage. Must stay equal to the "top-16" offset (4rem) used by the
// ".hero-sticky" class in index.css so scroll progress starts exactly
// when the stage becomes pinned.
export const HERO_NAVBAR_OFFSET_PX = 64;

// Share of every category segment during which the category stays still
// before the dissolve transition starts (0.28 = first 28 percent).
const HOLD_BEFORE_DISSOLVE = 0.28;

// Share of every category segment kept still after the dissolve has
// finished, so the next category rests fully revealed before moving on.
const HOLD_AFTER_DISSOLVE = 0.12;

// Dissolve progress above which the current category content starts to
// scatter away (the dissolve hole has just begun to open).
const CONTENT_HIDE_AT = 0.1;

// Dissolve progress above which the next category content starts to
// fly in (the dissolve is nearly complete).
const CONTENT_SHOW_AT = 0.72;

// Restricts a number to the inclusive range between min and max.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Converts overall hero scroll progress into the full hero frame state.
//   progress - overall scroll progress of the hero track, from 0 to 1
//   count    - number of categories currently shown in the hero
// Returns:
//   segment      - index of the category whose backdrop is the "front" layer
//   dissolve     - dissolve progress from 0 (intact) to 1 (fully dissolved)
//   visibleIndex - index of the category whose content is visible, or -1
//                  while the dissolve is in between two categories
export const resolveHeroFrame = (progress, count) => {
  // With no categories there is nothing to present at all.
  if (count <= 0) {
    return { segment: 0, dissolve: 0, visibleIndex: -1 };
  }

  // A single category never dissolves; it is simply shown.
  if (count === 1) {
    return { segment: 0, dissolve: 0, visibleIndex: 0 };
  }

  // Scroll position expressed in "category units": 0 is the first
  // category, 1 is the second, and so on up to count - 1.
  const position = clamp(progress, 0, 1) * (count - 1);

  // Index of the transition currently in progress (category -> next).
  const segment = Math.min(Math.floor(position), count - 2);

  // How far we are inside the current transition, from 0 to 1.
  const localProgress = position - segment;

  // Dissolve progress after removing the still periods at both ends.
  const dissolve = clamp(
    (localProgress - HOLD_BEFORE_DISSOLVE) /
      (1 - HOLD_BEFORE_DISSOLVE - HOLD_AFTER_DISSOLVE),
    0,
    1,
  );

  // Decide which category content is visible for this dissolve stage.
  let visibleIndex = -1;
  if (dissolve < CONTENT_HIDE_AT) {
    // Dissolve has not really started: the current category is shown.
    visibleIndex = segment;
  } else if (dissolve > CONTENT_SHOW_AT) {
    // Dissolve is almost done: the next category is shown.
    visibleIndex = segment + 1;
  }

  // Hand the complete state back to the caller.
  return { segment, dissolve, visibleIndex };
};
