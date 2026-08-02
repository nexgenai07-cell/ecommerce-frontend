// Importing checkmark icon from react-icons (Ai = Ant Design icon set) — used to show a "free" badge tick
import { AiOutlineCheck } from "react-icons/ai";
// Importing truck icon from react-icons (Bs = Bootstrap icon set) — represents shipping/delivery visually
import { BsTruck } from "react-icons/bs";
// Importing a custom utility function "cn" that merges/joins class names conditionally (like clsx/classnames)
import cn from "../../utils/cn";

// Shipping options config
// This is an array of objects that holds all the static data for each shipping method
// Keeping data separate from JSX makes it easy to add/remove shipping options later
const SHIPPING_OPTIONS = [
  {
    id: "standard", // Unique identifier used to track which option is currently selected
    label: "Standard Delivery", // Display name shown to the user
    price: 0, // Numeric price value (0 means free), can be used for calculations later
    priceLabel: "FREE", // Human-readable price text shown on the card
    estimate: "Estimated: 3-5 business days", // Delivery time estimate text shown under the label
    free: true, // Boolean flag to apply special "free" styling (green color, checkmark icon)
  },
  {
    id: "express", // Unique identifier for the express shipping option
    label: "Express Shipping", // Display name for express delivery
    price: 999, // Price in smallest currency unit or just a number (999 = Rs. 999 here)
    priceLabel: "Rs. 999", // Human-readable price text for express shipping
    estimate: "Estimated: Next day delivery", // Delivery time estimate for express option
    free: false, // Not free, so normal gray price styling will be applied instead of green
  },
];

// Main functional component for Shipping Method selection
// Props:
// value -> currently selected shipping option id (controlled from parent)
// onChange -> callback function to update selected value in parent state
// error -> optional error message string to show validation error below the options
const ShippingMethod = ({ value, onChange, error }) => {
  return (
    // Outer card container — white background, rounded corners, light border, padding, vertical flex layout with gap
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
      {/* Section heading */}
      {/* Bold heading text showing the title of this section to the user */}
      <h2 className="text-lg font-bold text-gray-900">Shipping Method</h2>

      {/* Shipping options */}
      {/* Grid container: 1 column on mobile, 2 columns on small screens and above, with gap between cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Looping through each shipping option from the config array to render a selectable card */}
        {SHIPPING_OPTIONS.map((option) => {
          // Checking if this particular option's id matches the currently selected value
          // This boolean controls all the active/selected styling below
          const isSelected = value === option.id;
          return (
            // Each shipping option is rendered as a clickable button (acts like a radio card)
            <button
              key={option.id} // React key for list rendering, using unique option id
              type="button" // Explicitly setting type to button so it doesn't submit a form accidentally
              onClick={() => onChange(option.id)} // When clicked, calls parent's onChange with this option's id to update selection
              className={cn(
                // Base classes applied to every card: flex layout, padding, rounded corners, border, left-aligned text, smooth transition
                "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150",
                isSelected
                  ? "border-primary bg-primary/5" // Selected — emerald
                  : // If selected: emerald colored border + very light emerald tinted background
                    "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                // If not selected: light gray border by default, slightly darker gray border + background on hover
              )}
            >
              {/* Truck icon */}
              {/* Truck icon displayed on the left side of each card */}
              <BsTruck
                className={cn(
                  "w-5 h-5 shrink-0 mt-0.5", // Fixed icon size, prevents shrinking in flex layout, slight top margin for alignment with text
                  isSelected ? "text-primary" : "text-gray-400",
                  // Icon color changes to emerald when selected, otherwise stays light gray
                )}
              />

              {/* Details */}
              {/* Wrapper for the text content (label, price, estimate) — takes remaining space, allows text truncation */}
              <div className="flex-1 min-w-0">
                {/* Row containing the shipping label on the left and price on the right */}
                <div className="flex items-center justify-between gap-2">
                  {/* Shipping method name (e.g. "Standard Delivery" / "Express Shipping") */}
                  <p
                    className={cn(
                      "text-sm font-semibold", // Small bold text styling
                      isSelected ? "text-primary" : "text-gray-800",
                      // Text color becomes emerald when selected, otherwise dark gray
                    )}
                  >
                    {option.label}
                  </p>

                  {/* Price */}
                  {/* Price label text on the right side of the row, shrink-0 prevents it from shrinking on small screens */}
                  <span
                    className={cn(
                      "text-sm font-bold shrink-0",
                      option.free ? "text-success" : "text-gray-800",
                      // If this option is free, show price text in green/success color, otherwise normal dark gray
                    )}
                  >
                    {option.priceLabel}
                    {/* Free checkmark */}
                    {/* Only render this checkmark icon if the option is marked as free */}
                    {option.free && (
                      <AiOutlineCheck className="w-3.5 h-3.5 text-success inline ml-1" />
                      // Small green checkmark icon shown right next to "FREE" text, inline with the price text
                    )}
                  </span>
                </div>

                {/* Delivery time estimate text shown below the label/price row */}
                <p className="text-xs text-gray-400 mt-0.5">
                  {option.estimate}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conditional error message — only shows if "error" prop has a value (e.g. user didn't select any shipping method) */}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};

// Exporting this component so it can be imported and used in other files/pages
export default ShippingMethod;
