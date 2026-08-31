import { AiOutlineDollarCircle } from "react-icons/ai";

import Input from "../ui/Input";
import Badge from "../ui/Badge";
import calculateDiscount from "../../utils/calculateDiscount";

const PricingSection = ({ register, errors, watch, trigger }) => {
  const originalPrice = parseFloat(watch("original_price")) || 0;
  const salePrice = parseFloat(watch("price")) || 0;

  const discountPercent = calculateDiscount(originalPrice, salePrice);
  // Returns 0 when prices are missing/equal/invalid — calculateDiscount
  // already guards against divide-by-zero and bad input internally

  // The "original price must be greater than the sale price" rule lives
  // in the schema's cross-field superRefine (see ProductAdd/ProductEdit),
  // which only re-checks BOTH fields together when explicitly told to.
  // With mode: "onTouched", blurring one field only re-validates that
  // single field on its own — so this cross-field issue never actually
  // surfaced until the whole form was validated on Submit. Calling
  // trigger() for both field names together, on either field's blur,
  // forces that pair to be re-checked as a pair right away — this is
  // register()'s own onBlur (needed for its normal per-field validation)
  // PLUS this extra pairwise re-check, not a replacement for it.
  const revalidatePricePair = () => trigger(["price", "original_price"]);

  const originalPriceField = register("original_price");
  const salePriceField = register("price");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-5">
      {/* Section header row: icon badge + title, same pattern used on
          every card in this form for a consistent visual language */}
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
            label="Sale Price"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 1999"
            required
            leftIcon={<span className="text-gray-400">Rs.</span>}
            {...salePriceField}
            onBlur={(e) => {
              salePriceField.onBlur(e); // Keep react-hook-form's own per-field validation
              revalidatePricePair(); // Also re-check the pair, so the cross-field error shows immediately
            }}
            error={errors.price?.message}
          />

          {/* Discount badge — only rendered when there's an actual real
              discount (sale price genuinely lower than original price) */}
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
    </div>
  );
};

export default PricingSection;
