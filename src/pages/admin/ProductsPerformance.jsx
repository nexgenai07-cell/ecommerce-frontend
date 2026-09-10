import { useState } from "react";

// useQuery -> TanStack Query hook, fetches + caches the Best Sellers
// data from the backend so it isn't refetched on every re-render
import { useQuery } from "@tanstack/react-query";

// AiOutlineTrophy -> the trophy icon shown inside the page header's
// gradient badge — the SAME icon already used for this page's link in
// the admin sidebar ("Product Performance"), kept consistent here
import { AiOutlineTrophy } from "react-icons/ai";

// getBestSellers -> the single API call this whole page is built on;
// returns products ranked by sales for the chosen date range
import { getBestSellers } from "../../api/analytics.api";

// Input -> shared input component, used here twice for the two date pickers
import Input from "../../components/ui/Input";

import cn from "../../utils/cn";
// cn — merges Tailwind class strings, used to style the active/inactive
// quick-range chip buttons below (same helper Sales Report uses for
// the exact same purpose)

// PageHeader -> the SAME shared gradient icon + title header already
// used on every other admin screen (Dashboard, Orders, Sales Report,
// Revenue Report...) — kept exactly as-is here so this page matches
// the rest of the panel.
import PageHeader from "../../components/shared/PageHeader";

// ProductPerformanceStatsCards -> the KPI card row (units sold,
// total revenue, best seller)
import ProductPerformanceStatsCards from "../../components/admin-analytics/ProductPerformanceStatsCards";

// TopProductsRevenueList -> the horizontal-bar list showing the top
// products by revenue, with a "View full list" link at the bottom
import TopProductsRevenueList from "../../components/admin-analytics/TopProductsRevenueList";

// ProductsPerformanceTable -> the full data table below, listing every
// fetched product with its rank, units sold, and revenue
import ProductsPerformanceTable from "../../components/admin-analytics/ProductsPerformanceTable";

// getDefaultRange -> the 1st day of the current month through today
const getDefaultRange = () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: firstOfMonth.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
};

// --------------------------------------------------
// QUICK-RANGE PRESETS — one-tap shortcuts shown as chips under the date
// pickers (Today / Last 7 Days / Last 30 Days / This Month / Last Month).
// Same preset set and same live-computed-from-today approach as the
// Sales Report page, so both pages behave identically.
// --------------------------------------------------
const getPresetRanges = () => {
  const now = new Date();
  const toISO = (date) => date.toISOString().slice(0, 10);
  const today = toISO(now);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  // Day 0 of the current month rolls back to the last day of the month before it

  return [
    { label: "Today", startDate: today, endDate: today },
    { label: "Last 7 Days", startDate: toISO(sevenDaysAgo), endDate: today },
    { label: "Last 30 Days", startDate: toISO(thirtyDaysAgo), endDate: today },
    { label: "This Month", startDate: toISO(thisMonthStart), endDate: today },
    {
      label: "Last Month",
      startDate: toISO(lastMonthStart),
      endDate: toISO(lastMonthEnd),
    },
  ];
};

// ProductsPerformance -> the main page component rendered at
// ROUTES.ADMIN_ANALYTICS_PRODUCTS ("/admin/analytics/products")
const ProductsPerformance = () => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  // Recomputed on every render so "Today" always means today, not the
  // day the component first mounted
  const presetRanges = getPresetRanges();

  // Applies a preset's start/end dates in one tap — both date inputs
  // update together so every section on the page refetches in sync
  const handleSelectPreset = (preset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  // Shared source for BOTH the "Top Products by Revenue" bar list and
  // the full table below — fetched once here (limit: 50, a deliberate
  // middle ground — see the flag notes in ProductPerformanceStatsCards
  // for why this isn't pretending to cover the entire 254-product catalog)
  const { data: response, isLoading } = useQuery({
    queryKey: ["productsPerformance", "list", startDate, endDate],
    queryFn: ({ signal }) =>
      getBestSellers(
        { start_date: startDate, end_date: endDate, limit: 50 },
        signal,
      ),
  });

  const products = response?.data || [];
  // products -> falls back to an empty array while loading or if the
  // request fails, so every child component below can safely call
  // .map()/.slice() on it without needing its own null-check

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient icon + title component, matching
          every other admin screen. The date-range pickers sit on the
          right side of the header row, with the quick-range chips
          placed directly BELOW them (same layout Sales Report uses)
          instead of off to the side, so picking a precise date and
          tapping a quick preset both happen in the same visual spot.
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineTrophy />}
        title="Products Performance"
        actions={
          // w-full on mobile so the block below can stack full-width;
          // sm:w-auto lets it shrink back to its natural size once the
          // date row switches to a single horizontal line
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            {/* Date row — stacks into a single column on mobile
                (flex-col, each field full width) and becomes one
                horizontal row from the sm breakpoint up */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
              <div className="w-full sm:w-37.5 shrink-0">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Start date"
                />
              </div>

              {/* Separator dash — hidden on mobile where the fields
                  stack vertically instead of sitting side by side */}
              <span className="text-gray-300 hidden sm:inline">-</span>

              <div className="w-full sm:w-37.5 shrink-0">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="End date"
                />
              </div>
            </div>

            {/* ==========================================================
                QUICK-RANGE CHIPS — one-tap shortcuts sitting directly
                below the date pickers, exactly like Sales Report.
                Horizontally scrollable with the scrollbar hidden so
                all five chips stay reachable even on a narrow phone
                screen without breaking the layout.
                ========================================================== */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {presetRanges.map((preset) => {
                const isActive =
                  preset.startDate === startDate && preset.endDate === endDate;

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-150 shrink-0 border",
                      isActive
                        ? "bg-linear-to-r from-primary to-primary-dark text-white border-transparent shadow-sm shadow-primary/25"
                        : "bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
      />
      {/* Note: "Category: All" filter from the original design is NOT
          included — neither Best Sellers nor Low Performing Products
          document a category filter param in the API. */}

      <ProductPerformanceStatsCards startDate={startDate} endDate={endDate} />
      {/* Note: "Most Viewed Product" and "Avg Product Rating" cards
          from the design are NOT included — no view-aggregation or
          ratings/reviews system exists anywhere in the documented API. */}

      {/* ================================================================
          TOP PRODUCTS BY REVENUE — now full width (w-full), instead of
          being capped to a percentage of the page — matches the rest
          of this page's sections, which all run edge-to-edge.
          ================================================================ */}
      <div className="w-full">
        <TopProductsRevenueList products={products} isLoading={isLoading} />
        {/* "Sales by Category" donut from the original design is NOT
            included — same gap already flagged on the Sales Report
            page: no category-revenue-breakdown endpoint exists. */}
      </div>

      <ProductsPerformanceTable products={products} isLoading={isLoading} />
    </div>
  );
};

export default ProductsPerformance;
// Default export — imported in App.jsx as the component rendered at
// ROUTES.ADMIN_ANALYTICS_PRODUCTS ("/admin/analytics/products")
