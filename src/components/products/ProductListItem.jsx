// Local state hook — tracks whether the product image failed to load
import { useState, useRef } from "react";
// Link (for navigating to the product page) + navigate (for redirecting to
// login when an unauthenticated user tries to act on a product)
import { Link, useNavigate } from "react-router-dom";
// React Query — runs the add-to-cart / wishlist-toggle network calls
import { useMutation, useQueryClient } from "@tanstack/react-query";
// App route path constants (avoids hardcoding URL strings)
import { ROUTES } from "../../constants/routes";
// React Query cache key constants
import { QUERY_KEYS } from "../../constants/queryKeys";
// API calls
import { addToCart } from "../../api/cart.api";
import { addToWishlist, removeFromWishlist } from "../../api/wishlist.api";
// Auth hook — tells us if the current visitor is logged in
import useAuth from "../../hooks/useAuth";
// Cart hook — keeps the Redux cart badge in sync after a successful add
import useCart from "../../hooks/useCart";
// Wishlist hook — exposes current wishlist items + optimistic add/remove helpers
import useWishlist from "../../hooks/useWishlist";
// Fly-to-icon animation trigger functions — see hooks/useFlyToIcon.js.
// flyToWishlist/flyToCart make the real product image fly from this row
// into the centered bag/cart graphic. flyBackToWishlistCard reverses it
// when a product is un-hearted right here on a listing page (the row
// stays visible, so the item flies back down into it). Same hook
// ProductCard (grid view) and ProductInfo (detail page) already use —
// this list view was just never wired up to it.
import useFlyToIcon from "../../hooks/useFlyToIcon";
// Toast helpers for success/error feedback
import { showSuccess, showError } from "../ui/Toast";

// -------- Reusable shared components (now actually reused here) --------
import PriceDisplay from "../shared/PriceDisplay"; // Price + strikethrough + discount badge
import Badge from "../ui/Badge"; // Small status pill (used for "Out of Stock")
import Button from "../ui/Button"; // Standard button (used for "Add to Cart")
// Small icon-only heart button doesn't have a shared component of its own,
// so the two heart icons are kept local, matching the icons ProductCard uses
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";

// Local placeholder image — shown when a product has no image or the image
// URL fails to load. Same fallback path ProductCard uses, for consistency.
const FALLBACK_IMAGE = "/placeholder-product.svg";

