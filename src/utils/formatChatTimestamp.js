// ============================================================
// formatChatTimestamp - UTILITY FUNCTIONS
// ============================================================
// Two small, purpose-built formatters used only by the complaint
// message thread (ComplaintThread.jsx) to render timestamps the way
// a chat interface does: a centered "day divider" the first time a
// new calendar day appears in the thread, and a short time-only
// label under each individual message bubble.
//
// This is intentionally kept separate from utils/formatDate.js,
// which is shared across orders, notifications, and other pages that
// only ever need a plain date — reusing it here and changing its
// output would have affected every one of those screens as well.

// ----------------------------------------------------------
// isSameCalendarDay - internal helper
// ----------------------------------------------------------
// Compares two Date objects by year/month/day only, ignoring the
// time portion, so "today" and "yesterday" can be detected correctly
// regardless of what time each message was actually sent.
const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ----------------------------------------------------------
// getDateDividerLabel
// ----------------------------------------------------------
// Turns a raw timestamp into the label shown on the centered divider
// chip between groups of messages from different days, e.g. "Today",
// "Yesterday", or "Sep 7, 2026" for anything older.
export const getDateDividerLabel = (dateString) => {
  // Guard clause: no timestamp, nothing to render.
  if (!dateString) return "";

  const messageDate = new Date(dateString);
  const today = new Date();

  // Build "yesterday" by subtracting one calendar day from today.
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameCalendarDay(messageDate, today)) return "Today";
  if (isSameCalendarDay(messageDate, yesterday)) return "Yesterday";

  // Anything older falls back to a plain, unambiguous date.
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(messageDate);
};

// ----------------------------------------------------------
// formatMessageTime
// ----------------------------------------------------------
// Turns a raw timestamp into a short clock time only (e.g. "3:45
// PM"), matching the compact time label shown under a chat bubble —
// the day itself is already communicated by the divider above it, so
// repeating the full date on every single message would be noise.
export const formatMessageTime = (dateString) => {
  if (!dateString) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
};
