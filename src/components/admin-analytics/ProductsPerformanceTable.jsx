// formatPrice -> turns a raw number into "Rs 3,481,170" style display text
import formatPrice from "../../utils/formatPrice";

// Spinner -> large loading indicator shown while data is still being fetched
import Spinner from "../ui/Spinner";

// EmptyState -> shared "nothing to show yet" placeholder UI
import EmptyState from "../ui/EmptyState";

// ProductsPerformanceTable -> receives the already-fetched `products`
// array and the `isLoading` flag from the parent page (ProductsPerformance),
// it does NOT fetch anything itself
const ProductsPerformanceTable = ({ products, isLoading }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header — title + short description, sits above the
          scrollable table body so it's always visible */}
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          Top Performing Products
        </h2>
        <p className="text-xs text-gray-400">
          Ranked by units sold and revenue for the selected date range
        </p>
      </div>

      {isLoading ? (
        // Loading state — large centered spinner while the shared query
        // in the parent page is still in flight
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        // Empty state — shown when the date range has zero sales at all
        <div className="py-8">
          <EmptyState
            variant="noResults"
            title="No Data"
            description="No sales activity in this date range yet."
          />
        </div>
      ) : (
        // ================================================================
        // SCROLLABLE TABLE FIX
        // Previously this wrapper only had "overflow-x-auto", so however
        // many rows the API returned (up to 50), the table just kept
        // growing taller and taller down the page with no limit.
        //
        // Fixed by adding a fixed max-height capped to roughly 10 data
        // rows plus the header row, with "overflow-y-auto" so any rows
        // beyond that scroll INSIDE the card instead of pushing the
        // rest of the page down. "overflow-x-auto" is kept alongside it
        // so the table can still scroll sideways on narrow phone
        // screens without breaking the layout.
        //
        // Row height math: each data row is `py-3` padding + text-sm
        // line height ≈ 44px tall. 10 rows × 44px = 440px, plus the
        // header row (~44px) ≈ 484px total, so max-h-[484px] shows
        // exactly about 10 rows before the scrollbar kicks in.
        // ================================================================
        <div className="overflow-auto max-h-121 scrollbar-hide">
          <table className="w-full">
            <thead>
              {/* sticky top-0 -> the header row stays pinned to the top
                  of the scroll area as the admin scrolls through the
                  rows below it, so column labels are always visible.
                  z-10 -> keeps the sticky header rendering above the
                  row content as it scrolls underneath it. */}
              <tr className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  Units Sold
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {/* One row per product, in the order the API already
                  returned them (ranked by sales) */}
              {products.map((product, index) => (
                <tr
                  key={product.product_id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-400">
                    #{index + 1}
                    {/* index + 1 -> converts the zero-based array index
                        into a human-friendly rank starting at #1 */}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {product.total_sold}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    {formatPrice(product.total_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductsPerformanceTable;
// Default export — imported in ProductsPerformance.jsx as
// <ProductsPerformanceTable products={...} isLoading={...} />
