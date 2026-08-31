import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineClose } from "react-icons/ai";
import cn from "../../utils/cn";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import PriceDisplay from "./PriceDisplay";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import useWishlist from "../../hooks/useWishlist";
import useCart from "../../hooks/useCart";
import useAuth from "../../hooks/useAuth";
import useFlyToIcon from "../../hooks/useFlyToIcon";
import { showSuccess, showError } from "../ui/Toast";
import { addToCart } from "../../api/cart.api";
import { addToWishlist, removeFromWishlist } from "../../api/wishlist.api";

// Local placeholder image shown whenever a product has no image,
// or its image URL fails to load (broken link, expired signed URL, etc.)
const FALLBACK_IMAGE = "/placeholder-product.svg";

const ProductCard = ({
  product, // The full product data object
  className = "", // Any extra CSS classes passed in from the parent component
  onRemove, // optional — see file header
  onAddToCart: onAddToCartProp, // optional — see file header
  isAddingToCart: isAddingToCartProp, // optional — see file header
  footer = null, // optional — see file header
  registerImageRef, // optional — called with (productId, imgNode) whenever
  // this card's image element mounts/unmounts. Used only by the Wishlist
  // page, so its "Add All to Cart" button can trigger a flight for every
  // card at once — most callers don't pass this at all.
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuth();

  // Get cart actions — handleAddItem syncs Redux for instant UI feedback.
  // "items" is needed here too — to check how many units of THIS product
  // are already sitting in the cart, so the button can stop the customer
  // before they hit a product they've already maxed out (see
  // qtyAlreadyInCart / isMaxedInCart below), instead of letting the
  // request go to the backend and fail with a generic error toast.
  const { handleAddItem, items: cartItems } = useCart();

  // Fly-to-icon animation trigger functions — see hooks/useFlyToIcon.js.
  // flyToWishlist/flyToCart make the real product image fly from this
  // card into the centered bag/cart graphic. flyBackToWishlistCard
  // reverses it when a product is un-hearted right here on a listing
  // page (the card stays visible, so the item flies back down into it).
  const {
    flyToWishlist,
    flyBackToWishlistCard,
    dismissFromWishlist,
    flyToCart,
  } = useFlyToIcon();

  // Ref to the actual <img> element rendered below — this is the flight's
  // starting point (its exact on-screen position + the real image itself).
  const imageRef = useRef(null);

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

  // Decide which image source to actually render — computed early (rather
  // than further down) so the mutation callbacks below can also use it as
  // the image that flies to the wishlist/cart icon.
  const imageSrc =
    !product?.primary_image || imageFailed
      ? FALLBACK_IMAGE
      : product.primary_image;

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
  // ADD TO CART MUTATION — internal, self-contained version.
  // Only used when the parent does NOT pass its own onAddToCart/isAddingToCart
  // (i.e. everywhere except the Wishlist page's "Add All to Cart" flow)
  // ─────────────────────────────────────────
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
      handleAddItem({ product, quantity: 1 });
      showSuccess("Added to cart");
      // Refresh the real cart cache so the Cart page / navbar count stay accurate
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      showError("Failed to add to cart");
    },
  });

  // ─────────────────────────────────────────
  // WISHLIST TOGGLE MUTATION — internal, self-contained version.
  // Only used when the parent does NOT pass its own onRemove
  // (i.e. everywhere except the Wishlist page, which already knows the item
  // is in the wishlist and controls removal itself)
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

  // Whether this card is being rendered in "controlled" mode (Wishlist page)
  const isControlledAddToCart = typeof onAddToCartProp === "function";
  const isControlledRemove = typeof onRemove === "function";

  // Resolves to whichever loading state actually applies to this card
  const addingToCart = isControlledAddToCart
    ? !!isAddingToCartProp
    : cartMutation.isPending;

  // Function to toggle the product's wishlist status — add it or remove it
  // (only wired up when the card is NOT in controlled-remove mode)
  const handleWishlistToggle = (e) => {
    e.stopPropagation(); // Prevent the click from also triggering card navigation

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Fires immediately, before the network call — this card stays on
    // screen either way (we're on a listing page, not the Wishlist page
    // itself), so the item either flies up into the bag (adding) or
    // flies back down into this exact card (removing).
    if (inWishlist) {
      flyBackToWishlistCard(imageRef.current, imageSrc);
    } else {
      flyToWishlist(imageRef.current, imageSrc);
    }

    wishlistMutation.mutate();
  };

  // Remove button click — used only in controlled-remove mode (Wishlist page).
  // This row is leaving the list for good (there's no card left to fly
  // back into), so the item pops straight out of the bag and rises away,
  // fading out off-screen, rather than flying from anywhere or returning
  // anywhere.
  const handleRemoveClick = (e) => {
    e.stopPropagation();
    dismissFromWishlist(imageSrc);
    onRemove(product.id);
  };

  // Function to add the product to the cart
  const handleAddToCart = (e) => {
    e.stopPropagation(); // Prevent the click from also triggering card navigation

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!product?.in_stock) return;

    // Stop here — before any network request — if the customer's cart
    // already holds every unit this product has in stock. Without this
    // check, clicking "Add to Cart" on a related-product card would send
    // a request the backend is guaranteed to reject (since it independently
    // enforces the same stock limit), surfacing as a confusing generic
    // error toast the customer has no context for.
    if (isMaxedInCart) return;

    // Fly the image immediately, regardless of which mode this card is
    // in — the animation is purely visual feedback and doesn't need to
    // wait for the network request to resolve.
    flyToCart(imageRef.current, imageSrc);

    if (isControlledAddToCart) {
      onAddToCartProp(product.id); // let the parent's own mutation handle it
    } else {
      cartMutation.mutate();
    }
  };

  // If there's no product data, don't render anything
  if (!product) return null;

  // ─────────────────────────────────────────
  // STOCK STATUS PILL — replaces the old separate "Low Stock" / "Out of Stock"
  // badges with a single, always-present overlay so every card looks identical
  // ─────────────────────────────────────────
  const stock = product.stock ?? 0;
  const isOutOfStock = !product.in_stock || stock <= 0;
  const isLowStock = !isOutOfStock && stock <= 5;

  const stockStatus = isOutOfStock
    ? { label: "Out of Stock", dot: "bg-gray-400" }
    : isLowStock
      ? { label: `Only ${stock} Left`, dot: "bg-warning" }
      : { label: "In Stock", dot: "bg-success" };

  // How many units of THIS product are already sitting in the customer's
  // cart right now (0 if it isn't in the cart at all).
  const qtyAlreadyInCart =
    cartItems.find((cartItem) => cartItem.product.id === product.id)
      ?.quantity ?? 0;

  // True only when the product genuinely still has stock (isOutOfStock is
  // false) BUT the customer's own cart already holds every available unit.
  // This is deliberately kept separate from isOutOfStock — a different
  // customer could still buy this product, so it needs its own label and
  // shouldn't be lumped in with "Out of Stock", which means nobody can.
  const isMaxedInCart = !isOutOfStock && qtyAlreadyInCart >= stock;

  // Convert both prices to real numbers ONCE here — product.original_price
  // and product.price arrive from the API as decimal strings (e.g.
  // "10000.00"), and comparing raw strings with > does a lexicographic
  // (character-by-character) comparison instead of a numeric one. That
  // silently breaks whenever the original price's leading digit is smaller
  // than the sale price's leading digit — e.g. "10000.00" > "9000.00"
  // evaluates to false as strings ("1" < "9"), even though 10000 is
  // numerically larger — which is why a real discount like 10,000 → 9,000
  // could fail to show its badge while a discount like 130,000 → 120,000
  // worked fine by coincidence.
  const numericOriginalPrice = Number(product.original_price);
  const numericPrice = Number(product.price);

  const hasDiscount =
    numericOriginalPrice > numericPrice && numericOriginalPrice > 0;

  return (
    <div
      onClick={handleProductClick}
      className={cn(
        "group relative flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer",
        "hover:shadow-md hover:border-gray-200 transition-all duration-200",
        className,
      )}
    >
      {/* Container for the product image and overlay elements (badges, wishlist/remove button) */}
      <div className="relative overflow-hidden bg-gray-50 aspect-3/2">
        <img
          ref={(node) => {
            imageRef.current = node;
            registerImageRef?.(product.id, node);
          }}
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300",
            isOutOfStock ? "grayscale opacity-60" : "group-hover:scale-105",
          )}
        />

        {/* Discount badge — top-left, only rendered when a real discount exists.
            This is the ONLY place the discount % is shown (PriceDisplay below
            has its own badge turned off via showDiscount to avoid duplication).
            Uses the already-numeric values above instead of the raw string
            fields, so the percentage math is correct too. */}
        {hasDiscount && (
          <div className="absolute top-2 left-2">
            <Badge
              label={`-${Math.round(((numericOriginalPrice - numericPrice) / numericOriginalPrice) * 100)}%`}
              variant="danger"
              size="sm"
              rounded
            />
          </div>
        )}

        {/* Dim overlay when out of stock */}
        {isOutOfStock && <div className="absolute inset-0 bg-white/40" />}

        {/* Top-right action button — remove (X) in controlled mode, wishlist heart otherwise.
            Default state: a plain white circle with a muted gray icon, matching the
            wishlist heart button's subtle look. On hover, the circle fills solid red
            and the icon turns white — a clear "this will delete" signal right before
            the click, without a heavy red outline at rest. */}
        {isControlledRemove ? (
          // Plain white circle with a muted gray icon by default — matches
          // the subtler look of the wishlist heart button below instead of
          // standing out with a heavy red ring at rest. Only fills solid
          // red on hover, which is a clearer "this will delete" cue than
          // an always-on red outline.
          // w-6 h-6: scaled down from w-8 h-8 — the larger circle looked
          // oversized next to the rest of the card's compact overlay elements
          <button
            onClick={handleRemoveClick}
            aria-label="Remove from wishlist"
            className={cn(
              "absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow-sm",
              "flex items-center justify-center text-gray-400",
              "hover:bg-danger hover:text-white hover:scale-110 active:scale-95",
              "transition-all duration-200",
            )}
          >
            <AiOutlineClose className="w-3 h-3" strokeWidth={1.5} />
          </button>
        ) : (
          // w-6 h-6: scaled down to match the remove button above, keeping
          // both overlay buttons visually consistent in size
          <button
            onClick={handleWishlistToggle}
            disabled={wishlistMutation.isPending}
            className={cn(
              "absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow-sm",
              "flex items-center justify-center transition-all duration-200",
              "hover:scale-110 active:scale-95 disabled:opacity-50",
            )}
          >
            <svg
              className={cn(
                "w-3 h-3 transition-colors duration-200",
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
        )}

        {/* Status pill — sits at the bottom of the image, same on every card */}
        <div className="absolute bottom-2 left-2 right-2 flex">
          <div className="flex items-center gap-1.5 max-w-full bg-gray-900/85 backdrop-blur-sm text-white text-[11px] font-medium pl-2 pr-2.5 py-1 rounded-full shadow-md">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                stockStatus.dot,
              )}
            />
            <span className="truncate">{stockStatus.label}</span>
          </div>
        </div>
      </div>

      {/* Product information section below the image — kept tight/compact */}
      <div className="p-3.5 flex flex-col gap-1">
        {/* Category line — always reserved (even if empty) so every card in a
            row ends up the same height without needing extra gap-fill */}
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider truncate h-3.5">
          {product.category?.name || ""}
        </p>

        {/* Single line title — truncates instead of wrapping to 2 lines,
            keeps every card the same compact height */}
        <h3 className="text-sm font-semibold text-gray-800 truncate leading-snug">
          {product.name}
        </h3>

        {/* size="sm" + nowrap: keeps the sale price and (if any) strikethrough
            original price locked to ONE line at a smaller, more compact text
            size. This is what actually keeps every card in the grid the same
            height — a fixed single-line row is always the same height,
            whether or not a product has a discount, so there's no longer any
            need to reserve extra space for a possible second line.
            showDiscount=false: the top-left badge on the image already
            shows the discount %, so we don't repeat it here */}
        <PriceDisplay
          price={parseFloat(product.price)}
          originalPrice={parseFloat(product.original_price)}
          size="sm"
          nowrap
          showDiscount={false}
        />

        {/* Add to Cart button — three possible states:
            1. "Out of Stock": stock is genuinely 0, nobody can buy it
            2. "Max in Cart": stock exists, but this customer's cart
               already holds all of it — a different label on purpose,
               since a different customer could still buy this product
            3. Normal "Add to Cart" */}
        <Button
          variant="primary"
          size="sm"
          fullWidth
          isLoading={addingToCart}
          disabled={!product.in_stock || isMaxedInCart || addingToCart}
          onClick={handleAddToCart}
          className="mt-1"
        >
          {!product.in_stock
            ? "Out of Stock"
            : isMaxedInCart
              ? "Max in Cart"
              : "Add to Cart"}
        </Button>

        {/* Optional extra footer content (e.g. "Added on <date>" on the Wishlist page) */}
        {footer}
      </div>
    </div>
  );
};

export default ProductCard;
