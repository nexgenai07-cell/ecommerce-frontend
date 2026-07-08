// ============================================================
// isWithinDateRange - UTILITY FUNCTION
// ============================================================
const RANGE_TO_MONTHS = {
  "3months": 3,
  "6months": 6,
  "1year": 12,
};

const isWithinDateRange = (dateString, rangeId) => {
  if (rangeId === "all") return true;
  if (!dateString) return false;

  const months = RANGE_TO_MONTHS[rangeId];
  if (!months) return true;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  return new Date(dateString) >= cutoff;
};

export default isWithinDateRange;
