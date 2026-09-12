import FilterChip from "./FilterChip";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import formatDate from "../../../utils/formatDate";

/**
 * DateRangeFilterChip
 *
 * A FilterChip preconfigured for a "from - to" date range (Created Date
 * on the categories list, order date on the orders list, log date on
 * the audit log, and so on). Reused wherever an admin page needs to
 * filter a list by a date range, so every date-range dropdown looks and
 * behaves the same way.
 *
 * Props:
 * - label:      Chip label, e.g. "Date".
 * - heading:    Small heading shown inside the panel, e.g. "Created Date".
 * - startValue / endValue: Current "yyyy-mm-dd" string values.
 * - onStartChange / onEndChange: (value) => void handlers.
 * - onClear:    Clears both bounds at once (wired to the chip's X icon).
 */
const DateRangeFilterChip = ({
  label,
  heading,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onClear,
}) => {
  const valueLabel =
    startValue || endValue
      ? `${startValue ? formatDate(startValue) : "..."} - ${
          endValue ? formatDate(endValue) : "..."
        }`
      : "select range";

  return (
    <FilterChip
      label={label}
      valueLabel={valueLabel}
      isActive={!!(startValue || endValue)}
      onClear={onClear}
      panelClassName="w-64 max-w-[90vw] p-3"
    >
      {({ close }) => (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold text-gray-800 mb-0.5">
            {heading || `${label} Range`}
          </p>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startValue}
              onChange={(e) => onStartChange(e.target.value)}
              className="py-1.5 px-2 text-xs"
            />
            <span className="text-gray-300 shrink-0">-</span>
            <Input
              type="date"
              value={endValue}
              onChange={(e) => onEndChange(e.target.value)}
              className="py-1.5 px-2 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            fullWidth
            onClick={close}
            className="bg-gradient-to-r from-primary to-primary-dark font-semibold px-2 py-1 text-[11px]"
          >
            Apply
          </Button>
        </div>
      )}
    </FilterChip>
  );
};

export default DateRangeFilterChip;
