// ============================================================
// CumulativeGrowthChart — CUSTOMER GROWTH SUB-COMPONENT
// ============================================================
// Fully real — API 97 (GET /api/v1/analytics/customers/growth/)
// returns real "new_customers" per period, and the cumulative
// (running-total) line is a genuine derived calculation on top of
// that real series, not a separate field.
// The Month/Quarter/Year toggle maps directly to API 97's documented
// `period` param: monthly | quarter | year.

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

// formatPeriodLabel — API 97's `period` field changes SHAPE depending
// on the `period` query param sent:
//   daily/weekly/monthly -> "2024-01"      (a real date-like string)
//   quarter               -> "2026-Q1"      (year + quarter, NOT a date)
//   year                  -> "2025"         (bare year, NOT a full date)
// Passing "2026-Q1" or "2025" straight into formatDate() produces
// "Invalid Date" / an unpredictable result, since Date() can't parse
// a quarter string and a bare year isn't a reliable cross-browser
// Date input either. So: quarter/year strings are shown as-is
// (already human-readable), everything else still goes through the
// normal formatDate().
const formatPeriodLabel = (period) => {
  if (!period) return "";
  if (/^\d{4}-Q[1-4]$/.test(period)) {
    // "2026-Q1" -> "Q1 2026"
    const [year, q] = period.split("-");
    return `${q} ${year}`;
  }
  if (/^\d{4}$/.test(period)) {
    // Bare calendar year, e.g. "2025" — nothing to reformat
    return period;
  }
  return formatDate(period);
};

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Month" },
  { value: "quarter", label: "Quarter" },
  // API 97 documents 5 period values: daily | weekly | monthly |
  // quarter | year. "quarter" groups into fixed calendar quarters
  // (Q1 = Jan-Mar, etc.), independent of start_date.
  { value: "year", label: "Year" },
  // "year" groups into full calendar years.
];

const CumulativeGrowthChart = ({ startDate, endDate }) => {
  const [period, setPeriod] = useState("monthly");

  const { data: response, isLoading } = useQuery({
    queryKey: ["customerGrowth", "chart", startDate, endDate, period],
    queryFn: ({ signal }) => getCustomerGrowth({ start_date: startDate, end_date: endDate, period }, signal),
  });

  const points = response?.data || [];

  // Builds the cumulative running total on top of the real
  // new_customers series — each point's cumulative value is the sum
  // of every new_customers count up to and including that point
  let runningTotal = 0;
  const chartData = points.map((point) => {
    runningTotal += Number(point.new_customers) || 0;
    return {
      label: formatPeriodLabel(point.period),
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
