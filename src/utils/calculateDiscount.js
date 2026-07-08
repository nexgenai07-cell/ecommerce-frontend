// ============================================================
// calculateDiscount - UTILITY FUNCTION
// ============================================================
// Calculates what percentage discount is being offered, based on
// the original price vs the sale price. Used to display badges
// like "10% OFF" on product cards, so customers can quickly see
// how much they're saving on a discounted product.

const calculateDiscount = (originalPrice, salePrice) => {
  // --------------------------------------------------
  // GUARD CLAUSE (Safety Check)
  // --------------------------------------------------
  // Before doing any math, make sure both prices are valid:
  // - !originalPrice -> true if originalPrice is undefined, null, 0, or NaN
  // - !salePrice -> true if salePrice is undefined, null, 0, or NaN
  // - originalPrice === 0 -> extra explicit check, since dividing by
  //   zero in the formula below would produce Infinity or NaN, which
  //   would break the UI (e.g. showing "Infinity% OFF").
  // If ANY of these conditions are true, simply return 0 (no discount)
  // instead of letting the function continue with bad data.
  if (!originalPrice || !salePrice || originalPrice === 0) return 0;

  // --------------------------------------------------
  // DISCOUNT PERCENTAGE FORMULA
  // --------------------------------------------------
  // Standard discount percentage calculation:
  // 1. (originalPrice - salePrice) -> how much money was saved
  // 2. Divide that by originalPrice -> what FRACTION of the original
  //    price was saved (e.g. 0.20 means 20% was saved)
  // 3. Multiply by 100 -> convert that fraction into a percentage
  //
  // Example: originalPrice = 1000, salePrice = 800
  // (1000 - 800) / 1000 * 100 = 200 / 1000 * 100 = 0.2 * 100 = 20
  const discount = ((originalPrice - salePrice) / originalPrice) * 100;

  // --------------------------------------------------
  // ROUNDING THE RESULT
  // --------------------------------------------------
  // Math.round() removes any decimal places and rounds to the
  // nearest whole number. This avoids showing ugly values like
  // "14.285714285714286% OFF" — instead it cleanly shows "14% OFF".
  return Math.round(discount);
};

// Exporting this function so it can be imported and used
// anywhere a discount badge needs to be calculated, e.g.:
//
// calculateDiscount(1000, 800)  -> 20   (meaning "20% OFF")
// calculateDiscount(500, 500)   -> 0    (no discount, same price)
// calculateDiscount(null, 800)  -> 0    (invalid input, safely handled)
export default calculateDiscount;
