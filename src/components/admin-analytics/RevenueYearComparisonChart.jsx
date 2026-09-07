// ============================================================
// RevenueYearComparisonChart — REVENUE REPORT SUB-COMPONENT
// ============================================================
// A genuine 2-line comparison — fetches monthly revenue for the
// CURRENT year and the PREVIOUS year as two separate real API calls,
// then merges them by month into one chart. This is a real technique
// (not a display trick): each line is backed by its own actual
// getRevenueReport response.

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getRevenueReport } from "../../api/analytics.api";
import formatPrice from "../../utils/formatPrice";
import Spinner from "../ui/Spinner";

const RevenueYearComparisonChart = () => {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const { data: currentYearResponse, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ["revenueReport", "yearly", currentYear],
    queryFn: ({ signal }) => getRevenueReport({
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        period: "monthly",
      }, signal),
  });

  const { data: lastYearResponse, isLoading: isLoadingLast } = useQuery({
    queryKey: ["revenueReport", "yearly", lastYear],
    queryFn: ({ signal }) => getRevenueReport({
        start_date: `${lastYear}-01-01`,
        end_date: `${lastYear}-12-31`,
        period: "monthly",
      }, signal),
  });

  const isLoading = isLoadingCurrent || isLoadingLast;

  const currentYearPoints = currentYearResponse?.data?.data || [];
  const lastYearPoints = lastYearResponse?.data?.data || [];

  // Merge both years' data by MONTH NUMBER (not by their raw "period"
  // string, which would differ between years e.g. "2026-03" vs
  // "2025-03") — this builds one row per month with both years'
  // real revenue values side by side, ready for a 2-line chart
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const mergedData = monthLabels.map((label, index) => {
    const monthNumber = index + 1;
    const currentPoint = currentYearPoints.find(
      (p) => new Date(p.period).getMonth() + 1 === monthNumber,
    );
    const lastPoint = lastYearPoints.find(
      (p) => new Date(p.period).getMonth() + 1 === monthNumber,
    );
    return {
      month: label,
      [currentYear]: currentPoint ? Number(currentPoint.revenue) : null,
      [lastYear]: lastPoint ? Number(lastPoint.revenue) : null,
    };
  });

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
          Revenue by Month
        </h2>
        <p className="text-xs text-gray-400">
          {currentYear} vs {lastYear}
        </p>
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mergedData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="month"
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
                formatter={(value) => formatPrice(value)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey={String(currentYear)}
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey={String(lastYear)}
                stroke="#d1d5db"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueYearComparisonChart;
