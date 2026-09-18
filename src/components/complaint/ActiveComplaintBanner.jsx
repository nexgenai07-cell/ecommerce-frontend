// Import the warning/alert icon component from the react-icons library (Ant Design icon set)
import { AiOutlineWarning } from "react-icons/ai";
// React Query's data-fetching hook — this banner now fetches its own
// live count instead of relying on a complaint object passed down
// from its parent (see the big comment block below for why).
import { useQuery } from "@tanstack/react-query";
// Centralized React Query cache key constants
import { QUERY_KEYS } from "../../constants/queryKeys";
//— the logged-in customer's own open/in_progress complaints count
import { getOpenComplaintsCount } from "../../api/complaints.api";

// ============================================================
// ACTIVE COMPLAINT BANNER
// ============================================================
// UPDATED (API Changes Addendum, Sep 2026, API 72.2): this banner used
// to receive a single "complaint" object from its parent and render a
// STATIC line around it — "You have 1 open complaint" always said "1"
// regardless of how many were actually open, and "Order #{complaint.order
// || 'N/A'}" showed a real order number only for whichever ONE
// complaint the parent happened to find first (or the literal text
// "N/A" otherwise), even when several were open across different
// orders at once.
//
// It now calls the dedicated open-count endpoint itself and renders a
// single, honestly dynamic line built entirely from that real number —
// no more hardcoded "1", no more per-order text, and no "View Status"
// button, since that button pointed at a fixed link with nothing
// order-specific behind it. The parent no longer needs to pass a
// complaint object down at all; it renders unconditionally and simply
// shows nothing once there is nothing open to report.
const ActiveComplaintBanner = () => {
  // =============================================
  // OPEN COMPLAINTS COUNT — API 72.2
  // =============================================
  const { data } = useQuery({
    queryKey: QUERY_KEYS.OPEN_COMPLAINTS_COUNT,
    queryFn: ({ signal }) => getOpenComplaintsCount(signal),
    staleTime: 1000 * 60, // a fresh count is only really needed once a minute
  });

  const openCount = data?.data?.open_count ?? 0;

  // Nothing open right now — render nothing, same as the old
  // "no active complaint" behavior.
  if (openCount === 0) return null;

  // Begin the JSX that will be returned and rendered by this component
  return (
    // Outer wrapper div: a flex container arranging the icon and text
    // in a row, with padding, a light warning background color, a
    // subtle warning-colored border, and rounded corners.
    <div className="flex items-start gap-3 p-4 bg-warning-light border border-warning/20 rounded-xl">
      {/* Render the warning icon with a fixed width/height, warning color, prevent it from shrinking in the flex layout, and nudge it slightly down with top margin to align with text */}
      <AiOutlineWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      {/* Text container div wrapping the title and description paragraphs */}
      <div>
        {/* Bold, small-sized heading text shown in the warning color, acting as the title of the notice */}
        <p className="text-sm font-semibold text-warning">
          Active Status Notice
        </p>
        {/* Single dynamic line built entirely from the real open_count —
            correctly pluralized, and no longer tied to any one order. */}
        <p className="text-sm text-yellow-700 mt-0.5 leading-relaxed">
          You have {openCount} open request{openCount === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default ActiveComplaintBanner;
