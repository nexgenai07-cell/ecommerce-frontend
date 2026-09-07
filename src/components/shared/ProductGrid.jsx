// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";
// Import the ProductCard component used to render each individual product
import ProductCard from "./ProductCard";
// Import the SkeletonCard component used to show placeholder loading cards
import { SkeletonCard } from "../ui/Skeleton";
// Import the EmptyState component shown when there are no products to display
import EmptyState from "../ui/EmptyState";

// Define the ProductGrid functional component and destructure its props with default values
const ProductGrid = ({
  products = [], // Array of products — usually comes from an API call
  isLoading = false, // Whether data is currently being loaded
  skeletonCount = 8, // Number of skeleton placeholder cards to show while loading
  emptyVariant = "noProducts", // Which variant/style of EmptyState to use
  emptyTitle = "", // Custom title text for the empty state
  emptyDescription = "", // Custom description text for the empty state
  emptyActionLabel = "", // Text label for the empty state's action button
  onEmptyAction, // Callback function triggered when the empty state's button is clicked
  cols = {
    // Configuration object for how many columns to show at each screen size
    default: 2, // Number of columns on mobile (smallest screens)
    sm: 2, // Number of columns on small screens
    md: 3, // Number of columns on medium screens
    lg: 4, // Number of columns on large screens
  },
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Build the Tailwind grid-column classes dynamically based on the "cols" config passed in from outside
  const gridCols = cn(
    cols.default === 1 && "grid-cols-1", // 1 column by default, if specified
    cols.default === 2 && "grid-cols-2", // 2 columns by default, if specified
    cols.sm === 2 && "sm:grid-cols-2", // 2 columns at the "sm" breakpoint, if specified
    cols.sm === 3 && "sm:grid-cols-3", // 3 columns at the "sm" breakpoint, if specified
    cols.md === 3 && "md:grid-cols-3", // 3 columns at the "md" breakpoint, if specified
    cols.md === 4 && "md:grid-cols-4", // 4 columns at the "md" breakpoint, if specified
    cols.lg === 4 && "lg:grid-cols-4", // 4 columns at the "lg" breakpoint, if specified
    cols.lg === 5 && "lg:grid-cols-5", // 5 columns at the "lg" breakpoint, if specified
  );

  // If data is still loading, render a grid of skeleton placeholder cards instead of real content
  if (isLoading) {
    return (
      <div className={cn("grid gap-4", gridCols, className)}>
        {/* Create an array of the given length and render a SkeletonCard for each entry */}
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={index} /> // Use the array index as the key since there's no real data yet
        ))}
      </div>
    );
  }

  // If there are no products (null/undefined or empty array), render the EmptyState component
  if (!products || products.length === 0) {
    return (
      <EmptyState
        variant={emptyVariant} // Which visual variant of the empty state to show
        title={emptyTitle} // Custom title text, if provided
        description={emptyDescription} // Custom description text, if provided
        actionLabel={emptyActionLabel} // Text for the action button, if provided
        onAction={onEmptyAction} // Callback for when the action button is clicked
        className={className} // Pass through any extra classes
      />
    );
  }

  // Defensive de-dupe: if the same product id ever appears more than once in
  // the incoming array (e.g. a multi-category filter matching a product that
  // belongs to more than one selected category on the backend), keep only
  // the first occurrence so React never sees two children with the same key.
  const dedupedProducts = Array.from(
    new Map(products.map((p) => [p.id, p])).values(),
  );

  // Default case — render the actual grid of product cards
  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {/* Loop through the products array and render a ProductCard for each one */}
      {dedupedProducts.map((product) => (
        <ProductCard
          key={product.id} // Unique key for each product, required by React for list rendering
          product={product} // Pass the full product data down to the card
        />
      ))}
    </div>
  );
};

// Export the component so it can be imported and used in other files
export default ProductGrid;
