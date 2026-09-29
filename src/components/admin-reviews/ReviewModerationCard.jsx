// ============================================================
// REVIEW MODERATION CARD
// ============================================================
// One review in the admin moderation queue. It shows everything an
// admin needs to decide: who wrote the review (real name and email),
// which product it is for, the star rating, the comment, the reviewer's
// profile picture (initials when none was added), the Verified Buyer
// badge and the current status.
//
// Approve and Reject are always offered except for the decision the
// review already has, because the decision is never final: an approved
// review can be rejected later and a rejected one approved.
//
// Props:
//   review     - one item of the admin review list
//   onApprove  - (review) => void
//   onReject   - (review) => void
//   isBusy     - true while a decision for this review is being sent, so
//                both buttons are locked and cannot be clicked twice

import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai";
import { BsPatchCheckFill } from "react-icons/bs";

import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import RatingStars from "../shared/RatingStars";
import formatDate from "../../utils/formatDate";

// Badge label and colour for each review status.
const STATUS_BADGES = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

const ReviewModerationCard = ({
  review,
  onApprove,
  onReject,
  isBusy = false,
}) => {
  const statusBadge = STATUS_BADGES[review.status] || {
    label: review.status,
    variant: "gray",
  };

  const canApprove = review.status !== "approved";
  const canReject = review.status !== "rejected";

  return (
    <article className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
      <Avatar
        src={review.profile_picture_url || ""}
        name={review.user_name}
        size="lg"
        className="shrink-0"
      />

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Reviewer identity, verification and current status */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="text-sm font-semibold text-gray-900">
            {review.user_name}
          </p>
          <span className="text-xs text-gray-400 break-all">
            {review.user_email}
          </span>
          {review.is_verified_purchase && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-light px-2 py-0.5 rounded-full">
              <BsPatchCheckFill className="w-3 h-3" />
              Verified Buyer
            </span>
          )}
          <Badge
            label={statusBadge.label}
            variant={statusBadge.variant}
            size="sm"
            rounded
          />
        </div>

        {/* The product the review belongs to */}
        <p className="text-xs text-gray-500">
          Product:{" "}
          <span className="font-medium text-gray-700">
            {review.product_name}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <RatingStars rating={review.rating} showCount={false} size="sm" />
          <span className="text-xs text-gray-400">
            {formatDate(review.created_at)}
          </span>
        </div>

        {review.comment ? (
          <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-line">
            {review.comment}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            The customer left a rating without a comment.
          </p>
        )}
      </div>

      {/* Moderation actions */}
      <div className="flex sm:flex-col items-stretch gap-2 sm:w-32 shrink-0">
        {canApprove && (
          <Button
            size="sm"
            onClick={() => onApprove(review)}
            disabled={isBusy}
            leftIcon={<AiOutlineCheck className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
          >
            Approve
          </Button>
        )}
        {canReject && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(review)}
            disabled={isBusy}
            leftIcon={<AiOutlineClose className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
          >
            Reject
          </Button>
        )}
      </div>
    </article>
  );
};

export default ReviewModerationCard;
