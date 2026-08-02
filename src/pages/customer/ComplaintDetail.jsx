import { useParams, Link } from "react-router-dom";
// Import the useQuery hook from React Query for fetching and caching server data
import { useQuery } from "@tanstack/react-query";
// Import the motion component from framer-motion for animating the page entrance
import { motion } from "framer-motion";
// Import back-arrow, paperclip (attachment), robot (AI/system), person (agent), and clock icons used throughout this redesigned page
import { AiOutlineArrowLeft, AiOutlinePaperClip } from "react-icons/ai";
import {
  BsRobot,
  BsPersonCheck,
  BsClockHistory,
  BsChatSquareDots,
} from "react-icons/bs";
// Import the ROUTES object which holds all the predefined route paths used across the app
import { ROUTES } from "../../constants/routes";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches a single complaint's full detail from the backend
import { getComplaintDetail } from "../../api/complaints.api";
// Import the COMPLAINT_STATUS constant object containing the fixed status values used by the API
import { COMPLAINT_STATUS } from "../../constants/statusTypes";
// Import a utility function that formats raw date strings into a human-readable format
import formatDate from "../../utils/formatDate";
// Import a utility function "cn" used to conditionally join/merge Tailwind class names
import cn from "../../utils/cn";
// Import the Container layout component used to constrain and center page content with consistent padding/max-width
import Container from "../../components/layouts/Container";
// Import the full-page skeleton loader shown while the complaint detail is being fetched
import { SkeletonDetail } from "../../components/ui/Skeleton";
// Import the reusable error state component shown if the fetch fails
import ErrorState from "../../components/ui/ErrorState";

// Status badge colors — same convention used in PreviousComplaints.jsx, kept identical here so the
// status pill always looks the same wherever it appears across the complaints module
const STATUS_CONFIG = {
  // Configuration for the "OPEN" status: red/danger themed badge
  [COMPLAINT_STATUS.OPEN]: {
    label: "OPEN",
    className: "bg-danger-light text-danger",
  },
  // Configuration for the "IN_PROGRESS" status: yellow/warning themed badge, displayed as "IN REVIEW"
  [COMPLAINT_STATUS.IN_PROGRESS]: {
    label: "IN REVIEW",
    className: "bg-warning-light text-warning",
  },
  // Configuration for the "RESOLVED" status: green/success themed badge
  [COMPLAINT_STATUS.RESOLVED]: {
    label: "RESOLVED",
    className: "bg-success-light text-success",
  },
  // Configuration for the "CLOSED" status: neutral gray themed badge
  [COMPLAINT_STATUS.CLOSED]: {
    label: "CLOSED",
    className: "bg-gray-100 text-gray-500",
  },
};

