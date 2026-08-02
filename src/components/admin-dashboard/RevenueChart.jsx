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
// recharts — charting library.

import { getSalesReport } from "../../api/analytics.api";
// getSalesReport — API 83: GET /api/v1/analytics/sales/
// returns { period, data: [{ date, total_orders, total_revenue }] }

import cn from "../../utils/cn";
import formatPrice from "../../utils/formatPrice";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

// The toggle options shown to the admin. These now map 1:1 to the
// "period" values API 83 (GET /api/v1/analytics/sales/) accepts —
// backend team confirmed "yearly" support was added, so this is sent
// straight through to the API exactly like daily/weekly/monthly,
// no frontend-side aggregation needed anymore.
const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const RevenueChart = () => {
  const [period, setPeriod] = useState("daily");
  // Local state — which of the 4 grouping periods is currently selected.
  // Included in the query key below, so switching periods triggers a
  // fresh API call automatically (React Query treats it as a new query).

  const { data: salesResponse, isLoading } = useQuery({
    queryKey: ["adminDashboard", "salesReport", period],
    queryFn: () => getSalesReport({ period }),
    staleTime: 1000 * 60 * 2, // 2 minute cache
  });

  const points = salesResponse?.data?.data || [];
  // Defensive fallback — [] while loading or if the shape is unexpected

  // Format each data point's date into a short axis label.
  // For "yearly", the backend returns one row per calendar year (per the
  // date field, e.g. "2024-01-01"), so we just show the 4-digit year.
  const chartData = points.map((point) => ({
    ...point,
    label:
      period === "yearly"
        ? String(new Date(point.date).getFullYear())
        : new Date(point.date).toLocaleDateString("en-US", {
            weekday: period === "daily" ? "short" : undefined,
            month: period !== "daily" ? "short" : undefined,
            day: period !== "daily" ? "numeric" : undefined,
          }),
  }));

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-5
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300
      "
      /* ELEVATION — same soft "floating card" shadow used across every
         dashboard widget (StatsCard, OrdersStatusChart, RecentOrdersTable,
         InventoryAlertsWidget, TopSellingProducts, ActivityLogWidget), so
         the card visually lifts off the page at rest, with only a very
         slight, slow shadow increase on hover. */
    >
      {/* Header — title on the left, period toggle on the right */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          Revenue Over Time
        </h2>

        {/* Segmented toggle — Daily / Weekly / Monthly / Yearly switch */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                period === option.value
                  ? "bg-white text-gray-900 shadow-sm" // active pill — white background lifts above the gray track
                  : "text-gray-500 hover:text-gray-700", // inactive pill — muted, clickable
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState
            variant="noResults"
            title="No Revenue Data"
            description="There's no sales data for this period yet."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              {/* Gradient fill under the line, matching the emerald brand color */}
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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

              <Area
                type="monotone"
                dataKey="total_revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueChart;
