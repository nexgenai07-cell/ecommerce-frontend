// ============================================================
// formatPriceOrDash - UTILITY FUNCTION
// ============================================================
// Formats an optional money value for display. Unlike formatPrice,
// which turns every missing value into "Rs. 0", this helper keeps
// "no value" and "zero" apart:
//   - null, undefined, an empty string or a non-numeric value -> "—"
//   - any real number, including 0 and negative numbers -> formatted price
//
// It is used for admin-only figures such as the cost price and the
// profit of a product, where a missing value means the cost price was
// never entered and must not be presented as a real zero.
//
// formatPriceOrDash(30000) -> "Rs. 30,000"
// formatPriceOrDash(0)     -> "Rs. 0"
// formatPriceOrDash(null)  -> "—"

import formatPrice from "./formatPrice";

const formatPriceOrDash = (value) => {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "—";

  return formatPrice(numericValue);
};

export default formatPriceOrDash;
