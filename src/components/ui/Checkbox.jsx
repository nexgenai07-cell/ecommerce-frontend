// Reusable Checkbox component
// Replaces the browser's default checkbox with a custom emerald styled one
// Will be used in remember me, filters, and bulk select scenarios
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Checkbox = ({
  label = "", // Text rendered inline to the right of the checkbox
  error = "", // Error message string — renders in red below the checkbox when present
  hint = "", // Helper text rendered in gray below the checkbox — hidden when error is shown
  disabled = false, // When true, checkbox is visually dimmed and non-interactive
  className = "", // Extra Tailwind classes applied to the outermost wrapper div
  id, // Unique HTML id — connects the <label> htmlFor to the <input> for accessibility
  ...props // Remaining HTML input attributes — checked, defaultChecked, onChange, name, etc.
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Outer wrapper is a flex column with 1.5 unit gap between the row and hint/error text */}
      {/* className is applied here so external styles target the whole component block */}

      {/* Label wraps both the checkbox and its text so clicking the label toggles the checkbox */}
      <label
        htmlFor={id}
        // htmlFor links this label to the checkbox input with the matching id
        className={cn(
          "flex items-center gap-2.5 cursor-pointer select-none",
          // flex + items-center: aligns checkbox and label text on the same horizontal baseline
          // gap-2.5: consistent spacing between the checkbox box and its label text
          // cursor-pointer: shows hand cursor to signal the whole row is clickable
          // select-none: prevents text selection when clicking rapidly or double-clicking
          disabled && "opacity-50 cursor-not-allowed",
          // opacity-50 dims the entire row visually when disabled
          // cursor-not-allowed overrides cursor-pointer when the checkbox is disabled
        )}
      >
        {/* Native checkbox input — kept visible here but styled via accent-color and focus ring */}
        <input
          type="checkbox"
          // Explicitly set to checkbox — prevents any ambiguity when spreading ...props
          id={id}
          // id connects this input to its wrapping label via htmlFor for screen reader support

          disabled={disabled}
          // Passes disabled state to the native checkbox element

          className={cn(
            "w-4 h-4 rounded",
            // w-4 h-4: 16x16px checkbox — standard accessible touch target size
            // rounded: softens the checkbox corners slightly for a modern look

            "accent-primary cursor-pointer",
            // accent-primary: uses the CSS accent-color property to apply brand color
            // when the checkbox is checked — works natively without a custom SVG overlay
            // cursor-pointer: shows hand cursor on the checkbox itself

            "focus:ring-2 focus:ring-primary focus:ring-offset-1",
            // Replaces default browser focus outline with a custom emerald focus ring
            // focus:ring-offset-1 adds a small gap between the checkbox edge and the ring

            disabled && "cursor-not-allowed",
            // Overrides cursor-pointer on the input itself when disabled
          )}
          {...props}
          // Spreads remaining props — checked, defaultChecked, onChange, value, name, etc.
        />

        {/* Label text — only rendered when label prop is a non-empty string */}
        {label && (
          <span className="text-sm text-gray-700">{label}</span>
          // text-sm keeps font size consistent with other form components
          // text-gray-700 for readable but not overly heavy label text
        )}
      </label>

      {/* Error message — only rendered when error prop is a non-empty string */}
      {error && (
        <p className="text-xs text-danger ml-6">{error}</p>
        // text-xs keeps it smaller than the label text
        // text-danger renders it in red to signal validation failure
        // ml-6 indents the error to align it under the label text, not the checkbox box
      )}

      {/* Hint text — only rendered when hint exists AND there is no active error */}
      {hint && !error && (
        <p className="text-xs text-gray-500 ml-6">{hint}</p>
        // Muted gray, same size as error text
        // ml-6 matches the error indentation for visual consistency
        // Suppressed when error is present to avoid showing conflicting messages
      )}
    </div>
  );
};

export default Checkbox;
// Default export — imported anywhere as: import Checkbox from "..."
