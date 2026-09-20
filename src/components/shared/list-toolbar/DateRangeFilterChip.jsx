import { useState } from "react";
import FilterChip from "./FilterChip";
import OptionRow from "./OptionRow";
import Input from "../../ui/Input";
import formatDate from "../../../utils/formatDate";

/**
 * DateRangeFilterChip
 *
 * A FilterChip preconfigured for a "from - to" date range (created date
 * on the categories list, order date on the orders list, return date on
 * the returns list). Reused wherever an admin page needs to filter a
 * list by a date range, so every date-range dropdown looks and behaves
 * the same way.
 *
 * Quick ranges: a page can pass presets (for example Today, Last 7 Days,
 * This Month). They are listed at the top of the dropdown, above the custom
 * range fields, and picking one applies both dates at once and closes the
 * dropdown. When the selected dates match a preset, the chip shows that
 * preset's name instead of the two dates.
 *
 * Layout: the two date fields sit side by side (From on the left, To on
 * the right) in two equal columns. The panel is wide enough for both,
 * and each field is allowed to shrink inside its own column, so neither
 * field is ever clipped. On phones the panel opens as a card that spans
 * the screen width instead of hanging off the chip, so it can never run
 * past the edge of the viewport.
 *
 * Behavior: every change is applied to the list immediately, so there
 * is no Apply button. The panel closes when the user clicks outside it
 * or presses Escape.
 *
 * Range rule: the end date may equal the start date but can never be
 * earlier than it. The date pickers restrict the selectable dates, and
 * a value typed in by hand that breaks the rule is rejected with an
 * inline message, so an invalid range is never passed on to the caller.
 *
 * Props:
 * - label:      Chip label, e.g. "Date".
 * - heading:    Small heading shown inside the panel, e.g. "Order Date".
 * - startValue / endValue: Current "yyyy-mm-dd" string values.
 * - onStartChange / onEndChange: (value) => void handlers.
 * - onClear:    Clears both bounds at once (wired to the chip's X icon).
 * - presets:    Optional array of { label, startDate, endDate } quick ranges.
 * - onSelectPreset: (preset) => void — applies a preset's dates.
 * - isActive:   Optional override for whether the chip is highlighted (and
 *               shows the clear icon). Defaults to "a date is set". A page
 *               whose range always has a value can pass whether the range
 *               differs from its default.
 */
const DateRangeFilterChip = ({
  label,
  heading,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onClear,
  presets = [],
  onSelectPreset,
  isActive,
}) => {
  // Message shown inside the panel when a typed-in date breaks the
  // range rule. Empty when the current range is valid.
  const [rangeError, setRangeError] = useState("");

  // A preset is "selected" when its dates exactly match the current range.
  const isPresetSelected = (preset) =>
    preset.startDate === startValue && preset.endDate === endValue;
  const selectedPreset = presets.find(isPresetSelected);

  const valueLabel = selectedPreset
    ? selectedPreset.label
    : startValue || endValue
      ? `${startValue ? formatDate(startValue) : "..."} - ${
          endValue ? formatDate(endValue) : "..."
        }`
      : "select range";

  // "yyyy-mm-dd" strings sort in the same order as the dates they
  // represent, so a plain string comparison is enough to compare them.
  const handleStartChange = (value) => {
    if (value && endValue && value > endValue) {
      setRangeError("Start date cannot be after the end date.");
      return;
    }
    setRangeError("");
    onStartChange(value);
  };

  const handleEndChange = (value) => {
    if (value && startValue && value < startValue) {
      setRangeError("End date cannot be before the start date.");
      return;
    }
    setRangeError("");
    onEndChange(value);
  };

  const handleClear = () => {
    setRangeError("");
    onClear();
  };

  return (
    <FilterChip
      label={label}
      valueLabel={valueLabel}
      isActive={isActive ?? !!(startValue || endValue)}
      onClear={handleClear}
      // Desktop: a 320px dropdown under the chip, wide enough for two date
      // fields side by side. Below the sm breakpoint the panel becomes a
      // fixed card with a 16px margin on both sides, so it always fits
      // inside the screen.
      panelClassName="w-80 max-w-[90vw] p-3 max-sm:fixed max-sm:top-1/3 max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:max-w-none"
    >
      {({ close }) => (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-gray-800">
            {heading || `${label} Range`}
          </p>

          {/* Quick ranges — two columns so the list stays short. */}
          {presets.length > 0 && (
            <div className="grid grid-cols-2 gap-0.5">
              {presets.map((preset) => (
                <OptionRow
                  key={preset.label}
                  label={preset.label}
                  isSelected={isPresetSelected(preset)}
                  onClick={() => {
                    setRangeError("");
                    onSelectPreset?.(preset);
                    close();
                  }}
                />
              ))}
            </div>
          )}

          {presets.length > 0 && (
            <p className="border-t border-gray-100 pt-2 text-[11px] font-medium text-gray-500">
              Custom range
            </p>
          )}

          {/* Two equal columns. min-w-0 lets each column (and the field
              inside it) shrink below the browser's default date field
              width instead of overflowing and being clipped by the panel. */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-medium text-gray-500">
                From
              </span>
              <Input
                type="date"
                value={startValue}
                max={endValue || undefined}
                onChange={(e) => handleStartChange(e.target.value)}
                className="py-1.5 px-2 text-xs min-w-0"
              />
            </label>

            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-medium text-gray-500">To</span>
              <Input
                type="date"
                value={endValue}
                min={startValue || undefined}
                onChange={(e) => handleEndChange(e.target.value)}
                className="py-1.5 px-2 text-xs min-w-0"
              />
            </label>
          </div>

          {rangeError && (
            <p className="text-[11px] text-danger">{rangeError}</p>
          )}
        </div>
      )}
    </FilterChip>
  );
};

export default DateRangeFilterChip;
