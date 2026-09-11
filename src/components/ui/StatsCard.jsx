import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

// ICON_GRADIENTS — maps each accepted iconColor value to a matching two-tone
// diagonal gradient for the icon box background. Keeping this as a lookup
// table (rather than asking every caller to pass a gradient string directly)
// means every existing usage of StatsCard across the admin panel and the
// customer account dashboard picks up the gradient automatically, with no
// changes needed at the call site — callers keep passing the same
// iconColor value they always have (e.g. "text-primary", "text-danger").
const ICON_GRADIENTS = {
  "text-primary": "bg-linear-to-br from-primary to-primary-dark",
  "text-info": "bg-linear-to-br from-info to-info/70",
  "text-danger": "bg-linear-to-br from-danger to-danger/70",
  "text-warning": "bg-linear-to-br from-warning to-warning/70",
  "text-success": "bg-linear-to-br from-success to-success/70",
};
const DEFAULT_ICON_GRADIENT = ICON_GRADIENTS["text-primary"];

const StatsCard = ({
  title = "", // Descriptive label above the value — e.g. "Total Revenue"
  value = "", // The main KPI number displayed prominently — e.g. "Rs. 1,50,000"
  icon = null, // Optional icon element rendered in the top-right corner
  trend = "", // Percentage change string — e.g. "+12%" or "-5%"
  trendLabel = "", // Supporting text next to the trend badge — e.g. "vs last month"
  iconBg = "bg-primary-50", // Background color class for the icon container — defaults to light emerald
  iconColor = "text-primary", // Text/icon color class for the icon — defaults to brand emerald
  className = "", // Extra Tailwind classes for one-off customizations from outside
  onClick = null, // Optional click handler. When provided, the card becomes an
  // interactive element: it renders as a button-like div with a pointer
  // cursor, a focus ring for keyboard users, and responds to both mouse
  // clicks and Enter/Space key presses. When omitted, the card remains
  // purely presentational, exactly as before.
}) => {
  // Every StatsCard instance across the project now renders at the same
  // compact size — the small "floating chip" look originally reserved
  // for pages like Products/Discounts is now the one and only size,
  // including the Dashboard KPI cards. There is no separate "default"
  // (large) variant anymore, so every page that uses this component
  // stays visually consistent with every other page.

  const isInteractive = typeof onClick === "function";
  // isInteractive — true only when a real function is passed in. Used to
  // conditionally attach interactive-only props (role, tabIndex, key
  // handler, cursor styling) without affecting non-clickable usages of
  // this component elsewhere in the app.

  const handleKeyDown = (event) => {
    if (!isInteractive) return;
    // Activate on Enter or Space, matching native button behavior, since
    // this element renders as a div rather than a <button>.
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(event);
    }
  };
  // Determines trend direction by checking the first character of the trend string
  const isPositive = trend?.startsWith("+");
  // true when trend is a positive change — e.g. "+12%" — will show green badge with up arrow

  const isNegative = trend?.startsWith("-");
  // true when trend is a negative change — e.g. "-5%" — will show red badge with down arrow
  // If neither, trend is neutral — shows a gray badge with no arrow

  const iconGradient = ICON_GRADIENTS[iconColor] || DEFAULT_ICON_GRADIENT;
  // Looks up the gradient that matches the requested iconColor. The
  // original flat iconBg prop (e.g. "bg-primary-50") is no longer used for
  // the icon box background — it's kept as an accepted prop purely so
  // existing call sites don't need to be touched, but the box itself now
  // always renders with a solid two-tone gradient instead of a flat tint.

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      // role + tabIndex are only applied when the card is interactive, so
      // screen readers announce it as a button and keyboard users can tab
      // to it, without changing semantics for the many non-clickable
      // StatsCard instances across the app.
      className={cn(
        // "group" — lets the icon box react to the CARD being hovered
        // (via group-hover: below), instead of needing its own hover listener
        "group",

        // "relative" is no longer required for the trend badge (which
        // now sits in normal document flow — see below), but is left in
        // place in case other consumers of this card rely on it for
        // custom absolutely-positioned content passed through className.
        "relative",

        // Base classes — applied to every stats card instance
        "bg-white border border-gray-100 rounded-lg flex flex-col",
        "p-3 gap-1.5",
        // A touch more breathing room than the very first compact pass —
        // still tight, but no longer cramped

        // WIDTH — the card hugs its own content (title + icon row, or
        // the value below, whichever is wider) instead of stretching to
        // a fixed width, so it never leaves empty space after the icon.
        // min-w-[130px] just stops it from getting uncomfortably
        // cramped when both the title and the value are very short
        // (e.g. "Active" / "2").
        "w-fit min-w-[130px] shrink-0",

        // ELEVATION — the card has a soft shadow baked into its resting
        // state (instead of only appearing on hover), so it visually
        // "lifts" off the gray page background at all times.
        "shadow-[0_4px_14px_-4px_rgba(16,24,40,0.14)]",

        // HOVER — subtle upward lift on every card, reinforcing that the
        // card is a distinct, tappable-feeling summary chip.
        "hover:shadow-[0_10px_24px_-6px_rgba(16,24,40,0.22)] hover:-translate-y-0.5",
        "transition-all duration-300",
        // transition-all duration-300: smooth, slow shadow/transform animation
        // so the hover change never feels abrupt

        // INTERACTIVITY — only applied when an onClick handler is supplied.
        // Adds a pointer cursor so the card visually reads as tappable, a
        // slightly stronger hover lift to reinforce that affordance, and a
        // visible focus ring for keyboard navigation.
        isInteractive &&
          "cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",

        className,
        // Merges any extra classes passed from the parent
      )}
    >
      {/* Top row — title sits on the left, icon is pushed all the way to
          the far right edge of the card via justify-between, instead of
          sitting tight against the title. */}
      <div className="flex items-center justify-between gap-2">
        {/* Card title — descriptive label for the KPI metric */}
        <p className="font-medium text-gray-500 text-xs truncate max-w-[140px]">
          {title}
          {/* font-medium: slightly bold for legibility */}
          {/* text-gray-500: muted gray — clearly secondary to the bold value below */}
          {/* max-w-[140px] + truncate: caps the title's width so a long
              title clips with "…" instead of crowding the icon at the
              opposite end of the row */}
        </p>

        {/* Icon container — only rendered when icon prop is provided.
            Sits at the end of the row (see justify-between above) with a
            solid diagonal gradient fill instead of a flat tinted
            background, and a white icon for contrast against it. */}
        {icon && (
          <div
            className={cn(
              "flex items-center justify-center shrink-0",
              "w-7 h-7 rounded-md",
              // 28px icon box, matching the compact text size used
              // throughout this card

              // Soft shadow gives the icon box a sense of depth against
              // its own gradient fill
              "shadow-sm",

              // Icon box grows very slightly when the CARD (not just the icon)
              // is hovered — a tiny, tasteful bit of interactivity
              "transition-transform duration-300 group-hover:scale-105",

              iconGradient,
              // Diagonal two-tone gradient derived from the iconColor prop
              // — see the ICON_GRADIENTS lookup table above.
            )}
          >
            <span className="text-xs text-white">
              {icon}
              {/* Icon is always rendered in white now, since it sits on a
                  solid gradient fill rather than a light tint — the old
                  iconColor value is what selects which gradient is used
                  (see iconGradient above), it no longer colors the icon
                  itself. */}
            </span>
          </div>
        )}
      </div>

      {/* Main KPI value — the most prominent element on the card */}
      <p className="font-bold text-gray-900 text-lg truncate">
        {value}
        {/* font-bold: heaviest weight — establishes clear visual hierarchy */}
        {/* text-gray-900: near-black for maximum contrast */}
        {/* text-lg (down from text-xl) + truncate: smaller value text,
            clipped instead of wrapping so it can't stretch the card taller */}
      </p>

      {/* Trend badge — only rendered when trend prop is a non-empty string.
          Sits in normal document flow, on its own line below the value,
          with a small top margin separating it from the value text above.
          This card previously pinned the badge with absolute positioning
          over the bottom-right corner to avoid adding an extra row — but
          on cards with a long formatted value (e.g. a large currency
          figure), the badge could end up sitting directly on top of the
          value text instead of below it. Placing the badge in normal flow
          removes that risk entirely, at the small cost of a touch more
          height on cards that have a trend versus ones that don't. */}
      {trend && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 self-start mt-0.5 text-[9px] font-medium px-1 py-0.5 rounded max-w-full truncate",
            // mt-0.5: the small gap that keeps this badge clearly separate
            // from the value line above it
            // self-start: the badge only takes up as much width as its own
            // text needs, instead of stretching the full card width
            // max-w-full + truncate: long trend text (e.g. "Requires action")
            // clips with an ellipsis instead of overflowing the card

            isPositive && "bg-success-light text-success",
            isNegative && "bg-danger-light text-danger",
            !isPositive && !isNegative && "bg-gray-100 text-gray-500",
          )}
          title={trendLabel ? `${trend} ${trendLabel}` : trend}
          // Full text (including trendLabel, when supplied) still available
          // on hover/focus even though the badge itself is truncated
        >
          {isPositive && (
            <svg
              className="w-2 h-2 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 15l7-7 7 7"
              />
            </svg>
          )}
          {isNegative && (
            <svg
              className="w-2 h-2 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
          <span className="truncate">{trend}</span>
        </span>
      )}
    </div>
  );
};

export default StatsCard;
// Default export — imported anywhere as: import StatsCard from "..."
