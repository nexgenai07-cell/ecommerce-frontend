import { motion } from "framer-motion"; // animates the card on mount, unmount, and layout change
import { HiOutlineClock } from "react-icons/hi2"; // Small clock icon next to the "added on" footnote
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import ProductCard from "../shared/ProductCard"; // Reused directly — same image/badges/price/button as every other page

const WishlistCard = ({
  item, // object — the full wishlist entry including item.product and item.created_at
  onRemove, // function — called with item.id when the customer clicks the remove (X) button
  onAddToCart, // function — called with product.id when the customer clicks Add to Cart
  isAddingToCart, // boolean — true while the shared add-to-cart mutation is in flight
  registerImageRef, // function — (productId, imgNode) => void, forwarded straight
  // through to ProductCard so the Wishlist page can collect every card's
  // image element for the "Add All to Cart" simultaneous flight animation
  isSelected, // boolean — whether this card's bulk-select checkbox is checked
  onToggleSelect, // function — called with item.id when the checkbox is toggled
}) => {
  const product = item.product;

  return (
    // motion.div animates this card on mount, exit, and when sibling cards are removed
    // layout — smoothly repositions the card when other cards leave the grid
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {/* Bulk-select checkbox — sits in the corner gap outside the card's
          own rounded edge and image, so it never overlaps the discount
          badge or remove button ProductCard already renders inside its
          image area. */}
      <label
        className="absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="w-3.5 h-3.5 accent-primary cursor-pointer"
          aria-label={`Select ${product?.name || "item"}`}
        />
      </label>

      <ProductCard
        product={product}
        // Passing these three turns ProductCard into "controlled" mode:
        // it shows a remove (X) instead of a wishlist heart, and defers
        // add-to-cart to the Wishlist page's own shared mutation so
        // "Add All to Cart" can disable every card's button at once.
        onRemove={() => onRemove(item.id)}
        onAddToCart={onAddToCart}
        isAddingToCart={isAddingToCart}
        registerImageRef={registerImageRef}
        footer={
          item.created_at && (
            <p className="flex items-center justify-center gap-1 text-[11px] text-gray-400 pt-0.5">
              <HiOutlineClock className="w-3 h-3" />
              Added {formatDate(item.created_at)}
            </p>
          )
        }
      />
    </motion.div>
  );
};

export default WishlistCard; // Export so it can be rendered inside the Wishlist page grid
