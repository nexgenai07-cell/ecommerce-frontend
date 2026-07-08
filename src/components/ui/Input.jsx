// Reusable Input component
// Handles label, error, hint, leftIcon, rightIcon all in one
// Shows emerald border on focus
// Shows red border in error state
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Input = ({
  label = "", // Text label rendered above the input field
  error = "", // Error message string — renders in red below the input when present
  hint = "", // Helper text rendered in gray below the input — hidden when error is shown
  leftIcon = null, // Optional icon element positioned inside the input on the left side
  rightIcon = null, // Optional icon element positioned inside the input on the right side
  fullWidth = true, // When true (default), input wrapper stretches to full container width
  className = "", // Extra Tailwind classes for one-off customizations from outside
  id, // Unique HTML id — connects the <label> htmlFor to the <input> for accessibility
  required = false, // When true, shows a red asterisk (*) next to the label
  disabled = false, // When true, input is visually dimmed and non-interactive
  ...props // Remaining HTML input attributes — type, placeholder, value, onChange, etc.
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {/* Outer wrapper is a flex column with 1.5 unit gap between label, input, and hint/error */}
      {/* w-full applied conditionally based on fullWidth prop */}

      {/* Label — only rendered when label prop is provided */}
      {label && (
        <label
          htmlFor={id}
          // htmlFor links this label to the input with the matching id — improves accessibility
          className="text-sm font-medium text-gray-700"
          // Small, medium-weight, dark gray label text
        >
          {label}
          {/* Red asterisk — only shown when required prop is true */}
          {required && (
            <span className="text-danger ml-1">*</span>
            // ml-1 adds a small gap between label text and the asterisk
          )}
        </label>
      )}

      {/* Input wrapper — relative position enables absolute placement of left/right icons */}
      <div className="relative flex items-center">
        {/* Left icon — absolutely positioned inside the input on the left */}
        {leftIcon && (
          <span className="absolute left-3 text-gray-400 pointer-events-none">
            {/* left-3 aligns icon 12px from the left edge */}
            {/* text-gray-400 gives the icon a muted gray color */}
            {/* pointer-events-none prevents the icon from blocking clicks on the input */}
            {leftIcon}
          </span>
        )}

        {/* Actual input field */}
        <input
          id={id}
          // id connects this input to its label via htmlFor for screen reader support

          disabled={disabled}
          // Passes disabled state to the native input element

          className={cn(
            // Base classes — applied to every input instance
            "w-full rounded-lg border bg-white text-gray-900 text-sm transition-all duration-150",
            // w-full fills the relative wrapper div
            // rounded-lg gives softly rounded corners
            // bg-white ensures consistent background across browsers
            // text-gray-900 for high contrast readable input text
            // text-sm keeps font size consistent with the rest of the UI
            // transition-all duration-150 for smooth border/ring color changes on focus

            "placeholder:text-gray-400",
            // Muted gray placeholder text — distinct from actual input value

            leftIcon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5",
            // If left icon exists: pl-10 creates space so text doesn't overlap the icon
            // Otherwise: uniform px-4 horizontal padding on both sides

            rightIcon ? "pr-10" : "",
            // If right icon exists: pr-10 creates space so text doesn't overlap the right icon

            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            // Removes default browser outline and replaces with a custom emerald focus ring
            // focus:border-primary changes border color to brand color on focus

            "border-gray-200",
            // Default border color — light gray when input is idle

            error
              ? "border-danger focus:ring-danger focus:border-danger"
              : "border-gray-200",
            // Error state overrides border and focus ring to red (danger color)
            // Normal state keeps the light gray border

            disabled && "opacity-50 cursor-not-allowed bg-gray-50",
            // opacity-50 dims the input visually
            // cursor-not-allowed signals the input is non-interactive
            // bg-gray-50 gives a slightly off-white background to reinforce disabled state

            className,
            // Merges any extra classes passed from the parent component
          )}
          {...props}
          // Spreads remaining props — type, placeholder, value, onChange, onBlur, etc.
        />

        {/* Right icon — absolutely positioned inside the input on the right */}
        {rightIcon && (
          <span className="absolute right-3 text-gray-400">
            {/* right-3 aligns icon 12px from the right edge */}
            {/* No pointer-events-none here — right icon may be interactive (e.g. password toggle) */}
            {rightIcon}
          </span>
        )}
      </div>

      {/* Error message — only rendered when error prop is a non-empty string */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
        // text-xs keeps it smaller than the input text
        // text-danger renders it in red to match the error border
      )}

      {/* Hint text — only rendered when hint exists AND there is no error */}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
        // Muted gray, same size as error text
        // Suppressed when error is present to avoid showing conflicting messages
      )}
    </div>
  );
};

export default Input;
// Default export — imported anywhere as: import Input from "..."
