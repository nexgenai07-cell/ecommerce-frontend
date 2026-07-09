import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AiOutlineHeart,
  AiFillHeart,
  AiOutlineCheck,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import { BsTag } from "react-icons/bs";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";

import { addToCart } from "../../api/cart.api";
import { addToWishlist, removeFromWishlist } from "../../api/wishlist.api";

import useAuth from "../../hooks/useAuth";
import useCart from "../../hooks/useCart";
import useWishlist from "../../hooks/useWishlist";

import { showSuccess, showError } from "../ui/Toast";
import PriceDisplay from "../shared/PriceDisplay";
import QuantitySelector from "../shared/QuantitySelector";
import Badge from "../ui/Badge";

const ProductInfo = ({ product }) => {
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

  const [quantity, setQuantity] = useState(1);

  const inWishlist = isProductInWishlist(product?.id);
  const wishlistEntry = wishlistItems.find(
    (item) => item.product.id === product?.id,
  );

  // ─── ADD TO CART — API 33 ───
  const addToCartMutation = useMutation({
    mutationFn: () => addToCart({ product_id: product.id, quantity }),
    onSuccess: () => {
      handleAddItem({ product, quantity });
      showSuccess("Added to cart!");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || "Failed to add to cart";
      showError(message);
    },
  });

  // ─── WISHLIST TOGGLE — API 40 / 41 ───
  const wishlistMutation = useMutation({
    mutationFn: () =>
      inWishlist
        ? removeFromWishlist(wishlistEntry?.id)
        : addToWishlist({ product_id: product.id }),
    onSuccess: () => {
      if (inWishlist) {
        handleRemoveFromWishlist(wishlistEntry?.id);
        showSuccess("Removed from wishlist");
      } else {
        handleAddToWishlist({ product });
        showSuccess("Added to wishlist!");
      }
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WISHLIST });
    },
    onError: () => showError("Failed to update wishlist"),
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    addToCartMutation.mutate();
  };

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    wishlistMutation.mutate();
  };

  if (!product) return null;

  const isLowStock =
    product.in_stock &&
    typeof product.low_stock_threshold === "number" &&
    product.stock <= product.low_stock_threshold;

  return (
    <motion.div
      className="flex flex-col gap-5 lg:sticky lg:top-24 self-start"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ─── Title Card ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 flex flex-col gap-4">
        {product.category?.name && (
          <span className="w-fit text-xs font-semibold text-primary uppercase tracking-widest bg-primary-50 px-3 py-1 rounded-full">
            {product.category.name}
          </span>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          {product.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <PriceDisplay
            price={parseFloat(product.price)}
            originalPrice={parseFloat(product.original_price)}
            size="lg"
          />

          {product.in_stock ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success bg-success-light px-3 py-1.5 rounded-full">
              <AiOutlineCheck className="w-3.5 h-3.5" />
              In Stock
            </span>
          ) : (
            <Badge label="Out of Stock" variant="danger" rounded />
          )}
        </div>

        {product.sku && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <BsTag className="w-3.5 h-3.5" />
            SKU:{" "}
            <span className="text-gray-600 font-medium">{product.sku}</span>
          </div>
        )}
      </div>

      {/* ─── Buy Box Card ─── */}
      <div className="flex flex-col gap-5 bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Quantity</p>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={product.stock || 1}
            disabled={!product.in_stock}
            size="md"
          />
        </div>

        {isLowStock && (
          <p className="text-xs text-warning font-medium bg-warning-light px-3 py-2 rounded-lg -mt-2">
            ⚡ Only {product.stock} left in stock — order soon!
          </p>
        )}

        <div className="h-px bg-gray-100" />

        <div className="flex flex-col gap-3">
          <motion.button
            onClick={handleAddToCart}
            disabled={!product.in_stock || addToCartMutation.isPending}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: product.in_stock ? 1.01 : 1 }}
            className="
              w-full flex items-center justify-center gap-2
              py-3.5 px-6 rounded-xl text-sm font-semibold
              bg-primary text-white shadow-md shadow-primary/20
              hover:bg-primary-dark
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-200
            "
          >
            {addToCartMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <AiOutlineShoppingCart className="w-4 h-4" />
                Add to Cart
              </>
            )}
          </motion.button>

          <button
            onClick={handleWishlistToggle}
            disabled={wishlistMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            {inWishlist ? (
              <AiFillHeart className="w-4 h-4 text-red-500" />
            ) : (
              <AiOutlineHeart className="w-4 h-4" />
            )}
            {inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductInfo;
