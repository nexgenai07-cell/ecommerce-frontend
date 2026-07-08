// Reusable Textarea component
// Same as Input but for multi-line text entry
// Handles label, error, and hint all in one
// Will be used in complaint, notes, and description forms
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Textarea = ({
  label = "", // Text label rendered above the textarea field
  error = "", // Error message string — renders in red below textarea when present
  hint = "", // Helper text rendered in gray below textarea — hidden when error is shown
  fullWidth = true, // When true (default), wrapper stretches to full container width
  rows = 4, // Number of visible text lines — controls initial height, defaults to 4
  className = "", // Extra Tailwind classes for one-off customizations from outside
  id, // Unique HTML id — connects <label> htmlFor to <textarea> for accessibility
  required = false, // When true, shows a red asterisk (*) next to the label
  disabled = false, // When true, textarea is visually dimmed and non-interactive
  ...props // Remaining HTML textarea attributes — placeholder, value, onChange, etc.
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {/* Outer wrapper is a flex column with 1.5 unit gap between label, textarea, and hint/error */}
      {/* w-full applied conditionally based on fullWidth prop */}

      {/* Label — only rendered when label prop is a non-empty string */}
      {label && (
        <label
          htmlFor={id}
          // htmlFor links this label to the textarea with the matching id — improves accessibility
          className="text-sm font-medium text-gray-700"
          // Small, medium-weight, dark gray label text — consistent with Input component
        >
          {label}
          {/* Red asterisk — only shown when required prop is true */}
          {required && (
            <span className="text-danger ml-1">*</span>
            // ml-1 adds a small gap between label text and the asterisk
          )}
        </label>
      )}

      {/* Actual textarea element — no icon wrapper needed unlike Input */}
      <textarea
        id={id}
        // id connects this textarea to its label via htmlFor for screen reader support

        rows={rows}
        // Sets the visible row count — determines the default height before user resizes

        disabled={disabled}
        // Passes disabled state to the native textarea element

        className={cn(
          // Base classes — applied to every textarea instance
          "w-full rounded-lg border bg-white text-gray-900 text-sm transition-all duration-150",
          // w-full fills the parent wrapper div
          // rounded-lg gives softly rounded corners consistent with Input
          // bg-white ensures consistent background across browsers
          // text-gray-900 for high contrast readable text
          // text-sm keeps font size consistent with the rest of the UI
          // transition-all duration-150 for smooth border/ring color changes on focus

          "placeholder:text-gray-400 resize-none",
          // placeholder:text-gray-400 — muted gray placeholder text
          // resize-none — disables the browser's default drag-to-resize handle on the textarea

          "px-4 py-2.5",
          // Uniform horizontal and vertical padding — same as Input for visual consistency

          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          // Removes default browser outline and replaces with custom emerald focus ring
          // focus:border-primary changes border color to brand color on focus

          error
            ? "border-danger focus:ring-danger focus:border-danger"
            : "border-gray-200",
          // Error state: overrides border and focus ring to red (danger color)
          // Normal state: keeps the default light gray border

          disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          // opacity-50 dims the textarea visually
          // cursor-not-allowed signals the field is non-interactive
          // bg-gray-50 gives a slightly off-white background to reinforce disabled state

          className,
          // Merges any extra classes passed from the parent component
        )}
        {...props}
        // Spreads remaining props — placeholder, value, onChange, onBlur, maxLength, etc.
      />

      {/* Error message — only rendered when error prop is a non-empty string */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
        // text-xs keeps it smaller than the textarea text
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

export default Textarea;
// Default export — imported anywhere as: import Textarea from "..."
