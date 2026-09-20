import {
  AiOutlineCalendar,
  AiOutlineDown,
  AiOutlineDownload,
} from "react-icons/ai"; // Calendar icon for the date range, chevron for the dropdowns, download icon for the export button
import Popover from "../ui/Popover"; // Shared popover — handles opening, closing on outside click and Escape
import Button from "../ui/Button"; // Shared button, used for the export action
import OptionRow from "../shared/list-toolbar/OptionRow"; // The option row used by every filter dropdown in the admin panel
import cn from "../../utils/cn"; // Conditional Tailwind class merge helper

// Classes shared by the two native date inputs inside the date range group.
// The inputs are borderless because the group around them draws the border.
const DATE_INPUT_CLASS =
  "min-w-0 flex-1 sm:flex-none sm:w-28 bg-transparent text-xs font-medium text-gray-800 outline-none cursor-pointer";

/**
 * FilterSelect
 *
 * A compact single-select dropdown used inside the filter bar. It shows the
 * filter name next to the current value, and opens a themed option list — the
 * same option rows used by the filter dropdowns on the other admin pages —
 * instead of the browser's plain native menu.
 */
const FilterSelect = ({ label, ariaLabel, options, value, onChange }) => {
  const selectedOption =
    options.find((option) => option.value === value) || options[0];

  return (
    <Popover
      align="left"
      panelClassName="w-48 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
      trigger={
        <button
          type="button"
          aria-label={ariaLabel || label}
          aria-haspopup="listbox"
          className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs transition-colors hover:border-primary/50 hover:bg-primary-50/40"
        >
          <span className="font-medium text-gray-500 shrink-0">{label}</span>
          <span className="max-w-36 truncate font-semibold text-gray-900">
            {selectedOption?.label}
          </span>
          <AiOutlineDown className="w-2.5 h-2.5 text-gray-400 shrink-0" />
        </button>
      }
    >
      {({ close }) => (
        <div role="listbox" className="flex flex-col gap-0.5">
          {options.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              isSelected={option.value === value}
              onClick={() => {
                onChange(option.value);
                close();
              }}
            />
          ))}
        </div>
      )}
    </Popover>
  );
};

/**
 * AnalyticsFilterBar
 *
 * The compact toolbar shown under the title of every analytics page. It
 * gathers the page's filters in one tidy card instead of a tall stack of
 * loose controls:
 *   - a date range group (calendar icon, start date, end date)
 *   - optional quick-range chips (Today, Last 7 Days, ...)
 *   - optional single-select dropdowns (for example Status or Category)
 *   - an optional export button, pushed to the right
 *
 * On wide screens everything sits on one row; on narrower screens the groups
 * wrap onto further rows, and on phones each group takes the full width. A
 * page passes only the pieces it needs — the bar renders nothing for a piece
 * whose props are left out, so a page with only a date range gets just that.
 *
 * Props:
 * - startDate / endDate:          Current "yyyy-mm-dd" values.
 * - onStartDateChange / onEndDateChange: (value) => void handlers.
 * - presetRanges:   Optional array of { label, startDate, endDate }.
 * - onSelectPreset: (preset) => void — applies a preset's dates.
 * - selects:        Optional array of { key, label, ariaLabel, options,
 *                   value, onChange } — one dropdown each. onChange
 *                   receives the chosen option value.
 * - onExport / isExporting / exportLabel: Optional export button.
 */
const AnalyticsFilterBar = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  presetRanges = [],
  onSelectPreset,
  selects = [],
  onExport,
  isExporting = false,
  exportLabel = "Export",
}) => (
  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
    {/* Date range — one bordered group holding both native date inputs. The
        pickers limit the choice so the end date is never before the start
        date. */}
    <div className="flex w-full items-center gap-1.5 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 transition-colors focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 sm:w-auto">
      <AiOutlineCalendar className="w-4 h-4 text-primary shrink-0" />
      <input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(e) => onStartDateChange(e.target.value)}
        aria-label="Start date"
        className={DATE_INPUT_CLASS}
      />
      <span className="text-xs text-gray-300 shrink-0">to</span>
      <input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => onEndDateChange(e.target.value)}
        aria-label="End date"
        className={DATE_INPUT_CLASS}
      />
    </div>

    {/* Quick-range chips — a segmented control that scrolls sideways when the
        screen is too narrow to show every chip. A chip is active when its
        dates exactly match the selected range. */}
    {presetRanges.length > 0 && (
      <div className="flex w-full max-w-full items-center gap-0.5 overflow-x-auto scrollbar-hide rounded-full bg-gray-100 p-0.5 sm:w-auto">
        {presetRanges.map((preset) => {
          const isActive =
            preset.startDate === startDate && preset.endDate === endDate;

          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150",
                isActive
                  ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-sm shadow-primary/25"
                  : "text-gray-500 hover:bg-white hover:text-gray-800",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    )}

    {/* Dropdown filters — each one sits at the start of its own row on
        phones, so its option list always opens within the screen. */}
    {selects.map((select) => (
      <div key={select.key} className="w-full sm:w-auto">
        <FilterSelect
          label={select.label}
          ariaLabel={select.ariaLabel}
          options={select.options}
          value={select.value}
          onChange={select.onChange}
        />
      </div>
    ))}

    {/* Export button — pushed to the right on wide screens, full width on
        phones. */}
    {onExport && (
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<AiOutlineDownload className="w-4 h-4" />}
        onClick={onExport}
        isLoading={isExporting}
        className="h-9 w-full shrink-0 sm:ml-auto sm:w-auto"
      >
        {exportLabel}
      </Button>
    )}
  </div>
);

export default AnalyticsFilterBar;
