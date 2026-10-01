import { useState, useRef, useCallback } from "react"; // React hooks: state for the active story and pause flags, refs for drag tracking, memoized callbacks for navigation
import { motion } from "framer-motion"; // Animation library that provides the draggable wrapper used for the swipe interaction
import { BsPatchCheckFill } from "react-icons/bs"; // Verified badge icon shown in the chip on top of the featured photo
import Container from "../layouts/Container"; // Shared layout wrapper that centers content and applies consistent horizontal padding
import cn from "../../utils/cn"; // Tailwind class-merging helper used to combine class names conditionally

// ============================================================
// STORIES DATA
// Static list of customer stories rendered by the carousel.
// Optional "image" field: put a portrait photo URL (for example
// "/stories/sarah.jpg" stored in the public folder) and it replaces
// the gradient + initials artwork automatically. Portrait photos with
// a 2:3 ratio (for example 800x1200) fit the card shape best.
// ============================================================
const STORIES = [
  {
    id: 1, // Unique identifier used as the React key and for accessible labels
    name: "Sarah Johnson", // Customer's display name
    role: "Fashion Enthusiast", // Customer's role or title shown under the name
    metric: "100% spot-on recommendations", // Highlighted result shown as the large heading of the card
    text: "The curation is so precise, it feels like they know me better than I know myself. Every recommendation has been spot on.", // Customer quote
    initials: "SJ", // Initials rendered on the artwork when no photo is provided
    image: "", // Optional portrait photo URL; an empty value falls back to the gradient artwork
    panelClass: "from-emerald-500 via-emerald-600 to-teal-800", // Gradient colors of the artwork panel
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Tech Professional",
    metric: "40+ unique pieces discovered",
    text: "Finally, an AI that actually understands my aesthetic. I've discovered so many unique pieces I never would have found on my own.",
    initials: "MC",
    image: "",
    panelClass: "from-sky-500 via-blue-600 to-indigo-800",
  },
  {
    id: 3,
    name: "Priya Sharma",
    role: "Interior Designer",
    metric: "2-day average delivery",
    text: "The delivery was incredibly fast and the product quality exceeded my expectations. Will definitely be a regular customer.",
    initials: "PS",
    image: "",
    panelClass: "from-purple-500 via-fuchsia-600 to-purple-800",
  },
  {
    id: 4,
    name: "Ahmed Raza",
    role: "Small Business Owner",
    metric: "0 damaged bulk orders",
    text: "Ordering in bulk for my store has never been this smooth. Packaging is solid and nothing ever arrives damaged.",
    initials: "AR",
    image: "",
    panelClass: "from-amber-400 via-orange-500 to-orange-700",
  },
  {
    id: 5,
    name: "Emily Davis",
    role: "Frequent Shopper",
    metric: "3x faster repeat orders",
    text: "I love how the site remembers my style preferences. It genuinely feels like shopping with a friend who gets my taste.",
    initials: "ED",
    image: "",
    panelClass: "from-rose-400 via-rose-500 to-pink-700",
  },
  {
    id: 6,
    name: "Hassan Ali",
    role: "Graphic Designer",
    metric: "60-second checkout",
    text: "Clean checkout, fast support, and the product photos actually match what arrives at my door. Rare to find all three together.",
    initials: "HA",
    image: "",
    panelClass: "from-cyan-400 via-cyan-600 to-teal-800",
  },
  {
    id: 7,
    name: "Fatima Noor",
    role: "College Student",
    metric: "10+ friends referred",
    text: "Budget-friendly without feeling cheap. I've recommended this to literally every one of my roommates at this point.",
    initials: "FN",
    image: "",
    panelClass: "from-pink-400 via-fuchsia-500 to-purple-700",
  },
  {
    id: 8,
    name: "David Kim",
    role: "Photographer",
    metric: "24-hour size exchange",
    text: "Returns were painless the one time I needed to exchange a size. That alone earned my trust for future orders.",
    initials: "DK",
    image: "",
    panelClass: "from-indigo-400 via-indigo-600 to-slate-800",
  },
]; // End of the STORIES array

const TOTAL = STORIES.length; // Total number of stories, used for wrap-around navigation math

const MAX_VISIBLE_OFFSET = 3; // Farthest distance from the active card that is still positioned; cards beyond it share the hidden slot

