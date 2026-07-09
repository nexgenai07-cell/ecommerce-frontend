import { motion } from "framer-motion"; // animates the card on mount, unmount, and layout change
import { HiOutlineClock } from "react-icons/hi2"; // Small clock icon next to the "added on" footnote
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import ProductCard from "../shared/ProductCard"; // Reused directly — same image/badges/price/button as every other page

const WishlistCard = ({
  item, // object — the full wishlist entry including item.product and item.created_at
  onRemove, // function — called with item.id when the customer clicks the remove (X) button
  onAddToCart, // function — called with product.id when the customer clicks Add to Cart
  isAddingToCart, // boolean — true while the shared add-to-cart mutation is in flight
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
    >
      <ProductCard
        product={product}
        // Passing these three turns ProductCard into "controlled" mode:
        // it shows a remove (X) instead of a wishlist heart, and defers
        // add-to-cart to the Wishlist page's own shared mutation so
        // "Add All to Cart" can disable every card's button at once.
        onRemove={() => onRemove(item.id)}
        onAddToCart={onAddToCart}
        isAddingToCart={isAddingToCart}
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
