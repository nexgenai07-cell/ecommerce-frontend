import { useQuery } from "@tanstack/react-query";
// useQuery -> TanStack Query hook, fetches + caches the Sales Report data

import {
  AiOutlineDollarCircle, // icon used on the "Total Sales" card
  AiOutlineShoppingCart, // icon used on the "Total Orders" card
  AiOutlineCreditCard, // icon used on the "Avg Order Value" card
} from "react-icons/ai";

import { getSalesReport } from "../../api/analytics.api";
// getSalesReport -> API 83, the single source of ALL real data on this card row
import getPreviousPeriodRange from "../../utils/getPreviousPeriodRange";
// getPreviousPeriodRange -> computes the "previous period" date range used
// for the "vs last period" growth percentage on each card
import formatPrice from "../../utils/formatPrice";
// formatPrice -> turns a raw number into "Rs 3,481,170" style display text
import StatsCard from "../ui/StatsCard";
// StatsCard -> the shared small white KPI card UI used everywhere

// Sums a field across every real data point in a Sales Report response
const sumField = (dataPoints, field) =>
  dataPoints.reduce((total, point) => total + (Number(point[field]) || 0), 0);
// .reduce -> walks every day's data point and adds up the requested
// field (e.g. "total_revenue" or "total_orders") into one grand total

// Formats a real percentage change into the "+12.5%" / "-3.2%" string
// shape StatsCard expects, returning "" (no badge) when there's no
// previous-period baseline to compare against (avoids a misleading
// "+Infinity%" or "0%" on a brand-new date range with no prior data)
const formatGrowth = (current, previous) => {
  if (!previous) return "";
  // no previous-period value at all -> don't show a trend badge

  const change = ((current - previous) / previous) * 100;
  // change -> the percentage difference between current and previous period

  const sign = change >= 0 ? "+" : "";
  // sign -> prefixes a "+" for positive/zero change; negative numbers
  // already carry their own "-" from toFixed below

  return `${sign}${change.toFixed(1)}%`;
  // toFixed(1) -> rounds to one decimal place, e.g. "+521.1%"
};

const SalesStatsCards = ({ startDate, endDate }) => {
  // startDate, endDate -> the currently selected date range, passed down
  // from the SalesReport page so this component and the page stay in sync

  // Current period — the real date range the admin has selected
  const { data: currentResponse, isLoading } = useQuery({
    queryKey: ["salesReport", "current", startDate, endDate],
    // queryKey -> uniquely identifies this request so React Query knows
    // when to refetch (whenever startDate/endDate change)
    queryFn: ({ signal }) =>
      getSalesReport(
        {
          start_date: startDate,
          end_date: endDate,
          period: "daily",
          // period: "daily" -> ask the API for one data point per day so
          // the totals below are accurate for any custom range
        },
        signal,
      ),
  });

  // Previous period — same length, immediately before the current one
  const previousRange = getPreviousPeriodRange(startDate, endDate);
  const { data: previousResponse } = useQuery({
    queryKey: [
      "salesReport",
      "previous",
      previousRange.startDate,
      previousRange.endDate,
    ],
    queryFn: ({ signal }) =>
      getSalesReport(
        {
          start_date: previousRange.startDate,
          end_date: previousRange.endDate,
          period: "daily",
        },
        signal,
      ),
  });

  const currentPoints = currentResponse?.data?.data || [];
  // currentPoints -> the array of daily data points for the selected range,
  // falls back to [] while loading or if the API returns nothing

  const previousPoints = previousResponse?.data?.data || [];
  // previousPoints -> same, but for the comparison ("vs last period") range

  const currentRevenue = sumField(currentPoints, "total_revenue");
  // currentRevenue -> total money earned in the selected range
  const currentOrders = sumField(currentPoints, "total_orders");
  // currentOrders -> total number of orders placed in the selected range
  const currentAOV = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  // currentAOV -> "Average Order Value" = revenue divided by orders,
  // guarded against divide-by-zero when there are no orders yet

  const previousRevenue = sumField(previousPoints, "total_revenue");
  // previousRevenue -> same revenue total, but for the earlier comparison range
  const previousOrders = sumField(previousPoints, "total_orders");
  // previousOrders -> same order count, but for the earlier comparison range
  const previousAOV = previousOrders > 0 ? previousRevenue / previousOrders : 0;
  // previousAOV -> average order value for the earlier comparison range

  return (
    // flex-wrap — StatsCard now carries its own fixed width/height, so
    // this row already matches every other stats row in the admin
    // panel without needing a page-specific max-width cap.
    <div className="flex flex-wrap gap-2">
      <StatsCard
        title="Total Sales"
        value={isLoading ? "—" : formatPrice(currentRevenue)}
        // shows an em-dash placeholder while the real number is loading
        icon={<AiOutlineDollarCircle />}
        iconBg="bg-primary-50"
        // iconBg -> light emerald background behind the icon
        iconColor="text-primary"
        // iconColor -> emerald colored icon itself
        trend={formatGrowth(currentRevenue, previousRevenue)}
        // trend -> the "+521.1%" style badge text
        trendLabel="vs last period"
        // trendLabel -> small gray text next to the trend badge
      />
      <StatsCard
        title="Total Orders"
        value={isLoading ? "—" : currentOrders}
        icon={<AiOutlineShoppingCart />}
        iconBg="bg-info-light"
        // iconBg -> light blue background for this card's icon
        iconColor="text-info"
        // iconColor -> blue colored icon
        trend={formatGrowth(currentOrders, previousOrders)}
        trendLabel="vs last period"
      />
      <StatsCard
        title="Avg Order Value"
        value={isLoading ? "—" : formatPrice(currentAOV)}
        icon={<AiOutlineCreditCard />}
        iconBg="bg-success-light"
        // iconBg -> light green background for this card's icon
        iconColor="text-success"
        // iconColor -> green colored icon
        trend={formatGrowth(currentAOV, previousAOV)}
        trendLabel="vs last period"
      />
    </div>
  );
};

export default SalesStatsCards;
// default export -> imported in SalesReport.jsx as <SalesStatsCards ... />
