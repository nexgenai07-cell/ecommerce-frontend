// ============================================================
// PROFIT BREAKDOWN TABLE — PROFIT REPORT SUB-COMPONENT
// ============================================================
// One row per period of the profit report (day, week, month or year),
// newest first. Every row carries the complete profit picture: quantity,
// average selling price and cost per unit, markup per unit, revenue, cost,
// gross profit, markup % and profit margin %.
//
// Two percentages are shown and they are different numbers:
//   Markup %  = gross profit / cost x 100     (profit against cost)
//   Margin %  = gross profit / revenue x 100  (profit against revenue)
//
// A value the server could not calculate is shown as an em dash. The
// rows are paged on the client, so changing the page or the page size
// makes no extra request.
//
// Props:
//   rows      - the "data" array of a profit report response
//   period    - "daily" | "weekly" | "monthly" | "yearly", used for labels
//   isLoading - true while the report request is running

import { useState } from "react";

import formatPrice from "../../utils/formatPrice";
import formatPriceOrDash from "../../utils/formatPriceOrDash";
import formatPercent from "../../utils/formatPercent";
import formatReportPeriodLabel from "../../utils/formatReportPeriodLabel";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// Column heading of the first column for each period.
const PERIOD_COLUMN_LABELS = {
  daily: "Date",
  weekly: "Week Of",
  monthly: "Month",
  yearly: "Year",
};

// Muted grey text for a secondary number.
const MutedCell = ({ children }) => (
  <span className="text-gray-500">{children}</span>
);

const ProfitBreakdownTable = ({ rows, period, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Returns to page 1 whenever the page size changes, so a deep page of a
  // differently sized list can never land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Newest period first.
  const sortedRows = [...rows].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = sortedRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const columns = [
    {
      key: "date",
      label: PERIOD_COLUMN_LABELS[period] || "Period",
      render: (row) => formatReportPeriodLabel(row.date, period),
    },
    { key: "total_orders", label: "Orders" },
    {
      key: "units_sold",
      label: "Units",
      render: (row) => Number(row.units_sold) || 0,
    },
    {
      key: "avg_selling_price_per_unit",
      label: "Avg Price",
      render: (row) => (
        <MutedCell>
          {formatPriceOrDash(row.avg_selling_price_per_unit)}
        </MutedCell>
      ),
    },
    {
      key: "avg_cost_per_unit",
      label: "Avg Cost",
      render: (row) => (
        <MutedCell>{formatPriceOrDash(row.avg_cost_per_unit)}</MutedCell>
      ),
    },
    {
      key: "markup_per_unit",
      label: "Markup / Unit",
      render: (row) => (
        <MutedCell>{formatPriceOrDash(row.markup_per_unit)}</MutedCell>
      ),
    },
    {
      key: "total_revenue",
      label: "Revenue",
      render: (row) => (
        <span className="font-medium text-gray-900">
          {formatPrice(row.total_revenue)}
        </span>
      ),
    },
    {
      key: "total_cost",
      label: "Cost",
      render: (row) => (
        <MutedCell>{formatPriceOrDash(row.total_cost)}</MutedCell>
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
          <span className={`font-semibold ${toneClass}`}>
            {formatPriceOrDash(row.gross_profit)}
          </span>
        );
      },
    },
    {
      key: "markup_percent",
      label: "Markup %",
      render: (row) => (
        <MutedCell>{formatPercent(row.markup_percent)}</MutedCell>
      ),
    },
    {
      key: "profit_margin_percent",
      label: "Margin %",
      render: (row) => (
        <MutedCell>{formatPercent(row.profit_margin_percent)}</MutedCell>
      ),
    },
  ];

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 overflow-hidden
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300"
    >
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          Profit Breakdown
        </h2>
        <p className="text-xs text-gray-400">
          Markup % is profit against cost. Margin % is profit against revenue.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : sortedRows.length === 0 ? (
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
            data={paginatedRows}
            keyField="date"
            currentPage={safePage}
            totalPages={totalPages}
            totalResults={sortedRows.length}
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

export default ProfitBreakdownTable;
