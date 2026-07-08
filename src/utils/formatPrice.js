// ============================================================
// formatPrice - UTILITY FUNCTION
// ============================================================
// Converts a raw number into a properly formatted, human-readable
// currency string. For example: 150000 becomes "Rs. 1,50,000".
// This is used anywhere a price needs to be displayed in the UI —
// product cards, cart summary, checkout page, order details,
// admin analytics, etc.

const formatPrice = (amount) => {
  // --------------------------------------------------
  // GUARD CLAUSE (Safety Check)
  // --------------------------------------------------
  // If "amount" is falsy (undefined, null, 0, NaN, or empty string),
  // skip the formatting logic entirely and just return "Rs. 0".
  // This prevents showing broken values like "Rs. NaN" or crashing
  // when a price hasn't loaded yet.
  if (!amount) return "Rs. 0";

  // --------------------------------------------------
  // FORMATTING THE NUMBER AS CURRENCY
  // --------------------------------------------------
  // Using the browser's built-in Intl.NumberFormat API, which knows
  // how to format numbers according to locale-specific rules
  // (grouping separators, currency symbols, decimal places, etc.)
  return new Intl.NumberFormat("en-PK", {
    // "en-PK" = English (Pakistan) locale.
    // This ensures the number grouping follows the South Asian
    // lakh/crore style — e.g. "1,50,000" instead of the Western
    // style "150,000".

    style: "currency",
    // Tells Intl.NumberFormat to treat this as a currency value,
    // which means it will automatically prepend the currency symbol
    // (or code) and apply proper formatting rules.

    currency: "PKR",
    // Specifies the actual currency to use — PKR stands for
    // Pakistani Rupee. This determines the symbol/label shown
    // (e.g. "Rs." or "PKR" depending on locale rendering).

    minimumFractionDigits: 0,
    // By default, currency formatting often shows 2 decimal places
    // (e.g. "Rs. 150,000.00"). Setting this to 0 removes the decimals
    // entirely, since prices here are expected to be whole numbers.
  }).format(amount);
  // .format(amount) actually applies all the above formatting rules
  // to the given number and returns the final formatted string.
};

// Exporting this function so it can be imported and used
// anywhere a price needs to be displayed, e.g.:
//
// formatPrice(150000)  -> "Rs. 150,000"
// formatPrice(0)       -> "Rs. 0"
// formatPrice(null)    -> "Rs. 0"
export default formatPrice;
