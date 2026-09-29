// ============================================================
// PROFIT OVER TIME CHART — PROFIT REPORT SUB-COMPONENT
// ============================================================
// A grouped bar chart that shows revenue, cost and gross profit side by
// side for every period of the report (day, week, month or year). It
// draws the rows of the profit report it receives; it does not fetch
// anything itself.
//
// A period whose cost is unknown (no cost price saved for the items sold)
// has no cost or profit value. Those bars are drawn as zero, which is
// only a drawing choice: the table below shows an em dash for them.
//
// Props:
//   rows      - the "data" array of a profit report response
//   period    - "daily" | "weekly" | "monthly" | "yearly", used for labels
//   isLoading - true while the report request is running

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import formatPrice from "../../utils/formatPrice";
import formatReportPeriodLabel from "../../utils/formatReportPeriodLabel";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const ProfitOverTimeChart = ({ rows, period, isLoading }) => {
  // Oldest period first, so the chart reads from left to right in time.
  const chartData = [...rows]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((row) => ({
      label: formatReportPeriodLabel(row.date, period),
      revenue: Number(row.total_revenue) || 0,
      cost: Number(row.total_cost) || 0,
      profit: Number(row.gross_profit) || 0,
    }));

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300"
    >
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Revenue, Cost and Profit
        </h2>
        <p className="text-xs text-gray-400">
          Product sales, cost of goods sold and gross profit for each period
        </p>
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
            <BarChart
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
                tickFormatter={(value) =>
                  Math.abs(value) >= 1000
                    ? `${(value / 1000).toFixed(0)}k`
                    : value
                }
              />
              <Tooltip
                formatter={(value, name) => [formatPrice(value), name]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="cost"
                name="Cost"
                fill="#d1d5db"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="profit"
                name="Gross Profit"
                fill="#047857"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ProfitOverTimeChart;
