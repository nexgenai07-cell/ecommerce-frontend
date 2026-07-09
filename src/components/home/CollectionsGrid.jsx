import { Link } from "react-router-dom"; // Client-side navigation link (no full page reload)
import { useQuery, useQueries } from "@tanstack/react-query"; // useQuery = single API call, useQueries = multiple parallel API calls
import { AiOutlineArrowRight } from "react-icons/ai"; // Small arrow icon used inside each collection tile's "Explore" link

import { ROUTES } from "../../constants/routes"; // Central list of app route paths
import { QUERY_KEYS } from "../../constants/queryKeys"; // Central list of react-query cache keys
import { getCategories } from "../../api/categories.api"; // API call to fetch all product categories
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import { searchProducts } from "../../api/products.api"; // API call used to grab one representative product per category
import Container from "../layouts/Container"; // Wrapper that centers content and applies consistent side padding

// =============================================
// FALLBACK GRADIENTS
// Used ONLY when a category has no products yet (so no image exists).
// =============================================
const FALLBACK_GRADIENTS = [
  "bg-gradient-to-br from-gray-800 to-gray-950", // Fallback background for tile index 0
  "bg-gradient-to-br from-gray-700 to-gray-900", // Fallback background for tile index 1
  "bg-gradient-to-br from-primary-dark to-gray-950", // Fallback background for tile index 2
  "bg-gradient-to-br from-gray-800 to-gray-900", // Fallback background for tile index 3
  "bg-gradient-to-br from-gray-700 to-gray-950", // Fallback background for tile index 4
];

// =============================================
// SINGLE COLLECTION TILE
// Shared by every tile in the grid so hover behavior, overlay, and
// text placement stay perfectly consistent regardless of position.
// =============================================
const CollectionTile = ({ category, imageUrl, index, featured, className }) => (
  // Whole tile is a clickable link straight to the filtered products page for this category
  <Link
    to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
    className={`relative rounded-xl overflow-hidden group cursor-pointer ${
      !imageUrl
        ? FALLBACK_GRADIENTS[index] || FALLBACK_GRADIENTS[0] // Use a gradient background if no product image is available
        : "bg-gray-900" // Otherwise use a dark base color behind the photo
    } ${className}`}
  >
    {/* Real product photo as the tile background, when available */}
    {imageUrl && (
      <img
        src={imageUrl}
        alt={category.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" // Slight zoom-in effect on hover
      />
    )}

    {/* Bottom-anchored dark gradient — keeps white text readable over any photo */}
    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-black/5 group-hover:from-black/85 transition-colors duration-300" />

    {/* Text content positioned at the bottom of the card */}
    <div className="absolute bottom-3 left-3 right-3 z-10">
      {/* Category name — larger text for the featured tile, smaller for the rest */}
      <p
        className={`font-bold text-white leading-tight ${
          featured ? "text-lg sm:text-xl" : "text-sm"
        }`}
      >
        {category.name}
      </p>

      {/* Category description — only shown for the featured tile, and only on screens sm and up */}
      {featured && category.description && (
        <p className="hidden sm:block text-white/70 text-xs mt-1 line-clamp-1">
          {category.description}
        </p>
      )}

      {/* "Explore" call-to-action with arrow icon that slides right on hover */}
      <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] sm:text-xs text-primary-light font-medium group-hover:underline">
        Explore
        <AiOutlineArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
      </span>
    </div>
  </Link>
);

