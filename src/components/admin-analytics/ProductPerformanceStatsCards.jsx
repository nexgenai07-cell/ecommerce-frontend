import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineShoppingCart,
  AiOutlineTrophy,
  AiOutlineDollarCircle,
} from "react-icons/ai";

import { getBestSellers } from "../../api/analytics.api";
import formatPrice from "../../utils/formatPrice";
import StatsCard from "../ui/StatsCard";
// StatsCard is the single shared KPI card used across the entire admin
// panel (ProductStatsCards, SalesStatsCards, RevenueStatsCards, etc).
// This component previously rendered its own one-off gradient card
// markup instead of reusing it, which meant any future visual change to
// the KPI card style (padding, shadow, hover behavior) had to be applied
// in two places by hand. Standardizing on StatsCard here removes that
// duplication: this row now automatically stays visually consistent
// with every other stats row in the admin panel, and any future styling
// change only needs to happen once, inside StatsCard itself.

const ProductPerformanceStatsCards = ({ startDate, endDate }) => {
  // Data source is unchanged from before. limit: 50 is a deliberate
  // middle ground — large enough for "units sold" to be a meaningful
  // total, without pretending to cover the entire product catalog.
  const { data: response, isLoading } = useQuery({
    queryKey: ["productsPerformance", "bestSellers", startDate, endDate],
    queryFn: ({ signal }) =>
      getBestSellers(
        { start_date: startDate, end_date: endDate, limit: 50 },
        signal,
      ),
  });

  const products = response?.data || [];

  const totalUnitsSold = products.reduce(
    (sum, product) => sum + (Number(product.total_sold) || 0),
    0,
  );

  const totalRevenue = products.reduce(
    (sum, product) => sum + (Number(product.total_revenue) || 0),
    0,
  );

  const bestSeller = products[0]; // Already sorted by sales, so index 0 is the real #1.

  return (
    // flex-wrap — StatsCard now carries its own fixed width/height, so
    // this row already matches every other stats row in the admin
    // panel without needing a page-specific max-width cap.
    <div className="flex flex-wrap gap-2">
      <StatsCard
        title="Top Products Units Sold"
        value={isLoading ? "—" : totalUnitsSold.toLocaleString()}
        icon={<AiOutlineShoppingCart />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
        trend={
          isLoading
            ? ""
            : `Across ${products.length} tracked product${products.length === 1 ? "" : "s"}`
        }
        // trend is used here as plain supporting text rather than a
        // +/- percentage badge, the same way ProductStatsCards uses it
        // for its "Requires action" label — StatsCard renders any
        // non-empty string that doesn't start with "+" or "-" as a
        // neutral gray badge.
      />

      <StatsCard
        title="Total Revenue"
        value={isLoading ? "—" : formatPrice(totalRevenue)}
        icon={<AiOutlineDollarCircle />}
        iconBg="bg-info-light"
        iconColor="text-info"
        trend={isLoading ? "" : "Combined revenue for this range"}
      />

      <StatsCard
        title="Best Selling Product"
        value={isLoading ? "—" : bestSeller?.name || "No sales yet"}
        icon={<AiOutlineTrophy />}
        iconBg="bg-warning-light"
        iconColor="text-warning"
        trend={
          isLoading
            ? ""
            : bestSeller
              ? `${formatPrice(bestSeller.total_revenue)} in revenue`
              : ""
        }
      />
    </div>
  );
};

export default ProductPerformanceStatsCards;
