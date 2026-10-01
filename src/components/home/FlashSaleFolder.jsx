import { useEffect, useRef, useState } from "react"; // Hooks for the open state, the tilt state, the scroll observer and the auto-open timer

// Client-side navigation link — every product card inside the folder is a link
import { Link } from "react-router-dom";

// Animation library — drives the spring-smoothed pointer tilt of the whole folder,
// reports when the folder scrolls into view and reports the reduced-motion setting
import { motion, useInView, useReducedMotion } from "framer-motion";

// Fire icon shown on the discount tag of every product card and on the folder cover sticker
import { AiFillFire } from "react-icons/ai";

// Centralized route constants — always reference routes from here instead of hardcoding URLs
import { ROUTES } from "../../constants/routes";

// Formats a raw number into a "Rs. X,XXX" style string
import formatPrice from "../../utils/formatPrice";

// Local fallback image shown whenever a product has no image, or its real image fails to load
const FALLBACK_IMAGE = "/placeholder-product.svg";

// =============================================
// FOLDER BEHAVIOR SETTINGS
// =============================================
const AUTO_OPEN_WHEN_VISIBLE = true; // When true the folder opens by itself the first time it scrolls into view; visitors can still open and close it by hand
const AUTO_OPEN_DELAY_MS = 600; // Short pause after the folder becomes visible, so the opening motion is noticed
const MAX_TILT_DEG = 6; // Largest rotation, in degrees, the folder leans towards the pointer

// Decides where each card sits inside the fan, depending on how many products there are.
// A single product stands in the middle, two products spread left and right,
// and three products fill left, middle and right.
const getCardSlots = (count) => {
  if (count === 1) return ["center"];
  if (count === 2) return ["left", "right"];
  return ["left", "center", "right"];
};

