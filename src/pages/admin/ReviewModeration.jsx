// ============================================================
// REVIEW MODERATION PAGE (Admin)
// ============================================================
// The queue where an admin decides which customer reviews appear on the
// storefront. Every review a customer submits (or edits) is held as
// "pending" until it is approved here.
//
// Four tabs filter the queue by status: Pending (the default), Approved,
// Rejected and All. Approve and Reject send the decision to the server.
// Because a decision can always be changed later, a review can be moved
// between Approved and Rejected at any time. Rejecting asks for
// confirmation first, since it takes a review off the product page.
//
// The list can also be narrowed to one product by opening the page with
// a "product_id" query parameter (for example /admin/reviews?product_id=12).

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineStar, AiOutlineClose } from "react-icons/ai";

import { QUERY_KEYS } from "../../constants/queryKeys";
import { getAdminReviews, moderateReview } from "../../api/reviews.api";
import { showSuccess, showError } from "../../components/ui/Toast";

import PageHeader from "../../components/shared/PageHeader";
import StatusTabs from "../../components/shared/StatusTabs";
import ReviewModerationCard from "../../components/admin-reviews/ReviewModerationCard";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmModal from "../../components/ui/ConfirmModal";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

// Number of reviews per page, matching the server's default page size.
const PAGE_SIZE = 10;

// Only these four values may be sent as the status filter: the server
// treats any other value as "pending".
const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

// Text of the empty state for each tab.
const EMPTY_STATE_COPY = {
  pending: {
    title: "No reviews waiting for approval",
    description: "New customer reviews will appear here for you to approve.",
  },
  approved: {
    title: "No approved reviews",
    description: "Reviews you approve are listed here.",
  },
  rejected: {
    title: "No rejected reviews",
    description: "Reviews you reject are kept here so you can find them again.",
  },
  all: {
    title: "No reviews yet",
    description: "Customer reviews will appear here once they are submitted.",
  },
};

const ReviewModeration = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);

  // The review whose rejection is waiting for confirmation.
  const [reviewToReject, setReviewToReject] = useState(null);
  // The id of the review whose decision is currently being sent.
  const [busyReviewId, setBusyReviewId] = useState(null);

  // An optional product filter, taken from the URL. Only a plain positive
  // whole number is accepted, so a corrupted value is never sent on.
  const rawProductId = searchParams.get("product_id");
  const productId = /^\d+$/.test(rawProductId || "") ? rawProductId : null;

  // =============================================
  // REVIEW LIST QUERY
  // =============================================
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.ADMIN_REVIEWS, status, productId, page],
    queryFn: ({ signal }) =>
      getAdminReviews(
        { status, product_id: productId || undefined, page },
        signal,
      ),
    staleTime: 1000 * 15,
  });

  const reviews = data?.data?.results || [];
  const totalCount = data?.data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // The product name is read from the loaded reviews, for the filter chip.
  const filteredProductName = reviews[0]?.product_name;

  // =============================================
  // APPROVE / REJECT MUTATION
  // =============================================
  const moderateMutation = useMutation({
    mutationFn: ({ review, action }) => moderateReview(review.id, action),
    onMutate: ({ review }) => setBusyReviewId(review.id),
    onSuccess: (_response, { action }) => {
      showSuccess(
        action === "approve"
          ? "Review approved. It is now visible on the product page."
          : "Review rejected. It is no longer shown to customers.",
      );
    },
    onError: (error, { review }) => {
      showError(getApiErrorMessage(error, "Failed to update the review."));

      // The review no longer exists (for example the customer deleted
      // it), so the closing refresh below removes it from the list.
      if (error?.response?.status === 404) {
        showError("This review no longer exists.");
      }
      setBusyReviewId((current) => (current === review.id ? null : current));
    },
    onSettled: () => {
      setBusyReviewId(null);

      // Refresh every list that depends on review status: this queue,
      // the pending count on the dashboard, and the public review lists
      // and product ratings.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_REVIEWS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ALL_PRODUCT_REVIEWS,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
    },
  });

  const handleApprove = (review) =>
    moderateMutation.mutate({ review, action: "approve" });

  const handleConfirmReject = () => {
    const review = reviewToReject;
    setReviewToReject(null);
    if (review) moderateMutation.mutate({ review, action: "reject" });
  };

  const handleStatusChange = (nextStatus) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const clearProductFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("product_id");
    setSearchParams(nextParams, { replace: true });
    setPage(1);
  };

  const emptyCopy = EMPTY_STATE_COPY[status];

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <PageHeader icon={<AiOutlineStar />} title="Review Moderation" />

      <div className="flex flex-col gap-3">
        <StatusTabs
          tabs={STATUS_TABS}
          activeKey={status}
          onChange={handleStatusChange}
        />

        {productId && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
              Product: {filteredProductName || `#${productId}`}
              <button
                type="button"
                onClick={clearProductFilter}
                className="hover:text-primary-dark transition-colors"
                aria-label="Show reviews of all products"
              >
                <AiOutlineClose className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-4 p-5 bg-white rounded-xl border border-gray-100 animate-pulse"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 w-1/3 bg-gray-100 rounded" />
                <div className="h-3 w-1/4 bg-gray-100 rounded" />
                <div className="h-3 w-full bg-gray-50 rounded" />
                <div className="h-3 w-2/3 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="bg-white rounded-xl border border-gray-100">
          <ErrorState
            title="Couldn't load reviews"
            message="Something went wrong while fetching reviews. Please try again."
            onRetry={refetch}
          />
        </div>
      )}

      {!isLoading && !isError && reviews.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            variant="noResults"
            title={emptyCopy.title}
            description={emptyCopy.description}
          />
        </div>
      )}

      {!isLoading && !isError && reviews.length > 0 && (
        <div
          className={`flex flex-col gap-3 transition-opacity ${
            isFetching ? "opacity-70" : "opacity-100"
          }`}
        >
          {reviews.map((review) => (
            <ReviewModerationCard
              key={review.id}
              review={review}
              onApprove={handleApprove}
              onReject={setReviewToReject}
              isBusy={busyReviewId === review.id}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmModal
        isOpen={!!reviewToReject}
        onClose={() => setReviewToReject(null)}
        onConfirm={handleConfirmReject}
        title="Reject this review?"
        message="A rejected review is hidden from customers and is not counted in the product's rating. It stays stored here, and you can approve it again at any time."
        confirmLabel="Reject"
        variant="danger"
      />
    </div>
  );
};

export default ReviewModeration;
