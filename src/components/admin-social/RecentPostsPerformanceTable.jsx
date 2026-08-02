// ============================================================
// RecentPostsPerformanceTable — SOCIAL DASHBOARD SUB-COMPONENT
// ============================================================
// Shows the most recent posts with real engagement data — for a SMALL
// bounded list like this (5-10 rows), fetching each post's real
// Analytics (API 86) individually is a reasonable, real technique
// (unlike trying to aggregate analytics across the ENTIRE post
// history for the stat cards above, which isn't feasible). Uses
// useQueries (not a loop of useQuery, which would break React's rules
// of hooks) to fire all these small requests in parallel.
//
// "Published by AI Assistant"/"Published by Admin" from the design
// was REMOVED — no created_by/published_by field exists on the post
// object anywhere in the documented API.

import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDownload } from "react-icons/ai";

import { getSocialPosts, getPostAnalytics } from "../../api/social.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { ROUTES } from "../../constants/routes";
import { SOCIAL_POST_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import { exportReport } from "../../api/analytics.api";
import { showSuccess, showError } from "../ui/Toast";
import Badge from "../ui/Badge";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const STATUS_VARIANT = {
  [SOCIAL_POST_STATUS.PUBLISHED]: "success",
  [SOCIAL_POST_STATUS.SCHEDULED]: "info",
  [SOCIAL_POST_STATUS.PENDING]: "warning",
  [SOCIAL_POST_STATUS.REJECTED]: "danger",
};

const RecentPostsPerformanceTable = () => {
  const { data: postsResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_POSTS,
    queryFn: () => getSocialPosts({}),
    staleTime: 1000 * 60 * 2,
  });

  const recentPosts = extractListData(postsResponse).slice(0, 5);

  // Fires one real getPostAnalytics call PER post shown here, only
  // for posts that are actually published (Analytics only makes sense
  // for something that's actually gone live) — scheduled/pending posts
  // simply show no engagement numbers, which is honest since they
  // genuinely have none yet
  const analyticsQueries = useQueries({
    queries: recentPosts
      .filter((post) => post.status === SOCIAL_POST_STATUS.PUBLISHED)
      .map((post) => ({
        queryKey: QUERY_KEYS.SOCIAL_POST_ANALYTICS(post.id),
        queryFn: () => getPostAnalytics(post.id),
      })),
  });

  const analyticsByPostId = {};
  recentPosts
    .filter((post) => post.status === SOCIAL_POST_STATUS.PUBLISHED)
    .forEach((post, index) => {
      analyticsByPostId[post.id] = analyticsQueries[index]?.data?.data;
    });

  const handleExport = async () => {
    try {
      const response = await exportReport({ type: "social_posts" });
      // FLAG: "social_posts" as the `type` value is an unconfirmed
      // assumption, same pattern flagged on every other export button
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `social-posts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Export downloaded.");
    } catch (error) {
      showError(
        "Failed to export posts. This report type may not be supported by the backend yet.",
      );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Recent Posts Performance
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          <AiOutlineDownload className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : recentPosts.length === 0 ? (
        <div className="py-8">
          <EmptyState
            variant="noResults"
            title="No Posts Yet"
            description="Create your first social post to see performance here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Post Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Platform
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Engagement
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Reach
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map((post) => {
                const analytics = analyticsByPostId[post.id];
                return (
                  <tr
                    key={post.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.image_url || "/placeholder-product.svg"}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                        />
                        <p className="text-sm text-gray-900 truncate max-w-[180px]">
                          {post.caption}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {post.platform}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={post.status}
                        variant={STATUS_VARIANT[post.status] || "gray"}
                        size="sm"
                        rounded
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {analytics ? (
                        <>
                          <span className="font-medium">{analytics.likes}</span>{" "}
                          likes,{" "}
                          <span className="font-medium">
                            {analytics.comments}
                          </span>{" "}
                          comm.
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {analytics ? (
                        analytics.reach
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {post.scheduled_at ? formatDate(post.scheduled_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={ROUTES.ADMIN_SOCIAL_POSTS}
                          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <AiOutlineEye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentPostsPerformanceTable;
