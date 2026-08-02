import { useRef } from "react"; // Holds the map of every card's image element, keyed by product id
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

  // =============================================
  // WISHLIST API
  // API 39 — GET /api/v1/wishlist/
  // =============================================

  // enabled: isAuthenticated — skips the query entirely for unauthenticated visitors
  // staleTime 5 min — wishlist changes less frequently than orders or notifications
  const { data: wishlistData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.WISHLIST,
    queryFn: getWishlist,
    enabled: isAuthenticated, // prevents unnecessary API calls for guest users
    staleTime: 1000 * 60 * 5,
  });

  // Safely extract the items array from the nested API response shape
  // Falls back to empty array so the rest of the component never has to null-check
  const wishlistItems = wishlistData?.data?.items || [];

  // =============================================
  // REMOVE FROM WISHLIST
  // API 41 — DELETE /api/v1/wishlist/remove/{id}/
  // =============================================

  const removeMutation = useMutation({
    mutationFn: (itemId) => removeFromWishlist(itemId), // API call — deletes the wishlist entry by its id

    onSuccess: (_, itemId) => {
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
    },

    onError: () => showError("Failed to remove item."), // red toast if the API call fails
  });

  // =============================================
  // ADD TO CART
  // API 33 — POST /api/v1/cart/add/
  // =============================================

  const addToCartMutation = useMutation({
    mutationFn: (productId) =>
      addToCart({ product_id: productId, quantity: 1 }), // API call — adds one unit of the product to the cart

    onSuccess: (_, productId) => {
      // Find the full wishlist item matching the productId so we can pass product details to handleAddItem
      const item = wishlistItems.find((i) => i.product.id === productId);
      if (item) handleAddItem({ product: item.product, quantity: 1 }); // sync local cart state so the cart icon count updates immediately
      showSuccess("Added to cart!"); // green toast confirms the add
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART }); // refetch cart so the dropdown shows the new item
    },

    onError: () => showError("Failed to add to cart."), // red toast if the API call fails
  });

  // handleAddAllToCart — adds every in-stock wishlist item to the cart one by one
  // Uses mutateAsync so each call awaits the previous before firing the next
  // Shows an error toast early if there are no in-stock items to add
  const handleAddAllToCart = async () => {
    const inStock = wishlistItems.filter((i) => i.product.in_stock); // exclude out-of-stock products

    if (inStock.length === 0) {
      showError("No in-stock items to add"); // early exit with feedback if nothing can be added
      return;
    }

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
      await addToCartMutation.mutateAsync(item.product.id);
    }

    showSuccess(`${inStock.length} items added to cart!`); // final summary toast after all items are added
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
            isAddingAll={addToCartMutation.isPending} // disables the button while any add mutation is in flight
          />

          {/* ── Loading skeleton ────────────────────────────────────────────────────
              Shown while the wishlist API request is in flight
              Renders 4 skeleton cards in the same grid layout as the real cards      */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}{" "}
              {/* 4 animated placeholder cards */}
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
                    onAddToCart={(productId) =>
                      addToCartMutation.mutate(productId)
                    } // fires add-to-cart mutation with the product id
                    isAddingToCart={addToCartMutation.isPending} // disables all Add to Cart buttons while any mutation is in flight
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
