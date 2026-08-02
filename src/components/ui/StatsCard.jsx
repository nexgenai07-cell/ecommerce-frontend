import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const StatsCard = ({
  title = "", // Descriptive label above the value — e.g. "Total Revenue"
  value = "", // The main KPI number displayed prominently — e.g. "Rs. 1,50,000"
  icon = null, // Optional icon element rendered in the top-right corner
  trend = "", // Percentage change string — e.g. "+12%" or "-5%"
  trendLabel = "", // Supporting text next to the trend badge — e.g. "vs last month"
  iconBg = "bg-primary-50", // Background color class for the icon container — defaults to light emerald
  iconColor = "text-primary", // Text/icon color class for the icon — defaults to brand emerald
  className = "", // Extra Tailwind classes for one-off customizations from outside
  compact = false, // Opt-in smaller variant — tighter padding, smaller icon box and
  // value text, stronger resting elevation. Defaults to false so every
  // existing caller (Dashboard KPI cards) renders exactly as before;
  // only pages that explicitly pass compact={true} (e.g. the Product
  // page's summary row) get the smaller, more "floating chip" look.
}) => {
  // Determines trend direction by checking the first character of the trend string
  const isPositive = trend?.startsWith("+");
  // true when trend is a positive change — e.g. "+12%" — will show green badge with up arrow

  const isNegative = trend?.startsWith("-");
  // true when trend is a negative change — e.g. "-5%" — will show red badge with down arrow
  // If neither, trend is neutral — shows a gray badge with no arrow

  return (
    <div
      className={cn(
        // "group" — lets the icon box react to the CARD being hovered
        // (via group-hover: below), instead of needing its own hover listener
        "group",

        // Base classes — applied to every stats card instance
        "bg-white rounded-xl border border-gray-100 flex flex-col",
        compact ? "p-3.5 gap-2" : "p-5 gap-4",
        // compact=false (default, Dashboard): p-5 padding, gap-4 between sections
        // compact=true (Product page summary row): tighter p-3.5 padding,
        // gap-2 between sections — visibly smaller card footprint, both
        // in height and in how much horizontal space it needs to breathe

        // ELEVATION — the card has a soft shadow baked into its resting
        // state (instead of only appearing on hover), so it visually "lifts"
        // off the gray page background at all times, not just on interaction.
        // Compact cards get a slightly stronger resting + hover shadow so
        // they read as clearly "elevated" even at their smaller size.
        compact
          ? "shadow-[0_4px_14px_-4px_rgba(16,24,40,0.14)]"
          : "shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]",

        // HOVER — subtle lift on every card; compact cards get a small
        // upward nudge too since they're meant to feel like tappable
        // summary chips rather than static dashboard tiles.
        compact
          ? "hover:shadow-[0_10px_24px_-6px_rgba(16,24,40,0.22)] hover:-translate-y-0.5"
          : "hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]",
        "transition-all duration-300",
        // transition-all duration-300: smooth, slow shadow/transform animation
        // so the hover change never feels abrupt

        className,
        // Merges any extra classes passed from the parent
      )}
    >
      {/* Top row — title on the left, icon on the right */}
      <div className="flex items-center justify-between">
        {/* justify-between: pushes title to the far left and icon to the far right */}

        {/* Card title — descriptive label for the KPI metric */}
        <p
          className={cn(
            "font-medium text-gray-500",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {title}
          {/* compact: text-xs, default: text-sm — smaller label to match the smaller card */}
          {/* font-medium: slightly bold for legibility */}
          {/* text-gray-500: muted gray — clearly secondary to the bold value below */}
        </p>

        {/* Icon container — only rendered when icon prop is provided */}
        {icon && (
          <div
            className={cn(
              "rounded-xl flex items-center justify-center shrink-0",
              compact ? "w-9 h-9" : "w-12 h-12",
              // compact: 36px icon box, default: 48px — the biggest single
              // contributor to the card's overall height/footprint

              // Subtle inner ring + soft shadow gives the icon box a bit of
              // depth/polish instead of sitting flat against the card
              "ring-1 ring-black/5 shadow-sm",

              // Icon box grows very slightly when the CARD (not just the icon)
              // is hovered — a tiny, tasteful bit of interactivity
              "transition-transform duration-300 group-hover:scale-105",

              iconBg,
              // Applies the background color passed via iconBg prop — defaults to bg-primary-50
            )}
          >
            <span className={cn(compact ? "text-base" : "text-2xl", iconColor)}>
              {icon}
              {/* compact: text-base icon, default: text-2xl */}
              {/* iconColor: applies the icon color passed via prop — defaults to text-primary */}
            </span>
          </div>
        )}
      </div>

      {/* Main KPI value — the most prominent element on the card */}
      <p
        className={cn(
          "font-bold text-gray-900",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {value}
        {/* compact: text-xl, default: text-2xl — still bold and prominent,
            just scaled to match the smaller card */}
        {/* font-bold: heaviest weight — establishes clear visual hierarchy */}
        {/* text-gray-900: near-black for maximum contrast */}
      </p>

      {/* Trend section — only rendered when trend prop is a non-empty string */}
      {trend && (
        <div className="flex items-center gap-1.5">
          {/* flex + items-center: aligns the badge and label text on the same baseline */}
          {/* gap-1.5: tight spacing between the colored badge and the gray label */}

          {/* Trend badge — colored pill showing direction and percentage */}
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md",
              // inline-flex + items-center: aligns the arrow icon and percentage text
              // gap-0.5: minimal spacing between arrow icon and percentage number
              // text-xs: small badge text — subordinate to the main value
              // font-medium: slightly bold for legibility at small size
              // px-1.5 py-0.5: tight padding inside the badge pill
              // rounded-md: slightly rounded badge corners

              isPositive && "bg-success-light text-success",
              // Positive trend: light green background + green text — signals growth

              isNegative && "bg-danger-light text-danger",
              // Negative trend: light red background + red text — signals decline

              !isPositive && !isNegative && "bg-gray-100 text-gray-500",
              // Neutral trend: light gray background + gray text — no directional signal
            )}
          >
            {/* Up arrow — only shown for positive trends */}
            {isPositive && (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {/* w-3 h-3: 12px — tiny arrow that fits neatly inside the badge */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 15l7-7 7 7"
                  // Upward chevron path — points up to signal a positive increase
                />
              </svg>
            )}

            {/* Down arrow — only shown for negative trends */}
            {isNegative && (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {/* w-3 h-3: 12px — matches the up arrow size exactly */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 9l-7 7-7-7"
                  // Downward chevron path — points down to signal a negative decline
                />
              </svg>
            )}

            {trend}
            {/* Renders the raw trend string — e.g. "+12%" or "-5%" — after the arrow icon */}
          </span>

          {/* Trend label — optional supporting context next to the badge */}
          {trendLabel && (
            <span className="text-xs text-gray-400">{trendLabel}</span>
            // text-xs: same size as the badge text for visual alignment
            // text-gray-400: muted gray — clearly secondary to the colored badge
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
// Default export — imported anywhere as: import StatsCard from "..."
