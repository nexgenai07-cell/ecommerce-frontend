// ============================================================
// CalendarDaySidebar — CALENDAR SUB-COMPONENT
// ============================================================
// Shows posts for whichever day is currently selected, plus real
// engagement totals for that day's PUBLISHED posts (small N+1 —
// reasonable, since a single day realistically has only a handful of
// posts). The design's "+12.4%" growth figure was REMOVED — there's
// no historical day-over-day comparison data anywhere in the API.

import { useQueries } from "@tanstack/react-query";
import { AiOutlinePlus } from "react-icons/ai";
import { useNavigate } from "react-router-dom";

import { getPostAnalytics } from "../../api/social.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { ROUTES } from "../../constants/routes";
import { SOCIAL_POST_STATUS } from "../../constants/statusTypes";
import formatDate from "../../utils/formatDate";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";

const STATUS_VARIANT = {
  [SOCIAL_POST_STATUS.PUBLISHED]: "success",
  [SOCIAL_POST_STATUS.SCHEDULED]: "info",
  [SOCIAL_POST_STATUS.PENDING]: "warning",
  [SOCIAL_POST_STATUS.REJECTED]: "danger",
};

const CalendarDaySidebar = ({ selectedDate, postsForDay }) => {
  const navigate = useNavigate();

  const publishedPosts = postsForDay.filter(
    (post) => post.status === SOCIAL_POST_STATUS.PUBLISHED,
  );

  const analyticsQueries = useQueries({
    queries: publishedPosts.map((post) => ({
      queryKey: QUERY_KEYS.SOCIAL_POST_ANALYTICS(post.id),
      queryFn: ({ signal }) => getPostAnalytics(post.id, signal),
    })),
  });

  const totalEngagement = analyticsQueries.reduce((sum, query) => {
    const data = query.data?.data;
    if (!data) return sum;
    return sum + (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
  }, 0);

  return (
    <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-xs text-gray-400">
          {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <p className="text-base font-semibold text-gray-900">
          {formatDate(selectedDate.toISOString())}
        </p>

        <div className="flex flex-col gap-3 mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Today's Posts
          </p>

          {postsForDay.length === 0 ? (
            <EmptyState
              variant="noResults"
              title="No Posts"
              description="Nothing scheduled for this day yet."
            />
          ) : (
            postsForDay.map((post) => (
              <div
                key={post.id}
                className="border border-gray-100 rounded-lg p-3 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    label={post.status}
                    variant={STATUS_VARIANT[post.status] || "gray"}
                    size="sm"
                    rounded
                  />
                  <span className="text-xs text-gray-400">
                    {new Date(post.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {post.caption}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {post.platform}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        variant="primary"
        fullWidth
        leftIcon={<AiOutlinePlus className="w-4 h-4" />}
        onClick={() => navigate(ROUTES.ADMIN_SOCIAL_CREATE_POST)}
      >
        Add Post
      </Button>

      {publishedPosts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">
            Day's Engagement
          </p>
          <p className="text-2xl font-bold text-primary mt-1">
            {totalEngagement}
          </p>
          <p className="text-xs text-gray-400">
            Combined likes, comments &amp; shares across {publishedPosts.length}{" "}
            published post{publishedPosts.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarDaySidebar;
