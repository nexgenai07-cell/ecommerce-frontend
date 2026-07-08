// ============================================================
// CURATED COLLECTIONS SECTION
// A "bento grid" layout built from explicit blocks (not fragile
// CSS auto-placement) so it behaves predictably at any category
// count: a featured tile + a 2-card side stack on top, then a
// bottom row whose column count matches however many categories
// remain — meaning the bottom row ALWAYS fills the full width,
// with no leftover empty gap, regardless of how many tiles there are.
// Row heights are intentionally compact.
//
// IMPORTANT: The `categories` table has NO image field (confirmed
// against the ERD — id, store_id, name, description, created_at,
// updated_at only). To keep every tile 100% real/backend-driven
// instead of a flat placeholder color, each card's background is
// the PRIMARY IMAGE of that category's most recent real product —
// fetched live via the products search API. If a category has no
// products yet, it gracefully falls back to a branded dark gradient.
//
// Includes hover effects (image zoom + darkening overlay + animated
// arrow) on each card. Fully responsive.
// ============================================================

import { Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { AiOutlineArrowRight } from "react-icons/ai";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import { searchProducts } from "../../api/products.api";
import Container from "../layouts/Container";

// =============================================
// FALLBACK GRADIENTS
// Used ONLY when a category has no products yet (so no image exists).
// =============================================
const FALLBACK_GRADIENTS = [
  "bg-gradient-to-br from-gray-800 to-gray-950",
  "bg-gradient-to-br from-gray-700 to-gray-900",
  "bg-gradient-to-br from-primary-dark to-gray-950",
  "bg-gradient-to-br from-gray-800 to-gray-900",
  "bg-gradient-to-br from-gray-700 to-gray-950",
];

// =============================================
// SINGLE COLLECTION TILE
// Shared by every tile in the grid so hover behavior, overlay, and
// text placement stay perfectly consistent regardless of position.
// =============================================
const CollectionTile = ({ category, imageUrl, index, featured, className }) => (
  <Link
    to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
    className={`relative rounded-xl overflow-hidden group cursor-pointer ${
      !imageUrl
        ? FALLBACK_GRADIENTS[index] || FALLBACK_GRADIENTS[0]
        : "bg-gray-900"
    } ${className}`}
  >
    {/* Real product photo as the tile background, when available */}
    {imageUrl && (
      <img
        src={imageUrl}
        alt={category.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
    )}

    {/* Bottom-anchored dark gradient — keeps white text readable over any photo */}
    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-black/5 group-hover:from-black/85 transition-colors duration-300" />

    {/* Text content positioned at the bottom of the card */}
    <div className="absolute bottom-3 left-3 right-3 z-10">
      <p
        className={`font-bold text-white leading-tight ${
          featured ? "text-lg sm:text-xl" : "text-sm"
        }`}
      >
        {category.name}
      </p>

      {featured && category.description && (
        <p className="hidden sm:block text-white/70 text-xs mt-1 line-clamp-1">
          {category.description}
        </p>
      )}

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
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });

  // Limit to the first 5 categories — matches the bento grid's fixed layout (1 featured + 2 side + up to 2 bottom)
  // API_Documentation_Final.pdf (API 11) documents this endpoint as a
  // flat array, but real responses show a DRF-paginated object — a
  // backend/docs contract mismatch. extractListData() safely handles
  // either shape.
  const categories = extractListData(categoriesData).slice(0, 5);

  // =============================================
  // PER-CATEGORY REPRESENTATIVE PRODUCT IMAGE
  // Fires one lightweight query per category (only once categories
  // have loaded) to grab that category's single most recent product,
  // just to use its primary_image as the tile's background photo.
  // =============================================
  const productImageQueries = useQueries({
    queries: categories.map((category) => ({
      queryKey: [...QUERY_KEYS.PRODUCTS, "collection-thumbnail", category.id],
      queryFn: () =>
        searchProducts({
          category_id: category.id,
          ordering: "-created_at",
          page: 1,
        }),
      enabled: categories.length > 0,
      staleTime: 1000 * 60 * 10,
    })),
  });

  // Build a simple lookup: { [categoryId]: imageUrl | null }
  const categoryImageMap = {};
  categories.forEach((category, index) => {
    const firstProduct = productImageQueries[index]?.data?.data?.results?.[0];
    categoryImageMap[category.id] = firstProduct?.primary_image || null;
  });

  const isLoading =
    categoriesLoading || productImageQueries.some((q) => q.isLoading);

  // Split into: 1 featured + up to 2 side-stack + remaining for the bottom row
  const featuredCategory = categories[0];
  const sideCategories = categories.slice(1, 3); // up to 2
  const bottomCategories = categories.slice(3, 5); // up to 2 — bottom row's column count matches this length exactly, so it always fills full width

  return (
    <section className="py-14 px-14">
      <Container>
        <div className="flex flex-col gap-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Curated Collections
          </h2>

          {isLoading ? (
            // ---- LOADING STATE ----
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="h-45 sm:h-55 flex-2 rounded-xl bg-gray-100 animate-pulse" />
                <div className="flex flex-row sm:flex-col gap-4 flex-1">
                  <div className="h-21.25 sm:h-25.5 flex-1 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="h-21.25 sm:h-25.5 flex-1 rounded-xl bg-gray-100 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-25 sm:h-30 rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-25 sm:h-30 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            </div>
          ) : categories.length > 0 ? (
            // ---- DATA LOADED STATE ----
            <div className="flex flex-col gap-2">
              {/* ============ TOP ROW: featured tile + side stack ============ */}
              <div className="flex flex-col sm:flex-row gap-2">
                {featuredCategory && (
                  <CollectionTile
                    category={featuredCategory}
                    imageUrl={categoryImageMap[featuredCategory.id]}
                    index={0}
                    featured
                    className="h-45 sm:h-55 flex-2"
                  />
                )}

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
                      ? "grid-cols-1"
                      : "grid-cols-2"
                  }`}
                >
                  {bottomCategories.map((category, i) => (
                    <CollectionTile
                      key={category.id}
                      category={category}
                      imageUrl={categoryImageMap[category.id]}
                      index={i + 3}
                      className="h-25 sm:h-30"
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
