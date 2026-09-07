import { useRef, useState } from "react"; // Holds the map of every card's image element, keyed by product id; useState tracks which product ids are currently being added
import { useNavigate } from "react-router-dom"; // useNavigate lets the empty state action button navigate to the products page
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // useQuery fetches wishlist data; useMutation handles remove and add-to-cart; useQueryClient invalidates stale cache
import { AnimatePresence } from "framer-motion"; // AnimatePresence enables exit animations when wishlist cards are removed
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants — keeps query keys consistent across the app
import { getWishlist, removeFromWishlist } from "../../api/wishlist.api"; // API functions: fetch the wishlist, delete a specific item by id
import { addToCart } from "../../api/cart.api"; // API function — adds a product to the cart with a given quantity
import useAuth from "../../hooks/useAuth"; // Custom hook that exposes isAuthenticated — wishlist query is skipped for guests
import useCart from "../../hooks/useCart"; // Custom hook that exposes handleAddItem to sync the local cart UI state immediately
import useFlyToIcon from "../../hooks/useFlyToIcon"; // flyToCart — fires the "fly into the cart" animation for a given image element + photo
import { showSuccess, showError } from "../../components/ui/Toast"; // Toast notification helpers for mutation feedback
import Container from "../../components/layouts/Container"; // Consistent max-width + horizontal padding wrapper
import WishlistHeader from "../../components/wishlist/WishlistHeader"; // Page heading + item count pill + Share and Add All to Cart buttons
import WishlistCard from "../../components/wishlist/WishlistCard"; // Single product card with remove, add to cart, stock status, price
import WishlistAIBanner from "../../components/wishlist/WishlistAIBanner"; // AI recommendation banner shown below the grid
import EmptyState from "../../components/ui/EmptyState"; // Generic empty state UI with a configurable action button
import { SkeletonCard } from "../../components/ui/Skeleton"; // Animated placeholder card shown while wishlist data is loading

