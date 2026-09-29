import { useQuery } from "@tanstack/react-query";
// useQuery -> TanStack Query hook, fetches + caches the Revenue Report data
import { AiOutlineDollarCircle, AiOutlineRise } from "react-icons/ai";
// AiOutlineDollarCircle -> icon for the "Gross Revenue" card
// AiOutlineRise         -> icon for the "Revenue Growth" card

import { getRevenueReport } from "../../api/analytics.api";
// getRevenueReport -> the single source of real data for this row
import getPreviousPeriodRange from "../../utils/getPreviousPeriodRange";
// getPreviousPeriodRange -> computes the earlier comparison date range
import formatPrice from "../../utils/formatPrice";
// formatPrice -> turns a raw number into "Rs. 3,481,170" style display text
import StatsCard from "../ui/StatsCard";
// StatsCard -> the shared small white KPI card UI used everywhere
import ProfitSummaryCards from "./ProfitSummaryCards";
// ProfitSummaryCards -> Total Cost, Gross Profit, Markup % and Profit Margin %

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

const RevenueStatsCards = ({ startDate, endDate, status }) => {
  // startDate, endDate -> currently selected range, passed down from the
  // RevenueReport page so everything stays in sync
  // status -> the Sold/Cancelled/Refunded/All filter, also passed down
  // from the RevenueReport page

  const { data: currentResponse, isLoading } = useQuery({
    queryKey: ["revenueReport", "current", startDate, endDate, status],
    // queryKey -> uniquely identifies this request for caching/refetching
    queryFn: ({ signal }) =>
      getRevenueReport(
        {
          start_date: startDate,
          end_date: endDate,
          period: "daily",
          // period: "daily" -> one data point per day
          status,
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
      status,
    ],
    queryFn: ({ signal }) =>
      getRevenueReport(
        {
          start_date: previousRange.startDate,
          end_date: previousRange.endDate,
          period: "daily",
          status,
        },
        signal,
      ),
  });

  // The "summary" object holds the totals for the whole selected range,
  // calculated by the server, so the cards read from it instead of adding
  // up rows on the client.
  const currentSummary = currentResponse?.data?.summary;
  const previousSummary = previousResponse?.data?.summary;

  const currentRevenue = Number(currentSummary?.total_revenue) || 0;
  // currentRevenue -> product sales for the selected range (0 while loading)
  const previousRevenue = Number(previousSummary?.total_revenue) || 0;
  // previousRevenue -> product sales for the earlier comparison range
  const growth = formatGrowth(currentRevenue, previousRevenue);
  // growth -> the "+521.1%" style string, reused by both cards below

  return (
    // flex-wrap — StatsCard carries its own fixed width/height, so this
    // row matches every other stats row in the admin panel.
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

      {/* Total Cost, Gross Profit, Markup % and Profit Margin %, plus a
          note when some sold items have no cost price saved. */}
      <ProfitSummaryCards summary={currentSummary} isLoading={isLoading} />
    </div>
  );
};

export default RevenueStatsCards;
// default export -> imported in RevenueReport.jsx as <RevenueStatsCards ... />
