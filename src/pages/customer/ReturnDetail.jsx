import { useParams, Link } from "react-router-dom";
// Import the useQuery hook from React Query for fetching and caching server data
import { useQuery } from "@tanstack/react-query";
// Import the motion component from framer-motion for animating the page entrance
import { motion } from "framer-motion";
// Back-arrow for the "back to returns" link, and a package icon for the order chip
import { AiOutlineArrowLeft, AiOutlineInbox } from "react-icons/ai";
import { BsBoxSeam, BsPersonCheck, BsClockHistory } from "react-icons/bs";
// Import the ROUTES object which holds all the predefined route paths used across the app
import { ROUTES } from "../../constants/routes";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches a single return request's full detail — API 66
import { getReturnDetail } from "../../api/returns.api";
// Import the RETURN_STATUS constant object containing the fixed status values used by the API
import { RETURN_STATUS } from "../../constants/statusTypes";
// Import a utility function that formats raw date strings into a human-readable format
import formatDate from "../../utils/formatDate";
// Import a utility function "cn" used to conditionally join/merge Tailwind class names
import cn from "../../utils/cn";
// Import the Container layout component used to constrain and center page content with consistent padding/max-width
import Container from "../../components/layouts/Container";
// Import the full-page skeleton loader shown while the return detail is being fetched
// SkeletonDetailThread mirrors this page's actual "conversation thread" layout
// (icon-badge header + two stacked message cards) rather than the unrelated
// generic detail-page skeleton, so the page no longer jumps in height once
// the real return data arrives.
import { SkeletonDetailThread } from "../../components/ui/Skeleton";
// Import the reusable error state component shown if the fetch fails
import ErrorState from "../../components/ui/ErrorState";

// Status badge colors — same convention used in ReturnStatus.jsx (Order Detail page),
// kept identical here so the status pill always looks the same wherever it appears
// across the returns module.
const STATUS_CONFIG = {
  // "pending" is the REAL backend value for a freshly-filed, undecided return
  // (see the note in constants/statusTypes.js) — displayed as "Pending Review"
  [RETURN_STATUS.REQUESTED]: {
    label: "Pending Review",
    className: "bg-warning-light text-warning",
  },
  [RETURN_STATUS.APPROVED]: {
    label: "Approved",
    className: "bg-success-light text-success",
  },
  [RETURN_STATUS.REJECTED]: {
    label: "Rejected",
    className: "bg-danger-light text-danger",
  },
};

// Define the ReturnDetail page component (no props required) — renders the full detail view for one return request
const ReturnDetail = () => {
  // Extract the return ID from the URL — e.g. /account/returns/16 → "16"
  const { id } = useParams();

  // =============================================
  // RETURN DETAIL API — API 66: GET /api/v1/returns/{id}/
  // =============================================
  const {
    data: returnData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    // Unique cache key that includes the return ID so each return's detail is cached independently
    queryKey: QUERY_KEYS.RETURN_DETAIL(id),
    queryFn: ({ signal }) => getReturnDetail(id, signal),
    // Only run this query once an ID is actually present in the URL
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

  // Safely extract the return object from the nested API response shape, defaulting to null if not yet available
  const orderReturn = returnData?.data || null;

  // Loading state — full page skeleton, matches ComplaintDetail's pattern
  if (isLoading) {
    return (
      <Container className="py-6 sm:py-8">
        <SkeletonDetailThread />
      </Container>
    );
  }

  // Error state — retry button, matches ComplaintDetail's pattern
  if (isError || !orderReturn) {
    return (
      <Container className="py-6 sm:py-8">
        <ErrorState
          title="Couldn't load this return"
          message="It may have been removed, or something went wrong while fetching it."
          onRetry={refetch}
        />
      </Container>
    );
  }

  // Look up the styling/label config for this return's status, falling back to the "pending" config if status is unrecognized
  const statusConfig =
    STATUS_CONFIG[orderReturn.status] || STATUS_CONFIG[RETURN_STATUS.REQUESTED];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Back link — returns to the Returns list page */}
          <Link
            to={ROUTES.ACCOUNT_RETURNS}
            className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors w-fit"
          >
            <AiOutlineArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Returns
          </Link>

          {/* Header — icon badge + title/subtitle on the left, status badge on the right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                <BsBoxSeam className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Return #RET-{orderReturn.id}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Filed on {formatDate(orderReturn.created_at)}
                  {orderReturn.order_number && (
                    <> &middot; Order #{orderReturn.order_number}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide",
                  statusConfig.className,
                )}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Return details card */}
          <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_6px_22px_-6px_rgba(16,24,40,0.10)] overflow-hidden">
            <div className="h-1 w-full bg-linear-to-r from-primary via-primary-light to-primary-dark" />

            <div className="p-5 sm:p-6 flex items-start gap-4">
              <div className="relative z-10 w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm shadow-primary/30 shrink-0 ring-4 ring-white">
                <AiOutlineInbox className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Reason for return
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {orderReturn.reason || "No reason provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Decision card — only shown once the return has been approved or rejected;
              otherwise a "pending" waiting-state card, matching ComplaintDetail's pattern */}
          {orderReturn.status === RETURN_STATUS.APPROVED ||
          orderReturn.status === RETURN_STATUS.REJECTED ? (
            <div
              className={cn(
                "relative rounded-3xl border overflow-hidden",
                orderReturn.status === RETURN_STATUS.APPROVED
                  ? "bg-linear-to-br from-primary-50 to-white border-primary/10 shadow-[0_6px_22px_-6px_rgba(16,185,129,0.12)]"
                  : "bg-linear-to-br from-danger-light/40 to-white border-danger/10",
              )}
            >
              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div
                  className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white",
                    orderReturn.status === RETURN_STATUS.APPROVED
                      ? "bg-linear-to-br from-primary-dark to-primary shadow-sm shadow-primary/30"
                      : "bg-danger",
                  )}
                >
                  <BsPersonCheck className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      orderReturn.status === RETURN_STATUS.APPROVED
                        ? "text-primary"
                        : "text-danger",
                    )}
                  >
                    {orderReturn.status === RETURN_STATUS.APPROVED
                      ? "Return approved"
                      : "Return rejected"}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {orderReturn.status === RETURN_STATUS.APPROVED
                      ? "Your return has been approved. Please follow the instructions shared with you (or check your order for pickup/drop-off details) to complete the return."
                      : "Your return request was not approved. If you believe this is a mistake, please reach out via Support Tickets."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden">
              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="relative z-10 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 ring-4 ring-white">
                  <BsClockHistory className="w-4.5 h-4.5 text-gray-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-600">
                    Awaiting review
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                    Our team is currently reviewing your return request. You'll
                    see a decision here once it's available.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </motion.div>
  );
};

// Export this component as the default export so it can be used as the route's page component
export default ReturnDetail;
