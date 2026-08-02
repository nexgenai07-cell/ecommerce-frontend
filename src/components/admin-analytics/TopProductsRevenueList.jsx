import { useState } from "react";

// AiOutlineArrowRight -> the small arrow icon shown next to "View full
// list" / "Show less" at the bottom of the card
import { AiOutlineArrowRight } from "react-icons/ai";

// formatPrice -> turns a raw number into "Rs 3,481,170" style display text
import formatPrice from "../../utils/formatPrice";

// Spinner -> small loading indicator shown while the data is still being fetched
import Spinner from "../ui/Spinner";

// EmptyState -> shared "nothing to show yet" placeholder UI
import EmptyState from "../ui/EmptyState";

// TopProductsRevenueList -> receives the already-fetched `products`
// array and the `isLoading` flag from the parent page (ProductsPerformance),
// it does NOT fetch anything itself
const TopProductsRevenueList = ({ products, isLoading }) => {
  const [showAll, setShowAll] = useState(false);
  // showAll -> false by default (only the top 4 bars are drawn).
  // Toggled to true when the admin clicks "View full list" — this is a
  // simple LOCAL expand/collapse, not a page navigation.

  // ============================================================
  // "VIEW FULL LIST" FIX
  // This used to be a <Link> that navigated to a completely different
  // route (either this same page or the separate Product List page),
  // which took the admin AWAY from the revenue bars they were looking
  // at. That's not what was asked for — the remaining products from
  // THIS SAME "Top Products by Revenue" ranking should appear right
  // here, in place, underneath the first 4.
  //
  // Fixed by removing the <Link>/navigation entirely and instead
  // deciding, locally, how many of the already-fetched `products` to
  // render: 4 while collapsed, ALL of them once `showAll` is true.
  // ============================================================
  const visibleProducts = showAll ? products : products.slice(0, 4);
  // visibleProducts -> the actual array of products drawn as bars below;
  // switches between the first 4 and the complete list depending on showAll

  const remainingCount = Math.max(products.length - 4, 0);
  // remainingCount -> how many additional fetched products exist beyond
  // the first 4; Math.max(...,0) guards against a negative number if
  // fewer than 4 products were ever returned. Used both for the "View
  // more N products..." label and to decide whether the toggle link
  // needs to show at all.

  const maxRevenue = Math.max(
    ...products.map((p) => Number(p.total_revenue) || 0),
    1,
    // the trailing 1 -> prevents a divide-by-zero-style issue: if every
    // product had 0 revenue, maxRevenue would otherwise be 0 and the
    // width percentage math below would produce NaN
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
        Top Products by Revenue
      </h2>

      {isLoading ? (
        // Loading state — small centered spinner while the shared query
        // in the parent page is still in flight
        <div className="py-8 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : visibleProducts.length === 0 ? (
        // Empty state — shown when the date range has zero sales at all
        <EmptyState
          variant="noResults"
          title="No Sales Yet"
          description="Top products will appear here once orders come in."
        />
      ) : (
        <>
          {/* ============================================================
              SCROLL FIX FOR THE EXPANDED LIST
              While collapsed (showAll = false) this only ever holds 4
              bars, so it stays short and needs no scrolling. Once
              expanded (showAll = true) it can hold up to 50 bars, which
              would otherwise push the rest of the page down a huge
              amount — so a max-height + overflow-y-auto is applied ONLY
              while expanded, letting the extra bars scroll neatly
              inside the card instead.
              ============================================================ */}
          <div
            className={
              showAll
                ? "flex flex-col gap-4 max-h-105 overflow-y-auto pr-1 scrollbar-hide"
                : "flex flex-col gap-4"
            }
          >
            {/* One row per product — name + price on top, a
                proportional horizontal bar underneath */}
            {visibleProducts.map((product) => {
              const revenue = Number(product.total_revenue) || 0;
              // revenue -> this single product's total revenue as a number

              const widthPercent = (revenue / maxRevenue) * 100;
              // widthPercent -> this product's revenue expressed as a
              // percentage of the single highest revenue among all
              // fetched products, so the bars are visually comparable
              // to one another (the top seller's bar is always 100%)

              return (
                <div key={product.product_id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 truncate pr-2">
                      {product.name}
                      {/* truncate -> long product names are cut off
                          with an ellipsis instead of wrapping/overflowing */}
                    </span>
                    <span className="text-gray-500 shrink-0">
                      {formatPrice(revenue)}
                      {/* shrink-0 -> the price never gets squeezed by a
                          long product name next to it */}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    {/* Empty gray track — full width, represents 100% */}
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                      // inline style -> the width percentage is a
                      // runtime-calculated number, so it has to be set
                      // via the style attribute rather than a static
                      // Tailwind class
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {remainingCount > 0 && (
            // "View full list" -> "Show less" toggle button. type="button"
            // stops it from ever behaving like a form submit. Clicking it
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
                {/* Label changes depending on state: while collapsed it
                    tells the admin exactly how many more are hidden;
                    once expanded it simply confirms everything is shown */}
              </span>
              <span className="text-primary font-medium flex items-center gap-1">
                {showAll ? "Show less" : "View full list"}
                <AiOutlineArrowRight
                  className={
                    showAll
                      ? "w-3 h-3 rotate-90 transition-transform duration-200"
                      : "w-3 h-3 transition-transform duration-200"
                  }
                  // rotate-90 -> when expanded, the arrow points downward
                  // instead of rightward, giving a quick visual cue that
                  // clicking again will collapse the list back to 4
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
