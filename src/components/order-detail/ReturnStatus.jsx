import { RETURN_STATUS } from "../../constants/statusTypes"; // Shared status constants — always compare against these, never raw strings

const ReturnStatus = ({ orderReturn }) => {
  // Guard clause — if no return exists on this order, render nothing at all
  // This keeps the Order Detail page clean for orders that were never returned
  if (!orderReturn) return null;

  // getStatusLabel — maps the raw API status string to a human-readable display label
  // Compares against RETURN_STATUS constants (REQUESTED's real value is "pending",
  // not the literal word "requested") instead of hardcoded strings, so this can
  // never silently stop matching real backend data again.
  // Falls back to the raw status value if an unrecognized status arrives from the API
  const getStatusLabel = (status) => {
    switch (status) {
      case RETURN_STATUS.REQUESTED:
        return "Pending Review"; // Return has been submitted but not yet reviewed by the seller
      case RETURN_STATUS.APPROVED:
        return "Approved"; // Seller approved the return request
      case RETURN_STATUS.REJECTED:
        return "Rejected"; // Seller rejected the return request
      default:
        return status; // Unknown status — show the raw string as a safe fallback
    }
  };

  // getStatusColor — maps each status to a Tailwind background + text color pair
  // Uses semantic color tokens (warning, success, danger) defined in tokens.css
  const getStatusColor = (status) => {
    switch (status) {
      case RETURN_STATUS.REQUESTED:
        return "bg-warning-light text-warning"; // Amber — awaiting action
      case RETURN_STATUS.APPROVED:
        return "bg-success-light text-success"; // Green — return accepted
      case RETURN_STATUS.REJECTED:
        return "bg-danger-light text-danger"; // Red — return declined
      default:
        return "bg-gray-100 text-gray-600"; // Neutral gray for any unknown status
    }
  };

  return (
    // Card wrapper — white background, rounded corners, warning-tinted border signals this is an alert-level section
    // border-warning/30 uses 30% opacity so the border is noticeable but not harsh
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-warning/30 p-5 flex flex-col gap-3 shadow-sm">
      {/* ── Header row: section label + status badge ──────────────────────────
          Label on the left, colored badge on the right
          gap-2 ensures they don't touch each other on narrow screens          */}
      <div className="flex items-center justify-between gap-2">
        {/* Section label — small uppercase muted text, styled like a field label */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Return Status
        </p>

        {/* Status badge — color is determined dynamically by getStatusColor
            uppercase + tracking-wide gives the badge a formal, label-like look */}
        <span
          className={`
            px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wide
            ${getStatusColor(orderReturn.status)}
          `}
        >
          {getStatusLabel(orderReturn.status)}{" "}
          {/* Human-readable status label */}
        </span>
      </div>

      {/* ── Return details block ──────────────────────────────────────────────
          Stacks Return ID and reason text vertically                          */}
      <div className="flex flex-col gap-1.5">
        {/* Return ID — warning color ties it visually to the card's border theme */}
        <p className="text-xs font-semibold text-warning">
          Return ID: #{orderReturn.id}{" "}
          {/* Unique identifier for this return request */}
        </p>

        {/* Return reason — only rendered when the customer provided one
            Italic + leading-relaxed makes it read like a quoted customer note  */}
        {orderReturn.reason && (
          <p className="text-xs text-gray-500 italic leading-relaxed">
            "{orderReturn.reason}"{" "}
            {/* Customer's stated reason for returning the order */}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReturnStatus; // Export so it can be conditionally composed into the Order Detail page
