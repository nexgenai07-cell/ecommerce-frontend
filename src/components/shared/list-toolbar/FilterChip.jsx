import { AiOutlineClose, AiOutlineDown, AiOutlinePlus } from "react-icons/ai";
import Popover from "../../ui/Popover";
import cn from "../../../utils/cn";

/**
 * FilterChip
 *
 * A single rounded filter pill in the shape "+ Label" (nothing picked
 * yet) or "X | Label | Value v" (a value is active). The whole pill
 * opens a dropdown panel built from Popover; the leading X/+ icon has
 * its own click handler so clearing a filter never also toggles the
 * dropdown open.
 *
 * This is the shared building block behind every filter dropdown in the
 * admin panel (Category, Status, Price, Sort, Date Range, and so on).
 * Each admin list page composes its own set of FilterChip instances with
 * whatever option list makes sense for that page, while the pill's look
 * and interaction stay identical everywhere.
 *
 * Props:
 * - label:          Fixed name of the filter, e.g. "Category".
 * - valueLabel:      Text shown after the divider — either the active
 *                    value or a placeholder such as "select category".
 * - isActive:        Whether a real value is currently selected.
 * - onClear:         Called when the X icon is clicked (isActive only).
 * - panelClassName:  Extra classes for the dropdown panel (width, max
 *                    height, padding, etc.) — every page can size its
 *                    own panel independently.
 * - children:        Dropdown panel content. Supports the same
 *                    function-as-children pattern as Popover, receiving
 *                    { close } so an option row can close the panel
 *                    right after it is picked.
 */
const FilterChip = ({
  label,
  valueLabel,
  isActive,
  onClear,
  panelClassName,
  children,
}) => (
  <Popover
    align="left"
    panelClassName={cn("py-1 z-dropdown", panelClassName || "w-52")}
    trigger={
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 shrink-0 cursor-pointer transition-colors select-none",
          isActive
            ? "border-primary/40 bg-primary-50"
            : "border-gray-300 bg-white hover:bg-gray-50",
        )}
      >
        {isActive ? (
          // Independent click target: stopPropagation so clicking the X
          // clears the filter WITHOUT also toggling the dropdown open,
          // since the whole pill is itself the popover trigger.
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label={`Clear ${label} filter`}
            className="flex items-center justify-center text-gray-400 hover:text-danger transition-colors shrink-0"
          >
            <AiOutlineClose className="w-3 h-3" />
          </button>
        ) : (
          <AiOutlinePlus className="w-3 h-3 text-gray-400 shrink-0" />
        )}

        <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
          {label}
        </span>

        <span className="text-gray-300">|</span>
        <span className="text-xs font-semibold text-primary truncate max-w-[100px] sm:max-w-[140px]">
          {valueLabel}
        </span>

        <AiOutlineDown className="w-2.5 h-2.5 text-gray-400 shrink-0" />
      </div>
    }
  >
    {children}
  </Popover>
);

export default FilterChip;