// =============================================
// FOLDER PRODUCT CARD
// One small paper card that slides out of the folder. The whole card is a
// link to the product's detail page. The position and the motion of the card
// come from the "flash-folder-card" class in src/index.css.
// =============================================
const FolderCard = ({ product, slot }) => {
  const [imageFailed, setImageFailed] = useState(false); // Tracks whether the real product image failed to load

  // Prices arrive from the API as decimal strings (e.g. "10000.00"). They are converted
  // to real numbers once, because comparing two strings with ">" compares characters
  // instead of values and gives wrong answers for prices with a different number of digits.
  const numericOriginalPrice = Number(product.original_price);
  const numericPrice = Number(product.price);
  const hasDiscount = numericOriginalPrice > numericPrice; // True only when there is a genuine price drop
  const discountPercent = hasDiscount
    ? Math.round(
        ((numericOriginalPrice - numericPrice) / numericOriginalPrice) * 100,
      )
    : 0; // Real percentage taken from the two prices, never a made-up number

  const imageSrc =
    !product.primary_image || imageFailed
      ? FALLBACK_IMAGE // Use the fallback when there is no image, or the real one already failed
      : product.primary_image;

  return (
    <Link
      to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)} // Whole card links to the product's detail page
      data-slot={slot} // Tells the stylesheet which position of the fan this card takes
      aria-label={product.name}
      className="flash-folder-card group/card flex flex-col overflow-hidden rounded-[3cqw] bg-white shadow-lg shadow-black/30 ring-1 ring-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {/* Fixed-ratio image area — object-cover crops the picture instead of stretching it */}
      <div className="relative aspect-3/2 w-full shrink-0 overflow-hidden bg-gray-100">
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)} // Swap to the fallback image the moment the real one fails
          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
        />

        {/* Soft fade at the bottom of the photo so it blends into the text area */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/20 to-transparent" />

        {/* Discount tag — only rendered when there is a real discount to show */}
        {hasDiscount && (
          <span className="absolute left-[2cqw] top-[2cqw] inline-flex items-center gap-[0.6cqw] rounded-[1.4cqw] bg-linear-to-r from-danger to-red-600 px-[1.6cqw] py-[0.9cqw] text-[4.6cqw] font-extrabold leading-none text-white shadow-sm">
            <AiFillFire aria-hidden="true" className="h-[4.4cqw] w-[4.4cqw]" />-
            {discountPercent}%
          </span>
        )}
      </div>

      {/* Text area — name, then the sale price, then the struck-through original price.
          Sizes use cqw units so the text scales together with the folder. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[0.3cqw] px-[2.6cqw]">
        <p className="truncate text-[5.4cqw] font-semibold leading-tight text-gray-800">
          {product.name}
        </p>
        <p className="truncate text-[6.2cqw] font-extrabold leading-tight text-primary-dark">
          {formatPrice(numericPrice)}
        </p>
        {hasDiscount && (
          <p className="truncate text-[4.8cqw] leading-tight text-gray-400 line-through">
            {formatPrice(numericOriginalPrice)}
          </p>
        )}
      </div>
    </Link>
  );
};

// =============================================
// FLASH SALE FOLDER
// A compact 3D folder for the flash sale products. Three paper cards rest
// inside it; when the folder opens the front cover tilts forward and the
// cards slide out and fan apart with a spring motion. The folder leans
// gently towards the mouse pointer.
//
// Opening and closing
//   - Clicking the folder (or pressing Enter / Space on it) toggles it.
//   - The first time the folder scrolls into view it opens by itself
//     (see AUTO_OPEN_WHEN_VISIBLE above).
//
// Sizing
//   The folder is deliberately compact and scales with the width of its
//   wrapper, so it stays proportional from small phones up to wide desktops.
//   Card text and badges are sized in "cqw" units as well, so they shrink and
//   grow together with the folder. All static styling lives in
//   src/index.css under the "flash-folder" classes.
// =============================================
const FlashSaleFolder = ({ products = [], isLoading = false }) => {
  const [isOpen, setIsOpen] = useState(false); // Whether the folder is currently open
  const [tilt, setTilt] = useState({ x: 0, y: 0 }); // Current lean of the folder, in degrees, around the horizontal (x) and vertical (y) axes
  const sceneRef = useRef(null); // The element watched by the scroll observer and measured for the pointer tilt
  const hasInteractedRef = useRef(false); // Becomes true once the visitor opens or closes the folder by hand, which cancels the automatic opening
  const prefersReducedMotion = useReducedMotion(); // True when the visitor's system asks for less motion

  // True once the folder has been at least 60% visible; stays true afterwards
  const isSceneVisible = useInView(sceneRef, { once: true, amount: 0.6 });

  const cardSlots = getCardSlots(products.length); // One slot name per product, used by the stylesheet to place each card

  // Opens the folder automatically the first time it is seen, unless the visitor already used it
  useEffect(() => {
    if (
      !AUTO_OPEN_WHEN_VISIBLE ||
      !isSceneVisible ||
      isLoading ||
      products.length === 0
    ) {
      return undefined; // Nothing to open yet
    }

    const timerId = setTimeout(() => {
      if (!hasInteractedRef.current) setIsOpen(true); // Skip if the visitor already toggled the folder during the short pause
    }, AUTO_OPEN_DELAY_MS);

    return () => clearTimeout(timerId); // Cancel the pending opening if the component unmounts first
  }, [isSceneVisible, isLoading, products.length]);

  // Toggles the folder from its front cover
  const handleToggle = (event) => {
    event.stopPropagation(); // The scene has its own click handler, so this click must not reach it
    hasInteractedRef.current = true;
    setIsOpen((current) => !current);
  };

  // Opens a closed folder when any other part of it is clicked, such as the paper tips peeking out of the pocket
  const handleSceneClick = () => {
    if (isOpen || isLoading) return; // An open folder only closes through its front cover
    hasInteractedRef.current = true;
    setIsOpen(true);
  };

  // Leans the folder towards the mouse pointer. Touch input is ignored, and so is everything
  // when the visitor prefers reduced motion.
  const handlePointerMove = (event) => {
    if (prefersReducedMotion || event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect(); // Position and size of the scene on screen
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5; // Pointer position across the scene, from -0.5 (left edge) to 0.5 (right edge)
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5; // Pointer position down the scene, from -0.5 (top edge) to 0.5 (bottom edge)

    // Values are rounded to half a degree so the state only changes when the lean visibly changes
    setTilt({
      x: Math.round(-offsetY * 2 * MAX_TILT_DEG * 2) / 2, // Pointer near the top leans the top edge away, pointer near the bottom leans it closer
      y: Math.round(offsetX * 2 * MAX_TILT_DEG * 2) / 2, // Pointer on the right turns the folder to the right, on the left turns it to the left
    });
  };

  // Levels the folder again once the pointer leaves it
  const handlePointerLeave = () => setTilt({ x: 0, y: 0 });

  return (
    // Stage — takes the width of its column, caps it to a small size, and is the
    // reference for every "cqw" unit used inside the folder
    <div className="flash-folder-stage">
      <div
        ref={sceneRef}
        data-open={isOpen} // Drives every opening motion in the stylesheet
        data-loading={isLoading} // Shows the folder as a pulsing placeholder while the products load
        onClick={handleSceneClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="flash-folder-scene group"
      >
        {/* Soft emerald glow behind the folder — pure ambience on the dark section background */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />

        {/* Tilt layer — spring-animated lean towards the pointer */}
        <motion.div
          className="flash-folder-tilt"
          animate={{ rotateX: tilt.x, rotateY: tilt.y }}
          transition={{
            type: "spring",
            stiffness: 140,
            damping: 16,
            mass: 0.6,
          }}
        >
          {/* Group — lowers the folder while it is open, so a closed folder sits in the vertical middle of the reserved space */}
          <div className="flash-folder-group">
            {/* Back panel of the folder, including its tab */}
            <div className="flash-folder-back" />

            {/* Paper cards — inert while the folder is closed, so they cannot be focused or clicked while hidden */}
            <div className="flash-folder-cards" inert={!isOpen}>
              {products.map((product, index) => (
                <FolderCard
                  key={product.id}
                  product={product}
                  slot={cardSlots[index]}
                />
              ))}
            </div>

            {/* Front cover — the button that opens and closes the folder */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={isLoading}
              aria-expanded={isOpen}
              aria-label={
                isOpen
                  ? "Close the flash sale folder"
                  : "Open the flash sale folder"
              }
              className="flash-folder-front focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {/* Small sticker printed on the cover — stays visible whether the folder is open or closed */}
              <span className="pointer-events-none absolute bottom-[5.5cqw] left-[6cqw] inline-flex items-center gap-[1.2cqw] rounded-full bg-white px-[2.6cqw] py-[1.2cqw] text-[4.6cqw] font-extrabold leading-none text-primary-dark shadow-sm">
                <AiFillFire
                  aria-hidden="true"
                  className="h-[4.6cqw] w-[4.6cqw] text-danger"
                />
                Flash Deals
              </span>

              {/* Small hint that fades away once the folder is open */}
              <span className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/20 px-[3.6cqw] py-[1.6cqw] text-[5cqw] font-semibold leading-none tracking-wide text-white backdrop-blur-sm transition-opacity duration-300 group-data-[open=true]:opacity-0">
                Tap to open
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FlashSaleFolder;
