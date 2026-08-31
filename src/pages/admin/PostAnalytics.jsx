import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineArrowLeft, AiOutlineCopy } from "react-icons/ai";

import {
  getSocialPostById,
  getPostAnalytics,
  createSocialPost,
} from "../../api/social.api";
// getSocialPostById — API 79: GET /api/v1/social/posts/{id}/
// getPostAnalytics  — API 86: GET /api/v1/social/analytics/{post_id}/
// createSocialPost  — reused here for "Duplicate", same real technique
//                      built for PostCard.jsx (no dedicated duplicate endpoint exists)

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import StatsCard from "../../components/ui/StatsCard";

const PostAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: postResponse, isLoading: isPostLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_POST_DETAIL(id),
    queryFn: () => getSocialPostById(id),
  });
  const post = postResponse?.data;

  const { data: analyticsResponse, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_POST_ANALYTICS(id),
    queryFn: () => getPostAnalytics(id),
  });
  const analytics = analyticsResponse?.data;

  const duplicateMutation = useMutation({
    mutationFn: () =>
      createSocialPost({
        product: post.product?.id,
        platform: post.platform,
        caption: post.caption,
        hashtags: post.hashtags,
        image_url: post.image_url,
      }),
    onSuccess: () => {
      // Without this, the new draft would not appear in the Posts list
      // until the page is manually refreshed, since PostsList.jsx reads
      // from the same QUERY_KEYS.SOCIAL_POSTS cache.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SOCIAL_POSTS });
      showSuccess("Post duplicated as a new draft.");
      navigate(ROUTES.ADMIN_SOCIAL_POSTS);
    },
    onError: () => showError("Failed to duplicate post."),
  });

  const isLoading = isPostLoading || isAnalyticsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-24 text-gray-400">Post not found.</div>
    );
  }

  const likes = analytics?.likes || 0;
  const comments = analytics?.comments || 0;
  const shares = analytics?.shares || 0;
  const reach = analytics?.reach || 0;

  // Real derived metric — not a separate backend field
  const engagementRate =
    reach > 0
      ? (((likes + comments + shares) / reach) * 100).toFixed(1)
      : "0.0";

  const maxBreakdownValue = Math.max(likes, comments, shares, 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">
            <Link
              to={ROUTES.ADMIN_SOCIAL_DASHBOARD}
              className="hover:text-primary"
            >
              Social Media
            </Link>
            {" / "}
            <Link to={ROUTES.ADMIN_SOCIAL_POSTS} className="hover:text-primary">
              Posts
            </Link>
            {" / "}Post #{post.id}
          </p>
          <h1 className="text-xl font-bold text-gray-900">Post Analytics</h1>
        </div>
        <Button
          variant="secondary"
          leftIcon={<AiOutlineArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(ROUTES.ADMIN_SOCIAL_POSTS)}
        >
          Back to Posts
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Post Preview
            </h2>
            <Badge label={post.status} status={post.status} size="sm" rounded />
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="aspect-square bg-gray-100">
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900">
                {likes.toLocaleString()} likes
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                {post.caption}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            leftIcon={<AiOutlineCopy className="w-4 h-4" />}
            onClick={() => duplicateMutation.mutate()}
            isLoading={duplicateMutation.isPending}
          >
            Duplicate Post
          </Button>
          {/* Note: "Edit Post" and "View on Platform" from the design
              are NOT included — no post-content-edit endpoint and no
              live-post-URL field exist anywhere in the documented API. */}
        </div>

        {/* Stats + breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard title="Reach" value={reach.toLocaleString()} />
            <StatsCard title="Engagement Rate" value={`${engagementRate}%`} />
          </div>
          {/* Note: "Impressions" and "Link Clicks" cards from the
              design are NOT included — API 86's real response only
              has likes, comments, shares, and reach. */}

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Engagement Breakdown
            </h2>
            {[
              { label: "Likes", value: likes, color: "bg-primary" },
              { label: "Comments", value: comments, color: "bg-info" },
              { label: "Shares", value: shares, color: "bg-purple-500" },
            ].map((metric) => (
              <div key={metric.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 uppercase text-xs font-medium">
                    {metric.label}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {metric.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${metric.color}`}
                    style={{
                      width: `${(metric.value / maxBreakdownValue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Note: "Reach Over Time" and "Audience Demographics" from
              the design are NOT included — see the flags shared before
              this code: no per-day reach history and no
              age/gender demographic tracking exist anywhere in the API. */}
        </div>
      </div>
    </div>
  );
};

export default PostAnalytics;
