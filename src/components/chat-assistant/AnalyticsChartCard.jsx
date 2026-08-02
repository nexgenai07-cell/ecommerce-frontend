import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import formatPrice from "../../utils/formatPrice";

// Human-readable titles for each fixed report_type value the backend
// can send — matches the exact enum defined in the backend spec.
const REPORT_TITLES = {
  sales_report: "Sales Report",
  revenue_report: "Revenue",
  best_sellers: "Best Sellers",
  customer_growth: "Customer Growth",
};

const AnalyticsChartCard = ({ analytics }) => {
  const title = REPORT_TITLES[analytics.report_type] || "Analytics";

  return (
    <div className="mt-2 bg-white rounded-lg p-3 w-full max-w-sm border border-gray-100">
      <p className="text-xs font-bold text-gray-700 mb-0.5">{title}</p>
      {/* Period range — only shown when the backend actually included
          one, since not every report type necessarily has a date range. */}
      {analytics.period && (
        <p className="text-[11px] text-gray-400 mb-2">
          {analytics.period.start} – {analytics.period.end}
        </p>
      )}

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={analytics.series}
            margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
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
              tick={{ fontSize: 10, fill: "#9ca3af" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              width={45}
              tickFormatter={(value) => {
                if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value;
              }}
            />
            <Tooltip
              formatter={(value) => formatPrice(value)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            {/* radius rounds only the TOP corners of each bar, matching
                the rounded-card visual language used everywhere else */}
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary totals grid — only rendered if the backend included
          one; iterates generically over whatever keys are present
          rather than hardcoding field names per report type. */}
      {analytics.summary && Object.keys(analytics.summary).length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
          {Object.entries(analytics.summary).map(([key, value]) => (
            <div key={key}>
              <p className="text-[10px] text-gray-400 capitalize">
                {key.replace(/_/g, " ")}
              </p>
              <p className="text-xs font-bold text-gray-800">
                {/* Formats as currency only when the key name suggests
                    a money value (e.g. "total_revenue"); everything
                    else (like order counts) is shown as a plain number. */}
                {typeof value === "number" &&
                key.toLowerCase().includes("revenue")
                  ? formatPrice(value)
                  : value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsChartCard;
