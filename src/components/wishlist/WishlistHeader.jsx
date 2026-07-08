import { AiOutlineShareAlt, AiFillHeart } from "react-icons/ai"; // Share icon for the copy-link button, filled heart for the wishlist icon box
import { BsCartPlus } from "react-icons/bs"; // Cart-plus icon for the Add All to Cart button
import { showSuccess } from "../ui/Toast"; // Toast notification helper for clipboard copy feedback
import { Spinner } from "../ui/Spinner"; // Reusable spinner — shown inside the button while adding all items

const WishlistHeader = ({
  itemCount, // number — total saved wishlist items, drives the subtitle text and button visibility
  onAddAllToCart, // function — callback fired when the customer clicks Add All to Cart
  isAddingAll, // boolean — true while the add-all mutation is in flight; disables the button
}) => {
  // handleShare — copies the current page URL to the clipboard
  // navigator.clipboard is optional-chained in case the browser doesn't support it
  // Shows a success toast to confirm the link was copied
  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href); // copies e.g. "https://site.com/account/wishlist"
    showSuccess("Wishlist link copied!"); // green toast confirms the action to the user
  };

  return (
    // Outer row — stacks vertically on mobile (flex-col), aligns to bottom edge side by side on sm+
    // sm:items-end aligns the icon+heading block and the buttons along their bottom edges
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      {/* ── Left side: icon box + heading + subtitle ──────────────────────────────
          Same pattern as the "Submit a Complaint" page header: a rounded
          gradient icon square sits to the left of a stacked title/subtitle block */}
      <div className="flex items-center gap-4">
        {/* Icon box — rounded gradient square, brand emerald tones
            shadow-primary/30 gives it a soft colored glow instead of a flat gray shadow
            shrink-0 keeps it from being squeezed when the subtitle text wraps */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
          <AiFillHeart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />{" "}
          {/* Filled heart — represents saved/loved items */}
        </div>

        {/* Title + subtitle stack */}
        <div>
          {/* Page title — solid dark bold text, no gradient clip, matches the
              reference header style exactly */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Wishlist
          </h1>

          {/* Subtitle — muted gray description line under the heading
              Shows the live item count when there is at least one saved item,
              otherwise falls back to a general description */}
          <p className="text-sm text-gray-400 mt-0.5">
            {itemCount > 0
              ? `${itemCount} item${itemCount !== 1 ? "s" : ""} saved for later — ready whenever you are.`
              : "Save products you love and shop them anytime."}
          </p>
        </div>
      </div>

      {/* ── Right side: action buttons — only rendered when wishlist has items ───
          Hidden entirely when the wishlist is empty to keep the header clean      */}
      {itemCount > 0 && (
        <div className="flex items-center gap-3">
          {/* Share Wishlist — glass/outline style, copies the page URL to clipboard on click */}
          <button
            onClick={handleShare}
            className="
              flex items-center gap-2 px-4 py-2.5
              bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700
              hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark
              active:scale-[0.98] transition-all duration-200
            "
          >
            <AiOutlineShareAlt className="w-4 h-4" /> {/* Share icon */}
            Share Wishlist
          </button>

          {/* Add All to Cart — gradient fill + soft brand-colored glow shadow gives
              this the "main action" weight it deserves as the primary CTA on the page
              disabled while isAddingAll is true to prevent duplicate mutations
              disabled:opacity-60 visually dims the button when it is locked
              active:scale-[0.98] gives a subtle press-down feel on click        */}
          <button
            onClick={onAddAllToCart}
            disabled={isAddingAll}
            className="
              flex items-center gap-2 px-4 py-2.5
              bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl
              shadow-md shadow-primary/20
              hover:shadow-lg hover:shadow-primary/30 hover:brightness-105
              active:scale-[0.98]
              disabled:opacity-60 disabled:shadow-none disabled:hover:brightness-100
              transition-all duration-200
            "
          >
            {isAddingAll ? (
              <Spinner size="sm" className="text-white" /> // shared spinner while the sequential add-all loop runs
            ) : (
              <BsCartPlus className="w-4 h-4" /> // Cart-plus icon
            )}
            {isAddingAll ? "Adding..." : "Add All to Cart"}
            {/* Label changes while mutation is in flight */}
          </button>
        </div>
      )}
    </div>
  );
};

export default WishlistHeader; // Export so it can be composed into the Wishlist page
