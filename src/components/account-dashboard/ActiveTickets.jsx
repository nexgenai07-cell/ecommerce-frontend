import { useState } from "react"; // Local pagination state — which page of tickets is currently visible
import { Link, useNavigate } from "react-router-dom"; // Link navigates to the return/complaint detail page when "View" is clicked; useNavigate drives the whole-row click
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import Badge from "../ui/Badge"; // Reusable status pill — auto-resolves color via getStatusColor
import DataTable from "../ui/DataTable"; // Shared table component used across the admin panel and the rest of the
// customer account pages — swapped in here so this widget finally gets the
// same green gradient header, row divider, compact font size, hover tint,
// and whole-row click behavior as every other table in the app, instead of
// the hand-built <table> markup it used before
import { RETURN_STATUS, COMPLAINT_STATUS } from "../../constants/statusTypes"; // Shared status constants — used to map raw status values to readable labels

// Selectable "rows per page" values for this widget's dropdown. Kept
// smaller than the full history pages (OrderHistory, PreviousComplaints,
// PreviousReturns) since this is still a compact dashboard summary, not
// the full ticket list — but the customer can now expand it in place
// instead of only having Prev/Next available.
const PAGE_SIZE_OPTIONS = [3, 10, 20];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// getTicketStatusLabel — converts a raw return/complaint status string into a human-readable label
// A ticket here can only be a pending return (RETURN_STATUS.REQUESTED, real value
// "pending") or a non-closed complaint ("open" / "in_progress" / "resolved"), since
// AccountDashboard.jsx pre-filters the list before it ever reaches this component
const getTicketStatusLabel = (status) => {
  switch (status) {
    case RETURN_STATUS.REQUESTED:
      return "Requested"; // Return request submitted, awaiting seller review
    case COMPLAINT_STATUS.OPEN:
      return "Open"; // Complaint raised, not yet picked up
    case COMPLAINT_STATUS.IN_PROGRESS:
      return "In Progress"; // Support team is actively working on it
    case COMPLAINT_STATUS.RESOLVED:
      return "Resolved"; // Issue has been fixed, awaiting customer confirmation/closure
    default:
      return status; // Fallback — shows the raw value instead of hiding it
  }
};

const ActiveTickets = ({
  tickets,
  title = "Complaints & Returns", // Section heading shown above the table
  showType = true, // When false, hides the "Type" column — used when this
  // component renders a single-type table (e.g. only complaints, or only
  // returns) where every row would show the same value anyway
}) => {
  const navigate = useNavigate();
  // navigate — drives the whole-row click, sending the customer to the same
  // return/complaint detail page the row's own "View" link already goes to

  // Which page of the ticket list is currently visible — resets are not needed
  // since this widget never re-filters; the underlying tickets array only grows
  // or shrinks between query refetches, not between renders
  const [currentPage, setCurrentPage] = useState(1);
  // How many tickets are shown per page, controlled by the "Rows per page"
  // dropdown rendered inside DataTable's built-in pagination footer
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Called when the customer picks a different "rows per page" value.
  // Resets back to page 1 as well, since staying on a deep page number
  // could land past the end of the newly-sized result set.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Guard clause — render nothing at all when there are no active tickets
  // This keeps the dashboard clean and avoids showing an empty card
  if (tickets.length === 0) return null;

  // Total pages derived from the full (already-sorted) ticket list length
  const totalPages = Math.ceil(tickets.length / pageSize);

  // Slice out just the rows for the current page — classic client-side
  // pagination, same math used in NotificationHistory.jsx
  const paginatedTickets = tickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Column configuration handed to the shared DataTable — mirrors the five
  // visible columns the hand-built version rendered, plus the trailing
  // View action, so nothing the customer sees changes except the styling
  // and the new whole-row click.
  const columns = [
    {
      key: "id",
      label: "ID",
      render: (ticket) => (
        <span className="font-medium text-gray-800">{ticket.id}</span>
      ),
    },
    // "Type" column is conditionally included — omitted when showType is
    // false, since a single-type table (all complaints, or all returns)
    // would just repeat the same value on every row
    ...(showType
      ? [
          {
            key: "type",
            label: "Type",
            render: (ticket) => (
              <span className="text-gray-500">{ticket.type}</span>
            ),
          },
        ]
      : []),
    {
      key: "reference",
      // Reference column — the order this ticket is linked to (order_number), OR,
      // for complaints that aren't tied to any order (e.g. type "other"), the
      // complaint's own category (e.g. "Payment", "Product") as a fallback.
      // This column is never a blank/dead cell — it always shows the customer
      // something they can use to identify what the ticket is actually about.
      label: "Reference",
      render: (ticket) => (
        <span className="text-gray-500">{ticket.reference}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      // Badge auto-resolves its color via getStatusColor, same as OrderStatusBadge does for orders
      render: (ticket) => (
        <Badge
          label={getTicketStatusLabel(ticket.status)} // human-readable label for the raw status
          status={ticket.status} // raw status — Badge resolves the correct color from this
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "expectedResolution",
      // Filed-on date — this is ticket.expectedResolution under the hood, which is actually
      // mapped from created_at in AccountDashboard.jsx (see NOTE there: the API doesn't
      // document a real "expected resolution" field, so we show the filing date instead
      // and label the column honestly rather than implying a future resolution estimate).
      label: "Filed On",
      render: (ticket) => (
        <span className="text-gray-400">
          {formatDate(ticket.expectedResolution)} {/* e.g. "Jul 5, 2026" */}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Action",
      // View link — navigates straight to the underlying return's or complaint's
      // own detail page, using the linkTo built for this ticket in
      // AccountDashboard.jsx (it already knows whether this row is a return or
      // a complaint).
      render: (ticket) => (
        <Link
          to={ticket.linkTo}
          onClick={(e) => e.stopPropagation()}
          // Stops this click from also bubbling up to the row's own
          // onClick, which navigates to the same page — avoids a
          // redundant double navigation when the link itself is clicked
          className="text-sm text-primary font-semibold hover:underline"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    // Outer wrapper — h-full so this card stretches to match its sibling's
    // height when the two of them sit side by side in a CSS grid row (the
    // grid row itself already stretches both items to the tallest one's
    // height by default; h-full is what lets THIS div actually fill that
    // stretched space instead of staying at its own content height). No
    // border/shadow of its own — DataTable supplies its own card chrome
    // (border, shadow, rounded corners) around the table + pagination
    // footer below, same pattern OrderManagement/ReturnsManagement use on
    // the admin side, so this widget doesn't end up with a double
    // border/shadow stacked on top of DataTable's.
    <div className="h-full flex flex-col gap-3">
      {/* Section title — sits above the table card instead of inside a
          shared header bar, matching how every other admin page titles
          its DataTable */}
      <h2 className="text-base font-bold text-gray-900">{title}</h2>

      {/* DataTable — same shared component every admin table and the rest of
          the customer account tables use, so this widget now matches them
          exactly: green gradient header, visible row divider, compact font
          size, stronger hover tint, and clicking anywhere on a row opens the
          same detail page as its own "View" link. flex-1 lets this wrapper
          consume the remaining height below the title, and className="h-full"
          on DataTable itself carries that height into its own card, so a
          short table's pagination footer still lands flush with a taller
          sibling table's footer instead of floating right under its last row. */}
      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)] flex-1">
        <DataTable
          columns={columns}
          data={paginatedTickets}
          keyField="id"
          onRowClick={(ticket) => navigate(ticket.linkTo)}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={tickets.length}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={handlePageSizeChange}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default ActiveTickets; // Export so it can be conditionally composed into the Customer Account Dashboard page
