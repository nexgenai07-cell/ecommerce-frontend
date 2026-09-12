import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  DateRangeFilterChip,
  OptionRow,
} from "../shared/list-toolbar";

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "name", label: "Name: A-Z" },
  { value: "-name", label: "Name: Z-A" },
  { value: "-product_count", label: "Most Products" },
  { value: "product_count", label: "Fewest Products" },
];

const DEFAULT_ORDERING = "-created_at";

// NOTE: there is no "Status" (Active/Inactive) dropdown here. It relied
// on a category's is_active field to distinguish soft-deleted rows from
// normal ones inside this very list — but the backend's real deletion
// mechanism uses a separate internal is_delete flag that is never
// returned by this endpoint, and deleted categories are filtered out of
// the list before it ever reaches the frontend. Every category this
// component receives is, by definition, a live one, so there is nothing
// left for a status filter to narrow down.

/**
 * CategoryFilters
 *
 * The toolbar sitting above the categories table: search box, a
 * "Filters" toggle, an "Export" button, and — once opened — the
 * Created Date range and Sort dropdown chips.
 *
 * Built on the same shared list-toolbar pieces as every other admin
 * list page's filters component, so this toolbar is visually and
 * behaviourally identical to the one above the products table.
 *
 * Props:
 * - filters:          Current filter values owned by
 *                     CategoryManagement.jsx — { search, startDate,
 *                     endDate, ordering }.
 * - onFilterChange:   (key, value) => void — called on every change to
 *                     any single field.
 * - onClearFilters:   () => void — resets every field back to its
 *                     default in one call.
 * - hasActiveFilters: Whether at least one real filter (search or date
 *                     range) is currently active.
 * - onExport:         Handler for the Export button. Exports the
 *                     currently filtered/sorted category list as a
 *                     client-side CSV (there is no confirmed backend
 *                     export type for categories yet, but the full
 *                     list is already loaded and filtered in the
 *                     browser, so nothing is lost by building the CSV
 *                     from that instead of a fresh server request).
 */
const CategoryFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  // Sort is intentionally excluded from this count — "Newest First" is
  // just the default view, not a narrowing filter.
  const activeFilterCount = [
    filters.startDate || filters.endDate,
    filters.ordering && filters.ordering !== DEFAULT_ORDERING,
  ].filter(Boolean).length;

  const selectedSort = SORT_OPTIONS.find(
    (opt) => opt.value === filters.ordering,
  );

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={filters.search}
        onSearchChange={(value) => onFilterChange("search", value)}
        searchPlaceholder="Search by category name..."
        activeFilterCount={activeFilterCount}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={() => setAreFiltersOpen((prev) => !prev)}
        onExport={onExport}
      />

      {areFiltersOpen && (
        <FilterChipsRow
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        >
          <DateRangeFilterChip
            label="Date"
            heading="Created Date"
            startValue={filters.startDate}
            endValue={filters.endDate}
            onStartChange={(value) => onFilterChange("startDate", value)}
            onEndChange={(value) => onFilterChange("endDate", value)}
            onClear={() => {
              onFilterChange("startDate", "");
              onFilterChange("endDate", "");
            }}
          />

          <FilterChip
            label="Sort"
            valueLabel={selectedSort ? selectedSort.label : "select sort"}
            isActive={filters.ordering !== DEFAULT_ORDERING}
            onClear={() => onFilterChange("ordering", DEFAULT_ORDERING)}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {SORT_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={filters.ordering === opt.value}
                    onClick={() => {
                      onFilterChange("ordering", opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>
        </FilterChipsRow>
      )}
    </div>
  );
};

export default CategoryFilters;
