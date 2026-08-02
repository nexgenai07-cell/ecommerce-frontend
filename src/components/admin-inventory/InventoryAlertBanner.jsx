// ============================================================
// InventoryAlertBanner — INVENTORY ALERTS SUB-COMPONENT
// ============================================================
// The "X products need attention — Y out of stock, Z low stock"
// banner — entirely real, just a plain-language summary of the exact
// same real counts InventoryStatsCards computes.

import { AiOutlineSound } from "react-icons/ai";

const InventoryAlertBanner = ({
  outOfStockCount,
  lowStockCount,
  onReviewAll,
}) => {
  const totalNeedingAttention = outOfStockCount + lowStockCount;

  if (totalNeedingAttention === 0) return null;
  // No banner at all when nothing needs attention — an empty "0
  // products need attention" banner would just be visual noise

  return (
    <div className="bg-warning-light border border-warning/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-warning">
          <AiOutlineSound className="w-4 h-4" />
        </span>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">
            {totalNeedingAttention} products
          </span>{" "}
          need attention —{" "}
          <span className="font-semibold text-danger">
            {outOfStockCount} out of stock
          </span>
          {", "}
          <span className="font-semibold text-warning">
            {lowStockCount} low stock
          </span>
        </p>
      </div>
      <button
        onClick={onReviewAll}
        className="text-sm font-medium text-warning hover:underline shrink-0"
      >
        Review All
      </button>
    </div>
  );
};

export default InventoryAlertBanner;