const SWIPE_DISTANCE_PX = 60; // Minimum horizontal drag distance that counts as an intentional swipe

const SWIPE_VELOCITY = 500; // Minimum drag speed (px/s) that counts as a swipe even when the distance is short

const Testimonials = () => {
  // Index of the story that is currently featured in the center of the chain
  const [activeIndex, setActiveIndex] = useState(0);

  // True while a mouse pointer rests over the carousel, which pauses autoplay
  const [isHovered, setIsHovered] = useState(false);

  // True while a keyboard user has focus inside the carousel, which pauses autoplay
  const [isFocused, setIsFocused] = useState(false);

  // True while the user is dragging the chain, which pauses autoplay
  const [isDragging, setIsDragging] = useState(false);

  // Ref that remembers a drag happened so the click that follows a drag is ignored
  const dragMovedRef = useRef(false);

  // Autoplay stays paused whenever the user is interacting with the carousel in any way
  const isPaused = isHovered || isFocused || isDragging;

  // Moves the carousel to any index and wraps around at both ends
  const goTo = useCallback((targetIndex) => {
    setActiveIndex(((targetIndex % TOTAL) + TOTAL) % TOTAL); // Positive-modulo keeps the index inside 0..TOTAL-1 even for negative values
  }, []);

  // Advances the carousel by one story
  const next = useCallback(() => {
    setActiveIndex((current) => (current + 1) % TOTAL); // Wraps from the last story back to the first
  }, []);

  // Moves the carousel back by one story
  const prev = useCallback(() => {
    setActiveIndex((current) => (current - 1 + TOTAL) % TOTAL); // Wraps from the first story to the last
  }, []);

  // Keyboard support: left and right arrow keys change the featured story
  const handleKeyDown = (event) => {
    if (event.key === "ArrowRight") next(); // Right arrow shows the next story
    if (event.key === "ArrowLeft") prev(); // Left arrow shows the previous story
  };

  // Pauses autoplay only for real mouse pointers, so touch taps never leave autoplay stuck in a paused state
  const handlePointerEnter = (event) => {
    if (event.pointerType === "mouse") setIsHovered(true); // Ignore touch and pen pointers
  };

  // Resumes autoplay when the mouse leaves the carousel
  const handlePointerLeave = () => setIsHovered(false);

  // Pauses autoplay only when focus arrived through the keyboard, so mouse clicks on controls do not freeze it
  const handleFocus = (event) => {
    if (event.target.matches(":focus-visible")) setIsFocused(true); // Only keyboard-driven focus qualifies
  };

  // Resumes autoplay once focus has fully left the carousel
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false); // Focus moving between inner controls keeps the pause active
  };

  // Marks the start of a drag so the pointer-up click can be ignored and autoplay pauses
  const handleDragStart = () => {
    dragMovedRef.current = true; // Flag consumed by handleCardClick
    setIsDragging(true); // Pause autoplay while the chain is being dragged
  };

  // Decides whether a finished drag was a swipe and changes the story accordingly
  const handleDragEnd = (_event, info) => {
    const swipedLeft =
      info.offset.x < -SWIPE_DISTANCE_PX || info.velocity.x < -SWIPE_VELOCITY; // Dragging left reveals the next story
    const swipedRight =
      info.offset.x > SWIPE_DISTANCE_PX || info.velocity.x > SWIPE_VELOCITY; // Dragging right reveals the previous story
    if (swipedLeft)
      next(); // Show the next story after a left swipe
    else if (swipedRight) prev(); // Show the previous story after a right swipe
    setIsDragging(false); // Resume autoplay now that the drag is over
    setTimeout(() => {
      dragMovedRef.current = false; // Clear the flag after the browser has dispatched the trailing click event
    }, 60);
  };

  // Jumps to a story when its side card is clicked, unless the click belongs to a drag gesture
  const handleCardClick = (index) => {
    if (dragMovedRef.current) return; // A drag must never be treated as a click
    goTo(index); // Bring the clicked card to the center
  };

  // Signed distance of a story from the active one, using the shortest path around the loop
  const getOffset = (index) => {
    let diff = index - activeIndex; // Raw index difference between this card and the active card
    if (diff > TOTAL / 2) diff -= TOTAL; // Wrap far-right cards to the left side when that path is shorter
    if (diff < -TOTAL / 2) diff += TOTAL; // Wrap far-left cards to the right side when that path is shorter
    return Math.max(-MAX_VISIBLE_OFFSET, Math.min(MAX_VISIBLE_OFFSET, diff)); // Clamp so distant cards share one hidden slot
  };

  return (
    // Section wrapper: clips the side cards at the screen edges so the page never scrolls sideways
    <section className="pb-4 pt-2 sm:pb-6 sm:pt-3 bg-gray-50 overflow-hidden">
      {/* ============ SECTION HEADER ============ */}
      <Container>
        {/* Centered heading block with the title and a short supporting sentence */}
        <div className="flex flex-col items-center text-center gap-1 mb-4 sm:mb-5">
          {/* Main heading whose size grows from mobile to desktop */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Our Stories
          </h2>
          {/* Supporting sentence with a capped width so it never stretches on large screens */}
          <p className="text-sm sm:text-base text-gray-500 max-w-md">
            Real experiences from real Zyron shoppers
          </p>
        </div>
      </Container>

      {/* ============ CAROUSEL + PROGRESS MARKERS ============ */}
      {/* Interaction wrapper: one place to detect hover and keyboard focus for pausing autoplay. It sits outside the Container so the chain can use the full screen width. */}
      <div
        className="flex flex-col items-center gap-3 sm:gap-4"
        onPointerEnter={handlePointerEnter} // Pause autoplay while a mouse hovers the carousel
        onPointerLeave={handlePointerLeave} // Resume autoplay when the mouse leaves
        onFocus={handleFocus} // Pause autoplay while a keyboard user is inside the carousel
        onBlur={handleBlur} // Resume autoplay when focus leaves the carousel
      >
        {/* Stage: focusable region that receives the arrow-key shortcuts */}
        <div
          className="relative w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-8 focus-visible:ring-offset-gray-50"
          tabIndex={0} // Makes the stage reachable with the Tab key so keyboard navigation works
          role="region" // Identifies the stage as a landmark region for assistive technology
          aria-roledescription="carousel" // Tells screen readers that this region behaves like a carousel
          aria-label="Customer stories" // Accessible name announced for the region
          onKeyDown={handleKeyDown} // Enables left and right arrow-key navigation
        >
          {/* Draggable chain: a single grid cell in which every card is stacked and then positioned by its data-offset */}
          <motion.div
            className="story-chain relative grid grid-cols-[minmax(0,1fr)] cursor-grab select-none active:cursor-grabbing"
            drag="x" // Restricts dragging to the horizontal axis
            dragConstraints={{ left: 0, right: 0 }} // Zero-width constraint area so the chain only stretches elastically
            dragElastic={0.18} // How far the chain follows the pointer beyond the constraint area
            dragSnapToOrigin // Returns the chain to its resting position when the drag ends
            onDragStart={handleDragStart} // Pauses autoplay and flags the gesture as a drag
            onDragEnd={handleDragEnd} // Converts the finished gesture into a next or previous action
            aria-live={isPaused ? "polite" : "off"} // Announces story changes only when the user is interacting, never during autoplay
          >
            {STORIES.map((story, index) => {
              const offset = getOffset(index); // Signed distance from the active card (0 = center)
              const isActive = offset === 0; // True only for the featured card

              return (
                // Story card: its size, position and layering are driven purely by the data-offset attribute in index.css
                <article
                  key={story.id} // Stable unique key for React's list reconciliation
                  className="story-card col-start-1 row-start-1 justify-self-center self-center relative overflow-hidden bg-white shadow-xl ring-1 ring-black/5"
                  data-offset={offset} // Attribute that the CSS uses to size and place this card in the chain
                  aria-roledescription="slide" // Tells screen readers that this element is one slide of the carousel
                  aria-label={`Story ${index + 1} of ${TOTAL}`} // Accessible position label for the slide
                  aria-hidden={!isActive} // Hides side cards from screen readers so only the featured story is read
                  onClick={() => handleCardClick(index)} // Clicking a side card brings it to the center
                >
                  {/* ---------- PHOTO PANEL ---------- */}
                  {/* Photo panel: the framed portrait on side cards and the right column (or top band on phones) of the featured card */}
                  <div
                    className={cn(
                      "story-card__media overflow-hidden bg-linear-to-br", // Clips decorations and enables the gradient background
                      story.panelClass, // Per-story gradient colors
                    )}
                  >
                    {/* Real portrait photo when one is provided for this story */}
                    {story.image ? (
                      <img
                        src={story.image} // Photo source supplied in the STORIES data
                        alt="" // Decorative because the customer's name is already in the text content
                        loading="lazy" // Defers loading until the image is near the viewport
                        draggable={false} // Stops the browser's native image drag from fighting the swipe gesture
                        className="absolute inset-0 h-full w-full object-cover" // Fills the panel and crops the photo evenly
                      />
                    ) : (
                      <>
                        {/* Large translucent circle that adds depth to the gradient artwork */}
                        <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                        {/* Darker circle in the opposite corner that balances the composition */}
                        <span className="absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-black/10" />
                        {/* Customer initials centered on the artwork */}
                        <span className="story-card__initials absolute inset-0 flex items-center justify-center font-extrabold tracking-tight text-white/90">
                          {story.initials}
                        </span>
                      </>
                    )}

                    {/* Chip at the bottom of the featured photo; it takes the place of the company logo overlay of the reference design */}
                    <span className="story-card__badge absolute bottom-2 sm:bottom-3 xl:bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-md sm:rounded-lg bg-black/40 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-md">
                      {/* Verified icon in the brand color */}
                      <BsPatchCheckFill className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-light" />
                      {/* Chip label: visually hidden on very narrow phones where only the icon fits, but still read by screen readers */}
                      <span className="max-[359px]:sr-only">
                        Verified buyer
                      </span>
                    </span>
                  </div>

                  {/* ---------- TEXT CONTENT ---------- */}
                  {/* Text area: visible only on the featured card and hidden on side cards */}
                  <div className="story-card__content flex flex-col justify-between">
                    {/* Large light-weight heading that highlights the customer's result */}
                    <h3 className="story-heading">{story.metric}</h3>

                    {/* Lower block that groups the quote and the customer identity */}
                    <div className="story-body">
                      {/* Customer quote, clamped so long text never overflows the fixed card height */}
                      <blockquote className="story-quote line-clamp-6">
                        “{story.text}”
                      </blockquote>

                      {/* Customer identity with the dark vertical accent line on its left */}
                      <div className="story-author">
                        {/* Customer name */}
                        <p className="story-name truncate">{story.name}</p>
                        {/* Customer role or title */}
                        <p className="story-role truncate">{story.role}</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </motion.div>
        </div>

        {/* Progress markers: one dot per story, the active one stretches into a pill that fills up while autoplay counts down */}
        <div className="flex items-center justify-center">
          {STORIES.map((story, index) => {
            const isActive = index === activeIndex; // True for the marker of the featured story

            return (
              // Clickable marker with a larger hit area so it is easy to tap on phones
              <button
                key={story.id} // Stable unique key for the marker
                type="button"
                onClick={() => goTo(index)} // Jump straight to this story
                aria-label={`Show story ${index + 1}: ${story.name}`} // Accessible name that identifies the target story
                aria-current={isActive} // Marks the marker of the featured story for assistive technology
                className="group flex h-8 items-center px-1 focus-visible:outline-none" // Tall and padded hit area around the small visible dot
              >
                {/* Track of the marker: a dot when inactive and a wide pill when active */}
                <span
                  className={cn(
                    "block h-2 overflow-hidden rounded-full transition-all duration-500 ease-out group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2", // Shared shape, smooth stretching and keyboard focus ring
                    isActive
                      ? "w-14 bg-gray-300"
                      : "w-2 bg-gray-300 group-hover:bg-gray-400", // Wide pill for the active story, small dot with a hover tint for the others
                  )}
                >
                  {/* Fill of the marker: a dark bar that grows across the active pill during the autoplay countdown */}
                  <span
                    className={cn(
                      "block h-full w-full origin-left rounded-full bg-gray-900", // Fill shape that grows from the left edge
                      isActive ? "story-progress-fill" : "scale-x-0", // Active marker runs the countdown, the others stay empty
                      isActive && isPaused && "story-progress-fill--paused", // Countdown freezes while the user interacts
                    )}
                    onAnimationEnd={isActive ? next : undefined} // When the countdown finishes, autoplay advances to the next story
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Testimonials; // Exports the component so the Home page can render it
