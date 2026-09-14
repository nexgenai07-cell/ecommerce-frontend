import { AiOutlineDatabase, AiOutlineReload } from "react-icons/ai";
// AiOutlineReload — small refresh icon used as the SKU field's
// "Regenerate" button

import Input from "../ui/Input";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  sanitizeSkuValue,
  validateSku,
  SKU_FORMAT_HINT,
  SKU_MAX_LENGTH,
} from "../../utils/skuValidation";

const InventorySection = ({
  register,
  errors,
  totalStock,
  reservedStock,
  availableStock,
  onAdjustStockClick,
  onRegenerateSku, // Called when the refresh icon inside the SKU field is clicked
  isNewProduct = false,
  onSkuBlur,
  // Optional — when passed (by ProductAdd/ProductEdit), it's called
  // right after react-hook-form's own onBlur on the SKU field, and
  // triggers the "is this SKU already taken?" check (API 31.2). Left
  // undefined here does nothing extra, so this component works exactly
  // as before if a caller doesn't pass it.
  skuValue = "",
  // The SKU field's current live value, read from the parent form's
  // watch() output. Used to compute an inline error on every render —
  // independent of react-hook-form's own validation timing (which only
  // (re-)runs on blur/change once the field is "touched", and can
  // therefore miss or briefly clear an error right after it appears).
}) => {
  const total = totalStock ?? 0;
  const reserved = reservedStock ?? 0;
  const available = availableStock ?? Math.max(total - reserved, 0);

  const skuField = register("sku");
  // Captured separately (instead of spreading register("sku") inline)
  // so its own onChange/onBlur can be chained with the sanitizer and
  // the optional duplicate-SKU check below — same pattern used for the
  // Name field in BasicInfoSection.jsx.

  // A SKU can only be set once, at creation — editing an existing
  // product locks the field entirely so it can never be changed
  // afterward. isNewProduct is only ever passed as true by
  // ProductAdd.jsx, so this is false (locked) for every existing
  // product opened from ProductEdit.jsx.
  const isSkuLocked = !isNewProduct;

  // Recomputed on every render straight from the current field value —
  // shows the instant an invalid character/length/format is typed, and
  // keeps showing on every following keystroke until the value is
  // actually valid. Only checked once something has been typed, so an
  // empty field doesn't show "SKU is required" before the admin has
  // touched the form at all — react-hook-form's own errors.sku still
  // covers that case on submit.
  const liveSkuError = skuValue ? validateSku(skuValue) : null;
  const skuError = liveSkuError || errors.sku?.message;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
          <AiOutlineDatabase className="w-4.5 h-4.5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">Inventory</h2>
      </div>

      <Input
        label="SKU"
        placeholder="Auto-generated — you can edit it"
        // The always-visible format instruction while the field is
        // still editable; once locked, the hint instead explains why
        // the field can't be typed into.
        hint={
          isSkuLocked
            ? "SKU cannot be changed after a product is created."
            : SKU_FORMAT_HINT
        }
        maxLength={SKU_MAX_LENGTH}
        disabled={isSkuLocked}
        {...skuField}
        onChange={(e) => {
          // Uppercases and strips every space as the admin types, so
          // the field always shows the exact format that gets saved
          // instead of correcting it only after a failed submit.
          e.target.value = sanitizeSkuValue(e.target.value);
          skuField.onChange(e);
        }}
        onBlur={(e) => {
          skuField.onBlur(e); // Keep react-hook-form's own per-field validation
          onSkuBlur?.(e.target.value); // Then run the optional duplicate-SKU check
        }}
        error={skuError}
        rightIcon={
          // rightIcon supports interactive elements (per Input's own
          // docs comment) — a real <button>, not just a decorative icon.
          // Hidden once the SKU is locked, since there's nothing left
          // to regenerate.
          onRegenerateSku && !isSkuLocked ? (
            <button
              type="button"
              onClick={onRegenerateSku}
              className="text-gray-400 hover:text-primary transition-colors"
              aria-label="Generate a new SKU"
              title="Generate a new SKU"
            >
              <AiOutlineReload className="w-4 h-4" />
            </button>
          ) : null
        }
      />

      {isNewProduct ? (
        // Brand-new product being created — no history to protect yet,
        // so a plain starting-quantity field is fine here.
        <div className="flex flex-col gap-1.5">
          <Input
            label="Starting Quantity"
            type="number"
            min="0"
            placeholder="e.g. 50"
            required
            {...register("stock")}
            error={errors.stock?.message}
          />
          <Badge
            label={total > 0 ? "In Stock" : "Out of Stock"}
            variant={total > 0 ? "success" : "danger"}
            size="sm"
            rounded
            className="self-start"
          />
        </div>
      ) : (
        // Existing product — stock is display-only here. Any change
        // goes through the Adjust Stock modal (delta-based, atomic on
        // the backend), not through this form's Save/Publish button.
        // Reserved stock (units already committed to pending_payment
        // orders) is broken out separately from what's actually left
        // to sell, since the two now genuinely differ once orders are
        // placed but not yet paid for.
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Current Stock
          </label>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
            <span className="text-lg font-semibold text-gray-900">{total}</span>
            <Badge
              label={available > 0 ? "In Stock" : "Out of Stock"}
              variant={available > 0 ? "success" : "danger"}
              size="sm"
              rounded
            />
          </div>
          {reserved > 0 && (
            <p className="text-xs text-gray-400">
              {reserved} reserved by pending orders &middot;{" "}
              <span className="font-medium text-gray-600">
                {available} available to sell
              </span>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={onAdjustStockClick}
          >
            Adjust Stock
          </Button>
        </div>
      )}

      <Input
        label="Low Stock Threshold"
        type="number"
        min="0"
        placeholder="e.g. 5"
        hint="Admin gets alerted when stock falls to or below this number"
        {...register("low_stock_threshold")}
        error={errors.low_stock_threshold?.message}
      />
    </div>
  );
};

export default InventorySection;
