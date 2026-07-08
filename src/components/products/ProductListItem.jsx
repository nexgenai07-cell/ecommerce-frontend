// Product List View Item — horizontal card, stacks on mobile for full responsiveness
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineHeart,
  AiFillHeart,
  AiFillStar,
  AiOutlineStar,
} from "react-icons/ai";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { addToCart } from "../../api/cart.api";
import { addToWishlist, removeFromWishlist } from "../../api/wishlist.api";
import useAuth from "../../hooks/useAuth";
import useCart from "../../hooks/useCart";
import useWishlist from "../../hooks/useWishlist";
import { showSuccess, showError } from "../ui/Toast";
import formatPrice from "../../utils/formatPrice";

const ProductListItem = ({ product }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { handleAddItem } = useCart();
  const {
    items: wishlistItems,
    isProductInWishlist,
    handleAddToWishlist,
    handleRemoveFromWishlist,
  } = useWishlist();

  const inWishlist = isProductInWishlist(product?.id);

  // Find the actual wishlist entry so we can remove it using the correct id
  const wishlistEntry = wishlistItems.find(
    (item) => item.product.id === product?.id,
  );

  const [imageFailed, setImageFailed] = useState(false);

  const cartMutation = useMutation({
    mutationFn: () => addToCart({ product_id: product.id, quantity: 1 }),
    onSuccess: () => {
      handleAddItem({ product, quantity: 1 });
      showSuccess("Added to cart!");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
    onError: () => showError("Failed to add to cart."),
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      inWishlist
        ? removeFromWishlist(wishlistEntry?.id) // correct: wishlist item id, not product id
        : addToWishlist({ product_id: product.id }),
    onSuccess: () => {
      if (inWishlist) handleRemoveFromWishlist(wishlistEntry?.id);
      else handleAddToWishlist({ product });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WISHLIST });
    },
  });

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return navigate(ROUTES.LOGIN);
    cartMutation.mutate();
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return navigate(ROUTES.LOGIN);
    wishlistMutation.mutate();
  };

  if (!product) return null;

  const imageSrc =
    !product.primary_image || imageFailed
      ? "/placeholder-product.png"
      : product.primary_image;
  const hasDiscount =
    parseFloat(product.original_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round(
        ((product.original_price - product.price) / product.original_price) *
          100,
      )
    : 0;

  return (
    <Link
      to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)}
      className="group flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-3xl border-2 border-transparent hover:border-primary/15 shadow-sm hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative w-full h-48 sm:w-36 sm:h-36 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
        <img
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">
          {product.category?.name}
        </p>
        <p className="text-base font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {product.name}
        </p>

        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) =>
            i < Math.round(product.rating || 0) ? (
              <AiFillStar key={i} className="w-3.5 h-3.5 text-yellow-400" />
            ) : (
              <AiOutlineStar key={i} className="w-3.5 h-3.5 text-gray-200" />
            ),
          )}
          {product.review_count > 0 && (
            <span className="text-xs text-gray-400 ml-1">
              ({product.review_count})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${product.in_stock ? "bg-success" : "bg-danger"}`}
          />
          <span
            className={`text-xs font-semibold ${product.in_stock ? "text-success" : "text-danger"}`}
          >
            {product.in_stock
              ? product.stock <= 5
                ? `Low Stock (${product.stock})`
                : `In Stock (${product.stock})`
              : "Out of Stock"}
          </span>
        </div>
      </div>

      {/* Price + actions */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        <div className="sm:text-right">
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(parseFloat(product.price))}
          </p>
          {hasDiscount && (
            <p className="text-xs text-gray-400 line-through">
              {formatPrice(parseFloat(product.original_price))}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWishlist}
            className="p-2.5 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary-50 transition-all"
            aria-label="Add to wishlist"
          >
            {inWishlist ? (
              <AiFillHeart className="w-4 h-4 text-red-500" />
            ) : (
              <AiOutlineHeart className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock || cartMutation.isPending}
            className="px-5 py-2.5 bg-linear-to-r from-primary to-primary-dark text-white text-xs font-bold rounded-xl hover:shadow-md hover:shadow-primary/30 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {cartMutation.isPending ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductListItem;
