import { useState } from "react"; // useState manages the current pagination page locally
import { useQuery } from "@tanstack/react-query"; // useQuery handles fetching, caching, and loading state
import { BsClockHistory } from "react-icons/bs"; // History-clock icon for the gradient header badge
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants
import { getReturns } from "../../api/returns.api"; // GET /api/v1/returns/
import extractListData from "../../utils/extractListData"; // Defensive normalizer — handles both flat-array and paginated API response shapes
import formatDate from "../../utils/formatDate"; // Converts ISO date string into a readable format e.g. "Jun 29, 2026"
import { Link, useNavigate } from "react-router-dom"; // Link navigates to the Return Detail page when "View" is clicked; useNavigate drives the whole-row click
import { ROUTES } from "../../constants/routes"; // Route path constants, used for the "View" link below
import Badge from "../ui/Badge"; // Reusable status pill — auto-resolves color via getStatusColor
import DataTable from "../ui/DataTable"; // Shared table component used across the admin panel and the account pages — its built-in footer provides the pagination controls
import useScrollToSectionOnHash from "../../hooks/useScrollToSectionOnHash"; // Scrolls this card into view when the page is opened with the #previous-returns link (the dashboard's "View All")

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the pattern used across the admin tables. The first option
// is also the default page size when the page first loads.
const PAGE_SIZE_OPTIONS = [4, 10, 20];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const PreviousReturns = () => {
  const navigate = useNavigate();
  // navigate — drives the whole-row click, sending the customer to the same
  // Return Detail page the row's own "View" link already goes to

  // Current pagination page, starting at page 1
  const [currentPage, setCurrentPage] = useState(1);
  // How many returns are shown per page, controlled by the "Rows per
  // page" dropdown in the DataTable's pagination footer
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Called when the customer picks a different "rows per page" value.
  // Resets back to page 1 as well, since staying on a deep page number
  // could land past the end of the newly-sized result set.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // =============================================
  // RETURNS
  // GET /api/v1/returns/
  // =============================================
  // `page`, `page_size`, and `ordering` are sent straight through to the
  // backend, which already supports all three (see getReturns in
  // returns.api.js) — exactly one already-sorted, already-paginated
  // page of returns is fetched, no matter how many the customer has
  // filed in total. Same server-side pattern used on the admin orders
  // list; this replaces the previous approach of always fetching the
  // backend's default first page and re-sorting/re-slicing it in the
  // browser, which silently hid any return past the first page.
  const { data: returnsData, isLoading } = useQuery({
    // Distinct cache key per page/pageSize, still prefixed with
    // QUERY_KEYS.RETURNS so the submit mutation in ReturnRequest.jsx
    // (which invalidates QUERY_KEYS.RETURNS) refreshes every page of
    // this table, not just whichever one happens to be showing.
    queryKey: [...QUERY_KEYS.RETURNS, "list", { page: currentPage, pageSize }],
    queryFn: ({ signal }) =>
      getReturns(
        { ordering: "-created_at", page: currentPage, page_size: pageSize },
        signal,
      ),
    keepPreviousData: true, // keeps the previous page's rows on screen while a new page/page size loads
    staleTime: 1000 * 60 * 5,
  });

  // Ref for the card below. When the page is opened with the
  // "#previous-returns" link, the page scrolls down to this card once its
  // data has loaded.
  const sectionRef = useScrollToSectionOnHash("previous-returns", !isLoading);

  // Exactly one already-sorted, already-paginated page of returns
  // straight from the backend — routed through extractListData, which
  // handles both a plain array and a paginated response.
  const returns = extractListData(returnsData);
  const totalReturns = returnsData?.data?.count ?? returns.length;
  const totalPages = Math.max(1, Math.ceil(totalReturns / pageSize));

  // Table column configuration for DataTable
  const columns = [
    {
      key: "id",
      label: "ID",
      // Return ID — prefixed for a ticket-style format, matching the #CP- convention used for complaints
      render: (row) => (
        <span className="font-semibold text-gray-800 whitespace-nowrap">
          #RET-{row.id}
        </span>
      ),
    },
    {
      key: "order_number",
      label: "Order ID",
      render: (row) => (
        <span className="text-gray-500 whitespace-nowrap">
          {row.order_number}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      className: "max-w-55",
      // Truncated to one line so long text doesn't break the row
      render: (row) => (
        <p className="text-gray-600 line-clamp-1">{row.reason}</p>
      ),
    },
    {
      key: "status",
      label: "Status",
      // Color auto-resolved via getStatusColor (requested/approved/rejected)
      render: (row) => (
        <Badge
          label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          status={row.status}
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "created_at",
      label: "Filed On",
      render: (row) => (
        <span className="text-gray-400 whitespace-nowrap">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Action",
      // Navigates to the Return Detail page for this specific return
      render: (row) => (
        <Link
          to={ROUTES.ACCOUNT_RETURN_DETAIL.replace(":id", row.id)}
          onClick={(e) => e.stopPropagation()}
          // Stops this click from also bubbling up to the row's own
          // onClick, which navigates to the same page — avoids a
          // redundant double navigation when the link itself is clicked
          className="text-sm text-primary font-semibold hover:underline whitespace-nowrap"
        >
          View
        </Link>
      ),
    },
  ];

  // Once loading is done, hide the card entirely if the customer has no return history at all
  if (!isLoading && totalReturns === 0) return null;

  return (
    // Outer elevated card — white bg, rounded corners, soft shadow that glows emerald on hover, gradient strip on top
    // scroll-mt-28 keeps the card's heading clear of the fixed navbar when
    // the page scrolls to it
    <div
      ref={sectionRef}
      className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_26px_-8px_rgba(16,185,129,0.25)] transition-shadow duration-300 overflow-hidden scroll-mt-28"
    >
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
        <div className="p-4">
          <DataTable
            columns={columns}
            data={returns}
            keyField="id"
            onRowClick={(row) =>
              navigate(ROUTES.ACCOUNT_RETURN_DETAIL.replace(":id", row.id))
            }
            // Opens the same Return Detail page as the row's own "View"
            // link when any part of the row is clicked
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalReturns}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default PreviousReturns; // Export so it can be composed into ReturnRequest.jsx
