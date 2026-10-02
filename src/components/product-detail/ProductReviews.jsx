// ============================================================
// PRODUCT REVIEWS — Reviews tab content on the Product Detail page
// ============================================================
// Shows the rating summary with a star breakdown bar chart, the paginated
// list of approved reviews (newest first), a "Write a Review" flow for
// logged-in customers who have received the product, and an Edit / Delete
// flow on the customer's own review card.
//
// Reviews are moderated. A review a customer submits or edits is held
// back until an admin approves it, so:
//   - the list and the rating summary only ever contain approved reviews;
//   - after submitting or editing, the customer is told the review is
//     awaiting approval, and the review is not added to the list;
//   - a customer whose review is still pending will not see it in the
//     list, which is why a repeated submit is answered with an
//     explanatory message instead of an edit shortcut.

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineEdit,
  AiOutlineDelete,
  AiFillStar,
  AiOutlineClose,
  AiOutlineInfoCircle,
} from "react-icons/ai";
import { BsPatchCheckFill } from "react-icons/bs";

import { QUERY_KEYS } from "../../constants/queryKeys";
import {
  getProductReviews,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} from "../../api/reviews.api";

import useAuth from "../../hooks/useAuth";
import useReviewPicture from "../../hooks/useReviewPicture";
import { ROUTES } from "../../constants/routes";
import { showSuccess, showError } from "../ui/Toast";
import formatRelativeTime from "../../utils/formatRelativeTime";

import RatingStars from "../shared/RatingStars";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import Modal from "../ui/Modal";
import ConfirmModal from "../ui/ConfirmModal";
import Pagination from "../ui/Pagination";
import ReviewPicturePicker from "./ReviewPicturePicker";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

// Fixed page size, matching the backend's default page size for this
// list (the same assumption every other simple paginated list in this
// app makes, see OrderHistory.jsx).
const PAGE_SIZE = 10;

// Star ratings run 5 -> 1 for the breakdown bar chart, matching the
// order a customer naturally scans a rating summary in (best first).
const BREAKDOWN_ORDER = ["5", "4", "3", "2", "1"];

