import { useQuery } from "@tanstack/react-query";

import { getBestSellers } from "../../api/analytics.api";
// getBestSellers — API 86: GET /api/v1/analytics/products/best-sellers/
// returns [{ product_id, name, total_sold, total_revenue }]

import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const TopSellingProducts = () => {
  const { data: bestSellersResponse, isLoading } = useQuery({
    queryKey: ["adminDashboard", "bestSellers"],
    queryFn: () => getBestSellers({ limit: 5 }),
    // limit: 5 — matches API 86's own documented default
    staleTime: 1000 * 60 * 5,
  });

  const products = extractListData(bestSellersResponse);

  // The progress bar width for each product is relative to whichever
  // product earned the MOST revenue in this list — a real, data-driven
  // scale (not an arbitrary fixed percentage per row)
  const maxRevenue = Math.max(
    ...products.map((p) => Number(p.total_revenue) || 0),
    1, // avoids a divide-by-zero if every value were somehow 0
  );

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300
      "
    >
      <h2 className="text-base font-semibold text-gray-900">
        Top Selling Products
      </h2>

      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="No Sales Yet"
          description="Best-selling products will appear here once orders come in."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {products.map((product) => {
            const revenue = Number(product.total_revenue) || 0;
            const widthPercent = (revenue / maxRevenue) * 100;

            return (
              <div key={product.product_id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 truncate pr-2">
                    {product.name}
                  </span>

                  {/* Amount + how many units sold, grouped together on
                      the right side of the row */}
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-gray-500">
                      {formatPrice(revenue)}
                    </span>

                    {/* total_sold — comes directly from API 86's response
                        (getBestSellers). Shown in green as a small,
                        secondary data point next to the revenue amount. */}
                    <span className="text-success text-xs font-light leading-tight ">
                      ( {product.total_sold} sold)
                    </span>
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopSellingProducts;
