import { useState } from "react";
import { AiFillStar, AiOutlineShoppingCart } from "react-icons/ai";
import { BsImage } from "react-icons/bs";

import formatPrice from "../../utils/formatPrice";
import cn from "../../utils/cn";

const ProductCard = ({ product, onAddToCart, isAdmin }) => {
  // Local-only "just clicked" state — purely cosmetic, resets itself
  // after a short delay. See the big comment above for why this can
  // never be a real, backend-verified "added" indicator.
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAddToCart = () => {
    setIsRequesting(true);
    onAddToCart(product); // sends the natural-language "add to cart" chat message

    // Reverts the button back to normal after 1.5s regardless of what
    // actually happens on the backend — the real outcome will show up
    // as a new AI message a moment later.
    setTimeout(() => setIsRequesting(false), 1500);
  };

  // Defensively parse price as a number every time, since the backend
  // is documented to sometimes send it as a string ("2500.00") and
  // sometimes as a float (250000.0) depending on which tool produced
  // the response (see "price type inconsistency" in the Frontend
  // Chatbot Integration Guide, section 5).
  const numericPrice = Number(product.price) || 0;

  return (
    <div
      className="w-44 shrink-0 bg-white rounded-lg border border-gray-200
        shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden flex flex-col"
      // w-44 + shrink-0: fixed card width inside a horizontally
      // scrolling row, so cards don't squash when there are several
    >
      {/* Image area — always shows a neutral placeholder, since the
          backend's product images are currently always null. Framed
          as the DEFAULT visual state (not an error/edge case), per
          the integration guide's explicit guidance on this. */}
      <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <BsImage className="w-8 h-8 text-gray-300" />
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-1 flex-1">
        {/* Product name — clamped to 2 lines so long names don't
            break the card's fixed height inside the horizontal row */}
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">
          {product.name}
        </p>

        {/* Star rating — only rendered if the backend actually
            included one; the current metadata shape documented in the
            Frontend Guide doesn't guarantee a rating field, so this
            stays optional rather than assumed. */}
        {product.rating && (
          <div className="flex items-center gap-1">
            <AiFillStar className="w-3 h-3 text-warning" />
            <span className="text-xs text-gray-500">
              {product.rating}
              {product.review_count ? ` (${product.review_count})` : ""}
            </span>
          </div>
        )}

        {/* Price — always shown in bold brand-green to draw the eye */}
        <p className="text-sm font-bold text-primary mt-auto">
          {formatPrice(numericPrice)}
        </p>

        {/* Admin chatbot is a store-management tool, not a shopping
            surface — admins manage products/orders, they don't buy
            things, so this button only renders for the customer chat. */}
        {!isAdmin && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isRequesting}
            className={cn(
              "mt-1 w-full flex items-center justify-center gap-1",
              "text-xs font-semibold rounded-md py-1.5",
              "transition-all duration-150 active:scale-95",
              isRequesting
                ? "bg-primary-100 text-primary-dark cursor-wait" // brief cosmetic "in progress" look
                : "bg-primary text-white hover:bg-primary-dark",
            )}
          >
            <AiOutlineShoppingCart className="w-3.5 h-3.5" />
            {isRequesting ? "Adding..." : "Add to Cart"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
