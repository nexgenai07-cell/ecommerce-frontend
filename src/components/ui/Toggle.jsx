// Reusable Toggle component — sliding on/off switch
// Different from Checkbox — this one visually slides left to right
// Will be used for product active/inactive and notification on/off controls
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Toggle = ({
  label = "", // Text rendered inline to the left of the toggle switch
  hint = "", // Secondary helper text rendered in gray below the toggle row
  disabled = false, // When true, toggle is visually dimmed and non-interactive
  checked = false, // Controlled on/off state — driven entirely from parent component state
  onChange, // Handler called whenever the toggle is clicked and state should flip
  className = "", // Extra Tailwind classes applied to the outermost wrapper div
  id, // Unique HTML id — connects the <label> htmlFor to the hidden <input>
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Outer wrapper is a flex column with 1.5 unit gap between the toggle row and hint text */}
      {/* className applied here so external styles can target the whole component block */}

      {/* Label wraps both the text and the switch so clicking anywhere on the row toggles it */}
      <label
        htmlFor={id}
        // htmlFor links this label to the hidden checkbox input via matching id
        className={cn(
          "flex items-center justify-between gap-3 cursor-pointer select-none",
          // flex + items-center: aligns label text and toggle switch on the same baseline
          // justify-between: pushes label text to the left and toggle switch to the right
          // gap-3: minimum spacing between label text and the toggle switch
          // cursor-pointer: hand cursor signals the whole row is clickable
          // select-none: prevents text selection on rapid clicks or double-clicks
          disabled && "opacity-50 cursor-not-allowed",
          // opacity-50 dims the entire row visually when disabled
          // cursor-not-allowed overrides cursor-pointer when the toggle is disabled
        )}
      >
        {/* Label text — only rendered when label prop is a non-empty string */}
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
          // text-sm + font-medium + text-gray-700 consistent with other form component labels
        )}

        {/* Toggle switch — built from a hidden input, a track div, and a sliding thumb div */}
        <div className="relative">
          {/* relative position on this wrapper allows the thumb to be absolutely placed inside the track */}

          {/* Hidden native checkbox — handles all accessibility and keyboard interaction */}
          <input
            type="checkbox"
            id={id}
            // id connects this input to the wrapping label via htmlFor

            checked={checked}
            // Controlled checked state — true means on, false means off

            onChange={onChange}
            // Calls parent handler when the user clicks to flip the toggle state

            disabled={disabled}
            // Passes disabled state to the native input for keyboard and screen reader support

            className="sr-only"
            // sr-only (screen reader only) — visually hidden but still accessible to assistive tech
            // This keeps the toggle keyboard-navigable and screen-reader-friendly
          />

          {/* Track — the pill-shaped background that changes color based on checked state */}
          <div
            className={cn(
              "w-11 h-6 rounded-full transition-all duration-300",
              // w-11 (44px) x h-6 (24px): standard toggle track dimensions
              // rounded-full: fully rounded pill shape
              // transition-all duration-300: smooth color fade when toggling on/off

              checked ? "bg-primary" : "bg-gray-200",
              // On state: brand emerald background to signal active
              // Off state: muted gray background to signal inactive
            )}
          />

          {/* Thumb — the white circle that slides left (off) or right (on) */}
          <div
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300",
              // absolute: positions the thumb inside the track div
              // top-0.5 + left-0.5: 2px inset from top and left edges of the track
              // w-5 h-5 (20px): slightly smaller than the 24px track height for the inset look
              // bg-white: white thumb contrasts against both emerald and gray track colors
              // rounded-full: perfect circle shape
              // shadow-sm: subtle drop shadow gives the thumb a lifted, tactile appearance
              // transition-all duration-300: smooth slide animation when state changes

              checked ? "translate-x-5" : "translate-x-0",
              // On state: slides 20px to the right (translate-x-5) to sit at the right end of track
              // Off state: stays at its default left position (translate-x-0)
            )}
          />
        </div>
      </label>

      {/* Hint text — always shown when hint exists, no error state on Toggle */}
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
        // text-xs keeps it visually subordinate to the label
        // text-gray-500 muted gray for secondary descriptive information
      )}
    </div>
  );
};

export default Toggle;
// Default export — imported anywhere as: import Toggle from "..."
