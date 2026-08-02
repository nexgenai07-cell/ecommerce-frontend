import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Select = ({
  label = "", // Text label rendered above the select field
  error = "", // Error message string — renders in red below select when present
  hint = "", // Helper text in gray below select — hidden when error is shown
  options = [], // Array of option objects — each must have { value, label }
  placeholder = "Select an option", // Default first option shown before user makes a selection
  fullWidth = true, // When true (default), wrapper stretches to full container width
  className = "", // Extra Tailwind classes for one-off customizations from outside
  id, // Unique HTML id — connects <label> htmlFor to <select> for accessibility
  required = false, // When true, shows a red asterisk (*) next to the label
  disabled = false, // When true, select is visually dimmed and non-interactive
  ...props // Remaining HTML select attributes — value, onChange, name, etc.
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {/* Outer wrapper is a flex column with 1.5 unit gap between label, select, and hint/error */}
      {/* w-full applied conditionally based on fullWidth prop */}

      {/* Label — only rendered when label prop is a non-empty string */}
      {label && (
        <label
          htmlFor={id}
          // htmlFor links this label to the select with the matching id — improves accessibility
          className="text-sm font-medium text-gray-700"
          // Small, medium-weight, dark gray label — consistent with Input and Textarea components
        >
          {label}
          {/* Red asterisk — only shown when required prop is true */}
          {required && (
            <span className="text-danger ml-1">*</span>
            // ml-1 adds a small gap between label text and the asterisk
          )}
        </label>
      )}

      {/* Select wrapper — relative position allows the custom arrow icon to be placed inside */}
      <div className="relative">
        {/* Actual select element */}
        <select
          id={id}
          // id connects this select to its label via htmlFor for screen reader support

          disabled={disabled}
          // Passes disabled state to the native select element

          className={cn(
            // Base classes — applied to every select instance
            "w-full rounded-lg border bg-white text-gray-900 text-sm transition-all duration-150",
            // w-full fills the relative wrapper div
            // rounded-lg gives softly rounded corners consistent with Input and Textarea
            // bg-white ensures consistent background across browsers
            // text-gray-900 for high contrast readable selected value text
            // text-sm keeps font size consistent with the rest of the UI
            // transition-all duration-150 for smooth border/ring color changes on focus

            "pl-4 pr-10 py-2.5",
            // pl-4 normal left padding for the selected value text
            // pr-10 extra right padding so selected text never overlaps the custom arrow icon
            // py-2.5 vertical padding consistent with Input and Textarea

            "appearance-none cursor-pointer",
            // appearance-none removes the browser's default dropdown arrow so we can use our own
            // cursor-pointer shows a hand cursor on hover to signal interactivity

            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            // Removes default browser outline and replaces with custom emerald focus ring
            // focus:border-primary changes border color to brand color on focus

            error
              ? "border-danger focus:ring-danger focus:border-danger"
              : "border-gray-200",
            // Error state: overrides border and focus ring to red (danger color)
            // Normal state: keeps the default light gray border

            disabled && "opacity-50 cursor-not-allowed bg-gray-50",
            // opacity-50 dims the select visually
            // cursor-not-allowed overrides cursor-pointer when disabled
            // bg-gray-50 gives a slightly off-white background to reinforce disabled state

            className,
            // Merges any extra classes passed from the parent component
          )}
          {...props}
          // Spreads remaining props — value, onChange, name, defaultValue, etc.
        >
          {/* Placeholder option — shown by default. Intentionally NOT disabled:
              this option also represents "no filter" / "All ..." for every
              filter dropdown in the app (Category, Status, etc). If it were
              disabled, the browser would let it display once but would block
              the user from ever clicking back to it after picking a real
              option — which is exactly the bug where "All Categories" could
              never be re-selected once a specific category was chosen. */}
          <option value="">
            {placeholder}
            {/* Renders the placeholder text as a normal, selectable first option */}
          </option>

          {/* Renders one <option> per item in the options array passed from outside */}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {/* key uses option.value for stable React reconciliation */}
              {/* value is what gets submitted or stored in state on selection */}
              {option.label}
              {/* label is the human-readable text shown in the dropdown */}
            </option>
          ))}
        </select>

        {/* Custom chevron arrow icon — absolutely positioned inside the select on the right */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {/* right-3 aligns icon 12px from right edge */}
          {/* top-1/2 + -translate-y-1/2 perfectly centers the icon vertically */}
          {/* text-gray-400 gives the arrow a muted gray color */}
          {/* pointer-events-none prevents the icon from intercepting click events on the select */}
          <svg
            className="w-4 h-4"
            // 16x16px icon — small enough to fit comfortably inside the select field
            fill="none"
            // No fill — icon is drawn with stroke only
            stroke="currentColor"
            // Inherits the gray color from the parent span's text-gray-400
            viewBox="0 0 24 24"
            // Standard 24x24 viewBox coordinate system
          >
            <path
              strokeLinecap="round"
              // Rounded line ends for a softer, modern look
              strokeLinejoin="round"
              // Rounded corner joins consistent with strokeLinecap
              strokeWidth={2}
              // Stroke thickness of 2 units — visible but not heavy
              d="M19 9l-7 7-7-7"
              // SVG path that draws a downward-pointing chevron (V shape)
            />
          </svg>
        </span>
      </div>

      {/* Error message — only rendered when error prop is a non-empty string */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
        // text-xs keeps it smaller than the select text
        // text-danger renders it in red to match the error border
      )}

      {/* Hint text — only rendered when hint exists AND there is no active error */}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
        // Muted gray, same size as error text
        // Suppressed when error is present to avoid showing conflicting messages
      )}
    </div>
  );
};

export default Select;
// Default export — imported anywhere as: import Select from "..."
