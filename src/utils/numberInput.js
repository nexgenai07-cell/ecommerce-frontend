// ==========================================================
// numberInput - UTILITY FUNCTIONS
//
// Helpers for text inputs that show a number with thousands
// separators while the user types, e.g. "1999.5" -> "1,999.5".
// The form always stores the plain value (digits and at most
// one decimal point); the separators exist only in the display.
// ==========================================================

// Reduces any typed or pasted text to a plain number string.
// Keeps digits and a single decimal point, removes leading zeros
// and limits the number of decimal places.
//
// Options:
//   allowDecimal - when false, the decimal point is removed too
//   maxDecimals  - maximum digits kept after the decimal point
export const sanitizeNumberInput = (
  text,
  { allowDecimal = true, maxDecimals = 2 } = {},
) => {
  const cleaned = String(text ?? "").replace(/[^\d.]/g, "");

  // Whole numbers only: drop every decimal point and leading zeros
  if (!allowDecimal) {
    return cleaned.replace(/\./g, "").replace(/^0+(?=\d)/, "");
  }

  const dotIndex = cleaned.indexOf(".");

  // No decimal point typed: only leading zeros need removing
  if (dotIndex === -1) {
    return cleaned.replace(/^0+(?=\d)/, "");
  }

  const integerPart = cleaned.slice(0, dotIndex).replace(/^0+(?=\d)/, "");
  const decimalPart = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, "")
    .slice(0, maxDecimals);

  // A lone "." becomes "0." so the field never starts with a bare point
  return `${integerPart || "0"}.${decimalPart}`;
};

// Adds thousands separators to a plain number string.
// The decimal part, including a trailing "." while the user is still
// typing, is left exactly as it is.
//
// formatNumberWithCommas("1999.5") -> "1,999.5"
// formatNumberWithCommas("1000.")  -> "1,000."
// formatNumberWithCommas("")       -> ""
export const formatNumberWithCommas = (plainNumber) => {
  const text = String(plainNumber ?? "");
  if (!text) return "";

  const dotIndex = text.indexOf(".");
  const integerPart = dotIndex === -1 ? text : text.slice(0, dotIndex);
  const decimalSuffix = dotIndex === -1 ? "" : text.slice(dotIndex);

  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + decimalSuffix;
};
