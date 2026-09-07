// ============================================================
// PostsByPlatformChart — SOCIAL DASHBOARD SUB-COMPONENT
// ============================================================
// Fully real — API 78's documented `platform` filter param lets each
// platform's real post count be fetched individually (a small, fixed
// number of calls, one per known platform — not the same N+1 problem
// as per-post analytics, since there are only 4 platforms total).

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { getSocialPosts } from "../../api/social.api";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const PLATFORMS = [
  { key: "facebook", label: "Facebook", color: "#3b82f6" },
  { key: "instagram", label: "Instagram", color: "#10b981" },
  { key: "twitter", label: "Twitter / X", color: "#8b5cf6" },
  { key: "tiktok", label: "TikTok", color: "#1f2937" },
];

const PostsByPlatformChart = () => {
  // One real query per platform — TanStack Query runs these in
  // parallel automatically since they're independent hook calls
  const facebookQuery = useQuery({
    queryKey: ["socialDashboard", "platformCount", "facebook"],
    queryFn: ({ signal }) => getSocialPosts({ platform: "facebook" }, signal),
  });
  const instagramQuery = useQuery({
    queryKey: ["socialDashboard", "platformCount", "instagram"],
    queryFn: ({ signal }) => getSocialPosts({ platform: "instagram" }, signal),
  });
  const twitterQuery = useQuery({
    queryKey: ["socialDashboard", "platformCount", "twitter"],
    queryFn: ({ signal }) => getSocialPosts({ platform: "twitter" }, signal),
  });
  const tiktokQuery = useQuery({
    queryKey: ["socialDashboard", "platformCount", "tiktok"],
    queryFn: ({ signal }) => getSocialPosts({ platform: "tiktok" }, signal),
  });

  const queries = [facebookQuery, instagramQuery, twitterQuery, tiktokQuery];
  const isLoading = queries.some((q) => q.isLoading);

  const getCount = (query) =>
    query.data?.data?.count ?? (query.data?.data?.length || 0);

  const chartData = PLATFORMS.map((platform, index) => ({
    name: platform.label,
    value: getCount(queries[index]),
    color: platform.color,
  })).filter((item) => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const formattedTotal =
    total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">
        Posts by Platform
      </h2>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="No Posts Yet"
          description="Platform breakdown will appear once posts are created."
        />
      ) : (
        <>
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
                  formatter={(value, name) => [`${value} posts`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">
                {formattedTotal}
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Total Posts
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {chartData.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </span>
                <span className="text-gray-900 font-medium">
                  {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PostsByPlatformChart;