const Wishlist = () => {
  const navigate = useNavigate(); // used by the empty state button to send the user to the products listing page
  const queryClient = useQueryClient(); // used to invalidate wishlist and cart caches after mutations
  const { isAuthenticated } = useAuth(); // wishlist API should only fire for logged-in users
  const { handleAddItem } = useCart(); // syncs local cart state immediately after a successful add-to-cart mutation
  const { flyToCart } = useFlyToIcon(); // triggers the "fly into the cart" animation

  // Holds every currently-rendered card's <img> DOM node, keyed by product
  // id — populated by each WishlistCard/ProductCard via registerImageRef
  // below. This is what lets "Add All to Cart" fire a flight for every
  // card AT ONCE, instead of only being able to animate one image at a time.
  const imageRefsMap = useRef({});
  const registerImageRef = (productId, node) => {
    imageRefsMap.current[productId] = node;
  };

  // Tracks EXACTLY which product ids currently have an add-to-cart request
  // in flight — a Set instead of a single mutation's isPending/variables,
  // because a single mutation object can only ever describe ONE request at
  // a time. That was the bug: every card was reading the SAME shared
  // isPending flag, so one click lit up every card's spinner. It's also why
  // "Add All to Cart" needs its own handling below — that flow genuinely
  // does add several products, one after another, so several ids need to be
  // "loading" at once, each clearing independently as its own request finishes.
  const [loadingProductIds, setLoadingProductIds] = useState(() => new Set());

  // Separate flag just for the "Add All to Cart" header button. It must
  // NOT be derived from loadingProductIds.size > 0 — that set also lights
  // up for a single card's own click, which would make the "Add All"
  // button look like it's running too even though only one product is
  // being added. This flag is only ever set true/false by
  // handleAddAllToCart itself below.
  const [isAddingAll, setIsAddingAll] = useState(false);

  const startLoading = (productId) =>
    setLoadingProductIds((prev) => new Set(prev).add(productId));

  const stopLoading = (productId) =>
    setLoadingProductIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });

  // =============================================
  // WISHLIST API
  // API 39 — GET /api/v1/wishlist/
  // =============================================

  // enabled: isAuthenticated — skips the query entirely for unauthenticated visitors
  // staleTime 5 min — wishlist changes less frequently than orders or notifications
  const { data: wishlistData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.WISHLIST,
    queryFn: ({ signal }) => getWishlist(signal),
    enabled: isAuthenticated, // prevents unnecessary API calls for guest users
    staleTime: 1000 * 60 * 5,
  });

  // Safely extract the items array from the nested API response shape.
  // Falls back to empty array so the rest of the component never has to null-check.
  //
  // The extracted array is sorted by each item's own id (ascending) instead of
  // being rendered in whatever order the backend response happens to return.
  // A wishlist item's id is assigned once, when it's first saved, and never
  // changes afterward — so sorting by it keeps cards locked to "the order the
  // customer originally added them in", stable across refetches. The original
  // array from the cache is never mutated directly.
  const wishlistItems = wishlistData?.data?.items
    ? [...wishlistData.data.items].sort((a, b) => a.id - b.id)
    : [];

  // ─────────────────────────────────────────────────────────────────
  // SKELETON COUNT — how many placeholder cards to show while loading
  // ─────────────────────────────────────────────────────────────────
  // We want the skeleton grid to show exactly as many cards as the
  // customer's real wishlist has — never more, never fewer. The catch:
  // on a genuine first-ever load, `wishlistData` is still empty at this
  // point (that's the whole reason `isLoading` is true), so there is no
  // real count to read yet — the API response simply hasn't arrived.
  //
  // What we CAN do is check whether this exact wishlist was already
  // fetched earlier in the session under a different query (e.g. the
  // Account Dashboard's Wishlist Preview, or a previous visit to this
  // same page) — React Query keeps that under the same QUERY_KEYS.WISHLIST
  // cache key. If so, we reuse that real count instead of guessing.
  // Only on a true cold load — nothing cached anywhere yet — do we fall
  // back to a neutral placeholder count.
  const cachedWishlist = queryClient.getQueryData(QUERY_KEYS.WISHLIST);
  const cachedItemCount = cachedWishlist?.data?.items?.length;
  const skeletonCount =
    typeof cachedItemCount === "number" && cachedItemCount > 0
      ? cachedItemCount
      : 4; // true first-ever load with nothing cached anywhere — the API
  // hasn't responded yet, so this is the best a loading state can do

  // =============================================
  // REMOVE FROM WISHLIST
  // API 41 — DELETE /api/v1/wishlist/remove/{id}/
  // =============================================

  const removeMutation = useMutation({
    mutationFn: (itemId) => removeFromWishlist(itemId), // API call — deletes the wishlist entry by its id

    // Runs INSTANTLY, before the DELETE request even finishes — pulls the
    // item straight out of the shared wishlist cache and shows the success
    // toast right away. Without this, the card sat in place and the toast
    // stayed silent until the network request completed, which made both
    // feel like they were lagging well behind the dismiss animation that
    // plays the moment the button is clicked.
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.WISHLIST });

      // Snapshot of the cache exactly as it was, so it can be restored
      // if the removal ends up failing server-side.
      const previousWishlist = queryClient.getQueryData(QUERY_KEYS.WISHLIST);

      // Update the shared wishlist cache directly — this is the SAME cache
      // key every other component (navbar badge, product cards) reads from,
      // so they all reflect the removal instantly, with no extra refetch.
      queryClient.setQueryData(QUERY_KEYS.WISHLIST, (old) => {
        if (!old?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.filter((item) => item.id !== itemId),
          },
        };
      });

      showSuccess("Removed from wishlist"); // green toast confirms the removal

      return { previousWishlist };
    },

    onError: (_err, _itemId, context) => {
      // Undoes the optimistic cache write above, since the removal never
      // actually happened server-side.
      if (context?.previousWishlist) {
        queryClient.setQueryData(QUERY_KEYS.WISHLIST, context.previousWishlist);
      }
      showError("Failed to remove item."); // red toast if the API call fails
    },
  });

  // =============================================
  // ADD TO CART
  // API 33 — POST /api/v1/cart/add/
  // =============================================

  const addToCartMutation = useMutation({
    mutationFn: (productId) =>
      addToCart({ product_id: productId, quantity: 1 }), // API call — adds one unit of the product to the cart

    // Runs INSTANTLY, before the "add to cart" network request even
    // finishes — so the cart total updates right away instead of waiting
    // on this call AND the follow-up invalidateQueries refetch below.
    // Only applies when the product is already in the cart, since a
    // brand-new line item needs a server-generated id we don't have yet.
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });
      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data?.items) return old;

        const existingItem = old.data.items.find(
          (cartItem) => cartItem.product.id === productId,
        );
        if (!existingItem) return old;

        const unitPrice = parseFloat(existingItem.product.price) || 0;
        const oldSubtotal = parseFloat(old.data.subtotal) || 0;
        const oldTotal = parseFloat(old.data.total) || 0;

        const updatedItems = old.data.items.map((cartItem) =>
          cartItem.product.id === productId
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

    onSuccess: (_, productId) => {
      // Find the full wishlist item matching the productId so we can pass product details to handleAddItem
      const item = wishlistItems.find((i) => i.product.id === productId);
      if (item) handleAddItem({ product: item.product, quantity: 1 }); // sync local cart state so the cart icon count updates immediately
      showSuccess("Added to cart!"); // green toast confirms the add
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART }); // refetch cart so the dropdown shows the new item
    },

    onError: (_err, _productId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      showError("Failed to add to cart."); // red toast if the API call fails
    },
  });

  // handleAddToCart — used by a SINGLE card's own Add to Cart button.
  // Marks only that one product id as loading, fires the request, then
  // clears just that id — regardless of how long it takes or what any
  // other card is doing at the same time.
  const handleAddToCart = async (productId) => {
    startLoading(productId);
    try {
      await addToCartMutation.mutateAsync(productId);
    } finally {
      stopLoading(productId);
    }
  };

  // handleAddAllToCart — adds every in-stock wishlist item to the cart one by one
  // Uses mutateAsync so each call awaits the previous before firing the next
  // Shows an error toast early if there are no in-stock items to add
  const handleAddAllToCart = async () => {
    const inStock = wishlistItems.filter(
      (i) => (i.product.available_stock ?? 0) > 0,
    ); // exclude out-of-stock products

    if (inStock.length === 0) {
      showError("No in-stock items to add"); // early exit with feedback if nothing can be added
      return;
    }

    setIsAddingAll(true); // only the "Add All" button reflects this — not individual cards' own click state

    // Mark every in-stock card as loading right away, matching the flight
    // animation below which also fires for every card at once. Each id is
    // cleared independently, right as its own request finishes — so cards
    // stop spinning one by one, in the same order they were added, instead
    // of every card waiting for the entire batch to finish.
    setLoadingProductIds(new Set(inStock.map((i) => i.product.id)));

    // Fire every card's flight AT ONCE, right away — this is purely
    // visual feedback, so it doesn't need to wait for the network calls
    // below to actually complete one at a time.
    inStock.forEach((item) => {
      flyToCart(
        imageRefsMap.current[item.product.id],
        item.product.primary_image || "/placeholder-product.svg",
      );
    });

    // Sequential await — ensures each cart add completes before the next fires
    // Prevents race conditions on the server and keeps cart state consistent
    for (const item of inStock) {
      try {
        await addToCartMutation.mutateAsync(item.product.id);
      } finally {
        stopLoading(item.product.id); // this card's own spinner turns off as soon as ITS request finishes
      }
    }

    showSuccess(`${inStock.length} items added to cart!`); // final summary toast after all items are added
    setIsAddingAll(false); // Add All button goes back to normal only now, once the whole batch is done
  };

  return (
    // Outer wrapper — relative + overflow-hidden hosts the decorative ambient
    // gradient glow behind the header without letting it bleed into the navbar
    // or footer, or cause horizontal scrollbars on any screen size
    <div className="relative overflow-hidden">
      {/* Ambient background glow — soft emerald blur sitting behind the page
          header, purely decorative (pointer-events-none), gives the page a
          premium "lit" feel instead of a flat white background
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Container adds consistent horizontal padding and centers the page content */}
      <Container className="py-6 sm:py-8">
        {/* Outer flex column — stacks all page sections vertically with consistent gaps */}
        <div className="flex flex-col gap-8">
          {/* ── Page header ────────────────────────────────────────────────────────
              Title + item count pill + Share and Add All to Cart buttons
              Buttons are hidden inside WishlistHeader when wishlistItems is empty  */}
          <WishlistHeader
            itemCount={wishlistItems.length} // drives the count pill and button visibility
            onAddAllToCart={handleAddAllToCart} // fires the sequential add-all loop on click
            isAddingAll={isAddingAll} // true ONLY during the "Add All" flow itself — unaffected by a single card's own click
          />

          {/* ── Loading skeleton ────────────────────────────────────────────────────
              Shown while the wishlist API request is in flight.
              skeletonCount (derived above) matches the customer's REAL
              wishlist item count whenever that's already known from cache
              (e.g. arriving here after the Dashboard's Wishlist Preview
              already fetched it) — so the grid never shows more or fewer
              cards than the wishlist actually holds. Only falls back to a
              fixed placeholder count on a genuine first-ever load, where
              the real count simply isn't known yet.
              withFooter=true because every real card here is a WishlistCard,
              which always renders an extra "Added <date>" line that the plain
              SkeletonCard doesn't account for by default — without this the
              real cards render visibly taller than their own placeholders. */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} withFooter />
              ))}
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────────────────────────
              Shown only after loading completes and the wishlist has no saved items
              Wrapped in an elevated white card (rounded-3xl + shadow-sm + border)
              so it looks properly "raised" off the page instead of floating bare
              "Start Shopping" action button navigates to the products listing page   */}
          {!isLoading && wishlistItems.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <EmptyState
                variant="emptyWishlist"
                actionLabel="Start Shopping"
                onAction={() => navigate(ROUTES.PRODUCTS)} // sends the customer to browse products
              />
            </div>
          )}

          {/* ── Wishlist product grid ─────────────────────────────────────────────────
              Shown only after loading completes and there is at least one saved item
              AnimatePresence mode="popLayout" animates cards out smoothly when removed
              2 cols on mobile → 3 cols on md → 4 cols on lg → 5 cols on xl+ for
              a richer, fuller layout on large monitors                          */}
          {!isLoading && wishlistItems.length > 0 && (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {wishlistItems.map((item) => (
                  <WishlistCard
                    key={item.id} // stable unique key for React's reconciler
                    item={item} // full wishlist entry including nested product object
                    onRemove={(id) => removeMutation.mutate(id)} // fires remove mutation with the wishlist entry id
                    onAddToCart={(productId) => handleAddToCart(productId)} // fires add-to-cart for just this one product
                    isAddingToCart={loadingProductIds.has(item.product.id)} // true ONLY for the card whose own product id is currently loading
                    registerImageRef={registerImageRef} // collects this card's image node for "Add All to Cart"
                  />
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* ── AI Banner ────────────────────────────────────────────────────────────
              Only shown after loading and when there are items to recommend from
              Hidden on empty state so the banner doesn't appear without context      */}
          {!isLoading && wishlistItems.length > 0 && <WishlistAIBanner />}
        </div>
      </Container>
    </div>
  );
};

export default Wishlist; // Export so React Router can render this as the /account/wishlist page
