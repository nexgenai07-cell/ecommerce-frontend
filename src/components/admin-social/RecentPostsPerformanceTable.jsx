import { useQuery, useQueries } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
// useNavigate — drives the whole-row click, which sends the admin to the
// same posts list page the eye icon links to
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
import DataTable from "../ui/DataTable";

const STATUS_VARIANT = {
  [SOCIAL_POST_STATUS.PUBLISHED]: "success",
  [SOCIAL_POST_STATUS.SCHEDULED]: "info",
  [SOCIAL_POST_STATUS.PENDING]: "warning",
  [SOCIAL_POST_STATUS.REJECTED]: "danger",
};

const RecentPostsPerformanceTable = () => {
  const navigate = useNavigate();
  // navigate — used for the whole-row click so it can push the admin to
  // the posts list page exactly like the eye icon's <Link> already does

  const { data: postsResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_POSTS,
    queryFn: ({ signal }) => getSocialPosts({}, signal),
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
        queryFn: ({ signal }) => getPostAnalytics(post.id, signal),
      })),
  });

  const analyticsByPostId = {};
  recentPosts
    .filter((post) => post.status === SOCIAL_POST_STATUS.PUBLISHED)
    .forEach((post, index) => {
      analyticsByPostId[post.id] = analyticsQueries[index]?.data?.data;
    });

  // Each post is paired with its own analytics (if any) before being
  // handed to DataTable, so the Engagement and Reach columns can read
  // row.analytics directly instead of looking it up separately.
  const tableRows = recentPosts.map((post) => ({
    ...post,
    analytics: analyticsByPostId[post.id],
  }));

  const columns = [
    {
      key: "caption",
      label: "Post Preview",
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image_url || "/placeholder-product.svg"}
            alt=""
            className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
          />
          <p className="text-gray-900 truncate max-w-[180px]">{row.caption}</p>
        </div>
      ),
    },
    {
      key: "platform",
      label: "Platform",
      // Rendered explicitly (rather than via a column-level className)
      // so the "capitalize" styling only ever touches this cell's text
      // and never the header label above it, which already has its
      // own fixed "uppercase" styling from DataTable.
      render: (row) => <span className="capitalize">{row.platform}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge
          label={row.status}
          variant={STATUS_VARIANT[row.status] || "gray"}
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "engagement",
      label: "Engagement",
      render: (row) =>
        row.analytics ? (
          <>
            <span className="font-medium">{row.analytics.likes}</span> likes,{" "}
            <span className="font-medium">{row.analytics.comments}</span> comm.
          </>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "reach",
      label: "Reach",
      render: (row) =>
        row.analytics ? (
          row.analytics.reach
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "scheduled_at",
      label: "Date",
      render: (row) => (row.scheduled_at ? formatDate(row.scheduled_at) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <div className="flex items-center gap-1">
          <Link
            to={ROUTES.ADMIN_SOCIAL_POSTS}
            onClick={(e) => e.stopPropagation()}
            // Stops this click from also bubbling up to the row's own
            // onClick, which navigates to the same page — avoids a
            // redundant double navigation when the icon itself is clicked
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          >
            <AiOutlineEye className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ];

  const handleExport = async () => {
    try {
      const response = await exportReport({ type: "social_posts" });
      // "social_posts" is now a CONFIRMED accepted `type` value
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
      ) : tableRows.length === 0 ? (
        <div className="py-8">
          <EmptyState
            variant="noResults"
            title="No Posts Yet"
            description="Create your first social post to see performance here."
          />
        </div>
      ) : (
        <div className="p-4">
          <DataTable
            columns={columns}
            data={tableRows}
            keyField="id"
            onRowClick={() => navigate(ROUTES.ADMIN_SOCIAL_POSTS)}
            // Opens the same posts list page as the eye icon when any part
            // of the row is clicked
          />
        </div>
      )}
    </div>
  );
};

export default RecentPostsPerformanceTable;
