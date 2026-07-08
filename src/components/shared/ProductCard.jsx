// Reusable ProductCard component
// Used on the Home page, search results, wishlist, and related products
// Built-in features: wishlist heart, add to cart, discount badge, low stock badge
// Image has a graceful fallback — if a product's image URL is missing,
// broken, or fails to load, it automatically swaps to a placeholder
// instead of showing a broken-image icon with overlapping alt text
// Fully responsive

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import cn from "../../utils/cn";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import PriceDisplay from "./PriceDisplay";
import RatingStars from "./RatingStars";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import useWishlist from "../../hooks/useWishlist";
import useCart from "../../hooks/useCart";
import useAuth from "../../hooks/useAuth";
import { showSuccess, showError } from "../ui/Toast";
import { addToCart } from "../../api/cart.api";
import { addToWishlist, removeFromWishlist } from "../../api/wishlist.api";

// Local placeholder image shown whenever a product has no image,
// or its image URL fails to load (broken link, expired signed URL, etc.)
const FALLBACK_IMAGE = "/placeholder-product.png";

const ProductCard = ({
  product, // The full product data object
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuth();

  // Get cart actions — handleAddItem syncs Redux for instant UI feedback
  const { handleAddItem } = useCart();

  // Get wishlist state + actions.
  // "items" is needed here because removing from the wishlist requires the
  // WISHLIST ITEM's id (not the product id) — the API doesn't accept product id.
  const {
    items: wishlistItems,
    isProductInWishlist,
    handleAddToWishlist,
    handleRemoveFromWishlist,
  } = useWishlist();

  // Local state to track whether the image failed to load
  const [imageFailed, setImageFailed] = useState(false);

  // Check whether this product is currently in the user's wishlist
  const inWishlist = isProductInWishlist(product?.id);

  // Find the actual wishlist entry for this product (needed to remove it correctly)
  const wishlistEntry = wishlistItems.find(
    (item) => item.product.id === product?.id,
  );

  // Function to navigate to the product's detail page when the card is clicked
  const handleProductClick = () => {
    navigate(ROUTES.PRODUCT_DETAIL.replace(":id", product?.id));
  };

  // ─────────────────────────────────────────
  // ADD TO CART MUTATION — actually hits the backend now
  // ─────────────────────────────────────────
  const cartMutation = useMutation({
    mutationFn: () => addToCart({ product_id: product.id, quantity: 1 }),
    onSuccess: () => {
      handleAddItem({ product, quantity: 1 });
      showSuccess("Added to cart");
      // Refresh the real cart cache so the Cart page / navbar count stay accurate
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
    onError: () => showError("Failed to add to cart"),
  });

  // ─────────────────────────────────────────
  // WISHLIST TOGGLE MUTATION — actually hits the backend now
  // ─────────────────────────────────────────
  const wishlistMutation = useMutation({
    mutationFn: () =>
      inWishlist
        ? removeFromWishlist(wishlistEntry?.id) // correct: wishlist item id
        : addToWishlist({ product_id: product.id }),
    onSuccess: () => {
      if (inWishlist) {
        handleRemoveFromWishlist(wishlistEntry?.id);
        showSuccess("Removed from wishlist");
      } else {
        handleAddToWishlist({ product });
        showSuccess("Added to wishlist");
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WISHLIST });
    },
    onError: () => showError("Failed to update wishlist"),
  });

  // Function to toggle the product's wishlist status — add it or remove it
  const handleWishlistToggle = (e) => {
    e.stopPropagation(); // Prevent the click from also triggering card navigation

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    wishlistMutation.mutate();
  };

  // Function to add the product to the cart
  const handleAddToCart = (e) => {
    e.stopPropagation(); // Prevent the click from also triggering card navigation

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!product?.in_stock) return;

    cartMutation.mutate();
  };

  // If there's no product data, don't render anything
  if (!product) return null;

  // Decide which image source to actually render
  const imageSrc =
    !product.primary_image || imageFailed
      ? FALLBACK_IMAGE
      : product.primary_image;

  return (
    <div
      onClick={handleProductClick}
      className={cn(
        "group relative bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer",
        "hover:shadow-md hover:border-gray-200 transition-all duration-200",
        className,
      )}
    >
      {/* Container for the product image and overlay elements (badges, wishlist button) */}
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <img
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300",
            "group-hover:scale-105",
          )}
        />

        {/* Discount badge */}
        {product.original_price > product.price && (
          <div className="absolute top-2 left-2">
            <Badge
              label={`-${Math.round(((product.original_price - product.price) / product.original_price) * 100)}%`}
              variant="danger"
              size="sm"
              rounded
            />
          </div>
        )}

        {/* Low stock badge */}
        {product.in_stock && product.stock <= 5 && (
          <div className="absolute top-2 right-10">
            <Badge label="Low Stock" variant="warning" size="sm" rounded />
          </div>
        )}

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Badge label="Out of Stock" variant="gray" size="md" rounded />
          </div>
        )}

        {/* Wishlist heart button */}
        <button
          onClick={handleWishlistToggle}
          disabled={wishlistMutation.isPending}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-sm",
            "flex items-center justify-center transition-all duration-200",
            "hover:scale-110 active:scale-95 disabled:opacity-50",
          )}
        >
          <svg
            className={cn(
              "w-4 h-4 transition-colors duration-200",
              inWishlist ? "text-red-500 fill-current" : "text-gray-400",
            )}
            fill={inWishlist ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Product information section below the image */}
      <div className="p-4 flex flex-col gap-2">
        {product.category?.name && (
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {product.category.name}
          </p>
        )}

        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        <RatingStars
          rating={product.rating || 0}
          count={product.review_count || 0}
          size="sm"
        />

        <PriceDisplay
          price={parseFloat(product.price)}
          originalPrice={parseFloat(product.original_price)}
          size="md"
        />

        {/* Add to Cart button */}
        <Button
          variant="primary"
          size="sm"
          fullWidth
          isLoading={cartMutation.isPending}
          disabled={!product.in_stock || cartMutation.isPending}
          onClick={handleAddToCart}
          className="mt-1"
        >
          {product.in_stock ? "Add to Cart" : "Out of Stock"}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
//
