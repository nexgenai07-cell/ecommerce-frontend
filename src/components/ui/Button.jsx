// Reusable Button component for the entire project
// Variants: primary, secondary, danger, ghost, outline
// Sizes: sm, md, lg
// Fully responsive
// Colors will be updated from tokens.css once the final design arrives

import Spinner from "./Spinner";
// Default import of Spinner — shown inside button when isLoading is true

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Button = ({
  children, // Text or JSX rendered inside the button label
  variant = "primary", // Controls the visual style — defaults to primary
  size = "md", // Controls button dimensions — defaults to medium
  isLoading = false, // When true, shows spinner and blocks interaction (e.g. during API calls)
  disabled = false, // When true, button is visually and functionally disabled
  fullWidth = false, // When true, button stretches to fill its parent container width
  leftIcon = null, // Optional icon element rendered to the left of the label
  rightIcon = null, // Optional icon element rendered to the right of the label
  type = "button", // HTML button type — "button" prevents accidental form submissions
  onClick, // Click handler function passed down from the parent component
  className = "", // Extra Tailwind classes for one-off customizations from outside
  ...props // Any remaining valid HTML button attributes (aria-*, data-*, etc.)
}) => {
  // Each variant has its own background, text color, hover, active press, and focus ring classes
  // Color values (bg-primary, bg-danger, etc.) come from CSS variables defined in tokens.css
  const variantClasses = {
    primary:
      "bg-primary text-white hover:bg-primary-dark active:scale-95 focus:ring-primary",
    // Primary: solid brand color — used for main CTAs

    secondary:
      "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 focus:ring-gray-300",
    // Secondary: subtle gray — used for less important or alternative actions

    danger:
      "bg-danger text-white hover:bg-red-600 active:scale-95 focus:ring-danger",
    // Danger: red — used for destructive actions like delete or remove

    ghost:
      "bg-transparent text-gray-600 hover:bg-gray-100 active:scale-95 focus:ring-gray-200",
    // Ghost: no background — used in toolbars, menus, or low-emphasis actions

    outline:
      "bg-transparent border border-primary text-primary hover:bg-primary-50 active:scale-95 focus:ring-primary",
    // Outline: transparent with a brand-colored border — secondary CTA style
  };

  // Each size has its own padding, font size, and border radius
  // lg size uses responsive classes so it scales down gracefully on small screens
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs sm:text-sm rounded-md",
    // Small: compact size — xs text on mobile, sm on larger screens, slightly rounded

    md: "px-4 py-2 text-sm rounded-lg",
    // Medium: default size — consistent across all screen sizes

    lg: "px-5 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base rounded-lg",
    // Large: slightly smaller padding on mobile, full size on sm+ screens
  };

  return (
    <button
      type={type}
      // Explicitly sets button type — prevents unintended form submissions when type="button"

      onClick={onClick}
      // Passes the click handler from the parent to the native button element

      disabled={disabled || isLoading}
      // Disables the button natively when either disabled prop is true OR loading is active

      className={cn(
        // Base classes — applied to every button instance regardless of variant or size
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none",
        // inline-flex + items-center + justify-center: keeps icon and label aligned and centered
        // gap-2: consistent spacing between spinner, icons, and label text
        // font-medium: slightly bold without being too heavy
        // transition-all duration-150: smooth and fast hover/active state animations
        // focus:outline-none + focus:ring-2 + focus:ring-offset-2: custom accessible focus ring
        // select-none: prevents text selection on rapid clicks

        variantClasses[variant], // Applies the correct color and interaction classes for the variant
        sizeClasses[size], // Applies the correct padding, font, and radius for the size
        fullWidth && "w-full", // Conditionally stretches button to full container width
        (disabled || isLoading) && "opacity-50 cursor-not-allowed scale-100",
        // opacity-50: visually dims the button to signal it's inactive
        // cursor-not-allowed: shows a blocked cursor on hover
        // scale-100: overrides active:scale-95 so disabled buttons don't shrink on click
        className, // Merges any extra classes passed in from the parent
      )}
      {...props}
      // Spreads remaining props onto the <button> — supports aria-label, data-testid, etc.
    >
      {/* Spinner — only rendered when isLoading is true, replaces icons during loading */}
      {isLoading && <Spinner size="sm" />}

      {/* Left icon — hidden during loading to avoid overlapping with the spinner */}
      {!isLoading && leftIcon && (
        <span className="shrink-0">{leftIcon}</span>
        // shrink-0 prevents the icon from compressing in tight flex containers
      )}

      {/* Button label — always wrapped in a span for consistent flex alignment */}
      <span>{children}</span>

      {/* Right icon — also hidden during loading state */}
      {!isLoading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
        // shrink-0 keeps the right icon from shrinking in narrow containers
      )}
    </button>
  );
};

export default Button;
// Default export — imported anywhere as: import Button from "..."
