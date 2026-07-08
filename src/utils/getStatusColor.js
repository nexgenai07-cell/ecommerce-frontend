// ============================================================
// getStatusColor - UTILITY FUNCTION
// ============================================================
// Takes a status value (could be an order status, return status,
// or complaint status) and returns the matching Tailwind CSS classes
// for background color + text color.
//
// This is used by the reusable "Badge" component to visually represent
// different statuses with appropriate, meaningful colors —
// e.g. green/success = positive outcome, red/danger = negative/urgent,
// amber/warning = pending/in-progress, blue/info = acknowledged, gray = neutral/closed.

import {
  ORDER_STATUS,
  RETURN_STATUS,
  COMPLAINT_STATUS,
} from "../constants/statusTypes";
// Importing the centralized status constants instead of hardcoding
// raw strings like "pending" or "shipped" directly in this file.
// This ensures we're always comparing against the EXACT same values
// used everywhere else in the project, avoiding typos and mismatches.

const getStatusColor = (status) => {
  // Using a switch statement to check the incoming "status" value
  // against every possible known status across THREE different
  // modules (order, return, complaint), since this one function
  // handles color logic for all of them.
  switch (status) {
    // ==================================================
    // ORDER STATUSES
    // ==================================================
    case ORDER_STATUS.PENDING:
      // Order placed, awaiting Stripe payment confirmation — warning
      // (amber) token signals "waiting on the customer/system"
      return "bg-warning-light text-warning";

    case ORDER_STATUS.CONFIRMED:
      // Payment succeeded, order acknowledged — info (blue) token
      // signals "acknowledged, now being processed"
      return "bg-info-light text-info";

    case ORDER_STATUS.SHIPPED:
      // Order dispatched, in transit — a mid-tone emerald (primary-100 +
      // primary-dark text) distinguishes "in progress" from the paler
      // success-light green reserved for the final Delivered state,
      // while staying entirely inside the brand's emerald family instead
      // of introducing an unrelated purple
      return "bg-primary-100 text-primary-dark";

    case ORDER_STATUS.DELIVERED:
      // Order successfully reached the customer — success (emerald)
      // token signals "completed, positive outcome"
      return "bg-success-light text-success";

    case ORDER_STATUS.CANCELLED:
      // Order was cancelled — danger (red) token signals a
      // "negative/failed" outcome
      return "bg-danger-light text-danger";

    // ==================================================
    // RETURN STATUSES
    // ==================================================
    case RETURN_STATUS.REQUESTED:
      // Customer has requested a return, decision pending — warning
      // token signals "awaiting action"
      return "bg-warning-light text-warning";

    case RETURN_STATUS.APPROVED:
      // Return request was approved — success token signals a
      // "positive" resolution for the customer
      return "bg-success-light text-success";

    case RETURN_STATUS.REJECTED:
      // Return request was rejected — danger token signals a
      // "negative" outcome
      return "bg-danger-light text-danger";

    // ==================================================
    // COMPLAINT STATUSES
    // ==================================================
    case COMPLAINT_STATUS.OPEN:
      // Complaint has just been raised, untouched — danger token
      // signals "urgent, needs attention"
      return "bg-danger-light text-danger";

    case COMPLAINT_STATUS.IN_PROGRESS:
      // Support/admin team is actively working on it — warning token
      // signals "in progress, ongoing work"
      return "bg-warning-light text-warning";

    case COMPLAINT_STATUS.RESOLVED:
      // Issue has been fixed — success token signals "successful
      // resolution"
      return "bg-success-light text-success";

    case COMPLAINT_STATUS.CLOSED:
      // Complaint fully closed, no further action needed — neutral gray,
      // matching the exact gray/600 pairing Badge.jsx's own "gray"
      // variant already uses elsewhere, instead of the mismatched
      // gray-100/800 pairing this file used before
      return "bg-gray-100 text-gray-600";

    // ==================================================
    // DEFAULT FALLBACK
    // ==================================================
    default:
      // If "status" doesn't match ANY of the known values above
      // (e.g. an unexpected value from the backend, or a status
      // type that hasn't been handled yet), fall back to the same
      // safe, neutral gray token pairing used by CLOSED above,
      // instead of crashing or returning undefined.
      return "bg-gray-100 text-gray-600";
  }
};

// Exporting this function so it can be imported and used inside
// any Badge/status display component, e.g.:
//
// <span className={getStatusColor(order.status)}>
//   {order.status}
// </span>
export default getStatusColor;
