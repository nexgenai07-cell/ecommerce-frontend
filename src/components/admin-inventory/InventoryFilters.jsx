import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  MultiSelectFilterChip,
  OptionRow,
} from "../shared/list-toolbar";

/**
 * InventoryFilters
 *
 * The toolbar sitting above the inventory table: search box, a
 * "Filters" toggle, an "Export" button, and — once opened — the Status
 * and Category dropdown chips. Status uses MultiSelectFilterChip since
 * more than one can be active at once (e.g. "Out of Stock" AND
 * "Low Stock" together), unlike every other single-select status
 * dropdown in the admin panel.
 *
 * Built on the same shared list-toolbar pieces used by every other
 * admin list page.
 *
 * Props:
 * - statusOptions:   Array of { key, label } (key: "" is skipped — a
 *                    checkbox list has no single "All" row; clearing
 *                    the chip or using "Clear all" does that job).
 * - activeTabs:      Array of currently checked status keys.
 * - onToggleStatus:  (key) => void — flips one status on/off.
 * - onClearStatus:   () => void — unchecks every status.
 * - search:          Search box value (product name / SKU).
 * - onSearchChange:  (value) => void.
 * - categoryOptions: Array of { value, label } for the Category dropdown.
 * - categoryId:      Current category filter value ("" = all categories).
 * - onCategoryChange: (value) => void.
 * - onClearFilters:  () => void — resets status, search, and category.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 * - onExport:        Handler for the Export button.
 * - isExporting:     Loading state for the Export button.
 */
const InventoryFilters = ({
  statusOptions,
  activeTabs,
  onToggleStatus,
  onClearStatus,
  search,
  onSearchChange,
  categoryOptions,
  categoryId,
  onCategoryChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = [activeTabs.length > 0, categoryId].filter(
    Boolean,
  ).length;

  const selectedCategory = categoryOptions.find(
    (opt) => opt.value === categoryId,
  );

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Filter products..."
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
          <MultiSelectFilterChip
            label="Status"
            options={statusOptions
              .filter((opt) => opt.key !== "")
              .map((opt) => ({ value: opt.key, label: opt.label }))}
            selectedValues={activeTabs}
            onToggle={onToggleStatus}
            onClear={onClearStatus}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          />

          <FilterChip
            label="Category"
            valueLabel={
              selectedCategory && selectedCategory.value
                ? selectedCategory.label
                : "select category"
            }
            isActive={!!categoryId}
            onClear={() => onCategoryChange("")}
            panelClassName="w-60 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
          >
            {({ close }) => (
              <>
                {categoryOptions.map((opt) => (
                  <OptionRow
                    key={opt.value || "all-categories"}
                    label={opt.label}
                    isSelected={categoryId === opt.value}
                    onClick={() => {
                      onCategoryChange(opt.value);
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

export default InventoryFilters;
