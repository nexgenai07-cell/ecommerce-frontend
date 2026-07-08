import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AiOutlineArrowLeft, AiOutlinePaperClip } from "react-icons/ai";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getComplaintDetail } from "../../api/complaints.api";
import { COMPLAINT_STATUS } from "../../constants/statusTypes";
import formatDate from "../../utils/formatDate";
import cn from "../../utils/cn";
import Container from "../../components/layouts/Container";
import { SkeletonDetail } from "../../components/ui/Skeleton";
import ErrorState from "../../components/ui/ErrorState";

// Status badge colors — same convention used in PreviousComplaints.jsx
const STATUS_CONFIG = {
  [COMPLAINT_STATUS.OPEN]: {
    label: "OPEN",
    className: "bg-danger-light text-danger",
  },
  [COMPLAINT_STATUS.IN_PROGRESS]: {
    label: "IN REVIEW",
    className: "bg-warning-light text-warning",
  },
  [COMPLAINT_STATUS.RESOLVED]: {
    label: "RESOLVED",
    className: "bg-success-light text-success",
  },
  [COMPLAINT_STATUS.CLOSED]: {
    label: "CLOSED",
    className: "bg-gray-100 text-gray-500",
  },
};

const ComplaintDetail = () => {
  // Extract the complaint ID from the URL — e.g. /account/complaints/10 → "10"
  const { id } = useParams();

  // =============================================
  // COMPLAINT DETAIL API — API 56 — GET /api/v1/complaints/{id}/
  // =============================================
  const {
    data: complaintData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.COMPLAINT_DETAIL(id),
    queryFn: () => getComplaintDetail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

  const complaint = complaintData?.data || null;

  // Loading state — full page skeleton, matches OrderDetail's pattern
  if (isLoading) {
    return (
      <Container className="py-6 sm:py-8">
        <SkeletonDetail />
      </Container>
    );
  }

  // Error state — retry button, matches OrderDetail's pattern
  if (isError || !complaint) {
    return (
      <Container className="py-6 sm:py-8">
        <ErrorState
          title="Couldn't load this complaint"
          message="It may have been removed, or something went wrong while fetching it."
          onRetry={refetch}
        />
      </Container>
    );
  }

  const statusConfig =
    STATUS_CONFIG[complaint.status] || STATUS_CONFIG[COMPLAINT_STATUS.OPEN];

  // The form prefixes "Subject: ..." to the first line of the message —
  // split it back out here for a cleaner detail view.
  const [firstLine, ...restLines] = (complaint.message || "").split("\n");
  const subject = firstLine?.replace(/^Subject:\s*/i, "") || firstLine;
  const body = restLines.join("\n").trim();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Back link */}
          <Link
            to={ROUTES.ACCOUNT_COMPLAINTS}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors w-fit"
          >
            <AiOutlineArrowLeft className="w-4 h-4" />
            Back to Complaints
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Complaint #CP-{complaint.id}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Filed on {formatDate(complaint.created_at)}
                {complaint.order_number && (
                  <> &middot; Order #{complaint.order_number}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {complaint.priority === "urgent" && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide bg-danger-light text-danger">
                  Urgent
                </span>
              )}
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

          {/* Original complaint card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {complaint.type} issue
            </p>
            <h2 className="text-base font-bold text-gray-900">{subject}</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
              {body}
            </p>

            {/* Attachment, if any was uploaded with the complaint */}
            {complaint.attachment && (
              <a
                href={complaint.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-fit px-3 py-1.5 mt-1 bg-gray-50 border border-gray-100 rounded-lg text-xs text-primary font-medium hover:underline"
              >
                <AiOutlinePaperClip className="w-3.5 h-3.5" />
                View attachment
              </a>
            )}
          </div>

          {/* Admin response — only shown once one exists */}
          {complaint.response ? (
            <div className="bg-primary-50 rounded-2xl border border-primary/10 p-6 flex flex-col gap-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                Response from {complaint.resolved_by_name || "Support Team"}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {complaint.response}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
              <p className="text-sm text-gray-500">
                Our team is currently reviewing your complaint. You'll see a
                response here once it's available.
              </p>
            </div>
          )}
        </div>
      </Container>
    </motion.div>
  );
};

export default ComplaintDetail;
