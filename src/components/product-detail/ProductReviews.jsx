// PRODUCT REVIEWS — Reviews tab content on the Product Detail page
// ============================================================
// a rating
// breakdown bar chart, a paginated list of every review (newest
// first), a "Write a Review" flow for logged-in customers who haven't
// reviewed this product yet, and an Edit/Delete flow for a customer's
// own review card.

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineEdit, AiOutlineDelete, AiFillStar } from "react-icons/ai";
import { BsPatchCheckFill } from "react-icons/bs";

import { QUERY_KEYS } from "../../constants/queryKeys";
import {
  getProductReviews,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} from "../../api/reviews.api";

import useAuth from "../../hooks/useAuth";
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

// Fixed page size — matches the backend's own default DRF page size
// for this endpoint, same assumption already used by every other
// simple paginated list in this app (see OrderHistory.jsx's
// DEFAULT_PAGE_SIZE for the same pattern).
const PAGE_SIZE = 10;

// Star ratings run 5 -> 1 for the breakdown bar chart, matching the
// order a customer naturally scans a rating summary in (best first).
const BREAKDOWN_ORDER = ["5", "4", "3", "2", "1"];

// Small, self-contained clickable 1-5 star input — used only inside
// the Write/Edit Review form below. RatingStars.jsx (imported above)
// is display-only, so an editable version lives here instead, local
// to the one place in the app that needs it.
const StarRatingInput = ({ value, onChange, disabled }) => {
  // Tracks which star the pointer is currently hovering over, purely
  // for the live preview highlight — falls back to the committed
  // `value` the instant the pointer leaves the row.
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
  // The current page, handed to Login so the visitor returns here after signing in
  const location = useLocation();
  const queryClient = useQueryClient();
  // "user" is read here so a review card can be matched against the
  // currently logged-in customer by display name — see myReviewOnThisPage
  // below for exactly why name-matching is what the backend's own
  // response shape leaves us with.
  const { isAuthenticated, user } = useAuth();

  const [page, setPage] = useState(1);

  // Write/Edit form modal state. The SAME modal is reused for both
  // "Write a Review" (editingReview === null) and "Edit Your Review"
  // (editingReview holds the existing review object) — the fields and
  // submit mechanics are identical either way, only the mutation that
  // fires on submit differs.
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState("");

  // Delete confirmation — holds the full review object being deleted
  // (not just its id) so the confirmation copy could reference it if
  // ever needed, and so the modal's isOpen is simply !!deletingReview.
  const [deletingReview, setDeletingReview] = useState(null);

  // =============================================
  // REVIEWS QUERY — API 30.1 (GET, paginated)
  // =============================================
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCT_REVIEWS(productId), page],
    queryFn: ({ signal }) => getProductReviews(productId, { page }, signal),
    enabled: !!productId,
    staleTime: 1000 * 30,
  });

  const results = reviewsData?.data?.results || [];
  const count = reviewsData?.data?.count || 0;
  // "summary" is the authoritative, always-fresh rating snapshot the
  // backend attaches to every page of this endpoint — used for the
  // big average number and the breakdown bars instead of the product
  // detail response's own average_rating/review_count, so this stays
  // correct even the instant after this customer's own review lands.
  const summary = reviewsData?.data?.summary || {
    average_rating: 0,
    review_count: 0,
    breakdown: {},
  };
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Best-effort match of "which review, on the currently loaded page,
  // belongs to the logged-in customer". The backend's response doesn't
  // include a reviewer user id — only user_name — so this compares
  // display names, exactly as the addendum's own Frontend Notes for
  // API 30.2 suggest ("...or by matching the review's author against
  // the logged-in customer"). This only ever decides whether to OFFER
  // the Edit/Delete controls or the "Edit Your Review" button —
  // ownership itself is always re-enforced server-side on the actual
  // update/delete call regardless of what this match finds.
  const myReviewOnThisPage = results.find(
    (review) => user?.name && review.user_name === user.name,
  );

  // =============================================
  // ADD REVIEW — API 30.1 (POST)
  // =============================================
  const addMutation = useMutation({
    mutationFn: () =>
      addProductReview(productId, {
        rating: formRating,
        comment: formComment.trim() || undefined,
      }),
    onSuccess: () => {
      showSuccess("Thanks for your review!");
      closeForm();
      // A brand-new review sorts to the top (newest first, per the
      // addendum) and changes the rating summary/breakdown too, so
      // every cached page for this product needs a fresh fetch rather
      // than a targeted patch.
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_REVIEWS(productId),
      });
      // The product detail response's own average_rating/review_count
      // fields (API 30) are now stale too.
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(productId),
      });
      setPage(1);
    },
    onError: (error) => {
      const message = error?.response?.data?.error;
      // "Already reviewed" race (e.g. a second open tab submitting
      // first) — the review that won isn't necessarily on the page
      // currently loaded here, so a refetch is needed before Edit can
      // be offered for it.
      if (error?.response?.status === 400 && message) {
        showError(message);
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PRODUCT_REVIEWS(productId),
        });
        return;
      }
      showError(message || "Failed to submit your review.");
    },
  });

  // =============================================
  // UPDATE REVIEW — API 30.2 (PATCH — the customer's own review only)
  // =============================================
  const updateMutation = useMutation({
    mutationFn: () =>
      updateProductReview(editingReview.id, {
        rating: formRating,
        comment: formComment.trim(),
      }),
    onSuccess: () => {
      showSuccess("Review updated");
      closeForm();
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_REVIEWS(productId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(productId),
      });
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error || "Failed to update your review.",
      );
    },
  });

  // =============================================
  // DELETE REVIEW — API 30.2 (DELETE — soft delete, own review only)
  // =============================================
  const deleteMutation = useMutation({
    mutationFn: () => deleteProductReview(deletingReview.id),
    onSuccess: () => {
      showSuccess("Review deleted");
      setDeletingReview(null);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_REVIEWS(productId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(productId),
      });
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error || "Failed to delete your review.",
      );
      setDeletingReview(null);
    },
  });

  // Resets every piece of form state and closes the modal — shared by
  // both the Cancel button and a successful submit.
  const closeForm = () => {
    setShowFormModal(false);
    setEditingReview(null);
    setFormRating(0);
    setFormComment("");
    setFormError("");
  };

  // "Write a Review" button — guests are sent to Login first (checkout
  // and wishlist gate the same way elsewhere in this app). A customer
  // who already has a review on the currently loaded page is rerouted
  // straight into editing it instead, so they never even attempt the
  // POST that the backend would reject with its "already reviewed" 400.
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
    setShowFormModal(true);
  };

  const openEditForm = (review) => {
    setEditingReview(review);
    setFormRating(review.rating);
    setFormComment(review.comment || "");
    setFormError("");
    setShowFormModal(true);
  };

  const handleSubmitForm = () => {
    if (formRating < 1 || formRating > 5) {
      setFormError("Please select a star rating.");
      return;
    }
    setFormError("");
    if (editingReview) {
      updateMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Summary header — big average number, stars, and the
          5-star-down-to-1-star breakdown bar chart, per the addendum's
          Frontend Notes for API 30.1 ─── */}
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
          className="shrink-0 w-full sm:w-auto"
        >
          {myReviewOnThisPage ? "Edit Your Review" : "Write a Review"}
        </Button>
      </div>

      <div className="h-px bg-gray-100" />

      {/* ─── Review list — newest first, as returned by the backend ─── */}
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
                <Avatar name={review.user_name} size="md" />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {review.user_name}
                    </p>
                    {/* Verified Buyer badge — is_verified_purchase is
                        computed entirely server-side (a DELIVERED order
                        containing this product), never a frontend guess. */}
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

                  {/* Edit/Delete — only ever rendered on the current
                      customer's OWN review card, per the addendum's
                      Frontend Notes for API 30.2. */}
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
