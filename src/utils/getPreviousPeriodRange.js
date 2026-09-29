// ============================================================
// getPreviousPeriodRange - UTILITY FUNCTION
// ============================================================
// Given a start/end date range (e.g. "Oct 1, 2023" to "Oct 31, 2023"),
// returns the immediately-preceding range of the SAME length
// (e.g. "Sep 1, 2023" to "Sep 30, 2023") — used to compute real,
// genuine "+12.5% vs last period" growth badges by fetching both
// ranges from the same real API and comparing their totals.
//
// REUSABILITY: both SalesReport.jsx and RevenueReport.jsx need this
// exact same "what period came before this one" math, so it lives
// here once instead of being duplicated in each page.
//
// The result is built from each date's local calendar parts, not
// toISOString(), so the calculation matches the calendar day the
// admin actually selected regardless of time zone.

import { parseLocalISODate, toLocalISODate } from "./getReportDateRanges";

const getPreviousPeriodRange = (startDateStr, endDateStr) => {
  const startDate = parseLocalISODate(startDateStr);
  const endDate = parseLocalISODate(endDateStr);

  // How many days the CURRENT period spans (inclusive of both ends)
  const rangeDays =
    Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // The previous period's end is the day right before the current
  // period's start
  const previousEnd = new Date(startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);

  // The previous period's start is exactly `rangeDays` earlier than
  // its own end, so both periods cover the same number of days
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (rangeDays - 1));

  // Returned as plain "YYYY-MM-DD" strings, matching the format the
  // backend's start_date/end_date query params expect
  return {
    startDate: toLocalISODate(previousStart),
    endDate: toLocalISODate(previousEnd),
  };
};

export default getPreviousPeriodRange;
