import { useState } from "react";
// useState — local state for the selected date range

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches and caches the customer list for the table below

import { AiOutlineTeam } from "react-icons/ai";
// AiOutlineTeam — the SAME icon already used for "Customer Growth" in
// the admin sidebar, kept consistent here in the page header badge

import { getCustomers } from "../../api/customers.api";
// getCustomers — fetches the customer list that powers the Top Customers
// table below

import AnalyticsPageHeader from "../../components/admin-analytics/AnalyticsPageHeader";
// AnalyticsPageHeader — the page title with the Filters button at the top
// right, and the filter chip (date range) that opens under it

import CustomerGrowthStatsCards from "../../components/admin-analytics/CustomerGrowthStatsCards";
import CumulativeGrowthChart from "../../components/admin-analytics/CumulativeGrowthChart";
import TopCustomersTable from "../../components/admin-analytics/TopCustomersTable";

const toLocalISODate = (date) => {
  // toLocalISODate — formats a Date as "YYYY-MM-DD" using its LOCAL
  // year/month/day, never converting to UTC first.
  // date.toISOString() always converts to UTC before formatting. For an
  // admin in a timezone AHEAD of UTC (e.g. UTC+5), local midnight on
  // Jan 1 is 19:00 on Dec 31 in UTC, so toISOString().slice(0, 10) would
  // return the previous day. Building the string from
  // getFullYear/getMonth/getDate keeps it in the browser's local timezone,
  // matching what the admin sees on their calendar.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  // getDefaultRange — computes the initial date range shown when the
  // page first loads: from the 1st of January this year, through today
  const now = new Date();
  // now — the real current date/time, read fresh every time this runs
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  // startOfYear — January 1st of the current year
  return {
    startDate: toLocalISODate(startOfYear),
    // "YYYY-MM-DD" in the browser's own local timezone — the shape
    // the date inputs and the API's start_date query param both
    // expect
    endDate: toLocalISODate(now),
    // endDate — today, in the same "YYYY-MM-DD" shape
  };
};

const CustomerGrowth = () => {
  const defaultRange = getDefaultRange();
  // defaultRange — computed once per mount to seed the initial state below

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  // startDate — currently selected range start, drives the stats cards
  // and (when the chart is NOT in its own auto/tab-driven mode) the chart
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  // endDate — currently selected range end, same role as startDate above

  // This page deliberately has no quick-range chips (Today / Last 7 Days /
  // ...): CumulativeGrowthChart has its own Month/Quarter/Year tabs which,
  // once clicked, override the date range picked here and switch to a range
  // computed from today. A second set of quick-date shortcuts up here would
  // only affect the stats cards, so the two could fall out of sync. The
  // date range below is therefore purely a custom range for the stats cards
  // and the chart's date-driven mode.

  // Fetched here for the Top Customers table. The backend's `ordering`
  // param is used to ask for exactly the top 5 spenders, sorted by the
  // backend, since TopCustomersTable only ever displays the top 5.
  const { data: customersResponse, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customerGrowth", "topCustomers"],
    // queryKey — unique cache key for this specific query
    queryFn: ({ signal }) =>
      getCustomers({ ordering: "-total_spent", page_size: 5 }, signal),
  });

  const sortedCustomers = customersResponse?.data?.results || [];
  // Already sorted, highest spender first, straight from the backend —
  // no client-side sorting is needed

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — the title, the Filters button at the top right, and
          the date range chip that opens under it (no quick ranges — see the
          note above).
          ================================================================ */}
      <AnalyticsPageHeader
        icon={<AiOutlineTeam />}
        // Same icon used for "Customer Growth" in the sidebar
        title="Customer Growth"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        defaultStartDate={defaultRange.startDate}
        defaultEndDate={defaultRange.endDate}
      />

      {/* Stats cards for the selected date range */}
      <CustomerGrowthStatsCards startDate={startDate} endDate={endDate} />

      <CumulativeGrowthChart startDate={startDate} endDate={endDate} />
      {/* This chart follows startDate/endDate above only until the admin
          clicks one of its own Month/Quarter/Year tabs — once clicked, the
          chart switches to its own auto (today-based) range and ignores
          these props until the date fields above are changed again. See
          CumulativeGrowthChart.jsx for the full logic. */}

      <TopCustomersTable
        customers={sortedCustomers}
        // The top spenders, highest first — the table shows up to the
        // first 5
        isLoading={isCustomersLoading}
        // Drives the table's own loading spinner
      />
      {/* The table's Actions column (eye icon) opens the same customer
          detail drawer used on /admin/customers — see TopCustomersTable.jsx. */}
    </div>
  );
};

export default CustomerGrowth;
// Default export — this is the actual page component routed at
// /admin/analytics/customers
