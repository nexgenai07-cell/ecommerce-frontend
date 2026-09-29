// ============================================================
// calculateProfitMetrics - UTILITY FUNCTION
// ============================================================
// Calculates the per-unit profit figures of a product from its selling
// price and its purchase (cost) price. It is used for the live preview
// on the product form, so the admin sees the effect of the prices while
// typing. The backend calculates the same numbers for every stored
// product; this helper never replaces those values.
//
// Definitions:
//   profit         = price - purchase price (the markup per unit)
//   markup percent = profit / purchase price * 100 (profit against cost)
//   margin percent = profit / price * 100 (profit against selling price)
//
// Percentages are rounded to two decimal places. A percentage is null
// when its base is zero, mirroring the backend's behavior. When either
// price is missing or not a valid number, every value is null.

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

const calculateProfitMetrics = (price, purchasePrice) => {
  const sellingPrice = parseFloat(price);
  const costPrice = parseFloat(purchasePrice);

  if (Number.isNaN(sellingPrice) || Number.isNaN(costPrice)) {
    return { profit: null, markupPercent: null, marginPercent: null };
  }

  const profit = roundToTwoDecimals(sellingPrice - costPrice);

  return {
    profit,
    markupPercent:
      costPrice === 0
        ? null
        : roundToTwoDecimals(((sellingPrice - costPrice) / costPrice) * 100),
    marginPercent:
      sellingPrice === 0
        ? null
        : roundToTwoDecimals(((sellingPrice - costPrice) / sellingPrice) * 100),
  };
};

export default calculateProfitMetrics;
