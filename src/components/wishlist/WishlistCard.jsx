import { Link } from "react-router-dom"; // Link renders anchor tags that navigate to the product detail page without a full reload
import { motion } from "framer-motion"; // motion.div animates the card on mount, unmount, and layout change
import { AiOutlineClose } from "react-icons/ai"; // X icon for the remove button
import { BsCartPlus } from "react-icons/bs"; // Cart-plus icon shown inside the Add to Cart button
import { HiOutlineClock } from "react-icons/hi2"; // Small clock icon next to the "added on" footnote
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import RatingStars from "../shared/RatingStars"; // Reusable star rating component — replaces the old hand-rolled star loop
import PriceDisplay from "../shared/PriceDisplay"; // Reusable price component — handles sale price, strikethrough, and discount badge
import { Spinner } from "../ui/Spinner"; // Reusable spinner — replaces the old one-off spinning div

const WishlistCard = ({
  item, // object — the full wishlist entry including item.product and item.created_at
  onRemove, // function — called with item.id when the customer clicks the X button
  onAddToCart, // function — called with product.id when the customer clicks Add to Cart
  isAddingToCart, // boolean — true while the add-to-cart mutation is in flight for this card
}) => {
  // Shorthand reference to the nested product object — used throughout the card
  const product = item.product;

  // Parsed numeric prices — API sends these as strings, so we convert once here
  // and pass clean numbers down to PriceDisplay instead of re-parsing in JSX
  const price = parseFloat(product.price) || 0;
  const originalPrice = parseFloat(product.original_price) || 0;

  // Real, data-driven stock flags — no fake/demo logic, purely derived from
  // the actual product.in_stock and product.stock fields from the API
  const isOutOfStock = !product.in_stock;
  const isLowStock = product.in_stock && product.stock <= 5;

  return (
    // motion.div animates this card on mount, exit, and when sibling cards are removed
    // layout — smoothly repositions the card when other cards leave the grid
    // initial — starts slightly transparent and scaled down
    // animate — fades in and scales up to natural size
    // exit — shrinks and fades out when removed from the wishlist
    // relative + group — enables hover-triggered effects (remove button, image zoom)
    // hover:-translate-y-1.5 + hover:shadow-2xl — the card visibly "lifts" off the
    // page on hover, giving it real depth instead of sitting flat
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-gray-900/10 hover:-translate-y-1.5 hover:border-transparent transition-all duration-300"
    >
      {/* ── Remove button ──────────────────────────────────────────────────────
          Absolutely positioned in the top-right corner of the card
          backdrop-blur + bg-white/90 gives it a soft "glass" look over the image
          opacity-0 hides it by default; group-hover:opacity-100 reveals it on hover
          scale-90 -> scale-100 on hover adds a tiny pop-in feel
          z-20 keeps it above the image and any stock ribbon                    */}
      <button
        onClick={() => onRemove(item.id)} // passes the wishlist entry id (not product id) to the parent handler
        aria-label="Remove from wishlist" // screen reader label since this button has no visible text
        className="
          absolute top-3 right-3 z-20
          w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-gray-100
          flex items-center justify-center
          text-gray-400 hover:text-white hover:bg-danger hover:border-danger
          transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
        "
      >
        <AiOutlineClose className="w-4 h-4" /> {/* Small X icon */}
      </button>

      {/* ── Product image ──────────────────────────────────────────────────────
          Wrapped in a Link so clicking the image navigates to the product page
          aspect-square maintains a 1:1 ratio regardless of image dimensions
          bg-gradient-to-br gives the image frame a soft depth instead of flat gray
          overflow-hidden clips the scale-up hover effect cleanly              */}
      <Link
        to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)} // inject product id into the detail route
        className="relative block aspect-square bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden"
      >
        <img
          src={product.primary_image || "/placeholder-product.png"} // falls back to placeholder if image is missing
          alt={product.name} // descriptive alt text for accessibility and broken image state
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
            isOutOfStock ? "grayscale opacity-60" : "group-hover:scale-110" // dim + desaturate when unavailable, zoom on hover otherwise
          }`}
        />

        {/* Stock ribbon — only rendered when it's actually meaningful:
            "Out of Stock" (dark, real availability data) or "Only X Left"
            (urgency gradient, real low-stock data). No ribbon at all when
            stock is healthy, so this never becomes decorative noise.     */}
        {isOutOfStock && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-gray-900/80 backdrop-blur-sm shadow-md">
            Out of Stock
          </span>
        )}
        {isLowStock && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-linear-to-r from-danger to-red-600 shadow-md">
            Only {product.stock} Left
          </span>
        )}
      </Link>

      {/* ── Card body ──────────────────────────────────────────────────────────
          flex column with consistent gap between each info section
          flex-1 lets this section grow so the Add to Cart button + date
          line up at the same height across every card in the row          */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Category name — only rendered when the product has a category
            uppercase + tracking-wide gives it a small, refined "eyebrow" feel */}
        {product.category?.name && (
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            {product.category.name}
          </span>
        )}

        {/* Product name — clickable link to the detail page
            line-clamp-2 caps it at 2 lines so card heights stay uniform across the grid */}
        <Link
          to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)}
          className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {product.name}
        </Link>

        {/* ── Star rating ────────────────────────────────────────────────────────
            Reuses the shared RatingStars component instead of a local star loop —
            same component ProductCard uses elsewhere, so ratings look identical app-wide */}
        <RatingStars
          rating={product.rating || 0} // defaults to 0 when the product has no rating yet
          count={product.review_count || 0} // review count shown in parentheses
          size="sm" // compact size fits the tight card layout
        />

        {/* ── Price ──────────────────────────────────────────────────────────────
            Reuses the shared PriceDisplay component — automatically shows the
            strikethrough original price and the discount % badge only when a
            real discount exists, exactly like ProductCard and ProductDetail    */}
        <PriceDisplay price={price} originalPrice={originalPrice} size="md" />

        {/* Spacer pushes the button + footnote to the bottom of the card even
            when the description/category above is short — keeps the grid tidy */}
        <div className="flex-1" />

        {/* ── Add to Cart button ─────────────────────────────────────────────────
            Disabled when out of stock or while a mutation is already in flight
            Gradient background + soft brand-colored shadow gives it a premium,
            "lifted" feel instead of a flat solid fill
            Shows the shared Spinner in place of the label while adding        */}
        <button
          onClick={() => onAddToCart(product.id)} // passes product id to the parent mutation handler
          disabled={isOutOfStock || isAddingToCart}
          className="
            w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white
            flex items-center justify-center gap-2
            bg-linear-to-r from-primary to-primary-dark
            shadow-md shadow-primary/20
            hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98]
            disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:brightness-100
            transition-all duration-200
          "
        >
          {isAddingToCart ? (
            <Spinner size="sm" className="text-white" /> // shared spinner — inherits white via text-current
          ) : (
            <>
              <BsCartPlus className="w-4 h-4" /> {/* Cart-plus icon */}
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </>
          )}
        </button>

        {/* Added to wishlist date — only rendered when the timestamp exists on the item
            Small clock icon + muted text acts as a subtle metadata footnote    */}
        {item.created_at && (
          <p className="flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <HiOutlineClock className="w-3 h-3" />
            Added {formatDate(item.created_at)} {/* e.g. "Jun 29, 2026" */}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default WishlistCard; // Export so it can be rendered inside the Wishlist page grid
