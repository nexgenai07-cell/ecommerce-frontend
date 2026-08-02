import Input from "../ui/Input";
import Select from "../ui/Select";
import {
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineClose,
} from "react-icons/ai";

// Sort dropdown options — each value maps to a sorter function defined
// inside CategoryManagement.jsx (kept there since that's where the
// actual array of categories being sorted lives).
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "name", label: "Name: A-Z" },
  { value: "-name", label: "Name: Z-A" },
  { value: "-product_count", label: "Most Products" },
  { value: "product_count", label: "Fewest Products" },
];

// NOTE: the "Status" (Active/Inactive) dropdown that used to live here
// has been REMOVED. It relied on the category's is_active field to
// distinguish soft-deleted rows from normal ones inside this very
// list — but the backend's real deletion mechanism now uses a
// separate internal is_delete flag that is never returned in this
// endpoint's response, AND deleted categories are filtered out of the
// list entirely before it ever reaches the frontend. There is no
// longer any "inactive" row that could ever show up here to filter
// for — every category this component receives is, by definition,
// a live one. See CategoryManagement.jsx for the full explanation.

const CategoryFilters = ({
  filters, // { search, startDate, endDate, ordering } — current filter values, owned by the parent page
  onFilterChange, // (key, value) => void — called on every field change
  onClearFilters, // () => void — resets every field back to its default
  hasActiveFilters, // true when at least one real filter (search/startDate/endDate) is active
}) => {
  // Live count of how many filters are currently active — shown next to
  // the "Filters" heading, same pattern as ProductFilters.jsx. Sorting
  // is intentionally NOT counted here since "Newest First" is just the
  // default view, not a narrowing filter. "status" was removed from
  // this list along with the dropdown above.
  const activeFilterCount = [
    filters.search,
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-white shadow-md overflow-hidden">
      {/* Header row — icon + label + live active-filter count on the left,
          "Clear all" on the right (only rendered once a real filter is active) */}
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
          primary/most-used control, date range + sort sit together
          below in a clean, evenly-spaced grid. Grid is now 3 columns
          instead of 4 now that the Status dropdown is gone. */}
      <div className="p-5 flex flex-col gap-4">
        <Input
          placeholder="Search by category name..."
          leftIcon={<AiOutlineSearch className="w-4 h-4" />}
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input
            label="Created From"
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
          />

          <Input
            label="Created To"
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
          />

          <Select
            label="Sort By"
            options={SORT_OPTIONS}
            placeholder="Sort categories"
            value={filters.ordering}
            onChange={(e) => onFilterChange("ordering", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default CategoryFilters;
