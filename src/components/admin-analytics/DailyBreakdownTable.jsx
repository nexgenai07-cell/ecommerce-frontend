import {
  AiOutlineArrowUp,
  AiOutlineArrowDown,
  AiOutlineMinus,
} from "react-icons/ai";

import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const DailyBreakdownTable = ({ dataPoints, isLoading }) => {
  // Sorted newest-first, matching the mockup's ordering
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

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
      ) : sortedPoints.length === 0 ? (
        <div className="py-8">
          <EmptyState
            variant="noResults"
            title="No Data"
            description="No daily records in this date range yet."
          />
        </div>
      ) : (
        // overflow-x-auto — lets the table scroll horizontally on narrow
        // screens instead of squeezing its 5 columns unreadably small,
        // keeping the card itself fully responsive on mobile
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Orders
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  AOV
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPoints.map((point, index) => {
                // Comparing against the NEXT item in this newest-first
                // array means comparing against the day chronologically
                // BEFORE this one — a real, adjacent-day comparison
                const previousDay = sortedPoints[index + 1];
                const revenue = Number(point.total_revenue) || 0;
                const previousRevenue = previousDay
                  ? Number(previousDay.total_revenue) || 0
                  : null;

                const aov =
                  point.total_orders > 0 ? revenue / point.total_orders : 0;

                let trendIcon = (
                  <AiOutlineMinus className="w-4 h-4 text-gray-300" />
                );
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

                return (
                  <tr
                    key={point.date}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(point.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {point.total_orders}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatPrice(revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatPrice(aov)}
                    </td>
                    <td className="px-4 py-3">{trendIcon}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DailyBreakdownTable;
