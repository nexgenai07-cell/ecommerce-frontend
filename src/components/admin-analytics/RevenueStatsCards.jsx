import { useQuery } from "@tanstack/react-query";
// useQuery -> TanStack Query hook, fetches + caches the Revenue Report data
import { AiOutlineDollarCircle, AiOutlineRise } from "react-icons/ai";
// AiOutlineDollarCircle -> icon for the "Gross Revenue" card
// AiOutlineRise         -> icon for the "Revenue Growth" card

import { getRevenueReport } from "../../api/analytics.api";
// getRevenueReport -> API 84, the single source of real data for this row
import getPreviousPeriodRange from "../../utils/getPreviousPeriodRange";
// getPreviousPeriodRange -> computes the earlier comparison date range
import formatPrice from "../../utils/formatPrice";
// formatPrice -> turns a raw number into "Rs 3,481,170" style display text
import StatsCard from "../ui/StatsCard";
// StatsCard -> the shared small white KPI card UI used everywhere

const sumRevenue = (dataPoints) =>
  dataPoints.reduce((total, point) => total + (Number(point.revenue) || 0), 0);
// sumRevenue -> adds up the "revenue" field across every data point
// returned by the API into one grand total

const formatGrowth = (current, previous) => {
  if (!previous) return "";
  // no previous-period value at all -> don't show a trend badge

  const change = ((current - previous) / previous) * 100;
  // change -> the percentage difference between current and previous period

  const sign = change >= 0 ? "+" : "";
  // sign -> prefixes a "+" for positive/zero change

  return `${sign}${change.toFixed(1)}%`;
  // toFixed(1) -> rounds to one decimal place, e.g. "+521.1%"
};

const RevenueStatsCards = ({ startDate, endDate }) => {
  // startDate, endDate -> currently selected range, passed down from the
  // RevenueReport page so everything stays in sync

  const { data: currentResponse, isLoading } = useQuery({
    queryKey: ["revenueReport", "current", startDate, endDate],
    // queryKey -> uniquely identifies this request for caching/refetching
    queryFn: ({ signal }) =>
      getRevenueReport(
        {
          start_date: startDate,
          end_date: endDate,
          period: "daily",
          // period: "daily" -> one data point per day for an accurate total
        },
        signal,
      ),
  });

  const previousRange = getPreviousPeriodRange(startDate, endDate);
  // previousRange -> same-length range immediately before the current one
  const { data: previousResponse } = useQuery({
    queryKey: [
      "revenueReport",
      "previous",
      previousRange.startDate,
      previousRange.endDate,
    ],
    queryFn: ({ signal }) =>
      getRevenueReport(
        {
          start_date: previousRange.startDate,
          end_date: previousRange.endDate,
          period: "daily",
        },
        signal,
      ),
  });

  const currentRevenue = sumRevenue(currentResponse?.data?.data || []);
  // currentRevenue -> total revenue for the selected range (0 while loading)
  const previousRevenue = sumRevenue(previousResponse?.data?.data || []);
  // previousRevenue -> total revenue for the earlier comparison range
  const growth = formatGrowth(currentRevenue, previousRevenue);
  // growth -> the "+521.1%" style string, reused by both cards below

  return (
    // flex-wrap — StatsCard now carries its own fixed width/height, so
    // this row already matches every other stats row in the admin
    // panel without needing a page-specific max-width cap.
    <div className="flex flex-wrap gap-2">
      <StatsCard
        title="Gross Revenue"
        value={isLoading ? "—" : formatPrice(currentRevenue)}
        // shows an em-dash placeholder while the real number is loading
        icon={<AiOutlineDollarCircle />}
        iconBg="bg-primary-50"
        // iconBg -> light emerald background behind the icon
        iconColor="text-primary"
        // iconColor -> emerald colored icon itself
        trend={growth}
        trendLabel="vs last period"
      />
      <StatsCard
        title="Revenue Growth"
        value={growth || "—"}
        // shows the growth % as the main value itself for this card;
        // falls back to "—" if there's no comparison data at all
        icon={<AiOutlineRise />}
        iconBg="bg-success-light"
        // iconBg -> light green background for this card's icon
        iconColor="text-success"
        // iconColor -> green colored icon
      />
    </div>
  );
};

export default RevenueStatsCards;
// default export -> imported in RevenueReport.jsx as <RevenueStatsCards ... />
