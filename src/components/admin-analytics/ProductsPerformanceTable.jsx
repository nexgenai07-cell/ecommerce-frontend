import { useState } from "react";

import formatPrice from "../../utils/formatPrice";
import formatPriceOrDash from "../../utils/formatPriceOrDash";
import formatPercent from "../../utils/formatPercent";

// Spinner -> large loading indicator shown while data is still being fetched
import Spinner from "../ui/Spinner";

// EmptyState -> shared "nothing to show yet" placeholder UI
import EmptyState from "../ui/EmptyState";

// DataTable -> the shared table + pagination component used across the
// admin panel
import DataTable from "../ui/DataTable";

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50];
// Capped at 50 (not the usual 100) because the parent page only fetches
// the top 50 products for the date range.
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// ProductsPerformanceTable -> receives the already-fetched `products`
// array and the `isLoading` flag from the parent page (ProductsPerformance),
// it does NOT fetch anything itself
const ProductsPerformanceTable = ({ products, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many ranked products are shown per page, controlled
  // by the "Rows per page" dropdown in the table footer. Purely a
  // client-side slice of the already-fetched `products` array, so no
  // extra network request is made when it changes.

  // Resets back to page 1 whenever the rows-per-page value changes, so
  // staying on a deep page of a differently sized list can't land on an
  // empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Rank is assigned against the full, API-ordered list (ranked by
  // sales) before pagination slices it down to a page, so "#1" always
  // means the single top-selling product regardless of which page is
  // currently visible.
  const rankedProducts = products.map((product, index) => ({
    ...product,
    rank: index + 1,
  }));

  const totalPages = Math.max(1, Math.ceil(rankedProducts.length / pageSize));
  const paginatedProducts = rankedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const columns = [
    {
      key: "rank",
      label: "Rank",
      render: (row) => <span className="text-gray-400">#{row.rank}</span>,
    },
    {
      key: "name",
      label: "Product",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      key: "total_sold",
      label: "Units Sold",
    },
    {
      // Average selling price of one unit in the selected range
      key: "avg_selling_price_per_unit",
      label: "Avg Price",
      render: (row) => (
        <span className="text-gray-500">
          {formatPriceOrDash(row.avg_selling_price_per_unit)}
        </span>
      ),
    },
    {
      // Average cost price of one unit. A dash means no sold unit of this
      // product has a cost price saved.
      key: "avg_cost_per_unit",
      label: "Avg Cost",
      render: (row) => (
        <span className="text-gray-500">
          {formatPriceOrDash(row.avg_cost_per_unit)}
        </span>
      ),
    },
    {
      key: "total_revenue",
      label: "Revenue",
      render: (row) => (
        <span className="font-semibold text-green-600">
          {formatPrice(row.total_revenue)}
        </span>
      ),
    },
    {
      key: "total_cost",
      label: "Cost",
      render: (row) => (
        <span className="text-gray-500">
          {formatPriceOrDash(row.total_cost)}
        </span>
      ),
    },
    {
      // Revenue minus cost. Green for a profit, red for a loss.
      key: "gross_profit",
      label: "Profit",
      render: (row) => {
        const profit =
          row.gross_profit === null || row.gross_profit === undefined
            ? null
            : Number(row.gross_profit);
        const toneClass =
          profit === null || Number.isNaN(profit) || profit === 0
            ? "text-gray-700"
            : profit > 0
              ? "text-success"
              : "text-danger";
        return (
          <span className={`font-medium ${toneClass}`}>
            {formatPriceOrDash(row.gross_profit)}
          </span>
        );
      },
    },
    {
      // Profit as a percentage of cost
      key: "markup_percent",
      label: "Markup %",
      render: (row) => (
        <span className="text-gray-500">
          {formatPercent(row.markup_percent)}
        </span>
      ),
    },
    {
      // Profit as a percentage of revenue
      key: "profit_margin_percent",
      label: "Margin %",
      render: (row) => (
        <span className="text-gray-500">
          {formatPercent(row.profit_margin_percent)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header — title and short description, always visible above
          the table body */}
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          Top Performing Products
        </h2>
        <p className="text-xs text-gray-400">
          Ranked by units sold, with revenue, cost and profit for the selected
          date range
        </p>
      </div>

      {isLoading ? (
        // Loading state — large centered spinner while the query in the
        // parent page is still in flight
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : rankedProducts.length === 0 ? (
        // Empty state — shown when the date range has zero sales at all
        <div className="py-8">
          <EmptyState
            variant="noResults"
            title="No Data"
            description="No sales activity in this date range yet."
          />
        </div>
      ) : (
        <div className="p-4">
          <DataTable
            columns={columns}
            data={paginatedProducts}
            keyField="product_id"
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={rankedProducts.length}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default ProductsPerformanceTable;
// Default export — imported in ProductsPerformance.jsx as
// <ProductsPerformanceTable products={...} isLoading={...} />