const CollectionsGrid = () => {
  // =============================================
  // CATEGORIES API CALL
  // =============================================
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // Cache key for this request
    queryFn: getCategories, // Function that performs the API call
    staleTime: 1000 * 60 * 10, // Data considered fresh for 10 minutes
  });

  // Limit to the first 5 categories — matches the bento grid's fixed layout (1 featured + 2 side + up to 2 bottom)
  // API_Documentation_Final.pdf (API 11) documents this endpoint as a
  // flat array, but real responses show a DRF-paginated object — a
  // backend/docs contract mismatch. extractListData() safely handles
  // either shape.
  const categories = extractListData(categoriesData).slice(0, 5); // Normalized + capped to 5 categories

  // =============================================
  // PER-CATEGORY REPRESENTATIVE PRODUCT IMAGE
  // Fires one lightweight query per category (only once categories
  // have loaded) to grab that category's single most recent product,
  // just to use its primary_image as the tile's background photo.
  // =============================================
  const productImageQueries = useQueries({
    queries: categories.map((category) => ({
      queryKey: [...QUERY_KEYS.PRODUCTS, "collection-thumbnail", category.id], // Unique cache key per category
      queryFn: () =>
        searchProducts({
          category_id: category.id, // Only fetch products belonging to this category
          ordering: "-created_at", // Get the most recently added product first
          page: 1,
        }),
      enabled: categories.length > 0, // Don't fire until categories have actually loaded
      staleTime: 1000 * 60 * 10, // Data considered fresh for 10 minutes
    })),
  });

  // Build a simple lookup: { [categoryId]: imageUrl | null }
  const categoryImageMap = {};
  categories.forEach((category, index) => {
    const firstProduct = productImageQueries[index]?.data?.data?.results?.[0]; // First product returned for this category
    categoryImageMap[category.id] = firstProduct?.primary_image || null; // Store its image, or null if none exists
  });

  // True while categories OR any per-category product image query is still loading
  const isLoading =
    categoriesLoading || productImageQueries.some((q) => q.isLoading);

  // Split into: 1 featured + up to 2 side-stack + remaining for the bottom row
  const featuredCategory = categories[0]; // Largest, most prominent tile
  const sideCategories = categories.slice(1, 3); // up to 2 — stacked beside the featured tile
  const bottomCategories = categories.slice(3, 5); // up to 2 — bottom row's column count matches this length exactly, so it always fills full width

  return (
    // Outer section wrapper — vertical padding, extra horizontal padding on large screens
    <section className="py-14 lg:px-10">
      <Container>
        {/* Vertical stack: header block, then the collections grid */}
        <div className="flex flex-col gap-8">
          {/* ============ SECTION HEADER ============ */}
          {/* Eyebrow label + main heading + supporting subtitle */}
          <div className="flex flex-col gap-2">
            {/* Main section title — scales up from mobile (text-2xl) to desktop (text-4xl) for a bold, responsive look */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Curated Collections
            </h2>
            {/* Supporting subtitle text under the heading */}
            <p className="text-sm sm:text-base text-gray-500">
              Hand-picked edits across every category, refreshed regularly
            </p>
          </div>

          {isLoading ? (
            // ---- LOADING STATE ----
            // Gray pulse placeholders matching the exact shape of the real bento grid below
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="h-45 sm:h-55 flex-2 rounded-xl bg-gray-100 animate-pulse" />{" "}
                {/* Placeholder for the featured tile */}
                <div className="flex flex-row sm:flex-col gap-4 flex-1">
                  <div className="h-21.25 sm:h-25.5 flex-1 rounded-xl bg-gray-100 animate-pulse" />{" "}
                  {/* Placeholder for side tile 1 */}
                  <div className="h-21.25 sm:h-25.5 flex-1 rounded-xl bg-gray-100 animate-pulse" />{" "}
                  {/* Placeholder for side tile 2 */}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-25 sm:h-30 rounded-xl bg-gray-100 animate-pulse" />{" "}
                {/* Placeholder for bottom tile 1 */}
                <div className="h-25 sm:h-30 rounded-xl bg-gray-100 animate-pulse" />{" "}
                {/* Placeholder for bottom tile 2 */}
              </div>
            </div>
          ) : categories.length > 0 ? (
            // ---- DATA LOADED STATE ----
            <div className="flex flex-col gap-2">
              {/* ============ TOP ROW: featured tile + side stack ============ */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Big featured tile — only rendered if a first category actually exists */}
                {featuredCategory && (
                  <CollectionTile
                    category={featuredCategory}
                    imageUrl={categoryImageMap[featuredCategory.id]}
                    index={0}
                    featured // Marks this tile as the large, prominent one
                    className="h-45 sm:h-75 flex-2"
                  />
                )}

                {/* Up to 2 smaller tiles stacked beside the featured tile */}
                {sideCategories.length > 0 && (
                  <div className="flex flex-row sm:flex-col gap-2 flex-1">
                    {sideCategories.map((category, i) => (
                      <CollectionTile
                        key={category.id}
                        category={category}
                        imageUrl={categoryImageMap[category.id]}
                        index={i + 1}
                        className="h-21.25 sm:h-25.5 flex-1"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ============ BOTTOM ROW ============ */}
              {/* Column count always matches the number of remaining
                  categories (1 or 2) — so this row always stretches
                  to fill the full width with zero leftover gap */}
              {bottomCategories.length > 0 && (
                <div
                  className={`grid gap-4 ${
                    bottomCategories.length === 1
                      ? "grid-cols-1" // Single remaining category fills the whole row
                      : "grid-cols-2" // Two remaining categories split the row evenly
                  }`}
                >
                  {bottomCategories.map((category, i) => (
                    <CollectionTile
                      key={category.id}
                      category={category}
                      imageUrl={categoryImageMap[category.id]}
                      index={i + 3}
                      className="h-25 sm:h-43"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // ---- EMPTY STATE: API returned no categories ----
            <div className="text-center py-12 text-gray-400 text-sm">
              Collections coming soon
            </div>
          )}
        </div>
      </Container>
    </section>
  );
};

export default CollectionsGrid;
