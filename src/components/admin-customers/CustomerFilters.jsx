import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  OptionRow,
} from "../shared/list-toolbar";

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest Joined" },
  { value: "created_at", label: "Oldest Joined" },
  { value: "name", label: "Name: A–Z" },
  { value: "-name", label: "Name: Z–A" },
  { value: "-total_orders", label: "Most Orders" },
  { value: "total_orders", label: "Fewest Orders" },
  { value: "-total_spent", label: "Highest Spender" },
  { value: "total_spent", label: "Lowest Spender" },
];

const DEFAULT_ORDERING = "-created_at";

/**
 * CustomerFilters
 *
 * The toolbar sitting above the customers table: search box, a
 * "Filters" toggle, an "Export" button, and — once opened — the Sort
 * dropdown chip.
 *
 * Built on the same shared list-toolbar pieces as every other admin
 * list page's filters component, so this toolbar is visually and
 * behaviourally identical to the ones above the products/categories/
 * orders tables.
 *
 * Props:
 * - search:          Search box value (name / email / phone).
 * - onSearchChange:  (value) => void.
 * - sortBy:          Current `ordering` value.
 * - onSortChange:    (value) => void.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 * - onClearFilters:  () => void — resets search and sort together.
 * - onExport:        Handler for the Export button.
 * - isExporting:     Loading state for the Export button.
 */
const CustomerFilters = ({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = sortBy && sortBy !== DEFAULT_ORDERING ? 1 : 0;
  const selectedSort = SORT_OPTIONS.find((opt) => opt.value === sortBy);

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by name, email or phone..."
        activeFilterCount={activeFilterCount}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={() => setAreFiltersOpen((prev) => !prev)}
        onExport={onExport}
        isExporting={isExporting}
      />

      {areFiltersOpen && (
        <FilterChipsRow
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        >
          <FilterChip
            label="Sort"
            valueLabel={selectedSort ? selectedSort.label : "select sort"}
            isActive={sortBy !== DEFAULT_ORDERING}
            onClear={() => onSortChange(DEFAULT_ORDERING)}
            panelClassName="w-52 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {SORT_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={sortBy === opt.value}
                    onClick={() => {
                      onSortChange(opt.value);
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

export default CustomerFilters;
