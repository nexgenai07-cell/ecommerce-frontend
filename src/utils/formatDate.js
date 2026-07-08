// ============================================================
// formatDate - UTILITY FUNCTION
// ============================================================
// Converts a raw date string (e.g. from an API response) into a
// readable, human-friendly date format.
// For example: "2024-10-28" becomes "Oct 28, 2024".
// Used anywhere dates need to be displayed (orders, complaints,
// notifications, social post schedules, etc.)

const formatDate = (dateString) => {
  // Guard clause: if no date string is passed, return an empty string
  // instead of crashing or showing "Invalid Date"
  if (!dateString) return "";

  // Using the built-in Intl.DateTimeFormat API to format the date
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", // Show the full year, e.g. "2024"
    month: "short", // Show the month in short form, e.g. "Oct" instead of "October" or "10"
    day: "numeric", // Show the day of the month, e.g. "28"
  }).format(new Date(dateString));
  // new Date(dateString) converts the raw string into an actual JS Date object
  // before passing it into the formatter
};

// Exporting this function so it can be imported and used
// anywhere a date needs to be displayed, e.g.:
// formatDate("2024-10-28") -> "Oct 28, 2024"
export default formatDate;
