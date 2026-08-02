// Reusable Badge component — small label for displaying status at a glance
// Order status, payment status, and return status will all use this component
// Variants: success, warning, danger, info, gray
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

import getStatusColor from "../../utils/getStatusColor";
// getStatusColor utility — maps a status string (e.g. "delivered") to the correct Tailwind color classes automatically

const Badge = ({
  label = "", // Text rendered inside the badge (e.g. "Delivered", "Pending", "Cancelled")
  variant = "", // Manually chosen color variant — used when no status string is provided
  status = "", // Order/return/complaint status string — color is resolved automatically via getStatusColor
  size = "md", // Controls badge dimensions — "sm" for compact, "md" for default
  rounded = false, // When true, badge gets a full pill shape; when false, slightly rounded corners
  icon = null, // Optional small icon element rendered to the left of the label (e.g. a checkmark or cross)
  className = "", // Extra Tailwind classes for one-off customizations from outside
}) => {
  // If a status string is passed, resolve its color automatically via the utility
  // Otherwise fall back to the manually passed variant prop
  const statusColor = status ? getStatusColor(status) : "";
  // getStatusColor returns the full Tailwind bg + text class string for a given status keyword
  // statusColor will be an empty string if no status is provided — variant is used instead

  // Each manual variant maps to a light background + matching text color pair
  // All color tokens come from tokens.css CSS variables
  const variantClasses = {
    success: "bg-success-light text-success",
    // Green tones — used for positive outcomes like Delivered or Approved

    warning: "bg-warning-light text-warning",
    // Yellow tones — used for in-progress states like Pending or Processing

    danger: "bg-danger-light text-danger",
    // Red tones — used for negative outcomes like Cancelled or Rejected

    info: "bg-info-light text-info",
    // Blue tones — used for neutral informational states like Confirmed

    gray: "bg-gray-100 text-gray-600",
    // Gray tones — used as the default fallback for unknown or closed states
  };

  // Each size maps to its own horizontal/vertical padding and font size.
  // The icon's own size is controlled by whatever className the caller
  // passes on the icon element itself (e.g. "w-3.5 h-3.5"), so it's not
  // duplicated here — this just controls the gap between icon and text.
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    // Small: tighter padding — used in dense tables or compact UI areas

    md: "px-2.5 py-1 text-xs gap-1.5",
    // Medium (default): slightly more padding — used in most standard badge placements
  };

  return (
    <span
      className={cn(
        // Base classes — applied to every badge instance
        "inline-flex items-center font-medium",
        // inline-flex + items-center: vertically centers text and icon inside the badge
        // font-medium: slightly bold text for better legibility at small sizes

        sizeClasses[size],
        // Injects the correct padding, font size, and icon-to-text gap for the chosen size

        rounded ? "rounded-full" : "rounded-md",
        // rounded-full: full pill shape — softer, tag-like appearance
        // rounded-md: slightly rounded corners — more rectangular, formal appearance

        status ? statusColor : variantClasses[variant] || variantClasses.gray,
        // If status prop is provided: use the auto-resolved color from getStatusColor utility
        // If variant prop is provided: use the matching variantClasses entry
        // If neither matches: fall back to gray as the safe default color

        className,
        // Merges any extra classes passed from the parent component
      )}
    >
      {/* Icon — only rendered when the icon prop is provided. Inherits
          the badge's own text color automatically (no separate color
          class needed), since SVG icons from react-icons default to
          currentColor unless overridden. */}
      {icon && (
        <span className="inline-flex items-center shrink-0">{icon}</span>
      )}

      {label}
      {/* Renders the badge text — e.g. "Delivered", "Pending", "Cancelled" */}
    </span>
  );
};

export default Badge;
// Default export — imported anywhere as: import Badge from "..."