const ProductListItem = ({ product }) => {
  // Used to redirect unauthenticated users to the login page
  const navigate = useNavigate();
  // Used to invalidate cached cart/wishlist queries after a successful mutation
  const queryClient = useQueryClient();
  // Whether the current visitor is logged in
  const { isAuthenticated } = useAuth();
  // Cart helper — updates Redux immediately so the navbar badge feels
  // instant. "items" is also needed here to check how many units of THIS
  // product are already in the cart, so the button can stop the customer
  // before a doomed request even reaches the backend — see qtyAlreadyInCart
  // / isMaxedInCart below.
  const { handleAddItem, items: cartItems } = useCart();
  // Wishlist state + helpers
  const {
    items: wishlistItems,
    isProductInWishlist,
    handleAddToWishlist,
    handleRemoveFromWishlist,
  } = useWishlist();

  // Fly-to-icon animation triggers — see import comment above.
  const { flyToWishlist, flyBackToWishlistCard, flyToCart } = useFlyToIcon();

  // Ref to the actual <img> element rendered below — this is the flight's
  // starting point (its exact on-screen position + the real image itself).
  const imageRef = useRef(null);

  // Whether this specific product is currently saved to the wishlist
  const inWishlist = isProductInWishlist(product?.id);

  // The wishlist ENTRY (not just the product) is needed to remove it, since
  // the remove endpoint expects the wishlist item's own id, not the product id
  const wishlistEntry = wishlistItems.find(
    (item) => item.product.id === product?.id,
  );

  // Tracks whether the product image failed to load, so we can fall back
  // to the placeholder image instead of showing a broken image icon
  const [imageFailed, setImageFailed] = useState(false);

  // ---- Add to cart mutation ----
  const cartMutation = useMutation({
    mutationFn: () => addToCart({ product_id: product.id, quantity: 1 }),

    // Runs INSTANTLY, before the "add to cart" network request even
    // finishes — so the cart total updates right away instead of waiting
    // on this call AND the follow-up invalidateQueries refetch below.
    // Only applies when the product is already in the cart, since a
    // brand-new line item needs a server-generated id we don't have yet.
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
                quantity: cartItem.quantity + 1,
                total_price: (unitPrice * (cartItem.quantity + 1)).toFixed(2),
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
      handleAddItem({ product, quantity: 1 }); // Instant Redux update for the navbar badge
      showSuccess("Added to cart!");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART }); // Refresh the real cart data
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      showError("Failed to add to cart.");
    },
  });

  // ---- Wishlist add/remove mutation ----
  const wishlistMutation = useMutation({
    mutationFn: () =>
      inWishlist
        ? removeFromWishlist(wishlistEntry?.id) // Remove using the wishlist item's own id
        : addToWishlist({ product_id: product.id }), // Add using the product id
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

  // Decide which image to show — real image, or the fallback if missing/broken
  const imageSrc =
    !product?.primary_image || imageFailed
      ? FALLBACK_IMAGE
      : product?.primary_image;

  // How many units of THIS product are already sitting in the customer's
  // cart right now (0 if it isn't in the cart at all).
  const qtyAlreadyInCart =
    cartItems.find((cartItem) => cartItem.product.id === product?.id)
      ?.quantity ?? 0;

  // True only when the product genuinely still has stock BUT the
  // customer's own cart already holds every available unit. Kept separate
  // from "Out of Stock" — a different customer could still buy this
  // product, so it gets its own label instead of implying nobody can.
  const isMaxedInCart =
    !!product?.in_stock && qtyAlreadyInCart >= (product?.stock ?? 0);

  // Handles the "Add to Cart" button click
  const handleAddToCart = (e) => {
    e.preventDefault(); // Stop the surrounding <Link> from navigating away
    if (!isAuthenticated) return navigate(ROUTES.LOGIN); // Guests must log in first
    if (!product?.in_stock) return; // Safety guard — button is disabled anyway when out of stock

    // Stop here — before any network request — if the customer's cart
    // already holds every unit this product has in stock. Without this,
    // clicking "Add to Cart" would send a request the backend is
    // guaranteed to reject (it independently enforces the same stock
    // limit), surfacing as a confusing generic error toast.
    if (isMaxedInCart) return;

    // Fly the image immediately — purely visual feedback, doesn't need to
    // wait for the network request to resolve.
    flyToCart(imageRef.current, imageSrc);

    cartMutation.mutate();
  };

  // Handles the heart/wishlist button click
  const handleWishlist = (e) => {
    e.preventDefault(); // Stop the surrounding <Link> from navigating away
    if (!isAuthenticated) return navigate(ROUTES.LOGIN); // Guests must log in first

    // Fires immediately, before the network call — this row stays on
    // screen either way, so the item either flies up into the bag
    // (adding) or flies back down into this exact row (removing).
    if (inWishlist) {
      flyBackToWishlistCard(imageRef.current, imageSrc);
    } else {
      flyToWishlist(imageRef.current, imageSrc);
    }

    wishlistMutation.mutate();
  };

  // If somehow no product data was passed in, render nothing rather than crash
  if (!product) return null;

  return (
    // The entire row is a single Link — clicking anywhere (except the two
    // action buttons, which call preventDefault) opens the product detail page
    <Link
      to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)}
      className="group flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 hover:border-primary/20 shadow-sm hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
    >
      {/* ===== Product image ===== */}
      <div className="relative w-full h-44 sm:w-32 sm:h-32 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
        <img
          ref={imageRef}
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)} // Swap to placeholder on load failure
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Out of stock overlay — reuses the same Badge component ProductCard uses,
            instead of a hand-written span, so both views match exactly */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Badge label="Out of Stock" variant="gray" size="md" rounded />
          </div>
        )}
      </div>

      {/* ===== Middle column — name, category, stock status ===== */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
        {/* Category label — only shown when the product has one */}
        {product.category?.name && (
          <p className="text-xs font-bold text-primary uppercase tracking-wider">
            {product.category.name}
          </p>
        )}

        {/* Product name — clamped to 2 lines so long titles don't break the row height */}
        <p className="text-base font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {product.name}
        </p>

        {/* Stock status dot + label */}
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

      {/* ===== Right column — price + action buttons ===== */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        {/* Price block — now the shared PriceDisplay component (handles the
            strikethrough original price and the discount badge automatically) */}
        <PriceDisplay
          price={parseFloat(product.price)}
          originalPrice={parseFloat(product.original_price)}
          size="lg"
        />

        <div className="flex items-center gap-2">
          {/* Wishlist heart toggle button */}
          <button
            onClick={handleWishlist}
            disabled={wishlistMutation.isPending}
            className="p-2.5 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary-50 transition-all disabled:opacity-50"
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            {inWishlist ? (
              <AiFillHeart className="w-4 h-4 text-red-500" />
            ) : (
              <AiOutlineHeart className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Add to Cart — same three states as the grid card (ProductCard):
              "Out of Stock" (nothing left at all), "Max in Cart" (stock
              exists but this customer already holds all of it), or the
              normal "Add to Cart" */}
          <Button
            variant="primary"
            size="sm"
            isLoading={cartMutation.isPending}
            disabled={
              !product.in_stock || isMaxedInCart || cartMutation.isPending
            }
            onClick={handleAddToCart}
          >
            {!product.in_stock
              ? "Out of Stock"
              : isMaxedInCart
                ? "Max in Cart"
                : "Add to Cart"}
          </Button>
        </div>
      </div>
    </Link>
  );
};

// Export so Products.jsx can render this component when viewMode === "list"
export default ProductListItem;
