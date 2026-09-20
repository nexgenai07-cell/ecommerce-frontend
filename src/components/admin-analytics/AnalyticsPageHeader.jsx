import { useState } from "react";
import PageHeader from "../shared/PageHeader"; // The shared gradient icon + title header used on every admin screen
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  DateRangeFilterChip,
  OptionRow,
} from "../shared/list-toolbar"; // The same toolbar pieces used by every admin list page

/**
 * AnalyticsPageHeader
 *
 * The header of an analytics page, built from the same pieces as the admin
 * list pages so every screen in the panel behaves the same way:
 *
 *   - the page icon and title on the left;
 *   - a "Filters" button and (when the page can export) an "Export" button
 *     at the top right;
 *   - a row of filter chips under the header, hidden until "Filters" is
 *     clicked: a Date chip whose dropdown holds the quick ranges (Today,
 *     Last 7 Days, This Month...) together with a custom From / To range,
 *     plus one dropdown chip per extra filter (for example Status).
 *
 * The header only draws the controls. The page keeps its own state and its
 * own data requests and simply hands the values and change handlers in, so
 * changing a filter behaves exactly as it does anywhere else on the page.
 *
 * An analytics range always has a value, so "filtered" here means "different
 * from the page's default". The count on the Filters button, the highlighted
 * chips, their clear (X) icons and the "Clear all" link all follow that rule,
 * and clearing puts a filter back to its default rather than emptying it.
 *
 * Props:
 * - icon / title:        Passed to the shared PageHeader.
 * - startDate / endDate: Current "yyyy-mm-dd" range.
 * - onStartDateChange / onEndDateChange: (value) => void handlers.
 * - defaultStartDate / defaultEndDate:   The range the page starts with.
 * - presetRanges:   Optional array of { label, startDate, endDate }.
 * - onSelectPreset: (preset) => void — applies a preset's dates.
 * - selects:        Optional array of { key, label, options, value,
 *                   defaultValue, onChange } — one dropdown chip each.
 *                   options is an array of { value, label }; onChange
 *                   receives the chosen option value.
 * - onExport / isExporting / exportLabel: Optional Export button.
 */
const AnalyticsPageHeader = ({
  icon,
  title,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  defaultStartDate,
  defaultEndDate,
  presetRanges = [],
  onSelectPreset,
  selects = [],
  onExport,
  isExporting = false,
  exportLabel = "Export",
}) => {
  // Whether the row of filter chips under the header is showing.
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const isDateFiltered =
    startDate !== defaultStartDate || endDate !== defaultEndDate;

  const activeFilterCount =
    (isDateFiltered ? 1 : 0) +
    selects.filter((select) => select.value !== select.defaultValue).length;

  // Puts the date range back to the page's default range.
  const resetDates = () => {
    onStartDateChange(defaultStartDate);
    onEndDateChange(defaultEndDate);
  };

  // Puts every filter back to its default.
  const handleClearFilters = () => {
    resetDates();
    selects.forEach((select) => select.onChange(select.defaultValue));
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        icon={icon}
        title={title}
        actions={
          // sm:-mr-3 cancels the toolbar's own side padding so the buttons
          // line up with the right edge of the page.
          <div className="w-full sm:w-auto sm:-mr-3">
            <ListToolbarBar
              activeFilterCount={activeFilterCount}
              areFiltersOpen={areFiltersOpen}
              onToggleFilters={() => setAreFiltersOpen((open) => !open)}
              onExport={onExport}
              exportLabel={exportLabel}
              isExporting={isExporting}
            />
          </div>
        }
      />

      {areFiltersOpen && (
        <FilterChipsRow
          hasActiveFilters={activeFilterCount > 0}
          onClearFilters={handleClearFilters}
        >
          <DateRangeFilterChip
            label="Date"
            heading="Date Range"
            startValue={startDate}
            endValue={endDate}
            onStartChange={onStartDateChange}
            onEndChange={onEndDateChange}
            onClear={resetDates}
            presets={presetRanges}
            onSelectPreset={onSelectPreset}
            isActive={isDateFiltered}
          />

          {selects.map((select) => {
            const selectedOption = select.options.find(
              (option) => option.value === select.value,
            );

            return (
              <FilterChip
                key={select.key}
                label={select.label}
                valueLabel={
                  selectedOption
                    ? selectedOption.label
                    : `select ${select.label.toLowerCase()}`
                }
                isActive={select.value !== select.defaultValue}
                onClear={() => select.onChange(select.defaultValue)}
                panelClassName="w-52 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
              >
                {({ close }) => (
                  <>
                    {select.options.map((option) => (
                      <OptionRow
                        key={option.value}
                        label={option.label}
                        isSelected={option.value === select.value}
                        onClick={() => {
                          select.onChange(option.value);
                          close();
                        }}
                      />
                    ))}
                  </>
                )}
              </FilterChip>
            );
          })}
        </FilterChipsRow>
      )}
    </div>
  );
};

export default AnalyticsPageHeader;
