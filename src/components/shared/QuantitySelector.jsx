// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";

// Define the QuantitySelector functional component and destructure its props with default values
const QuantitySelector = ({
  value = 1, // Current quantity value
  onChange, // Callback function called whenever the quantity changes
  min = 1, // Minimum allowed quantity — defaults to 1
  max = 99, // Maximum allowed quantity — usually comes from stock availability
  disabled = false, // Set to true to disable the entire selector
  size = "md", // Size variant of the component — sm or md
  showMaxHint = false, // When true, shows a small "Max X available" caption
  // below the control once the quantity reaches max — so the customer
  // always knows WHY the + button stopped responding instead of it just
  // silently disabling with no explanation. Defaults to false, so every
  // other existing usage of this component (e.g. Product Detail page)
  // keeps rendering exactly as before.
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Function to decrease the quantity — won't go below the minimum
  const handleDecrement = () => {
    if (value <= min) return; // Already at the minimum, so do nothing
    onChange?.(value - 1); // Call onChange with the decreased value (optional chaining in case onChange isn't passed)
  };

  // Function to increase the quantity — won't go above the maximum
  const handleIncrement = () => {
    if (value >= max) return; // Already at the maximum, so do nothing
    onChange?.(value + 1); // Call onChange with the increased value (optional chaining in case onChange isn't passed)
  };

  // Function to handle direct typing into the input field
  const handleInput = (e) => {
    const newValue = parseInt(e.target.value); // Convert the input string value into a number

    // If the parsed value isn't a valid number, reset to the minimum value
    if (isNaN(newValue)) {
      onChange?.(min);
      return;
    }

    // Keep the typed value clamped within the min and max range
    if (newValue < min) {
      onChange?.(min); // Too low — snap to minimum
    } else if (newValue > max) {
      onChange?.(max); // Too high — snap to maximum
    } else {
      onChange?.(newValue); // Valid value within range — use it as is
    }
  };

  // Define different Tailwind CSS classes for each size option (sm, md)
  const sizeClasses = {
    sm: {
      button: "w-7 h-7 text-sm", // Smaller button size
      input: "w-10 h-7 text-sm", // Smaller input size
    },
    md: {
      button: "w-9 h-9 text-base", // Medium button size
      input: "w-12 h-9 text-sm", // Medium input size
    },
  };

  // Pick the class set that matches the current "size" prop
  const sizes = sizeClasses[size];

  // The actual -/input/+ control — unchanged from before. Kept as its own
  // variable so it can be returned as-is (no wrapper) when showMaxHint is
  // off, preserving the exact original markup for every existing caller.
  const control = (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-gray-200 overflow-hidden", // Base container styling — inline flex, rounded border
        disabled && "opacity-50 cursor-not-allowed", // Apply faded/disabled look when disabled is true
        className, // Any extra classes passed in from parent
      )}
    >
      {/* Minus button — decreases the quantity */}
      <button
        onClick={handleDecrement} // Call decrement handler on click
        disabled={disabled || value <= min} // Disable button if whole component is disabled OR already at minimum
        className={cn(
          "flex items-center justify-center bg-white text-gray-600", // Base button layout and color
          "hover:bg-gray-50 active:bg-gray-100 transition-colors", // Hover and active state styling with smooth transition
          "border-r border-gray-200", // Right border to separate from input
          "disabled:opacity-40 disabled:cursor-not-allowed", // Styling when button is disabled
          sizes.button, // Size-specific width/height/text classes
        )}
      >
        {/* Minus icon (SVG line) */}
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>

      {/* Quantity input field — user can type a value directly */}
      <input
        type="number" // Restrict input to numeric values
        value={value} // Controlled input — value comes from props
        onChange={handleInput} // Call input handler when the value changes
        min={min} // HTML-level minimum constraint
        max={max} // HTML-level maximum constraint
        disabled={disabled} // Disable input if component is disabled
        className={cn(
          "text-center font-medium text-gray-900 bg-white", // Centered text, bold, dark color, white background
          "border-none outline-none", // Remove default border and focus outline
          // Hide the default number input spinner arrows in WebKit browsers
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          "disabled:cursor-not-allowed", // Cursor styling when disabled
          sizes.input, // Size-specific width/height/text classes
        )}
      />

      {/* Plus button — increases the quantity */}
      <button
        onClick={handleIncrement} // Call increment handler on click
        disabled={disabled || value >= max} // Disable button if whole component is disabled OR already at maximum
        className={cn(
          "flex items-center justify-center bg-white text-gray-600", // Base button layout and color
          "hover:bg-gray-50 active:bg-gray-100 transition-colors", // Hover and active state styling with smooth transition
          "border-l border-gray-200", // Left border to separate from input
          "disabled:opacity-40 disabled:cursor-not-allowed", // Styling when button is disabled
          sizes.button, // Size-specific width/height/text classes
        )}
      >
        {/* Plus icon (SVG cross/plus shape) */}
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );

  // Default path — identical to the component's original return value,
  // so every caller that doesn't opt in stays completely unaffected
  if (!showMaxHint) return control;

  // Opt-in path — stacks the control above a small caption that only
  // appears once the customer has actually hit the max quantity, so the
  // disabled + button always explains itself
  return (
    <div className="inline-flex flex-col items-start gap-1">
      {control}
      {value >= max && (
        <p className="text-[11px] text-gray-400 leading-none">
          Max {max} available
        </p>
      )}
    </div>
  );
};

// Export the component so it can be imported and used in other files
export default QuantitySelector;
