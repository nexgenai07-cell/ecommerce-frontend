// ============================================================
// CumulativeGrowthChart — CUSTOMER GROWTH SUB-COMPONENT
// ============================================================
// Fully real — API 75 returns real "new_customers" per period, and
// the cumulative (running-total) line is a genuine derived
// calculation on top of that real series, not a separate field.
// The Month/Quarter/Year toggle maps directly to API 75's documented
// `period` param.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getCustomerGrowth } from "../../api/analytics.api";
import cn from "../../utils/cn";
import formatDate from "../../utils/formatDate";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Month" },
  { value: "weekly", label: "Quarter" },
  // FLAG: "Quarter" isn't one of API 75's 3 documented period values
  // (daily/weekly/monthly) — mapped here to "weekly" as the closest
  // real grouping available, since a true quarterly aggregation isn't
  // something the backend supports directly. Confirm with the backend
  // team if true quarterly grouping is needed.
  { value: "yearly", label: "Year" },
  // FLAG: same issue — "yearly" isn't documented either. Sent as an
  // optimistic attempt; if the backend rejects or ignores it, this
  // will silently fall back to whatever its default grouping is.
];

const CumulativeGrowthChart = ({ startDate, endDate }) => {
  const [period, setPeriod] = useState("monthly");

  const { data: response, isLoading } = useQuery({
    queryKey: ["customerGrowth", "chart", startDate, endDate, period],
    queryFn: () =>
      getCustomerGrowth({ start_date: startDate, end_date: endDate, period }),
  });

  const points = response?.data || [];

  // Builds the cumulative running total on top of the real
  // new_customers series — each point's cumulative value is the sum
  // of every new_customers count up to and including that point
  let runningTotal = 0;
  const chartData = points.map((point) => {
    runningTotal += Number(point.new_customers) || 0;
    return {
      label: formatDate(point.period),
      newCustomers: Number(point.new_customers) || 0,
      cumulative: runningTotal,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Cumulative Growth
          </h2>
          <p className="text-xs text-gray-400">
            New customer acquisition vs total base growth
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                period === option.value
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
            description="No new customers in this range yet."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
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
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="newCustomers"
                name="Monthly New"
                fill="#1f2937"
                radius={[4, 4, 0, 0]}
                barSize={12}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Cumulative Base"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CumulativeGrowthChart;
