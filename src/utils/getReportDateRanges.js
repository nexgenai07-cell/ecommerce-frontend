// ============================================================
// getReportDateRanges - UTILITY FUNCTIONS
// ============================================================
// Date helpers shared by report pages that let an admin pick a date range.
//
// Every date is built from the LOCAL calendar (year, month and day parts)
// instead of toISOString(), which converts to UTC first and can return the
// previous day for the first hours of a local day. Report ranges are
// always meant in the admin's own calendar.

// Parses a "YYYY-MM-DD" string as a local calendar date (midnight in the
// browser's own time zone), instead of new Date("YYYY-MM-DD"), which the
// JavaScript spec always parses as UTC midnight. Reading that UTC instant
// back through local getters (getDate(), setDate(), and so on) can land on
// the wrong calendar day for a time zone behind UTC. Building the Date
// from its year/month/day parts directly avoids that entirely.
export const parseLocalISODate = (dateString) => {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Formats a Date as "YYYY-MM-DD" using its local calendar day.
export const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Default range: the first day of the current month through today.
export const getDefaultRange = () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toLocalISODate(firstOfMonth),
    endDate: toLocalISODate(now),
  };
};

// One-tap quick ranges, always calculated from the current date.
export const getPresetRanges = () => {
  const now = new Date();
  const today = toLocalISODate(now);

  // Last 7 Days: today and the six days before it.
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);

  // Last 30 Days: today and the 29 days before it.
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Last Month: the full previous calendar month. Day 0 of the current
  // month is the last day of the month before it.
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    { label: "Today", startDate: today, endDate: today },
    {
      label: "Last 7 Days",
      startDate: toLocalISODate(sevenDaysAgo),
      endDate: today,
    },
    {
      label: "Last 30 Days",
      startDate: toLocalISODate(thirtyDaysAgo),
      endDate: today,
    },
    {
      label: "This Month",
      startDate: toLocalISODate(thisMonthStart),
      endDate: today,
    },
    {
      label: "Last Month",
      startDate: toLocalISODate(lastMonthStart),
      endDate: toLocalISODate(lastMonthEnd),
    },
  ];
};
