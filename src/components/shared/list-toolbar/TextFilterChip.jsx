import FilterChip from "./FilterChip";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

/**
 * TextFilterChip
 *
 * A FilterChip preconfigured for a single free-text field that is
 * distinct from the page's main search box — for example the "Phone
 * Number" filter on the orders list, which is matched more strictly
 * server-side than the general search field. Reused by any admin list
 * page that needs one extra, dedicated text filter.
 *
 * Props:
 * - label:        Chip label, e.g. "Phone".
 * - heading:      Small heading shown inside the panel.
 * - placeholder:  Placeholder for the text input.
 * - value:        Current text value.
 * - onChange:     (value) => void handler for the input.
 * - onClear:      Clears the field (wired to the chip's X icon).
 */
const TextFilterChip = ({
  label,
  heading,
  placeholder,
  value,
  onChange,
  onClear,
}) => (
  <FilterChip
    label={label}
    valueLabel={value || `select ${label.toLowerCase()}`}
    isActive={!!value}
    onClear={onClear}
    panelClassName="w-64 max-w-[90vw] p-3"
  >
    {({ close }) => (
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold text-gray-800 mb-0.5">
          {heading || label}
        </p>
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="py-1.5 px-2 text-xs"
        />
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

export default TextFilterChip;
