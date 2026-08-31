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
import useFlyToIcon from "../../hooks/useFlyToIcon";

import { showSuccess, showError } from "../ui/Toast";
import PriceDisplay from "../shared/PriceDisplay";
import QuantitySelector from "../shared/QuantitySelector";
import Badge from "../ui/Badge";

const ProductInfo = ({ product, imageRef }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuth();
  const { handleAddItem } = useCart();

  // flyToCart/flyToWishlist fly the main product photo into the centered
  // cart/bag graphic. flyBackToWishlistCard reverses the wishlist flight
  // when un-hearting here — the photo is still on this very page, so it
  // flies back down into it, exactly like un-hearting a card on a
  // listing page.
  const { flyToCart, flyBackFromCart, flyToWishlist, flyBackToWishlistCard } =
    useFlyToIcon();

  const {
    items: wishlistItems,
    isProductInWishlist,
    handleAddToWishlist,
    handleRemoveFromWishlist,
  } = useWishlist();

  const [quantity, setQuantity] = useState(1);

  // The animation needs a real image URL to fly. Some products have an
  // empty/missing `primary_image` field even though they DO have images
  // in their gallery (images[]) — falling back to the first gallery image
  // means the animation still has something to fly, instead of silently
  // skipping itself whenever primary_image happens to be blank.
  const flyImageUrl =
    product?.primary_image ||
    product?.images?.[0]?.image_url ||
    "/placeholder-product.png";

  // Reads whatever image is ACTUALLY on screen right now — if the
  // customer switched to a different gallery thumbnail before clicking,
  // this is what makes the flying photo match that exact image instead
  // of always defaulting back to the product's primary photo.
  const getCurrentDisplayedImage = () => imageRef?.current?.src || flyImageUrl;

  const inWishlist = isProductInWishlist(product?.id);
  const wishlistEntry = wishlistItems.find(
    (item) => item.product.id === product?.id,
  );

  // ─── ADD TO CART — API 33 ───
  const addToCartMutation = useMutation({
    mutationFn: () => addToCart({ product_id: product.id, quantity }),

    // Runs INSTANTLY, before the "add to cart" network request even
    // finishes. Without this, the toast and fly-to-cart animation fired
    // in onSuccess below (right after the add call completes) made it
    // look like the number and price should already be updated — but
    // they were actually still waiting on a SECOND network round trip
    // (the invalidateQueries refetch), which made the update visibly
    // lag behind the animation. This mirrors the same optimistic-update
    // pattern already used in CartItem.jsx's quantity mutation.
    //
    // This only optimistically updates the total when the product is
    // ALREADY in the cart, since a brand-new line item needs a
    // server-generated id we don't have yet — that case still updates
    // as soon as the add call's own refetch completes.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });
      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data?.items) return old;

        const existingItem = old.data.items.find(
          (cartItem) => cartItem.product.id === product.id,
        );
        if (!existingItem) return old;

        const unitPrice = parseFloat(product.price) || 0;
        const oldSubtotal = parseFloat(old.data.subtotal) || 0;
        const oldTotal = parseFloat(old.data.total) || 0;

        const updatedItems = old.data.items.map((cartItem) =>
          cartItem.product.id === product.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + quantity,
                total_price: (
                  unitPrice *
                  (cartItem.quantity + quantity)
                ).toFixed(2),
              }
            : cartItem,
        );

        const newSubtotal = updatedItems.reduce(
          (sum, cartItem) => sum + parseFloat(cartItem.total_price || 0),
          0,
        );
        const newTotal = oldTotal + (newSubtotal - oldSubtotal);

        return {
          ...old,
          data: {
            ...old.data,
            items: updatedItems,
            subtotal: newSubtotal.toFixed(2),
            total: newTotal.toFixed(2),
          },
        };
      });

      return { previousCart };
    },

    onSuccess: () => {
      handleAddItem({ product, quantity });
      showSuccess("Added to cart!");
      // Quietly re-syncs with the authoritative server numbers in the
      // background — the screen already shows the right values from the
      // optimistic update above (when the product was already in the
      // cart), so this refetch corrects silently rather than being
      // something the customer has to wait on.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },

    onError: (error, _vars, context) => {
      // Undoes the optimistic cache write above, since the add never
      // actually happened server-side.
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
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
    // Fires immediately — the animation is purely visual feedback and
    // doesn't need to wait for the network request to resolve.
    flyToCart(imageRef?.current, getCurrentDisplayedImage());
    addToCartMutation.mutate();
  };

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    // Fires immediately, before the network call — the photo is still on
    // this very page either way, so this either flies up into the bag
    // (adding) or flies back down into the page (removing).
    if (inWishlist) {
      flyBackToWishlistCard(imageRef?.current, getCurrentDisplayedImage());
    } else {
      flyToWishlist(imageRef?.current, getCurrentDisplayedImage());
    }
    wishlistMutation.mutate();
  };

  // Fired whenever the quantity stepper's + or - is clicked. Plays the
  // same fly-into-cart feedback used everywhere else on increase. On
  // decrease, the item flies back OUT of the cart graphic and returns
  // to this exact photo — since the photo is still right here on
  // screen, it makes more sense to land back on it than to dismiss
  // off-screen (which is reserved for rows that are actually leaving
  // the page for good, like the Cart page's own list).
  const handleQuantityChange = (newQty) => {
    if (newQty > quantity) {
      flyToCart(imageRef?.current, getCurrentDisplayedImage());
    } else if (newQty < quantity) {
      flyBackFromCart(imageRef?.current, getCurrentDisplayedImage());
    }
    setQuantity(newQty);
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
            onChange={handleQuantityChange}
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
