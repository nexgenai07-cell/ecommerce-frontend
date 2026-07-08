import { Link } from "react-router-dom"; // Link renders anchor tags that navigate without a full page reload
import { useMutation, useQueryClient } from "@tanstack/react-query"; // useMutation handles the Add to Cart API call; useQueryClient invalidates stale cart cache after success
import { BsCartPlus } from "react-icons/bs"; // Cart-plus icon shown inside the Add to Cart button
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants — keeps query keys consistent across the app
import { addToCart } from "../../api/cart.api"; // API function that calls POST /api/v1/cart/ to add a product
import useCart from "../../hooks/useCart"; // Custom hook that exposes handleAddItem to sync the local cart UI state
import { showSuccess, showError } from "../ui/Toast"; // Toast notification helpers for mutation feedback
import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a display currency string e.g. "$49.99"

const WishlistPreview = ({ wishlistItems }) => {
  // queryClient lets us manually invalidate the cart cache after a successful add
  const queryClient = useQueryClient();

  // handleAddItem from useCart updates the local/in-memory cart state immediately
  // This keeps the cart icon count in sync without waiting for a refetch
  const { handleAddItem } = useCart();

  // Slice only the first 3 items — the dashboard preview shows a summary, not the full list
  const previewItems = wishlistItems.slice(0, 3);

  // ── Add to Cart mutation ────────────────────────────────────────────────────
  // mutationFn receives the product id and calls the cart API with quantity 1
  const addToCartMutation = useMutation({
    mutationFn: (productId) =>
      addToCart({ product_id: productId, quantity: 1 }),

    onSuccess: (_, productId) => {
      // Find the full wishlist item object matching the productId that was just added
      // Used to pass the product details to handleAddItem for local state sync
      const item = wishlistItems.find((i) => i.product.id === productId);

      if (item) handleAddItem({ product: item.product, quantity: 1 }); // sync local cart state so the cart icon updates immediately

      showSuccess("Added to cart!"); // green toast confirms the item was added successfully

      // Invalidate the cart cache so the next cart dropdown fetch returns fresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },

    onError: () => showError("Failed to add to cart."), // red toast if the API call fails for any reason
  });

  return (
    // Card wrapper — white background, rounded corners, border, clips overflow cleanly
    // shadow-sm at rest + hover:shadow-xl + hover:-translate-y-1 gives the
    // whole card a genuine raised feel, consistent with the other dashboard cards
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* ── Card header ──────────────────────────────────────────────────────────
          Section title on the left, "Explore" link to the full Wishlist page on the right
          border-b separates the header from the items list below               */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-900">My Wishlist</h2>
        <Link
          to={ROUTES.ACCOUNT_WISHLIST} // navigates to the full Wishlist page
          className="text-sm text-primary font-medium hover:underline"
        >
          Explore
        </Link>
      </div>

      {/* ── Items list ───────────────────────────────────────────────────────────
          divide-y draws a thin separator line between each item row             */}
      <div className="divide-y divide-gray-50">
        {/* Render preview items when wishlist has at least one saved product */}
        {previewItems.length > 0 ? (
          previewItems.map((item) => (
            // Single wishlist item row — image on the left, name+price in the middle, button on the right
            // hover:bg-gray-50/60 gives each row a subtle highlight, matching the
            // interactive-row feel used on RecentNotifications below it
            <div
              key={item.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
            >
              {/* Product thumbnail wrapper — overflow-hidden clips the hover zoom cleanly within the rounded box */}
              <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden shrink-0">
                <img
                  src={item.product.primary_image || "/placeholder-product.png"} // falls back to placeholder if image is missing
                  alt={item.product.name} // descriptive alt text for accessibility and broken image state
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" // subtle zoom on hover
                />
              </div>

              {/* Product name + price — flex-1 takes remaining space; min-w-0 enables text truncation */}
              <div className="flex-1 min-w-0">
                {/* Product name — truncated to one line so long names don't break the layout */}
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.product.name}
                </p>

                {/* Product price — slightly bolder than the name to draw the eye */}
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatPrice(parseFloat(item.product.price))}
                </p>
              </div>

              {/* Add to Cart button — fires the mutation with this product's id on click
                  isAddingThisItem checks BOTH that the mutation is in flight AND that it was
                  triggered by THIS specific product's id (via mutation.variables) — this way
                  clicking one item's button only disables/loads that button, not every button
                  in the list, since addToCartMutation is a single shared instance for all 3 rows
                  Now a small filled gradient pill instead of a plain outline button — consistent
                  with the CTA language used on Wishlist/Orders/Notifications
                  shrink-0 keeps the button from compressing on narrow screens                    */}
              {(() => {
                const isAddingThisItem =
                  addToCartMutation.isPending &&
                  addToCartMutation.variables === item.product.id;

                return (
                  <button
                    onClick={() => addToCartMutation.mutate(item.product.id)}
                    disabled={isAddingThisItem} // only locks THIS button while its own request is in flight
                    className="
                      flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white
                      bg-linear-to-r from-primary to-primary-dark rounded-lg
                      shadow-sm shadow-primary/20
                      hover:shadow-md hover:shadow-primary/30 hover:brightness-105
                      transition-all shrink-0
                      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100
                    "
                  >
                    {!isAddingThisItem && (
                      <BsCartPlus className="w-3.5 h-3.5" /> // Cart-plus icon, hidden while adding to keep the "Adding..." label compact
                    )}
                    {isAddingThisItem ? "Adding..." : "Add to Cart"}
                  </button>
                );
              })()}
            </div>
          ))
        ) : (
          // Empty state — shown when the customer hasn't saved any products to their wishlist yet
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No wishlist items
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPreview; // Export so it can be composed into the Customer Account Dashboard page
