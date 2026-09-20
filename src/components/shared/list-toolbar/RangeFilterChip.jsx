import FilterChip from "./FilterChip";
import Input from "../../ui/Input";

// Key names that must always pass through untouched, regardless of
// what's typed — none of these produce a character on their own, so
// blocking them would break normal editing (deleting, moving the
// cursor, selecting a range, tabbing to the next field).
const ALWAYS_ALLOWED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

// Blocks any keystroke that would type a non-digit character —
// letters, the minus sign, "e"/"+" (both usually still typeable in a
// number input), decimal points, commas, everything. Digits (0-9)
// pass through untouched; a small set of navigation/editing keys
// (see ALWAYS_ALLOWED_KEYS above) always pass through too. Ctrl/Cmd
// combinations (copy, paste, select-all, undo) are also left alone —
// only a bare, single printable character is judged against the
// digit check.
const blockNonDigitKeydown = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (ALWAYS_ALLOWED_KEYS.has(event.key)) return;
  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault();
  }
};

// Strips anything that isn't a digit — the safety net for input paths
// a keydown handler can't catch on its own, like pasting text,
// dragging text in, or autofill.
const stripToDigits = (value) => (value ?? "").replace(/[^0-9]/g, "");

// Adds a thousands-separator comma for display only — e.g. "900000"
// is shown as "900,000". The value handed back to the parent (and
// ultimately sent to the API as min_price/max_price) always stays the
// plain, comma-free digit string; this formatting never leaves this
// component.
const formatWithThousands = (digits) =>
  digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";

/**
 * RangeFilterChip
 *
 * A FilterChip preconfigured for a numeric "min - max" range (Price on
 * the products list, Order Total on the orders list, Amount on the
 * discounts list, and so on). Any admin page that needs a number-range
 * filter reuses this instead of re-building a min/max mini-form.
 *
 * Only whole, non-negative numbers can ever be entered — letters, the
 * minus sign, decimal points, and every other special character are
 * blocked at the keystroke itself (not accepted and then corrected),
 * with a paste/autofill-safe cleanup on top of that. Large numbers are
 * shown with thousands-separator commas as the admin types, purely for
 * readability — minValue/maxValue themselves, and whatever
 * onMinChange/onMaxChange receive, are always the plain digit string.
 *
 * Every change is applied to the list immediately, so there is no Apply
 * button. The panel closes when the user clicks outside it or presses
 * Escape.
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
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold text-gray-800 mb-0.5">
          {heading || `${label} Range`}
        </p>
        <div className="flex items-center gap-1.5">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Min"
            value={formatWithThousands(minValue)}
            onKeyDown={blockNonDigitKeydown}
            onChange={(e) => onMinChange(stripToDigits(e.target.value))}
            className="py-1.5 px-2 text-xs"
          />
          <span className="text-gray-300 shrink-0">-</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Max"
            value={formatWithThousands(maxValue)}
            onKeyDown={blockNonDigitKeydown}
            onChange={(e) => onMaxChange(stripToDigits(e.target.value))}
            className="py-1.5 px-2 text-xs"
          />
        </div>
      </div>
    </FilterChip>
  );
};

export default RangeFilterChip;
