// Reusable loading spinner component
// Will be used inside buttons, on page loading, and as a skeleton replacement
// Size variants: sm, md, lg

import cn from "../../utils/cn";
// Importing cn utility — cleanly merges multiple Tailwind class strings together

const Spinner = ({ size = "md", className = "" }) => {
  // Spinner accepts two props:
  // size — controls the dimensions of the SVG icon, defaults to "md"
  // className — allows extra Tailwind classes to be injected from outside

  // Each size maps to specific width and height Tailwind classes
  const sizeClasses = {
    sm: "w-4 h-4", // Small (16px) — fits neatly inside buttons
    md: "w-6 h-6", // Medium (24px) — used for inline loading indicators
    lg: "w-8 h-8", // Large (32px) — used for full page or section loading
  };

  return (
    <svg
      className={cn(
        "animate-spin text-current",
        // animate-spin: Tailwind's built-in infinite 360deg rotation animation
        // text-current: SVG inherits the text color of its parent element automatically
        sizeClasses[size],
        // Injects the correct width/height classes based on the size prop
        className,
        // Merges any additional classes passed from the parent component
      )}
      xmlns="http://www.w3.org/2000/svg"
      // Standard SVG namespace — required for valid inline SVG markup
      fill="none"
      // No fill on the SVG root — individual shapes control their own fill
      viewBox="0 0 24 24"
      // ViewBox defines the internal coordinate system — 24x24 unit grid
      aria-label="Loading"
      // Accessibility label — screen readers will announce "Loading" for this element
    >
      {/* Background circle — always fully visible, gives the spinner its track appearance */}
      <circle
        className="opacity-25"
        // 25% opacity makes this the faint gray background ring
        cx="12"
        cy="12"
        // cx and cy center the circle at the middle of the 24x24 viewBox
        r="10"
        // Radius of 10 units — leaves 2 units of padding from the viewBox edge
        stroke="currentColor"
        // Stroke inherits color from parent via text-current on the SVG
        strokeWidth="4"
        // Stroke thickness of 4 units — makes the ring clearly visible
      />

      {/* Foreground arc — the spinning part, brighter and more visible than the background ring */}
      <path
        className="opacity-75"
        // 75% opacity makes this arc stand out clearly against the background circle
        fill="currentColor"
        // Filled with the inherited text color (no stroke needed — it's a filled shape)
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        // SVG path that draws a quarter-circle arc at the top-left of the spinner
        // Combined with animate-spin on the parent SVG, this arc appears to spin around
      />
    </svg>
  );
};

export { Spinner };
// Named export — can be imported as: import { Spinner } from "./Spinner"

export default Spinner;
// Default export — can also be imported as: import Spinner from "./Spinner"
