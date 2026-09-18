// Import the useQuery hook from React Query for fetching and caching server data
import { useQuery } from "@tanstack/react-query";
// Import the motion component from framer-motion for animating the page entrance
import { motion } from "framer-motion";
// Import a chat-bubble icon for the gradient page-header badge, from the "bs" (Bootstrap) icon set
import { BsChatSquareText } from "react-icons/bs";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches the list of complaints from the backend
import { getComplaints } from "../../api/complaints.api";
// Import the Container layout component used to constrain and center page content with consistent padding/max-width
import Container from "../../components/layouts/Container";
// Import the banner component that displays a warning when the user has an active/open complaint
import ActiveComplaintBanner from "../../components/complaint/ActiveComplaintBanner";
// Import the form component used to submit a new complaint (now a plain content section, no own card)
import ComplaintForm from "../../components/complaint/ComplaintForm";
// Import the sidebar component that explains the 3-step resolution protocol (now a plain content section, no own card)
import ResolutionProtocol from "../../components/complaint/ResolutionProtocol";
// Import the table component that lists the user's previous complaints
import PreviousComplaints from "../../components/complaint/PreviousComplaints";

// Define the ComplaintSubmit page component (no props required) — this is the main page that assembles all the smaller complaint-related components
const ComplaintSubmit = () => {
  // =============================================
  // COMPLAINTS API — cache warm-up for PreviousComplaints below
  // API 55 — GET /api/v1/complaints/
  // =============================================
  // UPDATED (API Changes Addendum, Sep 2026): the "is there an active
  // complaint" check that used to live here has moved into
  // ActiveComplaintBanner itself, which now fetches the real open
  // count directly from API 72.2 instead of this page guessing it from
  // the first "OPEN" row in this list (and always displaying "1"
  // regardless of the true count). This query is kept as-is purely to
  // warm the shared QUERY_KEYS.COMPLAINTS cache entry ahead of
  // PreviousComplaints below, which reads the exact same key.
  useQuery({
    // Unique cache key under which this query's data is stored/retrieved (shared with PreviousComplaints, so both stay in sync)
    queryKey: QUERY_KEYS.COMPLAINTS,
    // The actual async function that performs the API call to fetch complaints
    queryFn: ({ signal }) => getComplaints(undefined, signal),
    // Keep this data "fresh" (won't auto-refetch) for 2 minutes (2 * 60 * 1000 ms) to avoid unnecessary network calls
    staleTime: 1000 * 60 * 2,
  });

  // Begin the JSX returned by this page component
  return (
    // Wrap the entire page in a framer-motion div to animate its appearance
    <motion.div
      // Starting animation state: fully transparent (invisible)
      initial={{ opacity: 0 }}
      // Ending animation state: fully visible
      animate={{ opacity: 1 }}
      // Animation timing configuration: fade-in over 0.3 seconds
      transition={{ duration: 0.3 }}
    >
      {/* Container component constrains content width and adds vertical padding, larger on "sm" screens and up */}
      <Container className="py-6 sm:py-8">
        {/* Outer vertical flex layout stacking all page sections with consistent gap spacing between them */}
        <div className="flex flex-col gap-6">
          {/* Page heading row — plain, no card wrapper, sits directly on the page background */}
          {/* Row grouping a gradient icon badge with the title + subtitle stack */}
          <div className="flex items-center gap-3">
            {/* Gradient circular icon badge — same visual language used on the Return Request page header */}
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              {/* Chat-bubble icon, colored white so it pops against the gradient */}
              <BsChatSquareText className="w-5 h-5 text-white" />
            </div>
            {/* Column holding the main title and a short supporting subtitle */}
            <div className="flex flex-col">
              {/* Main page title, large and bold */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Submit a Complaint
              </h1>
              {/* Subtitle/description text explaining the purpose of this page, in smaller light gray text */}
              <p className="text-sm text-gray-400">
                We value your feedback. Our AI-driven support team will review
                your case immediately.
              </p>
            </div>
          </div>

          {/* Active complaint banner */}
          {/* Renders unconditionally now — it fetches the real open
              count itself (API 72.2) and shows nothing when that
              count is zero, so there's no prop to pass down anymore. */}
          <ActiveComplaintBanner />

          {/* ── SINGLE UNIFIED FORM CARD ──────────────────────────────────────────
              The complaint form and the resolution protocol sidebar used to be TWO
              separate boxed cards sitting next to each other. They now live inside
              ONE elevated, shadowed card, split internally by a vertical divider on
              desktop (and a horizontal divider on mobile) instead of two full boxes. */}
          <div className="relative bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            {/* Thin gradient accent strip across the very top of the unified card */}
            <div className="h-1 w-full bg-linear-to-r from-primary via-primary-light to-primary-dark" />

            {/* Grid container: single column on mobile/tablet, 3 columns from "lg" breakpoint up */}
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Left — Complaint Form (2/3 width on desktop) */}
              {/* Padded section taking 2 of 3 columns on large screens; right border only appears on large screens where the sidebar sits beside it */}
              <div className="lg:col-span-2 p-5 sm:p-8 lg:border-r lg:border-gray-100">
                {/* Render the complaint submission form, passing an onSuccess callback to run after a successful submission */}
                <ComplaintForm
                  onSuccess={() => {
                    // Form submit ke baad scroll to previous complaints
                    // After a successful submission, smoothly scroll the page down to the "previous complaints" section (if the element exists)
                    document
                      .getElementById("previous-complaints")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                />
              </div>

              {/* Right — Resolution Protocol (1/3 width on desktop) */}
              {/* Padded section taking 1 of 3 columns on large screens; top border only appears below "lg" where it stacks under the form instead of beside it */}
              <div className="lg:col-span-1 p-5 sm:p-8 border-t border-gray-100 lg:border-t-0">
                {/* Render the resolution protocol sidebar content explaining the 3-step review process */}
                <ResolutionProtocol />
              </div>
            </div>
          </div>

          {/* Previous Complaints table */}
          {/* ── The ONE other card on this page — a genuinely separate section (a history
              table), so giving it its own card here is intentional, not repetitive. */}
          {/* Wrapper div with an "previous-complaints" id, used as the scroll target referenced in the form's onSuccess callback above */}
          <div id="previous-complaints">
            {/* Render the table listing the user's previous complaints */}
            <PreviousComplaints />
          </div>
        </div>
      </Container>
    </motion.div>
  );
};

// Export this component as the default export so it can be used as the route's page component
export default ComplaintSubmit;
