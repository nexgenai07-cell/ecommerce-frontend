import { useState } from "react";

import formatPrice from "../../utils/formatPrice";

// Spinner -> large loading indicator shown while data is still being fetched
import Spinner from "../ui/Spinner";

// EmptyState -> shared "nothing to show yet" placeholder UI
import EmptyState from "../ui/EmptyState";

// DataTable -> the shared table + pagination component used across the
// admin panel
import DataTable from "../ui/DataTable";

const PAGE_SIZE = 10;

// ProductsPerformanceTable -> receives the already-fetched `products`
// array and the `isLoading` flag from the parent page (ProductsPerformance),
// it does NOT fetch anything itself
const ProductsPerformanceTable = ({ products, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Rank is assigned against the full, API-ordered list (ranked by
  // sales) before pagination slices it down to a page, so "#1" always
  // means the single top-selling product regardless of which page is
  // currently visible.
  const rankedProducts = products.map((product, index) => ({
    ...product,
    rank: index + 1,
  }));

  const totalPages = Math.max(1, Math.ceil(rankedProducts.length / PAGE_SIZE));
  const paginatedProducts = rankedProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
      key: "total_revenue",
      label: "Revenue",
      render: (row) => (
        <span className="font-semibold text-green-600">
          {formatPrice(row.total_revenue)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header — title + short description, sits above the
          table body so it's always visible */}
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
          />
        </div>
      )}
    </div>
  );
};

export default ProductsPerformanceTable;
// Default export — imported in ProductsPerformance.jsx as
// <ProductsPerformanceTable products={...} isLoading={...} />
