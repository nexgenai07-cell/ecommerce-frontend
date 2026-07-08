// Reusable Divider component — separates content sections with a visible line
// Horizontal — between stacked sections
// Vertical — between inline elements like breadcrumb items
// Will be used in cart summary, sidebar sections, and profile pages
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Divider = ({
  orientation = "horizontal", // Layout direction — "horizontal" (default) or "vertical"
  label = "", // Optional text centered in the middle of a horizontal divider (e.g. "OR")
  className = "", // Extra Tailwind classes for one-off customizations from outside
}) => {
  // --- VERTICAL DIVIDER ---
  // Rendered as a thin vertical bar — used between inline elements like breadcrumb separators
  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "w-px h-full bg-gray-200 shrink-0",
          // w-px: 1px wide — a hairline vertical line
          // h-full: stretches to the full height of its flex parent container
          // bg-gray-200: light gray color consistent with horizontal divider border color
          // shrink-0: prevents the line from collapsing in tight flex containers
          className,
        )}
      />
    );
  }

  // --- HORIZONTAL DIVIDER — no label ---
  // Simple full-width horizontal rule — used between stacked content sections
  if (!label) {
    return (
      <hr
        className={cn(
          "border-0 border-t border-gray-200 w-full",
          // border-0: removes all default browser hr borders
          // border-t: adds only the top border — giving a single clean horizontal line
          // border-gray-200: light gray consistent with vertical divider color
          // w-full: stretches across the full width of the parent container
          className,
        )}
      />
    );
  }

  // --- HORIZONTAL DIVIDER — with label ---
  // Line on both sides with centered text in the middle — used for "OR" on login/register pages
  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full",
        // flex + items-center: aligns both lines and the label text on the same vertical center
        // gap-3: consistent spacing between each line and the center label
        // w-full: stretches the entire row to full container width
        className,
      )}
    >
      {/* Left line — grows to fill all available space to the left of the label */}
      <hr className="flex-1 border-0 border-t border-gray-200" />
      {/* flex-1: takes up all remaining horizontal space on the left side */}
      {/* border-0 + border-t + border-gray-200: same single-line style as the no-label divider */}

      {/* Center label — the text displayed between the two lines */}
      <span className="text-xs text-gray-400 font-medium shrink-0">
        {label}
        {/* text-xs: small text so it doesn't visually overpower the lines */}
        {/* text-gray-400: muted gray — subordinate to surrounding content */}
        {/* font-medium: slightly bold for legibility at small size */}
        {/* shrink-0: prevents the label from compressing when container is narrow */}
      </span>

      {/* Right line — mirrors the left line, grows to fill remaining space on the right */}
      <hr className="flex-1 border-0 border-t border-gray-200" />
      {/* flex-1: takes up all remaining horizontal space on the right side */}
      {/* border-0 + border-t + border-gray-200: identical style to the left line */}
    </div>
  );
};

export default Divider;
// Default export — imported anywhere as: import Divider from "..."
