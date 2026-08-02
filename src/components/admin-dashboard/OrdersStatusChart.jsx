import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { getOrdersAnalytics } from "../../api/analytics.api";
// getOrdersAnalytics — API 85: GET /api/v1/analytics/orders/
// returns { total, by_status: [{ status, count }] }

import { ORDER_STATUS } from "../../constants/statusTypes";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

// Maps each real ORDER_STATUS value to a label + color. Colors are
// pulled from the SAME hex values tokens.css defines for each status
// (matching Badge/getStatusColor everywhere else in the app).
const STATUS_CONFIG = [
  { key: ORDER_STATUS.PENDING, label: "Pending", color: "#f59e0b" },
  { key: ORDER_STATUS.CONFIRMED, label: "Confirmed", color: "#3b82f6" },
  { key: ORDER_STATUS.SHIPPED, label: "Shipped", color: "#059669" },
  { key: ORDER_STATUS.DELIVERED, label: "Delivered", color: "#10b981" },
  { key: ORDER_STATUS.CANCELLED, label: "Cancelled", color: "#ef4444" },
];

const OrdersStatusChart = () => {
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["adminDashboard", "ordersAnalytics"],
    queryFn: () => getOrdersAnalytics({}),
    staleTime: 1000 * 60 * 2,
  });

  const total = ordersResponse?.data?.total || 0;
  const byStatus = ordersResponse?.data?.by_status || [];

  // Build chart-ready data — one entry per STATUS_CONFIG item, pulling
  // the real count from byStatus (0 if that status isn't present at all)
  const chartData = STATUS_CONFIG.map((config) => {
    const match = byStatus.find((item) => item.status === config.key);
    return {
      name: config.label,
      value: match?.count || 0,
      color: config.color,
    };
  }).filter((item) => item.value > 0);
  // Only chart statuses that actually have at least one order —
  // an empty 0-value slice would just be an invisible sliver anyway

  // Formats the center total the same way the image does — "1.4k" for
  // large numbers, plain number otherwise
  const formattedTotal =
    total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total;

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-5
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300
      "
    >
      <h2 className="text-base font-semibold text-gray-900">
        Orders by Status
      </h2>

      {isLoading ? (
        <div className="h-56 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="No Orders Yet"
          description="Order status breakdown will appear here once orders come in."
        />
      ) : (
        <>
          {/* Donut chart with the total overlaid in the center */}
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} orders`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                  // BUG FIX — Recharts renders the tooltip in its own
                  // absolutely-positioned wrapper with no z-index by
                  // default, so it was stacking BELOW the donut ring and
                  // the absolutely-positioned center total label
                  // (both sit later in paint order). Explicitly setting
                  // a high z-index on the tooltip wrapper forces it to
                  // always render on top, regardless of hover position
                  // on the ring.
                  wrapperStyle={{ zIndex: 50 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label — absolutely positioned over the donut's hole */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">
                {formattedTotal}
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Total
              </span>
            </div>
          </div>

          {/* Legend — colored dot + label for each status charted */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OrdersStatusChart;
