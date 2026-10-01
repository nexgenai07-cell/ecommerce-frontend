// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";

// Classes shared by every chip. The border is 1.5px wide and transparent here;
// the inactive and active looks below paint the green gradient into it.
const PILL_BASE_CLASSES =
  "shrink-0 rounded-full border-[1.5px] border-transparent px-3.5 py-1.5 text-sm font-medium whitespace-nowrap shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

// Inactive chip: white fill inside the padding box, with an emerald gradient showing
// through the border box, so only the thin border ring is coloured
const PILL_INACTIVE_CLASSES =
  "text-gray-600 [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(135deg,var(--color-primary-light),var(--color-primary-dark))_border-box] hover:text-primary hover:shadow-md";

// Active chip: the same emerald gradient fills the whole chip, border included
const PILL_ACTIVE_CLASSES =
  "bg-linear-to-br from-primary-light to-primary-dark text-white";

// Define the CategoryPills functional component and destructure its props with default values
const CategoryPills = ({
  categories = [], // Array of categories — usually comes from an API call, shaped like [{id, name}]
  activeCategory = null, // The id of the currently selected category
  onCategoryChange, // Callback function triggered whenever the selected category changes
  showAll = true, // Whether to show the "All" pill option or not
  hideScrollbar = false, // When true, the row still scrolls sideways but no scrollbar is drawn
  getPillClassName, // Optional function that receives a chip's position in the row (the "All" chip counts as position 0) and returns extra CSS classes for it, e.g. an entrance animation
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Function to handle when a category pill is clicked
  const handleCategoryClick = (categoryId) => {
    // If the same category that's already active is clicked again, deselect it by passing null
    if (activeCategory === categoryId) {
      onCategoryChange?.(null);
    } else {
      onCategoryChange?.(categoryId); // Otherwise, select the newly clicked category
    }
  };

  // Position of the first real category in the row: it follows the "All" chip when that is shown
  const categoryOffset = showAll ? 1 : 0;

  // Return the JSX that will be rendered on the screen
  return (
    // Outer wrapper — enables horizontal scrolling for the pills row.
    // By default the themed thin scrollbar from index.css is shown only
    // when the pills overflow the container width. With hideScrollbar the
    // scrollbar is removed in every browser while touch, wheel and
    // trackpad scrolling keep working.
    <div
      className={cn(
        "w-full overflow-x-auto",
        hideScrollbar &&
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className, // Any extra classes passed in from the parent
      )}
    >
      {/* Pills container — uses nowrap-like sizing so pills sit in a single row instead of wrapping.
          The vertical padding leaves room for the shadow and the focus ring of the chips. */}
      <div className="flex items-center gap-2 py-1.5 w-max min-w-full">
        {/* "All" pill — clicking this clears the category filter and shows all products */}
        {showAll && (
          <button
            onClick={() => onCategoryChange?.(null)} // Clicking "All" always sets the category to null
            className={cn(
              PILL_BASE_CLASSES,
              activeCategory === null
                ? PILL_ACTIVE_CLASSES
                : PILL_INACTIVE_CLASSES,
              getPillClassName?.(0), // Entrance classes of the first position
            )}
          >
            All
          </button>
        )}

        {/* Loop through each category and render a pill button for it */}
        {categories.map((category, index) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              PILL_BASE_CLASSES,
              activeCategory === category.id
                ? PILL_ACTIVE_CLASSES
                : PILL_INACTIVE_CLASSES,
              getPillClassName?.(index + categoryOffset), // Entrance classes of this chip's position in the row
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryPills;
