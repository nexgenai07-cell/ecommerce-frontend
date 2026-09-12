import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  RangeFilterChip,
  OptionRow,
} from "../shared/list-toolbar";

// Fixed option lists for the two single-select dropdowns on this page.
// Category options are dynamic (passed in as a prop, since they come
// from the backend) so they are not listed here.
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

const DEFAULT_ORDERING = "-created_at";

/**
 * ProductFilters
 *
 * The toolbar sitting above the products table: search box, "Filters"
 * toggle, "Export" button, and — once "Filters" is opened — the
 * Category, Status, Price, and Sort dropdown chips.
 *
 * All of the shared visual/interaction behaviour (search collapse,
 * chip pill shape, dropdown panels, "Clear all") lives in
 * src/components/shared/list-toolbar; this file only wires that shared
 * toolbar to the specific fields this page's product list can be
 * filtered and sorted by.
 *
 * Props:
 * - categoryOptions:  Array of { value, label } for the Category
 *                     dropdown, resolved from the backend category list.
 * - filters:          Current filter values owned by ProductList.jsx —
 *                     { search, categoryId, status, minPrice, maxPrice,
 *                     ordering }.
 * - onFilterChange:   (key, value) => void — called on every change to
 *                     any single field.
 * - onClearFilters:   () => void — resets every field back to its
 *                     default in one call.
 * - hasActiveFilters: Whether at least one real filter (not counting
 *                     sort) is currently active — controls whether the
 *                     "Clear all" link is shown.
 * - onExport:         Handler for the Export button.
 */
const ProductFilters = ({
  categoryOptions,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
}) => {
  // Whether the filter-chips row below the top bar is shown at all.
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  // Sort is intentionally excluded from this count — "Newest" is just
  // the default view, not a narrowing filter, matching the convention
  // used on every other admin list page.
  const activeFilterCount = [
    filters.categoryId,
    filters.status,
    filters.minPrice || filters.maxPrice,
    filters.ordering && filters.ordering !== DEFAULT_ORDERING,
  ].filter(Boolean).length;

  const selectedCategory = categoryOptions.find(
    (opt) => opt.value === filters.categoryId,
  );
  const selectedStatus = STATUS_OPTIONS.find(
    (opt) => opt.value === filters.status,
  );
  const selectedSort = SORT_OPTIONS.find(
    (opt) => opt.value === filters.ordering,
  );

  return (
    // No overflow-hidden here on purpose — clipping this wrapper would
    // cut off every open dropdown panel instead of letting it float
    // above the products table below.
    <div className="relative">
      <ListToolbarBar
        searchValue={filters.search}
        onSearchChange={(value) => onFilterChange("search", value)}
        searchPlaceholder="Search by name or SKU..."
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
          <FilterChip
            label="Category"
            valueLabel={
              selectedCategory ? selectedCategory.label : "select category"
            }
            isActive={!!filters.categoryId}
            onClear={() => onFilterChange("categoryId", "")}
            panelClassName="w-60 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Categories"
                  isSelected={!filters.categoryId}
                  onClick={() => {
                    onFilterChange("categoryId", "");
                    close();
                  }}
                />
                {categoryOptions.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={filters.categoryId === opt.value}
                    onClick={() => {
                      onFilterChange("categoryId", opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Status"
            valueLabel={selectedStatus ? selectedStatus.label : "select status"}
            isActive={!!filters.status}
            onClear={() => onFilterChange("status", "")}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Status"
                  isSelected={!filters.status}
                  onClick={() => {
                    onFilterChange("status", "");
                    close();
                  }}
                />
                {STATUS_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={filters.status === opt.value}
                    onClick={() => {
                      onFilterChange("status", opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <RangeFilterChip
            label="Price"
            heading="Price Range"
            minValue={filters.minPrice}
            maxValue={filters.maxPrice}
            onMinChange={(value) => onFilterChange("minPrice", value)}
            onMaxChange={(value) => onFilterChange("maxPrice", value)}
            onClear={() => {
              onFilterChange("minPrice", "");
              onFilterChange("maxPrice", "");
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

export default ProductFilters;
