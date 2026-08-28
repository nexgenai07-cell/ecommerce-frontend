import { AiOutlineDatabase, AiOutlineReload } from "react-icons/ai";
// AiOutlineReload — small refresh icon used as the SKU field's
// "Regenerate" button

import Input from "../ui/Input";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const InventorySection = ({
  register,
  errors,
  currentStock,
  onAdjustStockClick,
  onRegenerateSku, // Called when the refresh icon inside the SKU field is clicked
  isNewProduct = false,
}) => {
  const stock = currentStock ?? 0;

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
        hint="Auto-filled as you type the product name — edit freely, or click the refresh icon for a new one"
        {...register("sku")}
        error={errors.sku?.message}
        rightIcon={
          // rightIcon supports interactive elements (per Input's own
          // docs comment) — a real <button>, not just a decorative icon
          onRegenerateSku ? (
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
            label={stock > 0 ? "In Stock" : "Out of Stock"}
            variant={stock > 0 ? "success" : "danger"}
            size="sm"
            rounded
            className="self-start"
          />
        </div>
      ) : (
        // Existing product — stock is display-only here. Any change
        // goes through the Adjust Stock modal (delta-based, atomic on
        // the backend), not through this form's Save/Publish button.
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Current Stock
          </label>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
            <span className="text-lg font-semibold text-gray-900">{stock}</span>
            <Badge
              label={stock > 0 ? "In Stock" : "Out of Stock"}
              variant={stock > 0 ? "success" : "danger"}
              size="sm"
              rounded
            />
          </div>
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
