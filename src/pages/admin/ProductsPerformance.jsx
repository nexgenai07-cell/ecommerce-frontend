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

// PageHeader -> the SAME shared gradient icon + title header already
// used on every other admin screen (Dashboard, Orders, Revenue
// Report...). Added here so Products Performance finally matches the
// rest of the panel instead of using its own plain <h1>.
import PageHeader from "../../components/shared/PageHeader";

// ProductPerformanceStatsCards -> the small "Top Products Units Sold" /
// "Best Selling Product" KPI card row
import ProductPerformanceStatsCards from "../../components/admin-analytics/ProductPerformanceStatsCards";

// TopProductsRevenueList -> the horizontal-bar list showing the top 4
// products by revenue, with a "View full list" link at the bottom
import TopProductsRevenueList from "../../components/admin-analytics/TopProductsRevenueList";

// ProductsPerformanceTable -> the full data table below, listing every
// fetched product with its rank, units sold, and revenue
import ProductsPerformanceTable from "../../components/admin-analytics/ProductsPerformanceTable";

// getDefaultRange -> works out the two starting date values the page
// opens with: the 1st day of the current month through today. This
// runs once when the component first mounts.
const getDefaultRange = () => {
  const now = new Date();
  // now -> the current date/time at the moment the page loads

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // firstOfMonth -> the 1st calendar day of the current month

  return {
    startDate: firstOfMonth.toISOString().slice(0, 10),
    // .toISOString().slice(0, 10) -> converts the Date object into the
    // "YYYY-MM-DD" string format that both the <Input type="date"> and
    // the API's start_date/end_date query params expect

    endDate: now.toISOString().slice(0, 10),
    // endDate -> today's date, in the same "YYYY-MM-DD" string format
  };
};

// ProductsPerformance -> the main page component rendered at
// ROUTES.ADMIN_ANALYTICS_PRODUCTS ("/admin/analytics/products")
const ProductsPerformance = () => {
  const defaultRange = getDefaultRange();
  // defaultRange -> computed once per render; used only to seed the
  // two pieces of state below on first mount

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  // startDate -> the currently selected range start, drives every
  // fetch on this page; setStartDate updates it whenever the first
  // date <Input> changes

  const [endDate, setEndDate] = useState(defaultRange.endDate);
  // endDate -> the currently selected range end; setEndDate updates it
  // whenever the second date <Input> changes

  // Shared source for BOTH the "Top Products by Revenue" bar list and
  // the full table below — fetched once here (limit: 50, a deliberate
  // middle ground — see the flag notes in ProductPerformanceStatsCards
  // for why this isn't pretending to cover the entire 254-product catalog)
  const { data: response, isLoading } = useQuery({
    queryKey: ["productsPerformance", "list", startDate, endDate],
    // queryKey -> uniquely identifies this request; whenever startDate
    // or endDate changes, TanStack Query automatically refetches with
    // the new values and re-renders the page with fresh data

    queryFn: ({ signal }) => getBestSellers({ start_date: startDate, end_date: endDate, limit: 50 }, signal),
    // queryFn -> the actual network call, passing the currently
    // selected date range plus a fixed limit of 50 products
  });

  const products = response?.data || [];
  // products -> the real array of product rows once loaded; falls back
  // to an empty array while loading or if the request fails, so every
  // child component below can safely call .map()/.slice() on it
  // without needing its own null-check

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient icon + title component, matching
          every other admin screen (Dashboard, Orders, Revenue Report...).
          The date-range pickers are passed in as `actions` so they
          render on the right side of the header (and wrap below the
          title on narrow screens, since PageHeader's outer row is
          flex-wrap) — exactly the same layout pattern already used on
          the Revenue Report page.
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineTrophy />}
        title="Products Performance"
        actions={
          // Date row — stacks into a single column on mobile (flex-col,
          // each field full width) and becomes one horizontal row from
          // the sm breakpoint up, so it never overflows the header on a
          // phone screen. w-full on mobile lets the fields below
          // stretch full-width; sm:w-auto lets the whole block shrink
          // back to its natural size once it becomes one horizontal line.
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-37.5 shrink-0">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
              />
            </div>

            {/* Separator dash — hidden on mobile where the fields stack
                vertically instead of sitting side by side */}
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
          TOP PRODUCTS BY REVENUE — WIDTH FIX (starts from the left,
          70% wide on large screens)
          This used to sit inside a `grid grid-cols-1 lg:grid-cols-2`
          wrapper as the ONLY child, which meant it silently occupied
          just ONE of the two grid columns (roughly half the page width
          on large screens) while the second column sat empty and
          invisible. That's why the card looked narrow.
          Fixed by dropping the leftover 2-column grid entirely and
          giving the card a simple percentage width instead:
          "w-full" -> full width on mobile so it never looks squeezed,
          "lg:w-[70%]" -> from the laptop breakpoint up the card takes
          exactly 70% of the available page width. There is NO
          "mx-auto" here on purpose — without it the block is NOT
          centered, so it starts flush from the left edge of the page
          (matching every other left-aligned section on this screen)
          instead of floating in the middle. */}
      <div className="w-full lg:w-[85%]">
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
