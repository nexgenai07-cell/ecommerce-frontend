import { useState } from "react";

// useQuery -> TanStack Query hook, fetches + caches the Best Sellers
// data from the backend so it isn't refetched on every re-render
import { useQuery } from "@tanstack/react-query";

// AiOutlineTrophy -> the trophy icon shown inside the page header's
// gradient badge — the SAME icon already used for this page's link in
// the admin sidebar ("Product Performance"), kept consistent here
import { AiOutlineTrophy } from "react-icons/ai";

// getBestSellers -> the API call this page is built on; returns products
// ranked by sales for the chosen date range, and can also return them
// ordered by revenue
import { getBestSellers } from "../../api/analytics.api";
// getCategories -> powers the "Category" filter dropdown below, and its
// value is forwarded to getBestSellers as category_id
import { getCategories } from "../../api/categories.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import {
  getDefaultRange,
  getPresetRanges,
} from "../../utils/getReportDateRanges";
// getDefaultRange / getPresetRanges — read the local calendar date, so
// "Today" and the other quick ranges always match the admin's own day,
// even in the hours where UTC and local time fall on different dates.

// AnalyticsPageHeader -> the page title with the Filters button at the top
// right, and the filter chips (date range with quick ranges, and category)
// that open under it
import AnalyticsPageHeader from "../../components/admin-analytics/AnalyticsPageHeader";

// ProductPerformanceStatsCards -> the KPI card row (units sold,
// total revenue, best seller)
import ProductPerformanceStatsCards from "../../components/admin-analytics/ProductPerformanceStatsCards";

// TopProductsRevenueList -> the horizontal-bar list showing the top
// products by revenue, with a "View full list" link at the bottom
import TopProductsRevenueList from "../../components/admin-analytics/TopProductsRevenueList";

// ProductsPerformanceTable -> the full data table below, listing every
// fetched product with its rank, units sold, and revenue
import ProductsPerformanceTable from "../../components/admin-analytics/ProductsPerformanceTable";

// ProductsPerformance -> the main page component rendered at
// ROUTES.ADMIN_ANALYTICS_PRODUCTS ("/admin/analytics/products")
const ProductsPerformance = () => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [categoryId, setCategoryId] = useState("");

  // Category filter options — reuses the exact same cache key/query as
  // every other category dropdown in this project (navbar, footer,
  // Product Management, etc. — see categories.api.js), so this costs
  // no extra request in practice.
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(undefined, signal),
    staleTime: 1000 * 60 * 5,
  });
  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...extractListData(categoriesResponse).map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
  ];

  // Recomputed on every render so "Today" always means today, not the
  // day the component first mounted
  const presetRanges = getPresetRanges();

  // Applies a preset's start/end dates in one tap — both dates update
  // together so every section on the page refetches in sync
  const handleSelectPreset = (preset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  // Source for the full table below the revenue list. The backend returns
  // it ranked by units sold (its default ordering), which is what the
  // table's Rank column shows. `category_id` combines with the date range,
  // and `limit` is respected because `page` is never sent (this page does
  // not use the opt-in pagination), so the response stays a plain array.
  const { data: response, isLoading } = useQuery({
    queryKey: ["productsPerformance", "list", startDate, endDate, categoryId],
    queryFn: ({ signal }) =>
      getBestSellers(
        {
          start_date: startDate,
          end_date: endDate,
          limit: 50,
          category_id: categoryId || undefined,
        },
        signal,
      ),
  });

  const products = response?.data || [];
  // products -> falls back to an empty array while loading or if the
  // request fails, so every child component below can safely call
  // .map()/.slice() on it without needing its own null-check

  // Source for the "Top Products by Revenue" list. The backend orders the
  // products by revenue BEFORE applying the limit, so the highest-earning
  // products are always returned — even one that sold few units and would
  // fall outside the top 50 when ranked by units sold.
  const { data: revenueResponse, isLoading: isRevenueLoading } = useQuery({
    queryKey: [
      "productsPerformance",
      "topRevenue",
      startDate,
      endDate,
      categoryId,
    ],
    queryFn: ({ signal }) =>
      getBestSellers(
        {
          start_date: startDate,
          end_date: endDate,
          limit: 50,
          category_id: categoryId || undefined,
          ordering: "-total_revenue",
        },
        signal,
      ),
  });

  const topRevenueProducts = revenueResponse?.data || [];

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — the title, the Filters button at the top right, and
          the filter chips that open under it (date range with the quick
          ranges inside its dropdown, and the category filter).
          ================================================================ */}
      <AnalyticsPageHeader
        icon={<AiOutlineTrophy />}
        title="Products Performance"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        defaultStartDate={defaultRange.startDate}
        defaultEndDate={defaultRange.endDate}
        presetRanges={presetRanges}
        onSelectPreset={handleSelectPreset}
        selects={[
          {
            key: "category",
            label: "Category",
            options: categoryOptions,
            value: categoryId,
            defaultValue: "",
            onChange: setCategoryId,
          },
        ]}
      />

      <ProductPerformanceStatsCards startDate={startDate} endDate={endDate} />

      {/* ================================================================
          TOP PRODUCTS BY REVENUE — full width (w-full), matching the
          rest of this page's sections, which all run edge-to-edge. It
          reads from its own revenue-ordered request, separate from the
          units-ranked table below.
          ================================================================ */}
      <div className="w-full">
        <TopProductsRevenueList
          products={topRevenueProducts}
          isLoading={isRevenueLoading}
        />
      </div>

      <ProductsPerformanceTable products={products} isLoading={isLoading} />
    </div>
  );
};

export default ProductsPerformance;
// Default export — imported in App.jsx as the component rendered at
// ROUTES.ADMIN_ANALYTICS_PRODUCTS ("/admin/analytics/products")
