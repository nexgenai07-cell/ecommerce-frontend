// ============================================================
// getDateRangeBounds - UTILITY FUNCTION
// ============================================================
// Converts one of OrderFilters' DATE_RANGES ids into a real
// { startDate, endDate } pair in the "YYYY-MM-DD" format the
// backend's start_date / end_date query params expect (see
// getMyOrders in orders.api.js).
//
// This is the server-side replacement for the old isWithinDateRange()
// helper, which compared dates in the browser after the full order
// list had already been downloaded. Sending these bounds straight to
// the backend lets it do the filtering, so only the orders that
// actually match ever reach the client.
//
// "today" and "last7days" are day-based rolling windows ending today.
// "1month"/"3months"/"6months"/"1year" are month-based rolling windows
// ending today. "all" (and the "custom" id, whose real bounds come
// from the customer's own date pickers rather than this map) return
// undefined for both bounds, since omitting start_date/end_date
// entirely is how the backend is told not to restrict by date at all.

const RANGE_TO_DAYS = {
  today: 0, // start and end are the same calendar day
  last7days: 6, // 6 days back + today = a 7-day window
};

const RANGE_TO_MONTHS = {
  "1month": 1,
  "3months": 3,
  "6months": 6,
  "1year": 12,
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const getDateRangeBounds = (rangeId) => {
  const endDate = new Date();

  if (rangeId in RANGE_TO_DAYS) {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - RANGE_TO_DAYS[rangeId]);
    return { startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) };
  }

  const months = RANGE_TO_MONTHS[rangeId];
  if (months) {
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - months);
    return { startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) };
  }

  return { startDate: undefined, endDate: undefined };
};

export default getDateRangeBounds;
