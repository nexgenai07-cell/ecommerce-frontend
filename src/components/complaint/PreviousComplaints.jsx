// Import React's useState hook for managing local component state (e.g., current pagination page)
import { useState } from "react";
// Import the useQuery hook from React Query for fetching and caching server data
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
// Import filter and download icons from the react-icons Ant Design icon set
import { AiOutlineFilter, AiOutlineDownload } from "react-icons/ai";
// Import a history-clock icon for the gradient header badge, from the "bs" (Bootstrap) icon set
import { BsClockHistory } from "react-icons/bs";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches the list of complaints from the backend
import { getComplaints } from "../../api/complaints.api";
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the complaints endpoint)
// Import the COMPLAINT_STATUS constant object containing the fixed status values used by the API
import { COMPLAINT_STATUS } from "../../constants/statusTypes";
// Import a utility function that formats raw date strings into a human-readable format
import formatDate from "../../utils/formatDate";
// Import a utility function "cn" used to conditionally join/merge Tailwind class names
import cn from "../../utils/cn";
// Import the shared DataTable component used across the admin panel — the
// table and its numbered pagination footer are now both driven by this,
// instead of a plain <table> plus a separately-rendered Pagination control
import DataTable from "../ui/DataTable";

// Status badge colors
// Define a lookup object mapping each complaint status to its display label and badge styling classes
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

// Define how many complaints should be shown per page in the pagination
const PER_PAGE = 4;

// Define the PreviousComplaints functional component (no props required)
const PreviousComplaints = () => {
  // State holding the currently active pagination page number, starting at page 1
  const [currentPage, setCurrentPage] = useState(1);

  // =============================================
  // COMPLAINTS API
  // API 55 — GET /api/v1/complaints/
  // =============================================
  // Fetch the list of complaints using React Query, also extracting the loading state
  const { data: complaintsData, isLoading } = useQuery({
    // Unique cache key under which this query's data is stored/retrieved
    queryKey: QUERY_KEYS.COMPLAINTS,
    // The actual async function that performs the API call to fetch complaints
    queryFn: ({ signal }) => getComplaints(undefined, signal),
    // Keep this data "fresh" (won't auto-refetch) for 2 minutes (2 * 60 * 1000 ms) to avoid unnecessary network calls
    staleTime: 1000 * 60 * 2,
  });

  // Safely extract the complaints array from the API response, defaulting to an empty array if data isn't available yet
  // API_Documentation_Final.pdf (API 55) documents a flat array — routed
  // through the normalizer defensively in case of backend/docs drift.
  const allComplaints = extractListData(complaintsData);
  // Calculate the total number of complaints fetched
  const totalComplaints = allComplaints.length;
  // Calculate the total number of pages needed based on total complaints and how many fit per page (rounded up)
  const totalPages = Math.max(1, Math.ceil(totalComplaints / PER_PAGE));

  // Paginated complaints
  // Slice the full complaints array down to just the items that belong on the current page
  const paginatedComplaints = allComplaints.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  // Table column configuration for DataTable
  const columns = [
    {
      key: "id",
      label: "ID",
      // Cell displaying the complaint's ID, prefixed with "#CP-" for a ticket-style format
      render: (row) => (
        <span className="font-semibold text-gray-800 whitespace-nowrap">
          #CP-{row.id}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      // Cell displaying the complaint's type, with capitalized first letter styling
      render: (row) => (
        <span className="text-gray-500 capitalize whitespace-nowrap">
          {row.type}
        </span>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      className: "max-w-50",
      // Cell displaying a short subject preview, capped at a max width.
      // Paragraph clamped to a single line (with ellipsis if too long);
      // strips the "Subject: " label the form prepends server-side,
      // showing only the actual subject content
      render: (row) => (
        <p className="text-gray-600 line-clamp-1">
          {row.message?.split("\n")[0]?.replace(/^Subject:\s*/i, "") ||
            row.message}
        </p>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        // Look up the styling/label config for this complaint's status,
        // falling back to the "OPEN" config if status is unrecognized
        const statusConfig =
          STATUS_CONFIG[row.status] || STATUS_CONFIG[COMPLAINT_STATUS.OPEN];
        return (
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide whitespace-nowrap",
              statusConfig.className,
            )}
          >
            {statusConfig.label}
          </span>
        );
      },
    },
    {
      key: "created_at",
      label: "Date",
      render: (row) => (
        <span className="text-gray-400 whitespace-nowrap">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Action",
      // Navigates to the Complaint Detail page (API 56) for this specific complaint
      render: (row) => (
        <Link
          to={ROUTES.ACCOUNT_COMPLAINT_DETAIL.replace(":id", row.id)}
          className="text-sm text-primary font-semibold hover:underline whitespace-nowrap"
        >
          View
        </Link>
      ),
    },
  ];

  // If data has finished loading and there are no complaints at all, render nothing (hide this component entirely)
  if (!isLoading && allComplaints.length === 0) return null;

  // Begin the JSX returned by this component
  return (
    // Outer elevated card — white bg, rounded corners, soft shadow that glows emerald on hover, gradient strip on top
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_26px_-8px_rgba(16,185,129,0.25)] transition-shadow duration-300 overflow-hidden">
      {/* Thin gradient accent strip across the top of the card, matching the Previous Returns table */}
      <div className="h-0.75 w-full bg-linear-to-r from-primary via-primary-light to-primary-dark" />

      {/* Header */}
      {/* Header row: flex container spacing the title (with gradient icon) and action icons apart, with horizontal/vertical padding and a bottom border */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        {/* Row grouping the gradient icon badge with the "Previous Complaints" heading */}
        <div className="flex items-center gap-2.5">
          {/* Small gradient icon badge — matches the header treatment used on the Returns page */}
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm shadow-primary/30 shrink-0">
            <BsClockHistory className="w-4 h-4 text-white" />
          </div>
          {/* Bold heading text displaying the card's title */}
          <h3 className="text-base font-bold text-gray-900">
            Previous Complaints
          </h3>
        </div>
        {/* Container for the header action icon buttons, arranged horizontally with small gap spacing */}
        <div className="flex items-center gap-1">
          {/* Filter icon button, currently without functionality wired up, now a pill that glows emerald on hover instead of plain gray */}
          <button
            className="p-1.5 rounded-full text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            aria-label="Filter"
          >
            <AiOutlineFilter className="w-4 h-4" />
          </button>
          {/* Export/download icon button, currently without functionality wired up, same pill hover treatment */}
          <button
            className="p-1.5 rounded-full text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            aria-label="Export"
          >
            <AiOutlineDownload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {/* Conditionally render either a loading skeleton or the actual table, depending on the isLoading flag */}
      {isLoading ? (
        // Loading state container: padding around the skeleton rows, vertical flex layout with gap spacing between them
        <div className="p-5 flex flex-col gap-3">
          {/* Render three placeholder skeleton bars to simulate loading rows.
              bg-gray-100 (not gray-50) is used here to match every other
              skeleton in the app — gray-50 sits almost flush with the white
              card background, so the animate-pulse fade made this section
              look empty instead of loading. */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="p-4">
          <DataTable
            columns={columns}
            data={paginatedComplaints}
            keyField="id"
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalComplaints}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default PreviousComplaints;
