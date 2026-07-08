// Reusable RadioGroup component
// Only one option can be selected within the group at a time
// Will be used in payment method, shipping method, and filter option selectors
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const RadioGroup = ({
  label = "", // Group-level label rendered above all options as a section heading
  options = [], // Array of option objects — each can have { value, label, hint, disabled }
  error = "", // Error message string — renders in red below the options list when present
  disabled = false, // When true, disables all options in the group at once
  className = "", // Extra Tailwind classes applied to the outermost wrapper div
  name, // HTML name attribute — shared across all radio inputs to link them as one group
  value, // Currently selected value — controlled from parent component state
  onChange, // Handler called whenever the user selects a different option
}) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Outer wrapper is a flex column with 2 unit gap between label, options, and error */}
      {/* className applied here so external styles can target the whole component block */}

      {/* Group label — only rendered when label prop is a non-empty string */}
      {label && (
        <p className="text-sm font-medium text-gray-700">{label}</p>
        // Rendered as a <p> not a <legend> since this isn't inside a <fieldset>
        // text-sm + font-medium + text-gray-700 consistent with other form component labels
      )}

      {/* Options list — each option is its own labeled card-style row */}
      <div className="flex flex-col gap-2">
        {/* flex-col stacks options vertically, gap-2 gives spacing between each card */}

        {options.map((option) => (
          <label
            key={option.value}
            // key uses option.value for stable React list reconciliation

            className={cn(
              // Base classes — applied to every option card
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150",
              // flex + items-start: aligns radio input and text block from the top
              // gap-3: spacing between the radio circle and the text content
              // p-3: uniform padding inside each option card
              // rounded-lg: softly rounded card corners
              // border: base border that changes color based on selected state
              // cursor-pointer: hand cursor signals the whole card is clickable
              // transition-all duration-150: smooth border and background color transitions

              value === option.value
                ? "border-primary bg-primary-50"
                : // Selected state: brand-colored border + light emerald background tint
                  "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              // Unselected state: light gray border with subtle hover feedback

              (disabled || option.disabled) && "opacity-50 cursor-not-allowed",
              // Dims and blocks interaction if the whole group OR this specific option is disabled
            )}
          >
            {/* Native radio input — accent-color styled, sits at the top of the text block */}
            <input
              type="radio"
              // Explicitly typed as radio to prevent ambiguity when rendering dynamically

              name={name}
              // Shared name groups all these inputs so the browser enforces single-selection

              value={option.value}
              // Value submitted or compared against the controlled value prop

              checked={value === option.value}
              // Controlled checked state — true only when this option matches the selected value

              onChange={onChange}
              // Calls the parent's onChange handler when this option is clicked

              disabled={disabled || option.disabled}
              // Disabled if the whole group is disabled OR this individual option is disabled

              className={cn(
                "mt-0.5 w-4 h-4 accent-primary cursor-pointer",
                // mt-0.5 nudges the radio down slightly so it aligns with the first line of text
                // w-4 h-4: 16x16px radio — standard accessible size
                // accent-primary: applies brand color to the radio dot via CSS accent-color
                // cursor-pointer: hand cursor on the input itself

                "focus:ring-2 focus:ring-primary focus:ring-offset-1",
                // Custom emerald focus ring replaces the browser default outline
                // focus:ring-offset-1 adds a small gap between the radio edge and the ring

                (disabled || option.disabled) && "cursor-not-allowed",
                // Overrides cursor-pointer on the input when this option is disabled
              )}
            />

            {/* Text content block — label and optional hint stacked vertically */}
            <div className="flex flex-col gap-0.5">
              {/* flex-col stacks label and hint, gap-0.5 keeps them tightly together */}

              {/* Option label — primary readable text for this option */}
              <span className="text-sm font-medium text-gray-700">
                {option.label}
                {/* text-sm + font-medium + text-gray-700 consistent with other form labels */}
              </span>

              {/* Option hint — secondary descriptive text, only shown when hint exists */}
              {option.hint && (
                <span className="text-xs text-gray-500">{option.hint}</span>
                // text-xs keeps it visually subordinate to the option label
                // text-gray-500 muted gray to distinguish it from the main label
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Error message — only rendered when error prop is a non-empty string */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
        // text-xs keeps it smaller than option labels
        // text-danger renders it in red to signal a validation failure for the whole group
      )}
    </div>
  );
};

export default RadioGroup;
// Default export — imported anywhere as: import RadioGroup from "..."
