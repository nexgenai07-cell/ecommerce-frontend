import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  OptionRow,
} from "../shared/list-toolbar";

const TYPE_OPTIONS = [
  { value: "percent", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
];

// Sort options for the new "ordering" query param (API 39, 16 Sep 2026
// Filtering Fix pass). "Newest First" (-created_at) is the default the
// page loads with, so it's excluded from the active-filter count below
// the same way Category Management's Sort chip works.
const DEFAULT_ORDERING = "-created_at";
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "code", label: "Code (A-Z)" },
  { value: "-code", label: "Code (Z-A)" },
  { value: "-value", label: "Value (High-Low)" },
  { value: "value", label: "Value (Low-High)" },
  { value: "end_date", label: "Expiring Soonest" },
  { value: "-end_date", label: "Expiring Latest" },
];

/**
 * DiscountFilters
 *
 * The toolbar sitting above the discounts table: search box, a
 * "Filters" toggle, an "Export" button, and — once opened — the
 * Status and Type dropdown chips.
 *
 * Built on the same shared list-toolbar pieces used by every other
 * admin list page. The status filter lives in its own dropdown chip
 * here (rather than an always-visible pill row) so it matches the same
 * pattern as every other dropdown filter in the admin panel.
 *
 * Props:
 * - statusTabs:      Array of { key, label } for the Status dropdown
 *                    (key: "" is the "All" option).
 * - activeStatus:    Currently selected status key.
 * - onStatusChange:  (key) => void.
 * - search:          Search box value (promo code).
 * - onSearchChange:  (value) => void.
 * - typeFilter:      Current type filter value ("" = all types).
 * - onTypeChange:    (value) => void.
 * - ordering:        Current "ordering" query value (API 39). Defaults
 *                    to "-created_at" (Newest First) on the page.
 * - onOrderingChange: (value) => void.
 * - onClearFilters:  () => void — resets every field to its default.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 * - onExport:        Handler for the Export button.
 * - isExporting:     Loading state for the Export button.
 */
const DiscountFilters = ({
  statusTabs,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  ordering,
  onOrderingChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = [activeStatus, typeFilter].filter(Boolean).length;
  // Sort is intentionally excluded from this count — "Newest First" is
  // the default the page loads with, so having it selected isn't
  // really an "active filter" from the admin's point of view.

  const selectedType = TYPE_OPTIONS.find((opt) => opt.value === typeFilter);
  const selectedStatus = statusTabs.find((tab) => tab.key === activeStatus);
  const selectedSort = SORT_OPTIONS.find((opt) => opt.value === ordering);

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search promo codes..."
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
            label="Status"
            valueLabel={selectedStatus ? selectedStatus.label : "select status"}
            isActive={!!activeStatus}
            onClear={() => onStatusChange("")}
            panelClassName="w-44 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {statusTabs.map((tab) => (
                  <OptionRow
                    key={tab.key || "all"}
                    label={tab.label}
                    isSelected={activeStatus === tab.key}
                    onClick={() => {
                      onStatusChange(tab.key);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Type"
            valueLabel={selectedType ? selectedType.label : "select type"}
            isActive={!!typeFilter}
            onClear={() => onTypeChange("")}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Types"
                  isSelected={!typeFilter}
                  onClick={() => {
                    onTypeChange("");
                    close();
                  }}
                />
                {TYPE_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={typeFilter === opt.value}
                    onClick={() => {
                      onTypeChange(opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Sort"
            valueLabel={selectedSort ? selectedSort.label : "select sort"}
            isActive={ordering !== DEFAULT_ORDERING}
            onClear={() => onOrderingChange(DEFAULT_ORDERING)}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {SORT_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={ordering === opt.value}
                    onClick={() => {
                      onOrderingChange(opt.value);
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

export default DiscountFilters;
