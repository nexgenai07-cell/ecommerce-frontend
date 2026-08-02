// ============================================================
// formatRelativeTime - UTILITY FUNCTION
// ============================================================
// Converts an ISO timestamp string into a short, human-readable
// "time ago" phrase — e.g. "2 minutes ago", "5 hours ago", "3 days ago".
// Falls back to the plain formatted date (via formatDate) once
// something is older than a week, since "47 days ago" is less useful
// to read than an actual calendar date.
//
// REUSABILITY: written as a standalone util (not baked into one
// widget) so any future feature needing relative timestamps — audit
// logs, notifications, chat messages, WhatsApp bot logs — can import
// this same function instead of re-writing the same math.

import formatDate from "./formatDate";
// formatDate — existing utility, used here as the fallback for
// anything older than a week

const formatRelativeTime = (isoString) => {
  // Guard clause — if no timestamp was passed, return an empty string
  // instead of crashing on `new Date(undefined)`
  if (!isoString) return "";

  const thenMs = new Date(isoString).getTime();
  // Converts the ISO string into a millisecond timestamp

  const nowMs = Date.now();
  // Current moment, also in milliseconds

  const diffSeconds = Math.floor((nowMs - thenMs) / 1000);
  // How many whole seconds have passed since that timestamp

  // Less than a minute ago
  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  // Less than an hour ago — show in minutes
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    // Handles singular "1 minute ago" vs plural "5 minutes ago" correctly
  }

  const diffHours = Math.floor(diffMinutes / 60);
  // Less than a day ago — show in hours
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  // Less than a week ago — show in days
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  // Older than a week — a relative phrase stops being useful,
  // so fall back to the actual formatted calendar date
  return formatDate(isoString);
};

export default formatRelativeTime;
