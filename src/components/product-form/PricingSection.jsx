import { AiOutlineDollarCircle } from "react-icons/ai";

import Input from "../ui/Input";
import Badge from "../ui/Badge";
import calculateDiscount from "../../utils/calculateDiscount";
import calculateProfitMetrics from "../../utils/calculateProfitMetrics";
import formatPriceOrDash from "../../utils/formatPriceOrDash";
import formatPercent from "../../utils/formatPercent";

// One labelled figure of the profit preview strip.
const ProfitFigure = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-[11px] font-medium text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-900 truncate">
      {value}
    </span>
  </div>
);

const PricingSection = ({ register, errors, watch, trigger }) => {
  const originalPrice = parseFloat(watch("original_price")) || 0;
  const salePrice = parseFloat(watch("price")) || 0;

  const discountPercent = calculateDiscount(originalPrice, salePrice);
  // Returns 0 when prices are missing, equal or invalid; calculateDiscount
  // already guards against divide-by-zero and bad input internally.

  // Live profit preview. The server calculates the stored figures; this
  // preview only lets the admin see the effect of the prices while typing.
  const { profit, markupPercent, marginPercent } = calculateProfitMetrics(
    watch("price"),
    watch("purchase_price"),
  );
  const hasProfitPreview = profit !== null;

  // The "original price must be greater than the sale price" rule lives in
  // the schema's cross-field validation (see ProductAdd / ProductEdit),
  // which only re-checks both fields together when explicitly told to.
  // With mode "onTouched", blurring one field only re-validates that
  // single field, so the cross-field issue would not surface until the
  // whole form is submitted. Calling trigger() for both field names on
  // either field's blur re-checks the pair right away. This runs in
  // addition to register()'s own onBlur, not instead of it.
  const revalidatePricePair = () => trigger(["price", "original_price"]);

  const originalPriceField = register("original_price");
  const salePriceField = register("price");
  const purchasePriceField = register("purchase_price");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-5">
      {/* Section header row: icon badge and title, the same pattern used on
          every card in this form */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
          <AiOutlineDollarCircle className="w-4.5 h-4.5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">Pricing</h2>
      </div>

      {/* Two fields side by side on larger screens, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <Input
          label="Original Price"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 2500"
          hint="Optional — only fill this in if you want to show a discount"
          leftIcon={<span className="text-gray-400">Rs.</span>}
          {...originalPriceField}
          onBlur={(e) => {
            originalPriceField.onBlur(e); // Keep react-hook-form's own per-field validation
            revalidatePricePair(); // Also re-check the pair, so the cross-field error shows immediately
          }}
          error={errors.original_price?.message}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 1999"
            required
            hint="The price customers will pay for this product"
            leftIcon={<span className="text-gray-400">Rs.</span>}
            {...salePriceField}
            onBlur={(e) => {
              salePriceField.onBlur(e); // Keep react-hook-form's own per-field validation
              revalidatePricePair(); // Also re-check the pair, so the cross-field error shows immediately
            }}
            error={errors.price?.message}
          />

          {/* Discount badge, only rendered when there is a real discount
              (sale price genuinely lower than original price) */}
          {discountPercent > 0 && (
            <Badge
              label={`${discountPercent}% OFF`}
              variant="success"
              size="sm"
              rounded
              className="self-start"
            />
          )}
        </div>
      </div>

      {/* Purchase Price: the store's cost price for this product. It is
          required, because profit, markup and margin are calculated from
          it everywhere in the admin panel. Zero is accepted. It is never
          shown to customers. */}
      <Input
        label="Purchase Price"
        type="number"
        step="0.01"
        min="0"
        placeholder="e.g. 1200"
        required
        hint="Your cost price for this product. Used to calculate profit and never shown to customers."
        leftIcon={<span className="text-gray-400">Rs.</span>}
        {...purchasePriceField}
        error={errors.purchase_price?.message}
      />

      {/* Live profit preview, shown once both prices are valid numbers */}
      {hasProfitPreview && (
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <ProfitFigure
            label="Profit per unit"
            value={formatPriceOrDash(profit)}
          />
          <ProfitFigure
            label="Markup (on cost)"
            value={formatPercent(markupPercent)}
          />
          <ProfitFigure
            label="Margin (on price)"
            value={formatPercent(marginPercent)}
          />
        </div>
      )}
    </div>
  );
};

export default PricingSection;
