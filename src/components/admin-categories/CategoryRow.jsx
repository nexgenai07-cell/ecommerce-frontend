import { useState } from "react";
import {
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePicture,
} from "react-icons/ai";
// AiOutlinePicture — fallback placeholder icon when a category has no
// image (or its image URL fails to load)
// NOTE: AiOutlineUndo (the restore icon) is no longer imported here —
// there is nothing left to restore, see the explanation below.

import formatDate from "../../utils/formatDate";
import Badge from "../ui/Badge";

const CategoryRow = ({ category, onEdit, onDelete }) => {
  // Tracks whether the real image URL failed to actually load in the
  // browser (broken link, deleted file, CORS issue, etc.) — separate
  // from "no image was ever set", so a bad URL also falls back cleanly
  // to the icon placeholder instead of showing a broken-image glyph.
  const [imageFailed, setImageFailed] = useState(false);

  // A category has a usable image only when the API actually gave us a
  // non-empty `image` string AND that image hasn't already failed to load
  const hasImage = !!category.image && !imageFailed;

  // Real product count straight from the category object returned by
  // API 21 — falls back to 0 only if the field is ever missing/null,
  // so the badge never shows "undefined" or "NaN".
  const productCount = Number(category.product_count) || 0;

  // NOTE ON WHAT WAS REMOVED FROM THIS ROW:
  // This row used to compute `isInactive` off category.is_active and
  // render a "Status" badge (Active/Inactive) plus a Restore button in
  // place of Delete for inactive rows. That entire branch is gone now.
  // Deletion moved to a separate, internal is_delete flag that the
  // backend never returns in this endpoint's response — and any
  // category whose is_delete is true is filtered out of the list
  // before it ever reaches this component. In other words: every
  // single category CategoryRow ever renders is, by definition, a
  // live/active one — there is no "inactive" state left for this row
  // to represent, so the badge and the restore branch were both dead
  // weight and have been deleted along with the underlying field.

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      {/* Image column — the new first column, shown before the name */}
      <td className="px-4 py-3">
        {hasImage ? (
          <img
            src={category.image}
            alt={category.name}
            onError={() => setImageFailed(true)}
            // Flips hasImage to false the moment this URL actually fails
            // to render, swapping in the icon placeholder on next render
            className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
          />
        ) : (
          // Fallback placeholder — a soft brand-colored box with a
          // generic picture icon, instead of a browser broken-image glyph
          <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0 ring-1 ring-black/5">
            <AiOutlinePicture className="w-4.5 h-4.5" />
          </div>
        )}
      </td>

      {/* Category name */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-900">
          {category.name}
        </span>
      </td>

      {/* Product count — real field, no per-row network call anymore */}
      <td className="px-4 py-3">
        <Badge
          label={`${productCount} item${productCount === 1 ? "" : "s"}`}
          variant="gray"
          size="sm"
          rounded
        />
      </td>

      {/* Created date */}
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDate(category.created_at)}
      </td>

      {/* Row actions — Edit and Delete are the only two actions now.
          Delete is a single, final action from the admin's point of
          view: the record survives in the database (so product
          references and audit history stay intact), but there is no
          UI path back to it anymore. */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
            aria-label={`Edit ${category.name}`}
          >
            <AiOutlineEdit className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(category)}
            className="p-1.5 text-gray-400 hover:text-danger rounded-lg hover:bg-danger-light transition-colors"
            aria-label={`Delete ${category.name}`}
          >
            <AiOutlineDelete className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default CategoryRow;
