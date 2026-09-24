// ============================================================
// formatBadgeLabel - UTILITY FUNCTION
// ============================================================
// Normalizes any text before it is displayed inside a Badge.
//
// Status values coming from the backend (order status, payment status,
// return status, complaint status, discount status, inventory alert
// status, etc.) are typically raw snake_case strings such as
// "pending_payment" or "in_progress". This function turns any such
// string into a clean, uppercase, space-separated label suitable for
// display — e.g. "pending_payment" becomes "PENDING PAYMENT".
//
// It is intentionally generic (not tied to a specific status type) so
// that every Badge in the app — across both the customer and admin
// sides — ends up with the exact same, consistent display formatting,
// regardless of whether the caller already passes a human-readable
// label (e.g. "Confirmed") or a raw backend value (e.g. "confirmed").

const formatBadgeLabel = (text) => {
  // Only strings need normalizing. Numbers, JSX elements, or empty
  // values are returned untouched so Badge can keep rendering
  // whatever was passed in without breaking.
  if (typeof text !== "string") return text;

  return (
    text
      .replace(/_/g, " ")
      // Replaces every underscore with a space, e.g.
      // "pending_payment" -> "pending payment"
      .toUpperCase()
    // Converts the entire label to uppercase, e.g.
    // "pending payment" -> "PENDING PAYMENT"
  );
};

// Exporting this function so it can be used inside the Badge component,
// e.g.:
//
// <span>{formatBadgeLabel(label)}</span>
export default formatBadgeLabel;
