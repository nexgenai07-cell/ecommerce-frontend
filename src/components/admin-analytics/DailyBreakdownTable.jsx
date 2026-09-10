import { useState } from "react";
import {
  AiOutlineArrowUp,
  AiOutlineArrowDown,
  AiOutlineMinus,
} from "react-icons/ai";

import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";

const PAGE_SIZE = 10;

const DailyBreakdownTable = ({ dataPoints, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Sorted newest-first, matching the mockup's ordering
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

  const totalPages = Math.max(1, Math.ceil(enrichedPoints.length / PAGE_SIZE));
  const paginatedPoints = enrichedPoints.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
      // shadow-[...] — a soft resting shadow (same elevation used by
      // StatsCard) so this table card visibly "lifts" off the page
      // background instead of sitting flat, with a slightly stronger
      // shadow on hover for a subtle interactive feel
    >
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          Daily Breakdown
        </h2>
        <p className="text-xs text-gray-400">
          Granular view of orders and revenue metrics per day
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
          />
        </div>
      )}
    </div>
  );
};

export default DailyBreakdownTable;
