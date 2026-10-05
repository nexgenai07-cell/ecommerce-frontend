import { Controller } from "react-hook-form";

// Icons: section header, SKU regenerate button, and the lock / unlock controls
import {
  AiOutlineDatabase,
  AiOutlineReload,
  AiOutlineUnlock,
  AiOutlineUndo,
} from "react-icons/ai";

// Shared UI building blocks
import Input from "../ui/Input";
import FormattedNumberInput from "../ui/FormattedNumberInput";
import { formatNumberWithCommas } from "../../utils/numberInput";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
// SKU helpers shared by every SKU field in the admin panel
import {
  sanitizeSkuValue,
  validateSku,
  SKU_FORMAT_HINT,
  SKU_MAX_LENGTH,
} from "../../utils/skuValidation";

// Props:
//   register           — react-hook-form register function of the parent form.
//   control            — react-hook-form control object of the parent form,
//                        used by the fields that show thousands separators.
//   errors             — react-hook-form errors object of the parent form.
//   totalStock / reservedStock / availableStock — stock figures shown for an
//                        existing product.
//   onAdjustStockClick — opens the Adjust Stock modal (existing product).
//   onRegenerateSku    — called when the refresh icon inside the SKU field is clicked.
//   isNewProduct       — true on the Add Product page, false when editing.
//   onSkuBlur          — optional; called right after react-hook-form's own
//                        onBlur on the SKU field, and triggers the "is this SKU
//                        already taken?" check. Callers that do not pass it get
//                        no extra behaviour.
//   skuValue           — the SKU field's current live value, read from the
//                        parent form's watch() output. It is used to compute an
//                        inline error on every render, independent of
//                        react-hook-form's own validation timing (which only
//                        re-runs on blur/change once the field is "touched").
//   isSkuUnlocked      — true after the admin deliberately unlocked the SKU of
//                        an existing product to correct it.
//   onUnlockSku        — called when the unlock icon is clicked. When it is not
//                        passed, the SKU of an existing product stays locked
//                        with no way to unlock it.
//   onCancelSkuChange  — called when the admin abandons a SKU correction; the
//                        parent restores the original SKU and locks it again.
const InventorySection = ({
  register,
  control,
  errors,
  totalStock,
  reservedStock,
  availableStock,
  onAdjustStockClick,
  onRegenerateSku,
  isNewProduct = false,
  onSkuBlur,
  skuValue = "",
  isSkuUnlocked = false,
  onUnlockSku,
  onCancelSkuChange,
}) => {
  // Total units owned, treating a missing value as zero
  const total = totalStock ?? 0;
  // Units already committed to unpaid orders
  const reserved = reservedStock ?? 0;
  // Units that can still be sold; falls back to total minus reserved
  const available = availableStock ?? Math.max(total - reserved, 0);

  // Captured separately (instead of spreading register("sku") inline)
  // so its own onChange/onBlur can be chained with the sanitizer and
  // the optional duplicate-SKU check below — same pattern used for the
  // Name field in BasicInfoSection.jsx.
  const skuField = register("sku");

  // The SKU of an existing product is read-only by default, because it may
  // be printed on labels, barcodes and spreadsheets. It becomes editable
  // only after the admin deliberately unlocks it (isSkuUnlocked). The SKU
  // of a brand-new product is always editable.
  const isSkuLocked = !isNewProduct && !isSkuUnlocked;

  // Recomputed on every render straight from the current field value —
  // shows the instant an invalid character/length/format is typed, and
  // keeps showing on every following keystroke until the value is
  // actually valid. Only checked once something has been typed, so an
  // empty field doesn't show "SKU is required" before the admin has
  // touched the form at all — react-hook-form's own errors.sku still
  // covers that case on submit.
  const liveSkuError = skuValue ? validateSku(skuValue) : null;
  // The error that is displayed: the live one first, then the form's own
  const skuError = liveSkuError || errors.sku?.message;

  // The helper text under the SKU field changes with the field's state
  let skuHint = SKU_FORMAT_HINT;
  if (isSkuLocked) {
    // Explains why the field cannot be typed into and how to correct it
    skuHint =
      "The SKU is locked. Use the unlock icon only to correct a wrong SKU.";
  } else if (!isNewProduct) {
    // Warns that a corrected SKU replaces the one used elsewhere
    skuHint = `${SKU_FORMAT_HINT} Saving replaces the product's current SKU.`;
  }

  // The icon buttons shown inside the SKU field on the right-hand side
  let skuRightIcon;
  if (isNewProduct) {
    // New product: only the regenerate button is offered
    skuRightIcon = onRegenerateSku ? (
      <button
        type="button"
        onClick={onRegenerateSku}
        className="text-gray-400 hover:text-primary transition-colors"
        aria-label="Generate a new SKU"
        title="Generate a new SKU"
      >
        <AiOutlineReload className="w-4 h-4" />
      </button>
    ) : null;
  } else if (isSkuLocked) {
    // Existing product, locked: offer the unlock action when the parent supports it
    skuRightIcon = onUnlockSku ? (
      <button
        type="button"
        onClick={onUnlockSku}
        className="text-gray-400 hover:text-primary transition-colors"
        aria-label="Unlock SKU to change it"
        title="Unlock SKU to change it"
      >
        <AiOutlineUnlock className="w-4 h-4" />
      </button>
    ) : null;
  } else {
    // Existing product, unlocked: offer regenerate and a way back to the original SKU
    skuRightIcon = (
      <span className="flex items-center gap-1.5">
        {/* Generates a fresh SKU from the product name and category */}
        {onRegenerateSku && (
          <button
            type="button"
            onClick={onRegenerateSku}
            className="text-gray-400 hover:text-primary transition-colors"
            aria-label="Generate a new SKU"
            title="Generate a new SKU"
          >
            <AiOutlineReload className="w-4 h-4" />
          </button>
        )}
        {/* Restores the original SKU and locks the field again */}
        {onCancelSkuChange && (
          <button
            type="button"
            onClick={onCancelSkuChange}
            className="text-gray-400 hover:text-primary transition-colors"
            aria-label="Restore the original SKU and lock it"
            title="Restore the original SKU and lock it"
          >
            <AiOutlineUndo className="w-4 h-4" />
          </button>
        )}
      </span>
    );
  }

  return (
    // Card that wraps the whole inventory section
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-4">
      {/* Section header with icon and title */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
          <AiOutlineDatabase className="w-4.5 h-4.5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">Inventory</h2>
      </div>

      {/* SKU field */}
      <Input
        label="SKU"
        placeholder="Auto-generated — you can edit it"
        // The always-visible instruction: the format rules while the field
        // is editable, or the reason it is locked
        hint={skuHint}
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
        // rightIcon supports interactive elements, so these are real
        // <button>s and not just decorative icons
        rightIcon={skuRightIcon}
      />

      {isNewProduct ? (
        // Brand-new product being created — no history to protect yet,
        // so a plain starting-quantity field is fine here.
        <div className="flex flex-col gap-1.5">
          {/* Starting stock entered by the admin */}
          <Controller
            control={control}
            name="stock"
            render={({ field }) => (
              <FormattedNumberInput
                label="Starting Quantity"
                placeholder="e.g. 1,000"
                required
                allowDecimal={false}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.stock?.message}
              />
            )}
          />
          {/* Availability badge based on the starting quantity */}
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
        // to sell, since the two genuinely differ once orders are
        // placed but not yet paid for.
        <div className="flex flex-col gap-2">
          {/* Label for the read-only stock figure */}
          <label className="text-sm font-medium text-gray-700">
            Current Stock
          </label>
          {/* Read-only total stock with an availability badge */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
            <span className="text-lg font-semibold text-gray-900">
              {formatNumberWithCommas(total)}
            </span>
            <Badge
              label={available > 0 ? "In Stock" : "Out of Stock"}
              variant={available > 0 ? "success" : "danger"}
              size="sm"
              rounded
            />
          </div>
          {/* Breakdown of reserved and sellable units, when any are reserved */}
          {reserved > 0 && (
            <p className="text-xs text-gray-400">
              {formatNumberWithCommas(reserved)} reserved by pending orders
              &middot;{" "}
              <span className="font-medium text-gray-600">
                {formatNumberWithCommas(available)} available to sell
              </span>
            </p>
          )}
          {/* Opens the Adjust Stock modal */}
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

      {/* Threshold below which the admin is alerted about low stock */}
      <Controller
        control={control}
        name="low_stock_threshold"
        render={({ field }) => (
          <FormattedNumberInput
            label="Low Stock Threshold"
            placeholder="e.g. 5"
            hint="Admin gets alerted when stock falls to or below this number"
            allowDecimal={false}
            ref={field.ref}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.low_stock_threshold?.message}
          />
        )}
      />
    </div>
  );
};

export default InventorySection;
