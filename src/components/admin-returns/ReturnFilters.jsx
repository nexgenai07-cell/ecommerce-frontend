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
  { value: "customer_name", label: "Customer Name: A-Z" },
  { value: "-customer_name", label: "Customer Name: Z-A" },
];

const DEFAULT_ORDERING = "-created_at";

/**
 * ReturnFilters
 *
 * The toolbar sitting above the returns table: search box, a "Filters"
 * toggle, an "Export" button, and — once "Filters" is opened — the
 * Status, Date Range, and Sort dropdown chips.
 *
 * Built on the same shared list-toolbar pieces used by every other
 * admin list page. The Return Status filter lives in its own dropdown
 * chip here (rather than an always-visible pill row) so it matches the
 * same pattern as every other dropdown filter in the admin panel.
 *
 * Props:
 * - statusTabs:      Array of { key, label } for the Status dropdown
 *                    (key: "" is the "All" option).
 * - activeStatus:    Currently selected status key.
 * - onStatusChange:  (key) => void.
 * - search:          Search box value (Return ID / Order ID / Customer).
 * - onSearchChange:  (value) => void.
 * - startDate / endDate: Date range values ("yyyy-mm-dd" strings).
 * - onStartDateChange / onEndDateChange: (value) => void.
 * - sortBy:          Current `ordering` value.
 * - onSortChange:    (value) => void.
 * - onClearFilters:  () => void — resets every field to its default.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 * - onExport:        Handler for the Export button.
 * - isExporting:     Loading state for the Export button.
 */
const ReturnFilters = ({
  statusTabs,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  sortBy,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  // Sort is intentionally excluded — "Newest First" is the default view.
  const activeFilterCount = [
    activeStatus,
    startDate || endDate,
    sortBy && sortBy !== DEFAULT_ORDERING,
  ].filter(Boolean).length;

  const selectedSort = SORT_OPTIONS.find((opt) => opt.value === sortBy);
  const selectedStatus = statusTabs.find((tab) => tab.key === activeStatus);

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search Return ID, Order ID, or Customer Name..."
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

          <DateRangeFilterChip
            label="Date"
            heading="Return Date"
            startValue={startDate}
            endValue={endDate}
            onStartChange={onStartDateChange}
            onEndChange={onEndDateChange}
            onClear={() => {
              onStartDateChange("");
              onEndDateChange("");
            }}
          />

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

export default ReturnFilters;
