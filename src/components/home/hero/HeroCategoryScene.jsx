// ============================================================
// HeroCategoryScene - COMPONENT
// ============================================================
// One full screen "scene" of the homepage hero: the category name in the
// middle, written with silver letters that fly in from all directions and
// settle into place, and that category's products scattered around it like
// sprinkles that also fly in and settle. All movement is done with CSS
// classes defined in index.css (".hero-scene", ".hero-fly-*",
// ".hero-slot-*"); this component only decides which classes to apply.
// A scene is switched on and off through the "isActive" prop.

import { Link } from "react-router-dom"; // Client side navigation to products and categories
import { AiOutlineArrowRight } from "react-icons/ai"; // Arrow icon for the call-to-action
import { ROUTES } from "../../../constants/routes"; // Central route paths
import formatPrice from "../../../utils/formatPrice"; // Formats prices as "Rs. 1,50,000"
import cn from "../../../utils/cn"; // Joins class names conditionally

// Image shown when a product has no picture or the picture fails to load.
const FALLBACK_IMAGE = "/placeholder-product.svg";

// Number of distinct fly-in directions defined in index.css (hero-fly-1 ... hero-fly-12).
const FLY_VARIANT_COUNT = 12;

// Number of dust twinkle dots defined in index.css (children of ".hero-dust").
const DUST_DOT_COUNT = 16;

// Number of accent colours defined in index.css (hero-tint-0 ... hero-tint-2).
const TINT_COUNT = 3;

// Maximum number of product sprinkles (matches the hero-slot-1 ... hero-slot-12 classes).
export const HERO_MAX_SPARKS = 12;

// Order in which products fill the slots. Alternating between the upper and
// lower slots spreads even a small number of products evenly around the title
// instead of crowding them all into one area.
const SLOT_ORDER = [1, 7, 3, 9, 5, 11, 2, 8, 4, 10, 6, 12];

// Picks a fly-in variant class for an element from its running index and
// a per-category offset, so neighbouring letters fly in from different sides.
const getFlyClass = (runningIndex, offset) =>
  `hero-fly-${((runningIndex * 5 + offset) % FLY_VARIANT_COUNT) + 1}`;

// Chooses the title size class from the longest word of the category name,
// so very long words still fit on narrow screens.
const getTitleSizeClass = (words) => {
  // Length of the longest word in the name.
  const longestWord = Math.max(...words.map((word) => word.length));
  if (longestWord >= 12) return "hero-title-sm"; // Very long word: smallest type
  if (longestWord >= 9) return "hero-title-md"; // Long word: medium type
  return "hero-title-lg"; // Normal word: largest type
};

// Props:
//   category - category object from the API ({ id, name, description })
//   products - array of product objects of that category
//   index    - zero based position of the category in the hero
//   total    - total number of categories in the hero
//   isActive - true while this scene should be visible
const HeroCategoryScene = ({ category, products, index, total, isActive }) => {
  // Break the category name into words so a word never splits across lines.
  const words = String(category.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Index of the first letter of every word, so each letter gets a unique
  // running number across the whole title without mutating anything in render.
  const wordStartIndexes = words.map((_, wordIndex) =>
    words.slice(0, wordIndex).reduce((sum, word) => sum + word.length, 0),
  );

  // Two digit position label such as "01" and "03".
  const positionLabel = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  // Only the first HERO_MAX_SPARKS products fit around the title.
  const sparkProducts = products.slice(0, HERO_MAX_SPARKS);

  return (
    // Scene wrapper. The "is-active" class switches every flying child between
    // its scattered state and its settled state; "inert" removes hidden scenes
    // from keyboard focus and from assistive technology.
    <div
      className={cn(
        "hero-scene",
        `hero-tint-${index % TINT_COUNT}`,
        isActive && "is-active",
      )}
      inert={!isActive}
    >
      {/* Twinkling dust dots that add a fine sprinkle layer behind everything */}
      <div className="hero-dust" aria-hidden="true">
        {Array.from({ length: DUST_DOT_COUNT }, (_, dustIndex) => (
          // Each dot is positioned and timed by its nth-child rule in index.css
          <span key={dustIndex} className="hero-dust-dot" />
        ))}
      </div>

      {/* Product sprinkles: every product sits in its own named slot around the title */}
      <ul className="hero-sparks">
        {sparkProducts.map((product, productIndex) => (
          // Slot class positions and sizes the tile; fly class sets its entrance direction
          <li
            key={product.id}
            className={cn(
              "hero-spark",
              `hero-slot-${SLOT_ORDER[productIndex]}`,
              getFlyClass(productIndex + 3, index * 3 + 1),
            )}
          >
            {/* Whole tile is a link to the product detail page */}
            <Link
              to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)}
              className="hero-spark-link"
              aria-label={`${product.name} - ${formatPrice(Number(product.price))}`}
            >
              {/* Inner wrapper carries the endless floating animation */}
              <span className="hero-spark-float">
                {/* Product picture; falls back to a placeholder when missing or broken */}
                <img
                  src={product.primary_image || FALLBACK_IMAGE}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="hero-spark-image"
                  onError={(event) => {
                    // Swap in the placeholder once, never looping on failure
                    if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }
                  }}
                />
              </span>

              {/* Name and price label revealed on hover or keyboard focus */}
              <span className="hero-spark-label">
                <span className="hero-spark-name">{product.name}</span>
                <span className="hero-spark-price">
                  {formatPrice(Number(product.price))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Centre block: position label, category name, description and call-to-action */}
      <div className="hero-center">
        {/* Small label showing which collection of the total is on screen */}
        <p className={cn("hero-kicker hero-fly", getFlyClass(index + 2, 4))}>
          Collection {positionLabel} / {totalLabel}
        </p>

        {/* Category name: the accessible label carries the full name, the letters are decorative */}
        <h2
          className={cn("hero-title", getTitleSizeClass(words))}
          aria-label={category.name}
        >
          {words.map((word, wordIndex) => (
            // Each word is a non-breaking group of letters
            <span
              key={`${word}-${wordIndex}`}
              className="hero-word"
              aria-hidden="true"
            >
              {word.split("").map((letter, letterIndex) => {
                // Number this letter so it receives its own fly-in direction
                const runningIndex = wordStartIndexes[wordIndex] + letterIndex;
                return (
                  // Letter wrapper: scatters outwards when the scene is inactive
                  <span
                    key={`${letter}-${letterIndex}`}
                    className={cn(
                      "hero-letter hero-fly",
                      getFlyClass(runningIndex, index * 4),
                    )}
                  >
                    {/* Silver gradient face of the letter */}
                    <span className="hero-letter-face">{letter}</span>
                  </span>
                );
              })}
            </span>
          ))}
        </h2>

        {/* Optional category description, kept to two lines */}
        {category.description ? (
          <p
            className={cn("hero-subtitle hero-fly", getFlyClass(index + 6, 2))}
          >
            {category.description}
          </p>
        ) : null}

        {/* Flying wrapper keeps the fly-in transition separate from the button's hover effect */}
        <div className={cn("hero-fly", getFlyClass(index + 9, 7))}>
          {/* Call-to-action leading to the product listing of this category */}
          <Link
            to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
            className="hero-cta"
          >
            <span>Shop {category.name}</span>
            <AiOutlineArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroCategoryScene; // Make the component available to HeroSection
