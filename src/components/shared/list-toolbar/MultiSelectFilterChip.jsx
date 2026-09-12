import FilterChip from "./FilterChip";

/**
 * MultiSelectFilterChip
 *
 * A FilterChip whose panel shows a checkbox per option instead of a
 * single-select list, for the rare filter where more than one value
 * can be active at once (e.g. Inventory Alerts' Status filter, where
 * "Out of Stock" and "Low Stock" can both be checked together).
 *
 * Unlike a single-select FilterChip, picking an option here does NOT
 * close the panel — the admin can keep checking more boxes before
 * dismissing it.
 *
 * Props:
 * - label:          Chip label, e.g. "Status".
 * - options:        Array of { value, label }.
 * - selectedValues: Array of currently-checked option values.
 * - onToggle:       (value) => void — flips one option on/off.
 * - onClear:        Clears every checked option (wired to the chip's X icon).
 * - panelClassName: Extra classes for the dropdown panel.
 */
const MultiSelectFilterChip = ({
  label,
  options,
  selectedValues,
  onToggle,
  onClear,
  panelClassName,
}) => {
  const valueLabel =
    selectedValues.length === 0
      ? `select ${label.toLowerCase()}`
      : selectedValues.length === 1
        ? options.find((opt) => opt.value === selectedValues[0])?.label ||
          selectedValues[0]
        : `${selectedValues.length} selected`;

  return (
    <FilterChip
      label={label}
      valueLabel={valueLabel}
      isActive={selectedValues.length > 0}
      onClear={onClear}
      panelClassName={
        panelClassName || "w-52 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
      }
    >
      {() => (
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => {
            const checked = selectedValues.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-primary-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary/40"
                />
                <span
                  className={
                    checked
                      ? "text-primary font-semibold"
                      : "text-gray-600 font-medium"
                  }
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </FilterChip>
  );
};

export default MultiSelectFilterChip;
