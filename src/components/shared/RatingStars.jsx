// Reusable RatingStars component
// Displays product rating stars — filled and empty
// Also displays the review count alongside the stars
// Used in ProductCard and ProductDetail
// Fully responsive

// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";

// Define the RatingStars functional component and destructure its props with default values
const RatingStars = ({
  rating = 0, // Rating value — ranges from 0 to 5
  count = 0, // Number of reviews this rating is based on
  size = "md", // Size variant of the component — sm, md, or lg
  showCount = true, // Whether to show the review count text or not
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Define different Tailwind CSS classes for each size option (sm, md, lg)
  const sizeClasses = {
    sm: {
      star: "w-3 h-3", // Small star size
      text: "text-xs", // Small text size
    },
    md: {
      star: "w-4 h-4", // Medium star size
      text: "text-sm", // Medium text size
    },
    lg: {
      star: "w-5 h-5", // Large star size
      text: "text-base", // Large text size
    },
  };

  // Pick the class set that matches the current "size" prop
  const sizes = sizeClasses[size];

  // Function to render all 5 stars — each can be filled, half-filled, or empty
  const renderStars = () => {
    // Create an array of 5 empty slots and map over each one to build a star
    return Array.from({ length: 5 }).map((_, index) => {
      // Convert the zero-based index into a 1-to-5 star value
      const starValue = index + 1; // Ranges from 1 to 5

      // If this star's position is less than or equal to the rounded-down rating, render a fully filled star
      if (starValue <= Math.floor(rating)) {
        return (
          <svg
            key={index} // Unique key for React's list rendering
            className={cn(sizes.star, "text-yellow-400 fill-current")} // Yellow color, filled with current text color
            viewBox="0 0 24 24" // SVG coordinate system
          >
            {/* Star shape path */}
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      }

      // If this star is exactly at the rounded-up rating AND the rating has a decimal part, render a half-filled star
      if (starValue === Math.ceil(rating) && rating % 1 !== 0) {
        return (
          <svg
            key={index} // Unique key for React's list rendering
            className={cn(sizes.star, "text-yellow-400")} // Yellow color for the filled half
            viewBox="0 0 24 24" // SVG coordinate system
          >
            {/* Half star — left side filled, right side empty, achieved using a gradient */}
            <defs>
              {/* Define a unique gradient ID per star index so multiple half-stars don't conflict */}
              <linearGradient id={`half-${index}`}>
                <stop offset="50%" stopColor="currentColor" />{" "}
                {/* First half — filled with star color */}
                <stop offset="50%" stopColor="#e5e7eb" />{" "}
                {/* Second half — empty/gray color */}
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${index})`} // Apply the gradient defined above as the fill
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" // Star shape path
            />
          </svg>
        );
      }

      // Otherwise, render an empty (gray) star
      return (
        <svg
          key={index} // Unique key for React's list rendering
          className={cn(sizes.star, "text-gray-200 fill-current")} // Gray color, filled with current text color
          viewBox="0 0 24 24" // SVG coordinate system
        >
          {/* Star shape path */}
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    });
  };

  // Return the JSX that will be rendered on the screen
  return (
    // Outer wrapper div — flex layout, items centered, small gap, plus any extra classes passed in
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Container for the row of star icons */}
      <div className="flex items-center gap-0.5">
        {renderStars()} {/* Call the function to render all 5 stars */}
      </div>

      {/* Rating number and review count — only rendered if showCount is true */}
      {showCount && (
        <div className="flex items-center gap-1">
          {/* Display the rating number, formatted to 1 decimal place */}
          <span className={cn("font-medium text-gray-700", sizes.text)}>
            {rating.toFixed(1)}
          </span>

          {/* Display the review count in parentheses — only if count is greater than 0 */}
          {count > 0 && (
            <span className={cn("text-gray-400", sizes.text)}>({count})</span>
          )}
        </div>
      )}
    </div>
  );
};

// Export the component so it can be imported and used in other files
export default RatingStars;
