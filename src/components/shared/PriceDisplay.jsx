// Reusable PriceDisplay component
// Shows the original price with a strikethrough and the sale price in emerald
// Also shows a discount percentage badge
// Used in ProductCard, ProductDetail, and Cart
// Fully responsive

// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";
// Import a helper function that formats a number into a readable price string (e.g. currency symbol, decimals)
import formatPrice from "../../utils/formatPrice";
// Import a helper function that calculates discount percentage from original and sale price
import calculateDiscount from "../../utils/calculateDiscount";

// Define the PriceDisplay functional component and destructure its props with default values
const PriceDisplay = ({
  price = 0, // Sale price — the amount the customer will actually pay
  originalPrice = 0, // Original price — will be shown with a strikethrough
  size = "md", // Size variant of the component — sm, md, or lg
  showDiscount = true, // Whether to show the discount percentage badge or not
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Calculate the discount percentage using the helper function, based on original and sale price
  const discountPercent = calculateDiscount(originalPrice, price);

  // Check whether there actually is a discount — original price must be greater than sale price, and must be a positive value
  const hasDiscount = originalPrice > price && originalPrice > 0;

  // Define different Tailwind CSS classes for each size option (sm, md, lg)
  const sizeClasses = {
    sm: {
      sale: "text-sm font-semibold", // Small size — sale price text style
      original: "text-xs", // Small size — original price text style
      badge: "text-xs px-1.5 py-0.5", // Small size — discount badge text/padding style
    },
    md: {
      sale: "text-base font-semibold", // Medium size — sale price text style
      original: "text-sm", // Medium size — original price text style
      badge: "text-xs px-2 py-0.5", // Medium size — discount badge text/padding style
    },
    lg: {
      sale: "text-xl font-bold", // Large size — sale price text style
      original: "text-sm", // Large size — original price text style
      badge: "text-xs px-2 py-1", // Large size — discount badge text/padding style
    },
  };

  // Pick the class set that matches the current "size" prop
  const sizes = sizeClasses[size];

  // Return the JSX that will be rendered on the screen
  return (
    // Outer wrapper div — flex layout, wraps items if needed, with gap between children, plus any extra classes passed in
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Sale price — displayed in the primary (emerald) color */}
      <span className={cn("text-primary", sizes.sale)}>
        {formatPrice(price)}
      </span>

      {/* Original price and discount badge — only rendered if there is actually a discount */}
      {hasDiscount && (
        <>
          {/* Original price — shown in gray with a strikethrough line */}
          <span className={cn("text-gray-400 line-through", sizes.original)}>
            {formatPrice(originalPrice)}
          </span>

          {/* Discount percentage badge — only shown if showDiscount is true AND discount percent is greater than 0 */}
          {showDiscount && discountPercent > 0 && (
            <span
              className={cn(
                "bg-danger-light text-danger font-medium rounded-md", // Badge background, text color, font weight, and rounded corners
                sizes.badge, // Size-specific padding and text size for the badge
              )}
            >
              {/* Display the discount percentage value with a minus sign and percent symbol */}
              -{discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

// Export the component so it can be imported and used in other files
export default PriceDisplay;
