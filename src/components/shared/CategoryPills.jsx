// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";

// Define the CategoryPills functional component and destructure its props with default values
const CategoryPills = ({
  categories = [], // Array of categories — usually comes from an API call, shaped like [{id, name}]
  activeCategory = null, // The id of the currently selected category
  onCategoryChange, // Callback function triggered whenever the selected category changes
  showAll = true, // Whether to show the "All" pill option or not
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

  // Return the JSX that will be rendered on the screen
  return (
    // Outer wrapper — enables horizontal scrolling for the pills row
    // "scrollbar-thin" shows a barely-there scrollbar ONLY when the
    // pills overflow the container width — matches the minimal look
    // seen on mobile devices, instead of a chunky default browser bar
    <div
      className={cn(
        "w-full overflow-x-auto scrollbar-thin",
        className, // Any extra classes passed in from the parent
      )}
    >
      {/* Pills container — uses nowrap-like sizing so pills sit in a single row instead of wrapping */}
      <div className="flex items-center gap-1 pb-2.5 w-max min-w-full">
        {/* "All" pill — clicking this clears the category filter and shows all products */}
        {showAll && (
          <button
            onClick={() => onCategoryChange?.(null)} // Clicking "All" always sets the category to null
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shadow",
              "border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              activeCategory === null
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary",
            )}
          >
            All
          </button>
        )}

        {/* Loop through each category and render a pill button for it */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              "px-2 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border bg-white",
              "border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              activeCategory === category.id
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary",
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
