import { useState } from "react";
import {
  AiOutlineArrowUp,
  AiOutlineArrowDown,
  AiOutlineMinus,
} from "react-icons/ai";

import formatPrice from "../../utils/formatPrice";
import formatPriceOrDash from "../../utils/formatPriceOrDash";
import formatPercent from "../../utils/formatPercent";
import formatDate from "../../utils/formatDate";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const DailyBreakdownTable = ({ dataPoints, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many daily rows are shown per page, controlled by
  // the "Rows per page" dropdown in the table footer. Purely a
  // client-side slice of the already-fetched `dataPoints`, so no extra
  // network request is made when it changes.

  // Resets back to page 1 whenever the rows-per-page value changes, so
  // staying on a deep page of a differently sized list can't land on an
  // empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Sorted newest-first
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  // Revenue, AOV, and the trend indicator are all computed against the
  // FULL sorted list first — the trend for any given day depends on
  // comparing it to the day immediately after it in this array, so
  // that comparison has to happen before pagination slices the list
  // down to a single page. Slicing first would compare each row on a
  // page to the wrong neighboring day, or lose the comparison
  // entirely at a page boundary.
  const enrichedPoints = sortedPoints.map((point, index) => {
    // Comparing against the NEXT item in this newest-first array means
    // comparing against the day chronologically BEFORE this one — a
    // real, adjacent-day comparison
    const previousDay = sortedPoints[index + 1];
    const revenue = Number(point.total_revenue) || 0;
    const previousRevenue = previousDay
      ? Number(previousDay.total_revenue) || 0
      : null;

    const aov = point.total_orders > 0 ? revenue / point.total_orders : 0;

    let trendIcon = <AiOutlineMinus className="w-4 h-4 text-gray-300" />;
    if (previousRevenue !== null) {
      trendIcon =
        revenue > previousRevenue ? (
          <AiOutlineArrowUp className="w-4 h-4 text-success" />
        ) : revenue < previousRevenue ? (
          <AiOutlineArrowDown className="w-4 h-4 text-danger" />
        ) : (
          <AiOutlineMinus className="w-4 h-4 text-gray-300" />
        );
    }

    return { ...point, revenue, aov, trendIcon };
  });

  const totalPages = Math.max(1, Math.ceil(enrichedPoints.length / pageSize));
  const paginatedPoints = enrichedPoints.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (row) => formatDate(row.date),
    },
    {
      key: "total_orders",
      label: "Orders",
    },
    {
      key: "revenue",
      label: "Revenue",
      render: (row) => (
        <span className="font-medium text-gray-900">
          {formatPrice(row.revenue)}
        </span>
      ),
    },
    {
      key: "units_sold",
      label: "Units",
      render: (row) => Number(row.units_sold ?? row.total_units) || 0,
    },
    {
      // Total cost of the goods sold that day (purchase price x quantity)
      key: "total_cost",
      label: "Cost",
      render: (row) => (
        <span className="text-gray-500">
          {formatPriceOrDash(row.total_cost)}
        </span>
      ),
    },
    {
      // Revenue minus cost. Green for a profit, red for a loss.
      key: "gross_profit",
      label: "Profit",
      render: (row) => {
        const profit =
          row.gross_profit === null || row.gross_profit === undefined
            ? null
            : Number(row.gross_profit);
        const toneClass =
          profit === null || Number.isNaN(profit) || profit === 0
            ? "text-gray-700"
            : profit > 0
              ? "text-success"
              : "text-danger";
        return (
          <span className={`font-medium ${toneClass}`}>
            {formatPriceOrDash(row.gross_profit)}
          </span>
        );
      },
    },
    {
      // Profit as a percentage of cost
      key: "markup_percent",
      label: "Markup %",
      render: (row) => (
        <span className="text-gray-500">
          {formatPercent(row.markup_percent)}
        </span>
      ),
    },
    {
      // Profit as a percentage of revenue
      key: "profit_margin_percent",
      label: "Margin %",
      render: (row) => (
        <span className="text-gray-500">
          {formatPercent(row.profit_margin_percent)}
        </span>
      ),
    },
    {
      key: "aov",
      label: "AOV",
      render: (row) => (
        <span className="text-gray-500">{formatPrice(row.aov)}</span>
      ),
    },
    {
      key: "trend",
      label: "Trend",
      render: (row) => row.trendIcon,
    },
  ];

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 overflow-hidden
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300"
      // The soft resting shadow matches StatsCard's elevation, with a
      // slightly stronger shadow on hover.
    >
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          Daily Breakdown
        </h2>
        <p className="text-xs text-gray-400">
          Orders, revenue, cost and profit for each day
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : enrichedPoints.length === 0 ? (
        <div className="py-8">
          <EmptyState
            variant="noResults"
            title="No Data"
            description="No daily records in this date range yet."
          />
        </div>
      ) : (
        <div className="p-4">
          <DataTable
            columns={columns}
            data={paginatedPoints}
            keyField="date"
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={enrichedPoints.length}
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

export default DailyBreakdownTable;
