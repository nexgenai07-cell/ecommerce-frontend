import { useState } from "react"; // useState manages the current pagination page locally
import { useQuery } from "@tanstack/react-query"; // useQuery handles fetching, caching, and loading state
import { BsClockHistory } from "react-icons/bs"; // History-clock icon for the gradient header badge
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants
import { getReturns } from "../../api/returns.api"; // API 51 — GET /api/v1/returns/
import extractListData from "../../utils/extractListData"; // Defensive normalizer — handles both flat-array and paginated API response shapes
import formatDate from "../../utils/formatDate"; // Converts ISO date string into a readable format e.g. "Jun 29, 2026"
import { Link } from "react-router-dom"; // Navigates to the Return Detail page when "View" is clicked
import { ROUTES } from "../../constants/routes"; // Route path constants, used for the "View" link below
import Badge from "../ui/Badge"; // Reusable status pill — auto-resolves color via getStatusColor
import Pagination from "../ui/Pagination"; // Same numbered prev/next pagination control used everywhere else in the app — replaces the old arrow-only Prev/Next buttons below

// How many returns to show per page
const PER_PAGE = 4;

const PreviousReturns = () => {
  // Current pagination page, starting at page 1
  const [currentPage, setCurrentPage] = useState(1);

  // =============================================
  // RETURNS API
  // API 51 — GET /api/v1/returns/
  // =============================================
  // Same QUERY_KEYS.RETURNS cache key used by the submit mutation in ReturnRequest.jsx,
  // so this table refreshes automatically right after a new return is submitted.
  const { data: returnsData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.RETURNS,
    queryFn: ({ signal }) => getReturns(undefined, signal),
    staleTime: 1000 * 60 * 5,
  });

  // Full returns array, newest first — falls back to empty array
  // Routed through extractListData defensively (API docs say flat array,
  // but other list endpoints in this project have drifted to paginated shape)
  const allReturns = [...extractListData(returnsData)].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const totalReturns = allReturns.length;
  const totalPages = Math.ceil(totalReturns / PER_PAGE);

  // Slice down to just the current page's rows
  const paginatedReturns = allReturns.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  // Once loading is done, hide the card entirely if the customer has no return history
  if (!isLoading && allReturns.length === 0) return null;

  return (
    // Outer elevated card — white bg, rounded corners, soft shadow that glows emerald on hover, gradient strip on top
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_26px_-8px_rgba(16,185,129,0.25)] transition-shadow duration-300 overflow-hidden">
      {/* Thin gradient accent strip across the top of the card, matching every other card on this page */}
      <div className="h-0.75 w-full bg-linear-to-r from-primary via-primary-light to-primary-dark" />

      {/* Card header */}
      {/* Row grouping the gradient icon badge with the "Previous Returns" heading */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
        {/* Small gradient icon badge — matches the header treatment used in the steps above */}
        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm shadow-primary/30 shrink-0">
          <BsClockHistory className="w-4 h-4 text-white" />
        </div>
        {/* Heading text */}
        <h2 className="text-base font-bold text-gray-900">Previous Returns</h2>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="p-5 flex flex-col gap-3">
          {/* bg-gray-100 (not gray-50) matches every other skeleton in the
              app — gray-50 is nearly the same shade as the white card
              behind it, so the animate-pulse fade made this look empty
              instead of loading. */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : (
        // Table wrapper — overflow-x-auto keeps columns intact on narrow screens, shows a
        // native horizontal scrollbar so the user knows there's more content to scroll to
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Header row — soft gradient tint instead of a flat gray, ties into the page's brand color */}
              <tr className="border-b border-gray-100 bg-linear-to-r from-primary-50/60 to-transparent">
                {[
                  "ID",
                  "Order ID",
                  "Reason",
                  "Status",
                  "Filed On",
                  "Action",
                ].map((col) => (
                  <th
                    key={col}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedReturns.map((ret) => (
                <tr
                  key={ret.id}
                  // Row hover now tints emerald instead of plain gray, tying it back to the brand color
                  className="hover:bg-primary-50/40 transition-colors duration-150"
                >
                  {/* Return ID — prefixed for a ticket-style format, matching #CMP- convention used for complaints */}
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">
                    #RET-{ret.id}
                  </td>

                  {/* Linked order number */}
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    {ret.order_number}
                  </td>

                  {/* Reason — truncated to one line so long text doesn't break the row */}
                  <td className="px-5 py-4 text-gray-600 max-w-55">
                    <p className="line-clamp-1">{ret.reason}</p>
                  </td>

                  {/* Status badge — color auto-resolved via getStatusColor (requested/approved/rejected) */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Badge
                      label={
                        ret.status.charAt(0).toUpperCase() + ret.status.slice(1)
                      }
                      status={ret.status}
                      size="sm"
                      rounded
                    />
                  </td>

                  {/* Filed-on date */}
                  <td className="px-5 py-4 text-gray-400 whitespace-nowrap">
                    {formatDate(ret.created_at)}
                  </td>

                  {/* View link — navigates to the Return Detail page (API 66) for this specific return */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Link
                      to={ROUTES.ACCOUNT_RETURN_DETAIL.replace(":id", ret.id)}
                      className="text-sm text-primary font-semibold hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination footer — same numbered Pagination component used
          everywhere else in the app instead of plain arrow-only Prev/Next.
          Pagination itself already hides when totalPages <= 1. */}
      {!isLoading && totalReturns > 0 && (
        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/30">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default PreviousReturns; // Export so it can be composed into ReturnRequest.jsx
