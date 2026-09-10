import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AiOutlineShoppingCart,
  AiOutlineTrophy,
  AiOutlineDollarCircle,
} from "react-icons/ai";

import { getBestSellers } from "../../api/analytics.api";
import formatPrice from "../../utils/formatPrice";

// ============================================================
// REDESIGN — Products Performance KPI row
// Replaces the old plain white StatsCard pair with three richer,
// gradient-accented cards that read as a proper "highlight" row:
// each one gets its own color story (emerald / violet / amber), a
// glowing icon badge, a soft decorative blob in the background, and
// a subtle staggered entrance animation. Still fully responsive —
// 1 column on phones, 3 across from the sm breakpoint up.
// ============================================================
const ProductPerformanceStatsCards = ({ startDate, endDate }) => {
  // Same data source as before (limit: 50 is a deliberate middle
  // ground — big enough for "units sold" to mean something, without
  // pretending to cover the entire catalog)
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

  const bestSeller = products[0]; // API 73 already returns these sorted by sales, so index 0 is the real #1

  // Config-driven so the three cards share one exact markup shape —
  // easier to keep visually identical to one another
  const cards = [
    {
      key: "units",
      title: "Top Products Units Sold",
      value: isLoading ? "—" : totalUnitsSold.toLocaleString(),
      caption: `Across ${isLoading ? "—" : products.length} tracked product${products.length === 1 ? "" : "s"}`,
      icon: <AiOutlineShoppingCart />,
      from: "from-primary",
      to: "to-primary-dark",
      glow: "shadow-primary/25",
      blob: "bg-primary/10",
    },
    {
      key: "revenue",
      title: "Total Revenue",
      value: isLoading ? "—" : formatPrice(totalRevenue),
      caption: "Combined revenue for this range",
      icon: <AiOutlineDollarCircle />,
      from: "from-violet-500",
      to: "to-violet-700",
      glow: "shadow-violet-500/25",
      blob: "bg-violet-500/10",
    },
    {
      key: "bestseller",
      title: "Best Selling Product",
      value: isLoading ? "—" : bestSeller?.name || "No sales yet",
      caption: bestSeller
        ? formatPrice(bestSeller.total_revenue) + " in revenue"
        : "—",
      icon: <AiOutlineTrophy />,
      from: "from-amber-400",
      to: "to-amber-600",
      glow: "shadow-amber-500/25",
      blob: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
          className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)] hover:shadow-[0_12px_28px_-8px_rgba(16,24,40,0.18)] hover:-translate-y-0.5 transition-all duration-300"
        >
          {/* Decorative soft-color blob in the corner — purely visual,
              adds depth without competing with the actual content */}
          <div
            className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl ${card.blob} transition-transform duration-500 group-hover:scale-125`}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {card.title}
              </p>
              <p
                className={`mt-2 font-bold text-gray-900 leading-tight ${
                  card.key === "bestseller" ? "text-lg truncate" : "text-2xl"
                }`}
                title={typeof card.value === "string" ? card.value : undefined}
              >
                {isLoading ? (
                  <span className="inline-block h-7 w-24 rounded-md bg-gray-100 animate-pulse" />
                ) : (
                  card.value
                )}
              </p>
              <p className="mt-1 text-xs text-gray-400 truncate">
                {isLoading ? (
                  <span className="inline-block h-3 w-32 rounded bg-gray-100 animate-pulse" />
                ) : (
                  card.caption
                )}
              </p>
            </div>

            {/* Gradient icon badge — the same "brand gradient badge"
                language used in PageHeader, repeated here per-card with
                each card's own accent color */}
            <div
              className={`shrink-0 w-12 h-12 rounded-xl bg-linear-to-br ${card.from} ${card.to} flex items-center justify-center shadow-lg ${card.glow} ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
            >
              <span className="text-white text-xl [&>svg]:w-6 [&>svg]:h-6">
                {card.icon}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ProductPerformanceStatsCards;