// Define the ComplaintDetail page component (no props required) — renders the full detail view for one complaint
const ComplaintDetail = () => {
  // Extract the complaint ID from the URL — e.g. /account/complaints/10 → "10"
  const { id } = useParams();

  // =============================================
  // COMPLAINT DETAIL API — GET /api/v1/complaints/{id}/
  // =============================================
  // Fetch this specific complaint's full detail using React Query, also extracting loading/error state and a refetch function
  const {
    data: complaintData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    // Unique cache key that includes the complaint ID so each complaint's detail is cached independently
    queryKey: QUERY_KEYS.COMPLAINT_DETAIL(id),
    // The actual async function that performs the API call, passing along the ID from the URL
    queryFn: () => getComplaintDetail(id),
    // Only run this query once an ID is actually present in the URL
    enabled: !!id,
    // Keep this data "fresh" (won't auto-refetch) for 2 minutes (2 * 60 * 1000 ms) to avoid unnecessary network calls
    staleTime: 1000 * 60 * 2,
  });

  // Safely extract the complaint object from the nested API response shape, defaulting to null if not yet available
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

  // Look up the styling/label config for this complaint's status, falling back to the "OPEN" config if status is unrecognized
  const statusConfig =
    STATUS_CONFIG[complaint.status] || STATUS_CONFIG[COMPLAINT_STATUS.OPEN];

  // The form prefixes "Subject: ..." to the first line of the message —
  // split it back out here for a cleaner detail view.
  const [firstLine, ...restLines] = (complaint.message || "").split("\n");
  const subject = firstLine?.replace(/^Subject:\s*/i, "") || firstLine;
  const body = restLines.join("\n").trim();

  // Begin the JSX returned by this page component
  return (
    // Wrap the entire page in a framer-motion div to animate its appearance
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Container component constrains content width and adds vertical padding, larger on "sm" screens and up */}
      <Container className="py-6 sm:py-8">
        {/* Outer vertical flex layout, capped at a comfortable reading width so long complaint text doesn't stretch edge-to-edge on wide screens */}
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Back link */}
          {/* Navigates back to the complaints list page; the arrow nudges slightly left on hover for a bit of tactile feedback */}
          <Link
            to={ROUTES.ACCOUNT_COMPLAINTS}
            className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors w-fit"
          >
            <AiOutlineArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Complaints
          </Link>

          {/* Header */}
          {/* Row grouping a gradient icon badge with the title/subtitle stack on the left, and status badges on the right.
              Stacks vertically on mobile, sits side-by-side from "sm" breakpoint up. */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left side — icon badge + title/subtitle, matching the header treatment used on the Submit Complaint page */}
            <div className="flex items-center gap-3">
              {/* Gradient circular icon badge — same visual language used across the complaints module */}
              <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                <BsChatSquareDots className="w-5 h-5 text-white" />
              </div>
              {/* Title + filed-on/order-number subtitle stack */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Complaint #CP-{complaint.id}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Filed on {formatDate(complaint.created_at)}
                  {complaint.order_number && (
                    <> &middot; Order #{complaint.order_number}</>
                  )}
                </p>
              </div>
            </div>

            {/* Right side — priority + status badges, wrapped so they don't overflow on narrow screens */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Urgent priority badge — only shown when this complaint was flagged as urgent */}
              {complaint.priority === "urgent" && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide bg-danger-light text-danger">
                  Urgent
                </span>
              )}
              {/* Status pill, dynamically colored based on the statusConfig looked up above */}
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

          {/* ── Conversation thread ─────────────────────────────────────────────
              The original complaint and the admin response now read as a connected
              two-step thread (customer message → support response) instead of two
              unrelated boxes, using a vertical connector line between the two avatar
              badges — same "timeline" language used in the Resolution Protocol panel
              on the Submit Complaint page, for visual consistency across the module. */}
          <div className="relative flex flex-col gap-4">
            {/* Connector line running behind both avatar badges below, from the middle of the first
                badge down to the middle of the second one. Only rendered here once, positioned with
                fixed offsets that line up with the 10-unit-wide avatar badges used in both cards. */}
            <div className="absolute left-5 top-10 bottom-10 w-px bg-linear-to-b from-primary-200 via-gray-200 to-gray-200" />

            {/* Original complaint card */}
            {/* Elevated card — white background, soft resting shadow that strengthens on hover, gradient accent
                strip on top, matching the "raised" card treatment used across the rest of the complaints module */}
            <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_6px_22px_-6px_rgba(16,24,40,0.10)] hover:shadow-[0_14px_32px_-8px_rgba(16,24,40,0.14)] transition-shadow duration-300 overflow-hidden">
              {/* Thin gradient accent strip across the top of the card */}
              <div className="h-1 w-full bg-linear-to-r from-primary via-primary-light to-primary-dark" />

              {/* Card body — flex row with an avatar badge on the left and the complaint content on the right */}
              <div className="p-5 sm:p-6 flex items-start gap-4">
                {/* Avatar badge representing the customer's own submission — a filled gradient circle with the
                    complaint-type icon, sits above the connector line thanks to the parent's z-index stacking */}
                <div className="relative z-10 w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm shadow-primary/30 shrink-0 ring-4 ring-white">
                  <BsRobot className="w-4.5 h-4.5 text-white" />
                </div>
                {/* Content column: type label, subject heading, body text, and optional attachment chip */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  {/* Small uppercase label naming the complaint category */}
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {complaint.type} issue
                  </p>
                  {/* Subject heading, bold and slightly larger than body text */}
                  <h2 className="text-base font-bold text-gray-900">
                    {subject}
                  </h2>
                  {/* Full complaint body text, preserving line breaks and using relaxed line height for readability */}
                  <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                    {body}
                  </p>

                  {/* Attachment, if any was uploaded with the complaint — styled as a small clickable chip */}
                  {complaint.attachment && (
                    <a
                      href={complaint.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-fit px-3 py-1.5 mt-1 bg-primary-50 border border-primary-100 rounded-lg text-xs text-primary font-semibold hover:bg-primary-100 transition-colors"
                    >
                      <AiOutlinePaperClip className="w-3.5 h-3.5" />
                      View attachment
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Admin response — only shown once one exists; otherwise a "pending" state card is shown instead */}
            {complaint.response ? (
              // Response received — elevated card tinted with the brand color so it visually reads as
              // "the reply" in the thread, with a person-check avatar badge distinguishing it from the
              // customer's own message above (which uses the robot/AI-triage avatar)
              <div className="relative bg-linear-to-br from-primary-50 to-white rounded-3xl border border-primary/10 shadow-[0_6px_22px_-6px_rgba(16,185,129,0.12)] overflow-hidden">
                {/* Card body — flex row with an avatar badge on the left and the response content on the right */}
                <div className="p-5 sm:p-6 flex items-start gap-4">
                  {/* Avatar badge representing the support agent's reply */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-linear-to-br from-primary-dark to-primary flex items-center justify-center shadow-sm shadow-primary/30 shrink-0 ring-4 ring-white">
                    <BsPersonCheck className="w-4.5 h-4.5 text-white" />
                  </div>
                  {/* Content column: responder label and the response body text */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Label naming who responded, falling back to a generic "Support Team" if no name is provided */}
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Response from{" "}
                      {complaint.resolved_by_name || "Support Team"}
                    </p>
                    {/* The actual response text, preserving line breaks and using relaxed line height for readability */}
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {complaint.response}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // No response yet — a calmer "waiting" state card, with a clock avatar badge and a soft pulse
              // animation on the icon so it reads as "actively pending" rather than a dead-end empty box
              <div className="relative bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden">
                {/* Card body — flex row with a pulsing clock avatar on the left and the waiting message on the right */}
                <div className="p-5 sm:p-6 flex items-start gap-4">
                  {/* Avatar badge with a soft pulse animation, signaling that this step is still in progress */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 ring-4 ring-white">
                    <BsClockHistory className="w-4.5 h-4.5 text-gray-400 animate-pulse" />
                  </div>
                  {/* Waiting message content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-600">
                      Awaiting response
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                      Our team is currently reviewing your complaint. You'll see
                      a response here once it's available.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </motion.div>
  );
};

// Export this component as the default export so it can be used as the route's page component
export default ComplaintDetail;
