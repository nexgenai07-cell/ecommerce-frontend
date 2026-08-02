// Step 2 — Select Items to Return
// Checkboxes with product image, name, category, price, qty
// Select All option
// Real order items from API
// NOTE: no outer card here — this renders INSIDE the single unified form card
// on ReturnRequest.jsx. Scrollable item list when the order has many items, fully responsive.

// Import a list-check icon from the "bs" (Bootstrap) icon set, used in the section header
import { BsListCheck } from "react-icons/bs";
// Import a checkmark icon used as an overlay badge on selected product thumbnails
import { AiOutlineCheck } from "react-icons/ai";
// Import a utility function to format numeric price values into a display-friendly currency string
import formatPrice from "../../utils/formatPrice";

// Main functional component for step 2 of the return flow, receiving props for order items and selection state/callbacks
const SelectItemsStep = ({
  orderItems, // Order ke items array
  selectedItems, // Currently selected item IDs
  onItemToggle, // Single item toggle callback
  onSelectAll, // Select all callback
}) => {
  // Sab items selected hain ya nahi
  // Determine whether every item in the order is currently selected (used to toggle the "Select All"/"Deselect All" button label)
  const allSelected =
    orderItems.length > 0 && selectedItems.length === orderItems.length;

  // Begin returning the JSX markup for this component — plain section, no card wrapper
  return (
    // Vertical flex column holding the section header and item list, with gap between them
    <div className="flex flex-col gap-4">
      {/* Section header */}
      {/* Row placing the heading (with small icon) on the left and the Select All button on the right, spaced apart */}
      <div className="flex items-center justify-between gap-2">
        {/* Row grouping the list-check icon with the section heading text */}
        <div className="flex items-center gap-2">
          {/* List-check icon, colored emerald, shrink-0 prevents shrinking — plain icon, no boxed badge */}
          <BsListCheck className="w-4 h-4 text-primary shrink-0" />
          {/* Section heading text */}
          <h2 className="text-base font-bold text-gray-900">
            Select Items to Return
          </h2>
        </div>
        {/* Select All button */}
        {/* Pill-style text button that toggles selecting/deselecting all items at once */}
        <button
          onClick={onSelectAll}
          className="text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark px-3 py-1.5 rounded-full bg-primary-50 hover:bg-primary-100 transition-colors shrink-0"
        >
          {/* Label changes depending on whether all items are currently selected */}
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Items list */}
      {/* Scrollable column — caps at a max height so an order with many items doesn't stretch the whole page,
          and shows a native scrollbar so the user always knows there's more to scroll through */}
      <div className="flex flex-col gap-3 max-h-104 overflow-y-auto pr-1">
        {/* Only render the item rows if there are actually items in the order; otherwise show a fallback message */}
        {orderItems.length > 0 ? (
          // Loop through each order item along with its index
          orderItems.map((item, index) => {
            // Determine whether this specific item is currently selected, using the product id (or index as fallback) as the identifier
            const isSelected = selectedItems.includes(
              item.product?.id || index,
            );
            // Return the JSX for a single selectable item row
            return (
              // Clickable label wrapping the checkbox and item details, so clicking anywhere on the row toggles the checkbox
              <label
                // Use the product id as the key, falling back to the array index if no id is available
                key={item.product?.id || index}
                // Dynamically apply a gradient-tinted "raised" look when selected, otherwise a plain gray row with hover lift
                className={`
                  flex items-center gap-4 p-4 rounded-xl border cursor-pointer
                  transition-all duration-200
                  ${
                    isSelected
                      ? "border-primary bg-linear-to-r from-primary-50 to-white shadow-sm shadow-primary/10"
                      : "border-gray-100 hover:border-primary/30"
                  }
                `}
              >
                {/* Checkbox */}
                {/* Checkbox input reflecting and controlling this item's selected state */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onItemToggle(item.product?.id || index)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                />
                {/* Product image */}
                {/* Square image container with rounded corners, border, light gray background placeholder, and clipped overflow; shrink-0 prevents shrinking */}
                <div className="relative w-14 h-14 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
                  {/* Product thumbnail image, falling back to a placeholder image path if no primary_image is set */}
                  <img
                    src={
                      item.product?.primary_image || "/placeholder-product.svg"
                    }
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                  {/* Selected overlay badge — a small emerald checkmark circle over the thumbnail's corner when selected */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm">
                      <AiOutlineCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                {/* Product details */}
                {/* Column container holding the product name and category text; grows to fill remaining space, min-w-0 prevents overflow */}
                <div className="flex-1 min-w-0">
                  {/* Product name text, truncated to a single line if it's too long (line-clamp-1) */}
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {item.product_name}
                  </p>
                  {/* Category/variant info */}
                  {/* Display the product's category name, falling back to a generic "Product" label if not available */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.product?.category?.name || "Product"}
                  </p>
                </div>
                {/* Price + qty */}
                {/* Right-aligned column showing the item's price and quantity; shrink-0 prevents shrinking */}
                <div className="text-right shrink-0">
                  {/* Display the formatted price for this item, parsed as a float and defaulting to 0 if missing */}
                  <p className="text-sm font-bold text-gray-800">
                    {formatPrice(parseFloat(item.price || 0))}
                  </p>
                  {/* Display the quantity ordered for this item */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Qty: {item.quantity}
                  </p>
                </div>
              </label>
            );
          })
        ) : (
          // Fallback message shown when there are no order items yet (e.g., no order selected in step 1)
          <p className="text-sm text-gray-400 text-center py-4">
            Please select an order first.
          </p>
        )}
      </div>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default SelectItemsStep;
