// Reusable ErrorState component
// Shown when an API call fails or an unexpected error occurs
// Retry button lets the user attempt the failed operation again
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

import Button from "./Button";
// Button component — used for the optional retry action button

const ErrorState = ({
  title = "Something went wrong",
  // Default heading — generic enough to work for any unexpected error scenario

  message = "An error occurred while loading data. Please try again.",
  // Default body text — explains what happened and prompts the user to retry

  onRetry,
  // Optional handler called when the retry button is clicked — e.g. re-trigger an API call
  // When not provided, the retry button is hidden entirely

  retryLabel = "Try Again",
  // Label on the retry button — overridable for different contexts (e.g. "Reload", "Refresh")

  className = "",
  // Extra Tailwind classes applied to the outer wrapper for layout customization
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-4 text-center",
        // flex-col: stacks icon circle, text block, and retry button vertically
        // items-center: horizontally centers all children
        // justify-center: vertically centers content when placed in a full-height container
        // gap-4: consistent spacing between icon, text block, and button
        // py-16: generous vertical padding so the error state feels spacious, not cramped
        // px-4: horizontal padding prevents content from touching screen edges on mobile
        // text-center: centers all text for a balanced, symmetric layout
        className,
      )}
    >
      {/* Error icon container — circular red background with a warning triangle inside */}
      <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center">
        {/* w-16 h-16: 64px circle — large enough to be immediately noticeable */}
        {/* rounded-full: perfect circle shape consistent with SuccessModal's checkmark circle */}
        {/* bg-danger-light: light red background from design tokens — matches the error color theme */}
        {/* flex + items-center + justify-center: centers the SVG icon inside the circle */}

        <svg
          className="w-8 h-8 text-danger"
          // w-8 h-8: 32px icon — half the container size for balanced proportions
          // text-danger: brand red color inherited by stroke="currentColor" on the path
          fill="none"
          // No fill — icon is drawn with stroke lines only
          stroke="currentColor"
          // Stroke color inherited from text-danger via currentColor
          viewBox="0 0 24 24"
          // Standard 24x24 coordinate system
        >
          <path
            strokeLinecap="round" // Rounded line ends for a softer appearance
            strokeLinejoin="round" // Rounded joins consistent with strokeLinecap
            strokeWidth={1.5}
            // Lighter stroke weight than typical — matches the EmptyState icon style
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            // Triangle warning path with an exclamation mark (vertical line + dot) inside
            // M12 9v2 — draws the exclamation vertical stroke
            // m0 4h.01 — draws the exclamation dot below
            // Remaining path — draws the triangle warning shape around them
          />
        </svg>
      </div>

      {/* Text content block — title and message stacked with tight spacing */}
      <div className="flex flex-col gap-2">
        {/* gap-2: tighter spacing between title and message — they belong together visually */}

        {/* Error title — primary heading for the error state */}
        <h3 className="text-base font-semibold text-gray-700">
          {title}
          {/* text-base: standard readable size consistent with EmptyState title */}
          {/* font-semibold: clear visual hierarchy without being as heavy as a page title */}
          {/* text-gray-700: dark enough to read clearly without the severity of text-gray-900 */}
        </h3>

        {/* Error message — secondary supporting detail below the title */}
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
          {message}
          {/* text-sm: smaller than title — clearly subordinate supporting information */}
          {/* text-gray-400: muted gray further subordinates it to the title */}
          {/* max-w-xs (320px): constrains line length for comfortable reading on wide screens */}
          {/* leading-relaxed: increased line height for multi-line message readability */}
        </p>
      </div>

      {/* Retry button — only rendered when onRetry handler is provided */}
      {onRetry && (
        <Button
          variant="outline"
          // Outline style — brand-colored border without a filled background
          // Less visually heavy than primary — appropriate for a recovery action, not a CTA
          onClick={onRetry}
          // Triggers the retry handler from the parent — e.g. refetch API data
        >
          {retryLabel}
          {/* Renders the retry button label — defaults to "Try Again" */}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
// Default export — imported anywhere as: import ErrorState from "..."
