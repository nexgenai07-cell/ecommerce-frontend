import FilterChip from "./FilterChip";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

/**
 * RangeFilterChip
 *
 * A FilterChip preconfigured for a numeric "min - max" range (Price on
 * the products list, Order Total on the orders list, Amount on the
 * discounts list, and so on). Any admin page that needs a number-range
 * filter reuses this instead of re-building a min/max mini-form.
 *
 * Props:
 * - label:        Chip label, e.g. "Price".
 * - heading:      Small heading shown inside the panel, e.g. "Price Range".
 * - minValue / maxValue: Current string values of the two inputs.
 * - onMinChange / onMaxChange: (value) => void handlers for each input.
 * - onClear:      Clears both bounds at once (wired to the chip's X icon).
 */
const RangeFilterChip = ({
  label,
  heading,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onClear,
}) => {
  const valueLabel =
    minValue || maxValue
      ? `${minValue || "0"} - ${maxValue || "max"}`
      : `select range`;

  return (
    <FilterChip
      label={label}
      valueLabel={valueLabel}
      isActive={!!(minValue || maxValue)}
      onClear={onClear}
      panelClassName="w-60 max-w-[90vw] p-3"
    >
      {({ close }) => (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold text-gray-800 mb-0.5">
            {heading || `${label} Range`}
          </p>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min="0"
              placeholder="Min"
              value={minValue}
              onChange={(e) => onMinChange(e.target.value)}
              className="py-1.5 px-2 text-xs"
            />
            <span className="text-gray-300 shrink-0">-</span>
            <Input
              type="number"
              min="0"
              placeholder="Max"
              value={maxValue}
              onChange={(e) => onMaxChange(e.target.value)}
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

export default RangeFilterChip;
