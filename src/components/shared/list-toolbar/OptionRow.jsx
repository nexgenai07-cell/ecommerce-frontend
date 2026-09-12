import { AiOutlineCheck } from "react-icons/ai";
import cn from "../../../utils/cn";

/**
 * OptionRow
 *
 * A single selectable line inside a FilterChip dropdown panel. The label
 * sits on the left and a small checkmark appears on the right only when
 * this row represents the currently active selection.
 *
 * This is the one and only option-row implementation used across every
 * admin list page (products, categories, orders, customers, and so on),
 * so every dropdown filter in the admin panel renders and behaves the
 * same way instead of each page inventing its own version.
 *
 * Props:
 * - label:      Text shown for this option.
 * - isSelected: Whether this option is the current value of the filter.
 * - onClick:    Called when the row is clicked.
 */
const OptionRow = ({ label, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors",
      "hover:bg-primary-50 hover:text-primary",
      isSelected
        ? "text-primary font-semibold bg-primary-50"
        : "text-gray-600 font-medium",
    )}
  >
    <span className="truncate">{label}</span>
    {isSelected && (
      <AiOutlineCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
    )}
  </button>
);

export default OptionRow;
