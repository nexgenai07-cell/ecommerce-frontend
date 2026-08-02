import { useState } from "react";
// useState — local state for the selected date range

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches and caches the customer list for the table below

import { AiOutlineTeam } from "react-icons/ai";
// AiOutlineTeam — the SAME icon already used for "Customer Growth" in
// the admin sidebar, kept consistent here in the page header badge

import { getCustomers } from "../../api/customers.api";
// getCustomers — API 87, used to fetch the raw customer list that
// powers the Top Customers table below

import Input from "../../components/ui/Input";
// Input — shared text input component, used here for the two date pickers

import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen (Dashboard, Orders, Products,
// Sales Report, Revenue Report...). Matches this page to the rest of
// the panel instead of a plain <h1>.

import CustomerGrowthStatsCards from "../../components/admin-analytics/CustomerGrowthStatsCards";
import CumulativeGrowthChart from "../../components/admin-analytics/CumulativeGrowthChart";
import TopCustomersTable from "../../components/admin-analytics/TopCustomersTable";

const getDefaultRange = () => {
  // getDefaultRange — computes the initial date range shown when the
  // page first loads: from the 1st of January this year, through today
  const now = new Date();
  // now — the real current date/time, read fresh every time this runs
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  // startOfYear — January 1st of the current year
  return {
    startDate: startOfYear.toISOString().slice(0, 10),
    // Converts to "YYYY-MM-DD" — the shape the date <Input> and the
    // API's start_date query param both expect
    endDate: now.toISOString().slice(0, 10),
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

  // NOTE: the quick-range preset chips (Today / Last 7 Days / Last 30
  // Days / This Month / Last Month) that used to sit under these date
  // pickers have been REMOVED from this page. Reason: CumulativeGrowthChart
  // already has its own Month/Quarter/Year tabs which, once clicked,
  // silently override whatever date range is picked here and switch to
  // an auto range computed from today. Having a SECOND set of quick-date
  // shortcuts up here (the chips) that only affected the stats cards —
  // and sometimes not the chart, depending on whether a chart tab was
  // active — was confusing, since two different "quick select" controls
  // on one page could easily fall out of sync with each other. Keeping
  // only the plain Start/End date inputs here removes that ambiguity:
  // this row is now purely "custom range for the stats cards / chart's
  // date-driven mode", and the chart's own tabs are the only quick-select
  // shortcut on the page.

  // Fetched here for the Top Customers table — a larger page (50) is
  // requested and sorted by total_spent client-side, since API 61's
  // List Customers doesn't document a server-side `ordering` param
  const { data: customersResponse, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customerGrowth", "topCustomers"],
    // queryKey — unique cache key for this specific query
    queryFn: () => getCustomers({ page_size: 50 }),
    // FLAG: page_size isn't a confirmed documented param either — same
    // optimistic-attempt pattern used across every other admin list page
  });

  const rawCustomers =
    // Prefers the paginated `.results` shape, falls back to a flat array
    customersResponse?.data?.results || customersResponse?.data || [];
  const sortedCustomers = [...rawCustomers].sort(
    // Copies the array before sorting — Array.sort() mutates in place,
    // and mutating the react-query cached array directly would cause
    // subtle bugs elsewhere in the app
    (a, b) => (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0),
    // Highest spender first
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient icon + title component, matching
          every other admin screen. Only the plain Start/End date inputs
          are passed in as `actions` (no quick-range chips) — see the
          note above for why the chips were removed.
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineTeam />}
        // Same icon already used for "Customer Growth" in the sidebar
        title="Customer Growth"
        actions={
          // flex-col on mobile (stacked, full width), sm:flex-row from
          // the small breakpoint up (both fields sit side by side)
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-37.5 shrink-0">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                // Updates startDate directly from the picked date
                aria-label="Start date"
                // Screen-reader label for the start-date field
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
                // Updates endDate directly from the picked date
                aria-label="End date"
                // Screen-reader label for the end-date field
              />
            </div>
          </div>
        }
      />

      {/* Stats cards — rendered in the smaller "compact" size, at a
          fixed narrow width, so the row takes up noticeably less
          vertical and horizontal space */}
      <CustomerGrowthStatsCards startDate={startDate} endDate={endDate} />
      {/* Note: "Returning Rate" card from the design is NOT included —
          see the flag notes above CustomerGrowthStatsCards: computing
          a true store-wide retention percentage isn't feasible without
          a dedicated backend aggregate endpoint. */}

      <CumulativeGrowthChart startDate={startDate} endDate={endDate} />
      {/* Note: "New vs Returning" and "Activity Funnel" widgets from
          the design are NOT included — neither a returning-customer
          split nor a view→cart→purchase funnel can be computed from
          any documented endpoint.
          Note: this chart follows startDate/endDate above ONLY until
          the admin clicks one of its own Month/Quarter/Year tabs —
          once clicked, the chart switches to its own auto (today-based)
          range and ignores these props until the date fields above are
          changed again. See CumulativeGrowthChart.jsx for the full logic. */}

      <TopCustomersTable
        customers={sortedCustomers}
        // The full, client-sorted customer list — the table itself
        // slices out just the top 5
        isLoading={isCustomersLoading}
        // Drives the table's own loading spinner
      />
      {/* Note: the table's Status column has been removed and replaced
          with an Actions column (eye icon) — clicking it opens the
          same customer detail drawer used on /admin/customers, see
          TopCustomersTable.jsx for the full implementation. */}
    </div>
  );
};

export default CustomerGrowth;
// Default export — this is the actual page component routed at
// /admin/analytics/customers
