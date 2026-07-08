import { useState } from "react"; // Local pagination state — which page of tickets is currently visible
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import Badge from "../ui/Badge"; // Reusable status pill — auto-resolves color via getStatusColor
import Pagination from "../ui/Pagination"; // Reusable prev/next + page-number control — same component used on OrderHistory/NotificationHistory
import { RETURN_STATUS, COMPLAINT_STATUS } from "../../constants/statusTypes"; // Shared status constants — used to map raw status values to readable labels

// How many tickets to show per page — kept small since this is a dashboard
// summary widget, not the full history page (that lives on /account/returns
// and /account/complaints)
const PER_PAGE = 3;

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

const ActiveTickets = ({ tickets }) => {
  // Which page of the ticket list is currently visible — resets are not needed
  // since this widget never re-filters; the underlying tickets array only grows
  // or shrinks between query refetches, not between renders
  const [currentPage, setCurrentPage] = useState(1);

  // Guard clause — render nothing at all when there are no active tickets
  // This keeps the dashboard clean and avoids showing an empty card
  if (tickets.length === 0) return null;

  // Total pages derived from the full (already-sorted) ticket list length
  const totalPages = Math.ceil(tickets.length / PER_PAGE);

  // Slice out just the rows for the current page — classic client-side
  // pagination, same math used in NotificationHistory.jsx
  const paginatedTickets = tickets.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  return (
    // Outer fragment-like wrapper — the table card and the pagination control
    // are two separate visual pieces (Pagination has its own shadow/rounded
    // card look, same as everywhere else it's used, e.g. Products.jsx),
    // so they sit stacked with a gap rather than nested inside one box
    <div className="flex flex-col gap-4">
      {/* Card wrapper — white background, rounded corners, border, clips table overflow cleanly
          shadow-sm at rest + hover:shadow-xl + hover:-translate-y-1 gives the
          whole card a genuine raised feel, consistent with the other dashboard cards */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* ── Card header ────────────────────────────────────────────────────────
            Section title only — no action link needed since pagination below
            already gives access to every ticket
            border-b separates the header from the table below                    */}
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-base font-bold text-gray-900">
            Active Complaints & Returns
          </h2>
        </div>

        {/* ── Table wrapper ──────────────────────────────────────────────────────
            overflow-x-auto enables horizontal scrolling on narrow screens
            so all 5 columns remain accessible without breaking the layout         */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Table header row — column labels */}
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {/* Render each column header from an array — keeps markup DRY
                    whitespace-nowrap prevents column labels from wrapping onto two lines
                    "Reference" replaces the old "Order ID" label — see the reference
                    cell comment below for why */}
                {["ID", "Type", "Reference", "Status", "Filed On"].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            {/* Table body — one row per active ticket on the current page, separated by subtle dividers */}
            <tbody className="divide-y divide-gray-50">
              {paginatedTickets.map((ticket) => (
                <tr
                  key={ticket.id} // stable unique key for React's reconciler
                  className="hover:bg-gray-50/50 transition-colors" // subtle row highlight on hover
                >
                  {/* Ticket ID — medium weight so it reads as the primary identifier for the row */}
                  <td className="px-5 py-4 font-medium text-gray-800">
                    {ticket.id}
                  </td>

                  {/* Ticket type — e.g. "Return Request", "Complaint" — muted since it's secondary info */}
                  <td className="px-5 py-4 text-gray-500">{ticket.type}</td>

                  {/* Reference column — the order this ticket is linked to (order_number), OR,
                      for complaints that aren't tied to any order (e.g. type "other"), the
                      complaint's own category (e.g. "Payment", "Product") as a fallback.
                      This column is never a blank/dead cell — it always shows the customer
                      something they can use to identify what the ticket is actually about. */}
                  <td className="px-5 py-4 text-gray-500">
                    {ticket.reference}
                  </td>

                  {/* Status column — real status pulled from the ticket's underlying return/complaint record
                      Badge auto-resolves its color via getStatusColor, same as OrderStatusBadge does for orders */}
                  <td className="px-5 py-4">
                    <Badge
                      label={getTicketStatusLabel(ticket.status)} // human-readable label for the raw status
                      status={ticket.status} // raw status — Badge resolves the correct color from this
                      size="sm"
                      rounded
                    />
                  </td>

                  {/* Filed-on date — this is ticket.expectedResolution under the hood, which is actually
                      mapped from created_at in AccountDashboard.jsx (see NOTE there: the API doesn't
                      document a real "expected resolution" field, so we show the filing date instead
                      and label the column honestly rather than implying a future resolution estimate). */}
                  <td className="px-5 py-4 text-gray-400">
                    {formatDate(ticket.expectedResolution)}{" "}
                    {/* e.g. "Jul 5, 2026" */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────────
          Only rendered when there's more than one page — Pagination itself
          also guards for totalPages <= 1, but checking here too avoids
          reserving empty vertical space via the gap-4 above for nothing.
          Same prev/next + page-number control used across OrderHistory,
          NotificationHistory, and Products — kept as its own visual card
          rather than nested inside the table card above. */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ActiveTickets; // Export so it can be conditionally composed into the Customer Account Dashboard page
