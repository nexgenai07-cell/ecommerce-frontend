// ============================================================
// formatReportPeriodLabel - UTILITY FUNCTION
// ============================================================
// Turns the "date" value of a report row into a label that suits the
// period the report is grouped by. The server always sends a full date
// ("YYYY-MM-DD"): the day for daily and weekly rows, the first day of the
// month for monthly rows and January 1st for yearly rows.
//
//   daily / weekly -> "Oct 28, 2024"
//   monthly        -> "Oct 2024"
//   yearly         -> "2024"
//
// The date is read in UTC on purpose. The value is a calendar date and not
// a moment in time, so reading it in a local time zone could show the
// previous day in time zones behind UTC.

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  timeZone: "UTC",
});

const formatReportPeriodLabel = (dateString, period) => {
  if (!dateString) return "";

  if (period === "yearly") return String(dateString).slice(0, 4);

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);

  return period === "monthly"
    ? monthFormatter.format(date)
    : dayFormatter.format(date);
};

export default formatReportPeriodLabel;
