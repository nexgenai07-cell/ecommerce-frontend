import { useQuery } from "@tanstack/react-query";
// useQuery — React Query hook that fetches, caches, and automatically
// re-fetches server data for each of the three metrics below

import {
  AiOutlineTeam,
  // Icon for the "Total Customers" card
  AiOutlineUserAdd,
  // Icon for the "New Customers" card
  AiOutlineDollarCircle,
  // Icon for the "Avg. Lifetime Value" card
} from "react-icons/ai";

import { getCustomers } from "../../api/customers.api";
// getCustomers — API 87, used here only to read the total customer count

import {
  getCustomerGrowth,
  // getCustomerGrowth — API 88 (Customer Growth), returns new-customer
  // counts grouped by period, used to sum "new customers in range"
  getDashboardSummary,
  // getDashboardSummary — API 82, used to read total_revenue and
  // total_customers for the Avg. LTV calculation
} from "../../api/analytics.api";

import extractListData from "../../utils/extractListData";
// extractListData — normalizes a list response into a plain array,
// regardless of whether the backend returned a flat array or a
// paginated { count, results } object

import formatPrice from "../../utils/formatPrice";
// formatPrice — converts a raw number into "Rs. X,XXX" display format

import StatsCard from "../ui/StatsCard";
// StatsCard — the shared KPI card component; supports a `compact`
// prop for a visibly smaller footprint, and a `className` prop for
// extra outer styling (used below to set a fixed narrow width)

const CustomerGrowthStatsCards = ({ startDate, endDate }) => {
  // startDate / endDate — the currently selected date range, passed
  // down from the CustomerGrowth page so the "New Customers" number
  // always matches whatever range the admin has picked

  // Total customers — real, from the admin customer list's count
  const { data: customersResponse } = useQuery({
    queryKey: ["customerGrowth", "totalCustomers"],
    // queryKey — unique cache key for this specific query
    queryFn: ({ signal }) => getCustomers({}, signal),
    // queryFn — the actual network call executed by React Query
    staleTime: 1000 * 60 * 5,
    // staleTime — keeps this cached for 5 minutes before refetching,
    // since the total customer count rarely changes second-to-second
  });
  const totalCustomers =
    // Prefers the backend's own paginated `count` field when present,
    customersResponse?.data?.count ??
    // otherwise falls back to counting the extracted array manually
    extractListData(customersResponse).length;

  // New customers in the selected range — real, summed from API 75
  const { data: growthResponse, isLoading } = useQuery({
    queryKey: ["customerGrowth", "newInRange", startDate, endDate],
    // queryKey includes startDate/endDate — changing the date range
    // triggers a fresh fetch and its own separate cache entry
    queryFn: ({ signal }) => getCustomerGrowth({
        start_date: startDate,
        // start_date — beginning of the selected date range
        end_date: endDate,
        // end_date — end of the selected date range
        period: "monthly",
        // period — groups the returned data points by month
      }, signal),
  });
  const growthPoints = growthResponse?.data || [];
  // growthPoints — falls back to an empty array while loading, so
  // .reduce() below never crashes on undefined
  const newCustomersCount = growthPoints.reduce(
    // Sums the new_customers field across every returned data point
    (sum, point) => sum + (Number(point.new_customers) || 0),
    0,
    // 0 — the starting value for the sum
  );

  // Average LTV — real derived approximation from 2 confirmed
  // aggregate fields on the Dashboard Summary endpoint
  const { data: summaryResponse } = useQuery({
    queryKey: ["customerGrowth", "dashboardSummary"],
    queryFn: ({ signal }) => getDashboardSummary(signal),
    staleTime: 1000 * 60 * 5,
    // staleTime — 5-minute cache, same reasoning as totalCustomers above
  });
  const summary = summaryResponse?.data || {};
  // summary — falls back to an empty object while loading
  const avgLTV =
    // Guards against dividing by zero when there are no customers yet
    summary.total_customers > 0
      ? summary.total_revenue / summary.total_customers
      : 0;

  return (
    // flex + flex-wrap — cards now sit side by side at their OWN
    // width (set per-card below) instead of being force-stretched to
    // fill three equal grid columns. flex-wrap lets them drop to a
    // new line on narrow screens instead of overflowing.
    <div className="flex flex-wrap gap-4">
      <StatsCard
        title="Total Customers"
        // Card label shown above the value
        value={totalCustomers}
        // The real total customer count computed above
        icon={<AiOutlineTeam />}
        // Team icon — represents the overall customer base
        iconBg="bg-primary-50"
        // Light emerald icon background
        iconColor="text-primary"
        // Emerald icon color, matches the brand token
        compact
        // compact — renders the smaller variant: tighter padding,
        // smaller icon box, smaller value text — reduces the card's
        // height
        className="w-full sm:w-56 shrink-0"
        // w-full on mobile (full-width row, stacked), sm:w-56 (224px)
        // from the small breakpoint up — this is what actually shrinks
        // the card's WIDTH once cards sit in a row. shrink-0 stops
        // flexbox from squeezing it any narrower than that.
      />
      <StatsCard
        title="New Customers"
        // Card label for the second KPI
        value={isLoading ? "—" : newCustomersCount}
        // Shows an em-dash placeholder while the growth query is
        // still loading, then the real summed count once it resolves
        icon={<AiOutlineUserAdd />}
        // User-add icon — represents newly acquired customers
        iconBg="bg-info-light"
        // Light blue icon background
        iconColor="text-info"
        // Blue icon color
        trend="in range"
        // "in selected range" only rendered via `trend` — StatsCard's
        // trendLabel silently does nothing without a `trend` value
        // alongside it (a mistake fixed here before delivery)
        compact
        // compact — same smaller card variant as the others
        className="w-full sm:w-56 shrink-0"
        // Same fixed narrow width as the other two cards
      />
      <StatsCard
        title="Avg. Lifetime Value"
        // Card label for the third KPI
        value={formatPrice(avgLTV)}
        // The derived average lifetime value, formatted as currency
        icon={<AiOutlineDollarCircle />}
        // Dollar-circle icon — represents a monetary value metric
        iconBg="bg-success-light"
        // Light green icon background
        iconColor="text-success"
        // Green icon color
        compact
        // compact — same smaller card variant as the others
        className="w-full sm:w-56 shrink-0"
        // Same fixed narrow width as the other two cards
      />
    </div>
  );
};

export default CustomerGrowthStatsCards;
// Default export — imported by CustomerGrowth.jsx as
// CustomerGrowthStatsCards
