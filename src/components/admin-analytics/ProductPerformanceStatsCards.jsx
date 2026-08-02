import { useQuery } from "@tanstack/react-query";
import { AiOutlineShoppingCart, AiOutlineTrophy } from "react-icons/ai";

import { getBestSellers } from "../../api/analytics.api";
import formatPrice from "../../utils/formatPrice";
import StatsCard from "../ui/StatsCard";

const ProductPerformanceStatsCards = ({ startDate, endDate }) => {
  // A larger limit here (50) is a deliberate middle ground — big
  // enough that the "units sold" sum means something meaningful, but
  // not so large that it pretends to cover the entire catalog
  const { data: response, isLoading } = useQuery({
    queryKey: ["productsPerformance", "bestSellers", startDate, endDate],
    queryFn: () =>
      getBestSellers({ start_date: startDate, end_date: endDate, limit: 50 }),
  });

  const products = response?.data || [];

  const totalUnitsSold = products.reduce(
    (sum, product) => sum + (Number(product.total_sold) || 0),
    0,
  );

  const bestSeller = products[0]; // API 73 already returns these sorted by sales, so index 0 is the real #1

  return (
    // ================================================================
    // CARD SIZE FIX — matches the Revenue Report page's stat cards
    // (RevenueStatsCards.jsx), used here as the requested reference:
    //
    // 1) "compact" prop added to both <StatsCard> below — this switches
    //    StatsCard to its smaller built-in variant (tighter p-3.5
    //    padding, smaller 36px icon box, smaller text sizes), which is
    //    exactly what shrinks each card's HEIGHT.
    //
    // 2) "lg:max-w-lg" added to this grid wrapper — the admin panel's
    //    content area has no max-width of its own, so without this cap
    //    these 2 cards used to each stretch to roughly half of the full
    //    page width on a laptop (much wider than intended). Capping the
    //    2-card row at 512px total (32rem = lg:max-w-lg) from the
    //    laptop breakpoint up keeps each card around 256px wide,
    //    exactly matching the Revenue Report cards' WIDTH.
    //
    // "grid" naturally stretches both cards to the SAME height as each
    // other already (grid's default align-items: stretch), so no extra
    // class is needed to keep the two cards visually even.
    // ================================================================
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:max-w-lg">
      <StatsCard
        compact
        // compact -> smaller footprint (less padding, smaller icon/value
        // text) and a stronger resting shadow, so the card visibly
        // "lifts" while taking up noticeably less vertical space
        title="Top Products Units Sold"
        value={isLoading ? "—" : totalUnitsSold.toLocaleString()}
        icon={<AiOutlineShoppingCart />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
      <StatsCard
        compact
        title="Best Selling Product"
        value={isLoading ? "—" : bestSeller?.name || "—"}
        icon={<AiOutlineTrophy />}
        iconBg="bg-warning-light"
        iconColor="text-warning"
        trend={bestSeller ? formatPrice(bestSeller.total_revenue) : ""}
      />
    </div>
  );
};

export default ProductPerformanceStatsCards;
