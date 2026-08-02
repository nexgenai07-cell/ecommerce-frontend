import { AiOutlineEye } from "react-icons/ai";

import PriceDisplay from "../shared/PriceDisplay";
// Reused for consistent price formatting/strikethrough styling —
// same component the real storefront uses

const LivePreviewCard = ({
  name,
  price,
  originalPrice,
  categoryLabel,
  imageUrl,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-3 lg:sticky lg:top-6">
      <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
          <AiOutlineEye className="w-4.5 h-4.5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">Live Preview</h2>
      </div>

      <div className="rounded-lg border border-gray-100 overflow-hidden">
        {/* Image */}
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name || "Product"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-300">No image yet</span>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1">
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider truncate">
            {categoryLabel || "—"}
          </p>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {name || "Untitled Product"}
          </p>
          <PriceDisplay
            price={parseFloat(price) || 0}
            originalPrice={parseFloat(originalPrice) || 0}
            size="sm"
            showDiscount={false}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        The preview updates in real-time as you type
      </p>
    </div>
  );
};

export default LivePreviewCard;
