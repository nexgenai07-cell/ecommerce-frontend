// Reusable StatsCard component
// Displays KPI numbers on the admin dashboard
// Contains an icon, main value, label, and optional trend badge
// Fully responsive

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
        // Base classes — applied to every stats card instance
        "bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4",
        // bg-white: solid white card background
        // rounded-xl: generously rounded corners for a modern card appearance
        // border border-gray-100: subtle border to define the card edge without heaviness
        // p-5: consistent internal padding on all sides
        // flex flex-col: stacks the top row, value, and trend badge vertically
        // gap-4: consistent spacing between each section of the card

        "hover:shadow-md transition-shadow duration-200",
        // hover:shadow-md: subtle lift effect on hover to signal interactivity
        // transition-shadow duration-200: smooth shadow animation on hover

        className,
        // Merges any extra classes passed from the parent
      )}
    >
      {/* Top row — title on the left, icon on the right */}
      <div className="flex items-center justify-between">
        {/* justify-between: pushes title to the far left and icon to the far right */}

        {/* Card title — descriptive label for the KPI metric */}
        <p className="text-sm font-medium text-gray-500">
          {title}
          {/* text-sm: small label text — subordinate to the main value */}
          {/* font-medium: slightly bold for legibility */}
          {/* text-gray-500: muted gray — clearly secondary to the bold value below */}
        </p>

        {/* Icon container — only rendered when icon prop is provided */}
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              // w-10 h-10: 40px square container — large enough to be visually clear
              // rounded-lg: rounded corners on the icon box match the card style
              // flex + items-center + justify-center: centers the icon inside the box
              // shrink-0: prevents the icon box from compressing in flex layout
              iconBg,
              // Applies the background color passed via iconBg prop — defaults to bg-primary-50
            )}
          >
            <span className={cn("text-xl", iconColor)}>
              {icon}
              {/* text-xl: renders emoji or SVG icons at a readable size inside the box */}
              {/* iconColor: applies the icon color passed via prop — defaults to text-primary */}
            </span>
          </div>
        )}
      </div>

      {/* Main KPI value — the most prominent element on the card */}
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {/* text-2xl: large number that immediately draws the eye */}
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
