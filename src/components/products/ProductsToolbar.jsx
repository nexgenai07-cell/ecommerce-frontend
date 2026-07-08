// Products Toolbar — Results count, active filter tags, sort, grid/list toggle
import {
  AiOutlineAppstore,
  AiOutlineBars,
  AiOutlineClose,
  AiOutlineDown,
} from "react-icons/ai";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import cn from "../../utils/cn";

// Only sort options the backend's `ordering` param actually supports
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
];

const ProductsToolbar = ({
  totalResults,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  currentPage,
  perPage,
}) => {
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
  // API_Documentation_Final.pdf (API 11) documents this endpoint as a
  // flat array, but real responses show a DRF-paginated object — a
  // backend/docs contract mismatch. extractListData() safely handles
  // either shape.
  const categories = extractListData(categoriesData);

  const activeFilterTags = [
    ...(filters.categories || []).map((catId) => ({
      id: `cat-${catId}`,
      label: categories.find((c) => c.id === catId)?.name || "Category",
      onRemove: () =>
        onFiltersChange({
          ...filters,
          categories: filters.categories.filter((c) => c !== catId),
        }),
    })),
    ...(filters.inStock
      ? [
          {
            id: "in-stock",
            label: "In Stock",
            onRemove: () => onFiltersChange({ ...filters, inStock: false }),
          },
        ]
      : []),
    ...(filters.minPrice || filters.maxPrice
      ? [
          {
            id: "price",
            label: `PKR ${filters.minPrice || 0} - ${filters.maxPrice || "∞"}`,
            onRemove: () =>
              onFiltersChange({ ...filters, minPrice: "", maxPrice: "" }),
          },
        ]
      : []),
  ];

  const hasActiveFilters = activeFilterTags.length > 0;

  const start = Math.min((currentPage - 1) * perPage + 1, totalResults);
  const end = Math.min(currentPage * perPage, totalResults);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white rounded-2xl border border-gray-100 px-4 py-3 sm:px-5">
        {/* Results count */}
        <p className="text-sm text-gray-500">
          {totalResults > 0 ? (
            <>
              Showing{" "}
              <span className="font-bold text-gray-800">
                {start}-{end}
              </span>{" "}
              of <span className="font-bold text-gray-800">{totalResults}</span>{" "}
              products
            </>
          ) : (
            "No products found"
          )}
        </p>

        <div className="flex items-center gap-3 shrink-0">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="
                appearance-none text-sm font-medium border border-gray-200 rounded-xl
                pl-3.5 pr-9 py-2.5 bg-gray-50 text-gray-700 cursor-pointer
                hover:border-primary/50 focus:outline-none focus:border-primary
                focus:ring-2 focus:ring-primary/20 transition-all
              "
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <AiOutlineDown className="w-3 h-3 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid/List segmented toggle */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => onViewModeChange("grid")}
              aria-label="Grid view"
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                viewMode === "grid"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              <AiOutlineAppstore className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              aria-label="List view"
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                viewMode === "list"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              <AiOutlineBars className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-linear-to-r from-primary to-primary-dark text-white text-xs font-semibold rounded-full shadow-sm shadow-primary/20"
            >
              {tag.label}
              <button
                onClick={tag.onRemove}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag.label} filter`}
              >
                <AiOutlineClose className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() =>
              onFiltersChange({
                categories: [],
                minPrice: "",
                maxPrice: "",
                inStock: false,
              })
            }
            className="text-xs text-primary font-semibold hover:underline"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsToolbar;
