// ============================================================
// formatPercent - UTILITY FUNCTION
// ============================================================
// Formats a percentage value returned by the backend for display.
// The backend sends percentages as plain numbers already rounded to
// two decimal places, and sends null when the value cannot be
// calculated (for example when the cost price is missing).
//
// A missing value is shown as an em dash instead of "0%", because a
// real 0% and "not available" mean different things to an admin.
//
// formatPercent(66.67) -> "66.67%"
// formatPercent(100)   -> "100%"
// formatPercent(null)  -> "—"

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "—";

  return `${percentFormatter.format(numericValue)}%`;
};

export default formatPercent;
