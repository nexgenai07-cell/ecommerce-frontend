// Reusable EmptyState component
// Shown when there is no data to display
// Used for no products, empty cart, no orders, no search results, and more
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

import Button from "./Button";
// Button component — used for the optional call-to-action button at the bottom

// Predefined variant configs — each has its own icon, title, and description
// All icons use the same w-12 h-12 size and strokeWidth={1.5} for a consistent light style
const VARIANTS = {
  // No products available in a listing or category
  noProducts: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
        {/* 3D box / package outline — visually represents a product */}
      </svg>
    ),
    title: "No Products Found",
    description: "There are no products available at the moment.",
  },

  // Shopping cart has no items
  emptyCart: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
        {/* Shopping cart with wheels — standard cart icon */}
      </svg>
    ),
    title: "Your Cart is Empty",
    description: "Add some products to your cart to get started.",
  },

  // Wishlist / saved items has no products
  emptyWishlist: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
        {/* Heart outline — represents saved / loved items */}
      </svg>
    ),
    title: "Your Wishlist is Empty",
    description: "Save products you love to your wishlist.",
  },

  // Customer has not placed any orders yet
  noOrders: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        {/* Clipboard / document outline — represents an order form */}
      </svg>
    ),
    title: "No Orders Yet",
    description: "You haven't placed any orders yet.",
  },

  // Search or filter returned zero results
  noResults: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
        {/* Magnifying glass — represents a search with no matches */}
      </svg>
    ),
    title: "No Results Found",
    description: "Try adjusting your search or filters.",
  },

  // Notification inbox is empty
  noNotifications: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
        {/* Bell outline — represents the notifications panel */}
      </svg>
    ),
    title: "No Notifications",
    description: "You're all caught up! No new notifications.",
  },

  // Chat / message inbox has no conversations
  noChats: {
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
        {/* Speech bubble with three dots — represents a chat or messaging interface */}
      </svg>
    ),
    title: "No Chats Yet",
    description: "Start a conversation with our AI assistant.",
  },
};

const EmptyState = ({
  variant = "noResults", // Which predefined variant to use — defaults to noResults as a safe fallback
  title = "", // Overrides the variant's default title when provided
  description = "", // Overrides the variant's default description when provided
  actionLabel = "", // Text for the optional CTA button — button only renders when both this and onAction are provided
  onAction, // Handler called when the CTA button is clicked — e.g. navigate to shop
  className = "", // Extra Tailwind classes applied to the outer wrapper for layout customization
}) => {
  // Resolve the config for the requested variant — falls back to noResults if variant key is unrecognized
  const config = VARIANTS[variant] || VARIANTS.noResults;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-4 text-center",
        // flex-col: stacks icon, text block, and button vertically
        // items-center: horizontally centers all children
        // justify-center: vertically centers content when used in a full-height container
        // gap-4: consistent spacing between icon, text block, and button
        // py-16: generous vertical padding so the empty state feels spacious, not cramped
        // px-4: horizontal padding prevents text from touching screen edges on mobile
        // text-center: centers all text — important for the description's max-w-xs constraint
        className,
      )}
    >
      {/* Icon — rendered in muted gray so it recedes and doesn't compete with the message */}
      <div className="text-gray-300">
        {config.icon}
        {/* text-gray-300: very light gray — icon is decorative, not informational */}
        {/* The SVG inherits this color via stroke="currentColor" on each icon path */}
      </div>

      {/* Text content block — title and description stacked with tight spacing */}
      <div className="flex flex-col gap-2">
        {/* gap-2: tighter spacing between title and description — they belong together visually */}

        {/* Title — uses custom title prop if provided, otherwise falls back to variant default */}
        <h3 className="text-base font-semibold text-gray-700">
          {title || config.title}
          {/* text-base: standard readable size — not too large for an empty state heading */}
          {/* font-semibold: clear hierarchy without being as heavy as a page title */}
          {/* text-gray-700: dark enough to read clearly, not as heavy as text-gray-900 */}
        </h3>

        {/* Description — uses custom description if provided, otherwise variant default */}
        <p className="text-sm text-gray-400 max-w-xs">
          {description || config.description}
          {/* text-sm: smaller than title — clearly secondary supporting text */}
          {/* text-gray-400: muted gray to further subordinate it to the title */}
          {/* max-w-xs (320px): constrains line length for comfortable reading on wide screens */}
        </p>
      </div>

      {/* CTA button — only rendered when BOTH actionLabel and onAction are provided */}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          // Primary emerald style — stands out as the main suggested next action
          onClick={onAction}
          // Triggers the action passed from the parent — e.g. navigate to shop or clear filters
        >
          {actionLabel}
          {/* Renders the button label — e.g. "Browse Products", "Start Shopping", "Clear Filters" */}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
// Default export — imported anywhere as: import EmptyState from "..."
