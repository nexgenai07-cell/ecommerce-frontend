// ============================================================
// SalesOverTimeChart — SALES REPORT SUB-COMPONENT
// ============================================================
// Real data from API 83 (Sales Report), rendered as an area chart with
// a Revenue/Orders toggle — switching just changes which real field
// (total_revenue vs total_orders) is plotted on the same real dataset,
// no separate API call needed for the toggle itself.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getSalesReport } from "../../api/analytics.api";
import cn from "../../utils/cn";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const METRIC_OPTIONS = [
  { key: "total_revenue", label: "Revenue" },
  { key: "total_orders", label: "Orders" },
];

const SalesOverTimeChart = ({ startDate, endDate }) => {
  const [metric, setMetric] = useState("total_revenue");

  const { data: response, isLoading } = useQuery({
    queryKey: ["salesReport", "chart", startDate, endDate],
    queryFn: () =>
      getSalesReport({
        start_date: startDate,
        end_date: endDate,
        period: "daily",
      }),
  });

  const points = response?.data?.data || [];
  const chartData = points.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Sales Over Time
          </h2>
          <p className="text-xs text-gray-400">
            Daily performance for the selected date range
          </p>
        </div>

        {/* Revenue/Orders toggle — same real dataset, different field plotted */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setMetric(option.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                metric === option.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState
            variant="noResults"
            title="No Data"
            description="No sales activity in this date range yet."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(value) =>
                  metric === "total_revenue" && value >= 1000
                    ? `${(value / 1000).toFixed(0)}k`
                    : value
                }
              />
              <Tooltip
                formatter={(value) => [
                  metric === "total_revenue" ? formatPrice(value) : value,
                  metric === "total_revenue" ? "Revenue" : "Orders",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SalesOverTimeChart;
