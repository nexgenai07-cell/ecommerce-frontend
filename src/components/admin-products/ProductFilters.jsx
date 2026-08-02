import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import {
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineClose,
} from "react-icons/ai";

const STATUS_OPTIONS = [
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "low_stock", label: "Low Stock" },
];

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest" },
  { value: "created_at", label: "Oldest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "name", label: "Name: A-Z" },
];

const ProductFilters = ({
  categoryOptions,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  // Live count of how many filters are currently active — shown next to
  // the "Filters" heading so the admin can see at a glance whether
  // they're looking at a filtered view without having to scan every field.
  const activeFilterCount = [
    filters.search,
    filters.categoryId,
    filters.status,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-white shadow-sm  overflow-hidden">
      {/* Header row — icon + label + live active-filter count on the left,
          "Clear all" on the right (only rendered once a filter is active) */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <AiOutlineFilter className="w-4 h-4" />
          </span>
          <span className="text-sm font-semibold text-gray-800">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
              {activeFilterCount}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-danger transition-colors"
          >
            <AiOutlineClose className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Body — search gets its own full-width row since it's the
          primary/most-used control, structured filters sit together
          below in a clean, evenly-spaced grid */}
      <div className="p-5 flex flex-col gap-4">
        <Input
          placeholder="Search by product name or SKU..."
          leftIcon={<AiOutlineSearch className="w-4 h-4" />}
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="All Categories"
            value={filters.categoryId}
            onChange={(e) => onFilterChange("categoryId", e.target.value)}
          />

          <Select
            label="Status"
            options={STATUS_OPTIONS}
            placeholder="All Status"
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">
              Price Range
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => onFilterChange("minPrice", e.target.value)}
              />
              <span className="text-gray-300 shrink-0">–</span>
              <Input
                type="number"
                min="0"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => onFilterChange("maxPrice", e.target.value)}
              />
            </div>
          </div>

          <Select
            label="Sort By"
            options={SORT_OPTIONS}
            placeholder="Sort products"
            value={filters.ordering}
            onChange={(e) => onFilterChange("ordering", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductFilters;
