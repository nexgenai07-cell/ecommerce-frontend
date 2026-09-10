import { useState } from "react";

// AiOutlineArrowRight -> the small arrow icon shown next to "View full
// list" / "Show less" at the bottom of the card
import { AiOutlineArrowRight } from "react-icons/ai";

import { motion, AnimatePresence } from "framer-motion";

// formatPrice -> turns a raw number into "Rs 3,481,170" style display text
import formatPrice from "../../utils/formatPrice";

// Spinner -> small loading indicator shown while the data is still being fetched
import Spinner from "../ui/Spinner";

// EmptyState -> shared "nothing to show yet" placeholder UI
import EmptyState from "../ui/EmptyState";

// A short, deterministic set of gradients for each revenue bar,
// cycled through by index so a long list doesn't look monotone —
// purely decorative, no meaning attached to which product gets which color.
const BAR_GRADIENTS = [
  "from-primary to-primary-dark",
  "from-sky-400 to-sky-600",
  "from-violet-400 to-violet-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
  "from-teal-400 to-teal-600",
];

// TopProductsRevenueList -> receives the already-fetched `products`
// array and the `isLoading` flag from the parent page (ProductsPerformance),
// it does NOT fetch anything itself
const TopProductsRevenueList = ({ products, isLoading }) => {
  const [showAll, setShowAll] = useState(false);
  // showAll -> false by default (only the top 4 bars are drawn).
  // Toggled to true when the admin clicks "View full list" — this is a
  // simple LOCAL expand/collapse, not a page navigation.

  // Remaining products from THIS SAME "Top Products by Revenue" ranking
  // appear right here in place, underneath the first 4, once expanded —
  // no navigation away from the page.
  const visibleProducts = showAll ? products : products.slice(0, 4);

  const remainingCount = Math.max(products.length - 4, 0);
  // remainingCount -> how many additional fetched products exist beyond
  // the first 4; used both for the "View more N products..." label and
  // to decide whether the toggle needs to show at all.

  const maxRevenue = Math.max(
    ...products.map((p) => Number(p.total_revenue) || 0),
    1,
    // the trailing 1 -> prevents a divide-by-zero-style issue
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
        Top Products by Revenue
      </h2>

      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="No Sales Yet"
          description="Top products will appear here once orders come in."
        />
      ) : (
        <>
          <div
            className={
              showAll
                ? "flex flex-col gap-4 max-h-105 overflow-y-auto pr-1 scrollbar-hide"
                : "flex flex-col gap-4"
            }
          >
            <AnimatePresence initial={false}>
              {visibleProducts.map((product, index) => {
                const revenue = Number(product.total_revenue) || 0;
                const widthPercent = Math.max(
                  (revenue / maxRevenue) * 100,
                  4, // every bar gets at least a sliver of color so it never looks "broken/empty"
                );
                const barGradient = BAR_GRADIENTS[index % BAR_GRADIENTS.length];

                return (
                  <motion.div
                    key={product.product_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 truncate pr-2">
                        {product.name}
                      </span>
                      <span className="text-gray-500 shrink-0">
                        {formatPrice(revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      {/* inline style -> the width percentage is a
                          runtime-calculated number, so it has to be set
                          via the style attribute rather than a static
                          Tailwind class (same convention used for this
                          exact kind of bar in TopSellingProducts.jsx) */}
                      <div
                        className={`h-full rounded-full bg-linear-to-r ${barGradient} transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {remainingCount > 0 && (
            // "View full list" -> "Show less" toggle button. Clicking it
            // flips `showAll`, which re-renders the SAME card with either
            // 4 or all of the products — nothing ever navigates away.
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="flex items-center justify-between text-sm text-gray-400 pt-1 w-full text-left"
            >
              <span>
                {showAll
                  ? "Showing all products"
                  : `View more ${remainingCount} products...`}
              </span>
              <span className="text-primary font-medium flex items-center gap-1">
                {showAll ? "Show less" : "View full list"}
                <AiOutlineArrowRight
                  className={
                    showAll
                      ? "w-3 h-3 rotate-90 transition-transform duration-200"
                      : "w-3 h-3 transition-transform duration-200"
                  }
                />
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TopProductsRevenueList;
// Default export — imported in ProductsPerformance.jsx as
// <TopProductsRevenueList products={...} isLoading={...} />
