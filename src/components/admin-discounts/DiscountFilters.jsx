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
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = [activeStatus, typeFilter].filter(Boolean).length;

  const selectedType = TYPE_OPTIONS.find((opt) => opt.value === typeFilter);
  const selectedStatus = statusTabs.find((tab) => tab.key === activeStatus);

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
        </FilterChipsRow>
      )}
    </div>
  );
};

export default DiscountFilters;
