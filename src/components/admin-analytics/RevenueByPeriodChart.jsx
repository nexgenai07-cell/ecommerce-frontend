import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getRevenueReport } from "../../api/analytics.api";
import formatPrice from "../../utils/formatPrice";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const RevenueByPeriodChart = ({ startDate, endDate }) => {
  const { data: response, isLoading } = useQuery({
    queryKey: ["revenueReport", "weekly", startDate, endDate],
    queryFn: ({ signal }) => getRevenueReport({
        start_date: startDate,
        end_date: endDate,
        period: "weekly",
      }, signal),
  });

  const points = response?.data?.data || [];

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300"
      // shadow-[...] — a soft resting shadow (same elevation used by
      // StatsCard) so this chart card visibly "lifts" off the page
      // background instead of sitting flat, with a slightly stronger
      // shadow on hover for a subtle interactive feel
    >
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Revenue Breakdown
        </h2>
        <p className="text-xs text-gray-400">
          Weekly revenue for the selected date range
        </p>
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : points.length === 0 ? (
          <EmptyState
            variant="noResults"
            title="No Data"
            description="No revenue recorded in this range yet."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <Tooltip
                formatter={(value) => [formatPrice(value), "Revenue"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueByPeriodChart;