// Small, self-contained clickable 1-5 star input, used only inside the
// Write / Edit Review form below. RatingStars (imported above) is
// display-only, so an editable version lives here, local to the one
// place in the app that needs it.
const StarRatingInput = ({ value, onChange, disabled }) => {
  // The star the pointer is currently hovering over, used only for the
  // live preview highlight. It falls back to the committed `value` the
  // moment the pointer leaves the row.
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 disabled:cursor-not-allowed"
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
        >
          <AiFillStar
            className={`w-7 h-7 transition-colors ${
              star <= (hovered || value) ? "text-yellow-400" : "text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ProductReviews = ({ productId }) => {
  const navigate = useNavigate();
  // The current page, handed to Login so the visitor returns here after
  // signing in.
  const location = useLocation();
  const queryClient = useQueryClient();
  // "user" is used to match a review card against the logged-in
  // customer by display name, see myReviewOnThisPage below.
  const { isAuthenticated, user } = useAuth();

  const [page, setPage] = useState(1);

  // Write / Edit form state. The same modal is used for both writing a
  // new review (editingReview === null) and editing an existing one
  // (editingReview holds that review). The fields and submit mechanics
  // are identical; only the mutation that runs on submit differs.
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState("");
  const [pictureError, setPictureError] = useState("");
  const { picture, selectPicture, clearPicture } = useReviewPicture();

  // The review being deleted, kept as the full object so the modal's
  // open state is simply !!deletingReview.
  const [deletingReview, setDeletingReview] = useState(null);

  // Set when the server refuses reviews from this customer for this
  // product (they have not received it yet). It disables the write
  // action and explains why. The product id is stored with the message
  // so it never leaks onto a different product's page.
  const [writeBlocked, setWriteBlocked] = useState(null);

  // Persistent notice shown after a review is submitted or edited, so
  // the customer has time to read that it is awaiting approval. Stored
  // with the product id for the same reason as writeBlocked.
  const [notice, setNotice] = useState(null);

  // =============================================
  // REVIEWS QUERY (paginated, approved reviews only)
  // =============================================
  const { data: reviewsData, isLoading } = useQuery({
    // The response depends on who is asking (it says whether this customer
    // may write a review), so signing in or out loads it again.
    queryKey: [...QUERY_KEYS.PRODUCT_REVIEWS(productId), page, isAuthenticated],
    queryFn: ({ signal }) => getProductReviews(productId, { page }, signal),
    enabled: !!productId,
    staleTime: 1000 * 30,
  });

  const results = reviewsData?.data?.results || [];
  const count = reviewsData?.data?.count || 0;
  // "summary" is the rating snapshot the backend attaches to every page
  // of this endpoint. It is used for the big average number and the
  // breakdown bars, and it only counts approved reviews, so it always
  // matches the list shown below it.
  const summary = reviewsData?.data?.summary || {
    average_rating: 0,
    review_count: 0,
    breakdown: {},
  };
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Best-effort match of which review on the loaded page belongs to the
  // logged-in customer. The response has no reviewer user id, only
  // user_name, so display names are compared. This only decides whether
  // to OFFER the Edit / Delete controls and the "Edit Your Review"
  // button. Ownership is always enforced again on the server when the
  // update or delete request is made.
  const myReviewOnThisPage = results.find(
    (review) => user?.name && review.user_name === user.name,
  );

  const isWriteBlocked = writeBlocked?.productId === productId;

  // Only customers who received this product may write a review. The
  // server states this for the signed-in customer as can_review; an
  // explicit false disables the action. While the server does not send the
  // value, a signed-in customer keeps the action and the server's 403
  // answer (handled in addMutation) still blocks anyone who is not
  // eligible. Visitors who are not signed in cannot review either. A
  // customer who already has a review keeps the edit action.
  const canWriteReview =
    !isWriteBlocked &&
    (Boolean(myReviewOnThisPage) ||
      (isAuthenticated && reviewsData?.data?.can_review !== false));

  // Explains why the write action is disabled.
  const writeDisabledMessage = isWriteBlocked
    ? writeBlocked.message
    : !canWriteReview
      ? isAuthenticated
        ? "Only customers who have bought and received this product can write a review."
        : "Sign in to write a review. Only customers who have bought and received this product can review it."
      : "";
  const activeNotice = notice?.productId === productId ? notice.message : "";

  const refreshReviews = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PRODUCT_REVIEWS(productId),
    });
    // The rating shown on the product itself depends on approved reviews
    // too, so it must be fetched again as well.
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PRODUCT_DETAIL(productId),
    });
  };

  // Removes one review from every cached page of this product's review
  // list. Used after an edit, because the edited review is pending again
  // and must disappear from the product page right away.
  const removeReviewFromCache = (reviewId) => {
    queryClient.setQueriesData(
      { queryKey: QUERY_KEYS.PRODUCT_REVIEWS(productId) },
      (cached) => {
        const cachedResults = cached?.data?.results;
        if (!Array.isArray(cachedResults)) return cached;

        const remaining = cachedResults.filter(
          (review) => review.id !== reviewId,
        );
        if (remaining.length === cachedResults.length) return cached;

        return {
          ...cached,
          data: {
            ...cached.data,
            results: remaining,
            count: Math.max(0, (cached.data.count ?? 0) - 1),
          },
        };
      },
    );
  };

  // Resets every piece of form state and closes the modal. Shared by the
  // Cancel button and by a successful submit.
  const closeForm = () => {
    setShowFormModal(false);
    setEditingReview(null);
    setFormRating(0);
    setFormComment("");
    setFormError("");
    setPictureError("");
    clearPicture();
  };

  // =============================================
  // ADD REVIEW
  // =============================================
  const addMutation = useMutation({
    mutationFn: () =>
      addProductReview(productId, {
        rating: formRating,
        comment: formComment.trim() || undefined,
        profilePicture: picture?.file,
      }),
    onSuccess: (response) => {
      const message = response?.data?.message;

      // A customer's review starts as pending and is not part of the
      // list yet, so it is deliberately not added to the list here. An
      // admin's own review is approved at once and has no message; the
      // refresh below makes it appear.
      if (message) {
        setNotice({ productId, message });
        showSuccess("Review submitted.");
      } else {
        showSuccess("Thanks for your review!");
      }

      closeForm();
      refreshReviews();
      setPage(1);
    },
    onError: (error) => {
      const message = getApiErrorMessage(
        error,
        "Failed to submit your review.",
      );
      const status = error?.response?.status;

      // The product has not been received by this customer yet.
      if (status === 403) {
        setWriteBlocked({ productId, message });
        closeForm();
        showError(message);
        return;
      }

      // The image itself was rejected. Nothing was saved, so the form
      // stays open and the message is shown next to the picture.
      if (status === 400 && message.includes("Profile picture")) {
        setPictureError(message);
        return;
      }

      // This customer already has a review for the product. If it were
      // approved it would be in the list (and the write button would
      // already be an edit button), so the existing review is most
      // likely still awaiting approval.
      if (status === 400 && message.includes("already reviewed")) {
        closeForm();
        showError(
          "You have already reviewed this product. If you cannot see your review yet, it is awaiting admin approval.",
        );
        refreshReviews();
        return;
      }

      showError(message);
    },
  });

  // =============================================
  // UPDATE REVIEW (the customer's own review only)
  // =============================================
  const updateMutation = useMutation({
    mutationFn: () =>
      updateProductReview(editingReview.id, {
        rating: formRating,
        comment: formComment.trim(),
        profilePicture: picture?.file,
      }),
    onSuccess: (response) => {
      const message = response?.data?.message;

      // An edited review goes back to pending, so it is taken off the
      // product page immediately instead of waiting for the refetch.
      removeReviewFromCache(editingReview.id);

      if (message) {
        setNotice({ productId, message });
      }
      showSuccess("Review updated.");

      closeForm();
      refreshReviews();
    },
    onError: (error) => {
      const message = getApiErrorMessage(
        error,
        "Failed to update your review.",
      );
      const status = error?.response?.status;

      // The image itself was rejected. Nothing was saved, so the form
      // stays open and the message is shown next to the picture.
      if (status === 400 && message.includes("Profile picture")) {
        setPictureError(message);
        return;
      }

      // The review no longer exists (for example it was deleted in
      // another tab), so the list is refreshed.
      if (status === 404) {
        closeForm();
        refreshReviews();
      }

      showError(message);
    },
  });

  // =============================================
  // DELETE REVIEW (soft delete, own review only)
  // =============================================
  const deleteMutation = useMutation({
    mutationFn: () => deleteProductReview(deletingReview.id),
    onSuccess: () => {
      showSuccess("Review deleted");
      setDeletingReview(null);
      refreshReviews();
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, "Failed to delete your review."));
      setDeletingReview(null);
    },
  });

  // "Write a Review" button. Guests are sent to Login first (checkout and
  // wishlist gate the same way elsewhere in this app). A customer who
  // already has a review on the loaded page is taken straight into
  // editing it instead.
  const openWriteForm = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { state: { from: location } });
      return;
    }
    if (myReviewOnThisPage) {
      openEditForm(myReviewOnThisPage);
      return;
    }
    setEditingReview(null);
    setFormRating(0);
    setFormComment("");
    setFormError("");
    setPictureError("");
    clearPicture();
    setShowFormModal(true);
  };

  const openEditForm = (review) => {
    setEditingReview(review);
    setFormRating(review.rating);
    setFormComment(review.comment || "");
    setFormError("");
    setPictureError("");
    clearPicture();
    setShowFormModal(true);
  };

  const handlePictureSelect = (file) => {
    setPictureError("");
    selectPicture(file);
  };

  const handleSubmitForm = () => {
    if (formRating < 1 || formRating > 5) {
      setFormError("Please select a star rating.");
      return;
    }
    setFormError("");
    setPictureError("");
    if (editingReview) {
      updateMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Summary header: big average number, stars, and the
          5-star-down-to-1-star breakdown bar chart ─── */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <p className="text-4xl font-bold text-gray-900">
            {Number(summary.average_rating || 0).toFixed(1)}
          </p>
          <RatingStars
            rating={Number(summary.average_rating) || 0}
            showCount={false}
            size="md"
          />
          <p className="text-xs text-gray-400">
            {summary.review_count || 0} review
            {summary.review_count === 1 ? "" : "s"}
          </p>
        </div>

        {summary.review_count > 0 && (
          <div className="flex-1 w-full flex flex-col gap-1.5">
            {BREAKDOWN_ORDER.map((star) => {
              const pct = Number(summary.breakdown?.[star] || 0);
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-10 shrink-0">
                    {star} star
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right shrink-0">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant={myReviewOnThisPage ? "outline" : "primary"}
          onClick={openWriteForm}
          disabled={!canWriteReview}
          className="shrink-0 w-full sm:w-auto"
        >
          {myReviewOnThisPage ? "Edit Your Review" : "Write a Review"}
        </Button>
      </div>

      {/* Explains why the write action is disabled for this customer. */}
      {writeDisabledMessage && (
        <p className="text-xs text-gray-500 leading-relaxed">
          {writeDisabledMessage}
        </p>
      )}

      {/* Confirmation shown after a review is submitted or edited. It
          stays visible until the customer dismisses it. */}
      {activeNotice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-light px-3.5 py-3"
        >
          <AiOutlineInfoCircle className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <p className="flex-1 text-xs text-gray-700 leading-relaxed">
            {activeNotice}
          </p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Dismiss message"
          >
            <AiOutlineClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="h-px bg-gray-100" />

      {/* ─── Review list: newest first, as returned by the backend ─── */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-full bg-gray-50 rounded" />
                <div className="h-3 w-2/3 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {results.map((review) => {
            const isMine = user?.name && review.user_name === user.name;
            return (
              <div key={review.id} className="flex gap-3">
                {/* The reviewer's own picture when they added one, the
                    initials avatar otherwise. */}
                <Avatar
                  src={review.profile_picture_url || ""}
                  name={review.user_name}
                  size="md"
                />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {review.user_name}
                    </p>
                    {/* The Verified Buyer badge is computed entirely on
                        the server (a delivered order containing this
                        product), never guessed by the frontend. */}
                    {review.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-light px-2 py-0.5 rounded-full">
                        <BsPatchCheckFill className="w-3 h-3" />
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars
                      rating={review.rating}
                      showCount={false}
                      size="sm"
                    />
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed mt-1">
                      {review.comment}
                    </p>
                  )}

                  {/* Edit / Delete are only rendered on the current
                      customer's own review card. */}
                  {isMine && (
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(review)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                      >
                        <AiOutlineEdit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingReview(review)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-danger transition-colors"
                      >
                        <AiOutlineDelete className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* ─── Write / Edit Review modal ─── */}
      <Modal
        isOpen={showFormModal}
        onClose={closeForm}
        title={editingReview ? "Edit Your Review" : "Write a Review"}
        size="sm"
        closeOnBackdrop={!isSubmitting}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Your Rating
            </p>
            <StarRatingInput
              value={formRating}
              onChange={setFormRating}
              disabled={isSubmitting}
            />
            {formError && <p className="text-xs text-danger">{formError}</p>}
          </div>

          <Textarea
            label="Your Review (optional)"
            placeholder="Share your thoughts about this product..."
            rows={4}
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            disabled={isSubmitting}
          />

          <ReviewPicturePicker
            previewUrl={picture?.previewUrl || null}
            currentUrl={editingReview?.profile_picture_url || null}
            onSelect={handlePictureSelect}
            onInvalid={setPictureError}
            onRemove={() => {
              setPictureError("");
              clearPicture();
            }}
            error={pictureError}
            disabled={isSubmitting}
          />

          <p className="text-xs text-gray-400 leading-relaxed">
            {editingReview
              ? "After you save your changes, your review is checked by our team again before it appears on the product page."
              : "Your review is checked by our team before it appears on the product page."}
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closeForm}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitForm} isLoading={isSubmitting}>
              {editingReview ? "Save Changes" : "Submit Review"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete confirmation ─── */}
      <ConfirmModal
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Review?"
        message="This will permanently remove your review from this product. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default ProductReviews;
