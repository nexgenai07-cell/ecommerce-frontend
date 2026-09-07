// ============================================================
// ADDRESS CARD
// ============================================================
// Renders one saved address as a card. Works in two modes:
//
// 1. MANAGEMENT MODE (default) — used on the Address Book page.
//    Shows Edit / Delete / Set as Default actions.
//
// 2. SELECTABLE MODE — used on the Checkout page's address picker.
//    Pass "selectable" so the whole card becomes clickable and shows
//    a radio-style selected state instead of the management actions.

import {
  HiOutlinePencil,
  HiOutlineTrash,
  HiCheckCircle,
} from "react-icons/hi2";
import cn from "../../utils/cn";

const AddressCard = ({
  address,
  selectable = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault = false,
}) => {
  const addressLines = [
    address.shipping_address,
    address.city,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border p-4 transition-all",
        selectable && "cursor-pointer",
        selected
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      {/* Header row — label + default badge (+ radio dot in selectable mode) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectable && (
            <span
              className={cn(
                "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                selected ? "border-primary" : "border-gray-300",
              )}
            >
              {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
            </span>
          )}
          <p className="text-sm font-bold text-gray-900">{address.label}</p>
        </div>

        {address.is_default && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <HiCheckCircle className="w-3.5 h-3.5" />
            Default
          </span>
        )}
      </div>

      {/* Address details */}
      <p className="text-sm text-gray-600 leading-relaxed">{addressLines}</p>
      {address.phone && (
        <p className="text-xs text-gray-400">{address.phone}</p>
      )}

      {/* Management actions — hidden entirely in selectable mode */}
      {!selectable && (
        <div className="flex items-center gap-4 pt-2 mt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
          >
            <HiOutlinePencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-danger transition-colors"
          >
            <HiOutlineTrash className="w-3.5 h-3.5" />
            Delete
          </button>
          {!address.is_default && (
            <button
              type="button"
              onClick={onSetDefault}
              disabled={isSettingDefault}
              className="ml-auto text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {isSettingDefault ? "Setting..." : "Set as Default"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressCard;
