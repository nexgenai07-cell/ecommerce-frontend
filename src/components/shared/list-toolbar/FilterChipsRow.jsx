/**
 * FilterChipsRow
 *
 * Lays out a page's FilterChip instances in a wrapping row and appends
 * the shared "Clear all" link at the far end once at least one filter
 * is active. Every admin list page renders its own chips as children
 * here, so the spacing, wrapping behaviour, and "Clear all" placement
 * stay identical across the whole admin panel.
 *
 * Props:
 * - hasActiveFilters: Whether to show the "Clear all" link.
 * - onClearFilters:   Handler for the "Clear all" link.
 * - children:         The page's FilterChip / RangeFilterChip /
 *                      DateRangeFilterChip instances, in display order.
 */
const FilterChipsRow = ({ hasActiveFilters, onClearFilters, children }) => (
  <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
    {children}

    {hasActiveFilters && (
      <button
        type="button"
        onClick={onClearFilters}
        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-danger transition-colors shrink-0"
      >
        Clear all
      </button>
    )}
  </div>
);

export default FilterChipsRow;
