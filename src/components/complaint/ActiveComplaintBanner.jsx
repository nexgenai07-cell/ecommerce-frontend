// Import the warning/alert icon component from the react-icons library (Ant Design icon set)
import { AiOutlineWarning } from "react-icons/ai";
// React Query's data-fetching hook — this banner now fetches its own
// live count instead of relying on a complaint object passed down
// from its parent
import { useQuery } from "@tanstack/react-query";
// Centralized React Query cache key constants
import { QUERY_KEYS } from "../../constants/queryKeys";
//— the logged-in customer's own open/in_progress complaints count
import { getOpenComplaintsCount } from "../../api/complaints.api";

// ============================================================
// ACTIVE COMPLAINT BANNER
// ============================================================

const ActiveComplaintBanner = () => {
  // =============================================
  // OPEN COMPLAINTS COUNT — API 72.2
  // =============================================
  // The endpoint's actual response body is { count: number }, not
  // { open_count: number } — the field is read as `data.count` below
  // to match the live API response exactly.
  const { data } = useQuery({
    queryKey: QUERY_KEYS.OPEN_COMPLAINTS_COUNT,
    queryFn: ({ signal }) => getOpenComplaintsCount(signal),
    staleTime: 1000 * 60, // a fresh count is only really needed once a minute
  });

  const openCount = data?.data?.count ?? 0;

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
      {/* Single line: bold heading followed by a colon, then the dynamic
          count text right after it — no separate paragraphs. */}
      <p className="text-sm leading-relaxed">
        <span className="font-semibold text-warning">
          Active Status Notice:
        </span>{" "}
        <span className="text-yellow-700">
          You have {openCount} open request{openCount === 1 ? "" : "s"}.
        </span>
      </p>
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default ActiveComplaintBanner;
