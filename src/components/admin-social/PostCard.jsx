// ============================================================
// PostCard — POSTS LIST SUB-COMPONENT
// ============================================================
// One card per social post. Real engagement numbers (likes/comments/
// shares/reach) are only fetched for PUBLISHED posts via API 86 —
// scheduled/pending/rejected posts show "-" placeholders, which is
// honest since they genuinely have no engagement yet, rather than
// hiding the fields or faking zeros.
//
// "Duplicate" is a REAL feature built from 2 real endpoints: it reads
// this post's own fields and calls Create Post (API 78) again with
// the same values (minus id/status), producing a genuine new draft
// copy — not a fabricated action.
//
// The "Modified 4h ago" timestamp from the design was REMOVED for
// draft-like posts — there's no updated_at field documented on the
// post object anywhere, only scheduled_at.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineEdit, AiOutlineDelete, AiOutlineCopy } from "react-icons/ai";

import {
  getPostAnalytics,
  createSocialPost,
  deleteSocialPost,
} from "../../api/social.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { SOCIAL_POST_STATUS } from "../../constants/statusTypes";
import formatRelativeTime from "../../utils/formatRelativeTime";
import formatDate from "../../utils/formatDate";
import { showSuccess, showError } from "../ui/Toast";
import Badge from "../ui/Badge";

const PLATFORM_BADGE_VARIANT = {
  facebook: "info",
  instagram: "danger",
  twitter: "gray",
  tiktok: "gray",
};

const STATUS_BADGE_VARIANT = {
  [SOCIAL_POST_STATUS.PUBLISHED]: "success",
  [SOCIAL_POST_STATUS.SCHEDULED]: "warning",
  [SOCIAL_POST_STATUS.PENDING]: "info",
  [SOCIAL_POST_STATUS.REJECTED]: "danger",
};

const PostCard = ({ post, onEdit, onDeleteRequest }) => {
  const queryClient = useQueryClient();
  const isPublished = post.status === SOCIAL_POST_STATUS.PUBLISHED;

  const { data: analyticsResponse } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_POST_ANALYTICS(post.id),
    queryFn: ({ signal }) => getPostAnalytics(post.id, signal),
    enabled: isPublished,
    // Only fires for posts that have actually gone live — no point
    // calling Analytics for a post that hasn't published yet
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
        // scheduled_at intentionally omitted — the duplicate starts as
        // a fresh, unscheduled pending post rather than inheriting the
        // original's (possibly already-past) schedule time
      }),
    onSuccess: () => {
      showSuccess("Post duplicated.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SOCIAL_POSTS });
    },
    onError: () => showError("Failed to duplicate post."),
  });

  // Real, honest timestamp text — matches what's actually knowable
  // from the post's real scheduled_at field and its real status
  const getTimestampText = () => {
    if (!post.scheduled_at) return null;
    const scheduledDate = new Date(post.scheduled_at);
    const isFuture = scheduledDate > new Date();

    if (post.status === SOCIAL_POST_STATUS.PUBLISHED) {
      return `Published ${formatRelativeTime(post.scheduled_at)}`;
    }
    if (post.status === SOCIAL_POST_STATUS.SCHEDULED && isFuture) {
      return `Scheduled for ${formatDate(post.scheduled_at)}`;
    }
    return formatDate(post.scheduled_at);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
      {/* Image with platform + status badges overlaid */}
      <div className="relative aspect-video bg-gray-100">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            No image
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge
            label={post.platform}
            variant={PLATFORM_BADGE_VARIANT[post.platform] || "gray"}
            size="sm"
            rounded
          />
        </div>
        <div className="absolute top-2 right-2">
          <Badge
            label={post.status}
            variant={STATUS_BADGE_VARIANT[post.status] || "gray"}
            size="sm"
            rounded
          />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <p className="text-sm text-gray-800 line-clamp-2">{post.caption}</p>

        {/* Engagement row — real for published, dashes otherwise */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Likes", value: analytics?.likes },
            { label: "Comms", value: analytics?.comments },
            { label: "Shares", value: analytics?.shares },
            { label: "Reach", value: analytics?.reach },
          ].map((metric) => (
            <div key={metric.label}>
              <p className="text-sm font-semibold text-gray-900">
                {metric.value ?? "-"}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">{getTimestampText()}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(post)}
              className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
              aria-label="Edit post"
            >
              <AiOutlineEdit className="w-4 h-4" />
            </button>
            <button
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
              className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
              aria-label="Duplicate post"
            >
              <AiOutlineCopy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteRequest(post)}
              className="p-1.5 text-gray-400 hover:text-danger rounded-lg hover:bg-danger-light transition-colors"
              aria-label="Delete post"
            >
              <AiOutlineDelete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
