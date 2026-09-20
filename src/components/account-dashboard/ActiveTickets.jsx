import { Link, useNavigate } from "react-router-dom"; // Link opens a ticket's detail page or the full list; useNavigate drives the whole-row click
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import Badge from "../ui/Badge"; // Reusable status pill — auto-resolves color via getStatusColor
import DataTable from "../ui/DataTable"; // Shared table component used across the admin panel and the customer account pages
import { RETURN_STATUS, COMPLAINT_STATUS } from "../../constants/statusTypes"; // Shared status constants — used to map raw status values to readable labels

// How many of the most recent tickets the dashboard preview shows. The full
// history lives on the Complaints and Returns pages, reached through the
// "View All" link in the card header.
const MAX_VISIBLE_TICKETS = 3;

// getTicketStatusLabel — converts a raw return/complaint status string into a human-readable label
// A ticket is either a return (RETURN_STATUS.REQUESTED, whose value is "pending",
// or an approved/rejected return) or a complaint ("open" / "in_progress" /
// "resolved" / "closed"), as prepared by AccountDashboard.jsx
const getTicketStatusLabel = (status) => {
  switch (status) {
    case RETURN_STATUS.REQUESTED:
      return "Pending"; // Return request submitted, awaiting seller review
    case COMPLAINT_STATUS.OPEN:
      return "Open"; // Complaint raised, not yet picked up
    case COMPLAINT_STATUS.IN_PROGRESS:
      return "In Progress"; // Support team is actively working on it
    case COMPLAINT_STATUS.RESOLVED:
      return "Resolved"; // Issue has been fixed, awaiting customer confirmation/closure
    default:
      // Any other status (for example approved, rejected or closed) is shown
      // with its first letter capitalised
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
  }
};

const ActiveTickets = ({
  tickets,
  title = "Complaints & Returns", // Section heading shown in the card header
  viewAllTo, // Route (optionally with a #section hash) the "View All" link opens — the link is left out when omitted
  showType = true, // When false, hides the "Type" column — used when this
  // component renders a single-type table (e.g. only complaints, or only
  // returns) where every row would show the same value anyway
}) => {
  const navigate = useNavigate();
  // navigate — drives the whole-row click, sending the customer to the same
  // return/complaint detail page the row's own "View" link goes to

  // Guard clause — render nothing at all when there are no tickets
  // This keeps the dashboard clean and avoids showing an empty card
  if (tickets.length === 0) return null;

  // The preview only shows the most recent tickets (the list arrives sorted
  // newest first)
  const visibleTickets = tickets.slice(0, MAX_VISIBLE_TICKETS);

  // Column configuration handed to the shared DataTable
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
      // The column always shows something the customer can use to identify
      // what the ticket is about.
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
      // Filed-on date — ticket.expectedResolution holds the ticket's created_at
      // date (see AccountDashboard.jsx). The column is hidden on phones to
      // keep the table narrow enough to read without scrolling sideways.
      label: "Filed On",
      className: "hidden sm:table-cell",
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
    // Card wrapper — the same card treatment as the Recent Orders table above
    // it. h-full makes the card fill its grid cell, so two cards sitting side
    // by side always end at the same height, whichever has fewer rows.
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* ── Card header ────────────────────────────────────────────────────
          Section title on the left, "View All" link on the right. The link
          opens the full list on its own page and scrolls to its table. The
          header has only a small bottom padding and no divider line, so the
          table sits close underneath the title.                           */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="text-sm text-primary font-medium hover:underline"
          >
            View All
          </Link>
        )}
      </div>

      {/* DataTable — the same shared component used everywhere else, so this
          widget has the same green gradient header, row dividers, compact font
          size and hover tint. Clicking anywhere on a row opens the same
          detail page as its own "View" link. There is no pagination here:
          the preview is a fixed short list, and "View All" leads to the full
          history. The wrapper has no top padding, so the table starts right
          below the header. */}
      <div className="px-4 pb-4">
        <DataTable
          columns={columns}
          data={visibleTickets}
          keyField="id"
          onRowClick={(ticket) => navigate(ticket.linkTo)}
          hidePagination
        />
      </div>
    </div>
  );
};

export default ActiveTickets; // Export so it can be composed into the Customer Account Dashboard page
