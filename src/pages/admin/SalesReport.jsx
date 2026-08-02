import { useState } from "react";

// TanStack Query — fetches the Sales Report data (API 83) and caches it
import { useQuery } from "@tanstack/react-query";

// Icons — download icon for the CSV button, line-chart icon for the page
// header badge (the exact icon already used for "Sales Report" in the
// admin sidebar, kept consistent here)
import { AiOutlineDownload, AiOutlineLineChart } from "react-icons/ai";

import { getSalesReport, exportReport } from "../../api/analytics.api";
// getSalesReport — API 83, the single source of ALL real data on this page
// exportReport   — API 90, "sales" is the ONE example type the doc actually
//                  confirms (unlike "orders"/"returns"/"customers"/"discounts"
//                  used on other pages, which were all assumptions) — this
//                  is the one export button in the whole admin panel that
//                  isn't a guess.

import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import cn from "../../utils/cn";
// cn — merges Tailwind class strings, used to style the active/inactive
// quick-range chip buttons below

import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already used on
// every other admin screen (Dashboard, Orders, Products, Returns...). Added
// here so Sales Report finally matches the rest of the panel instead of
// using its own plain <h1>.

import SalesStatsCards from "../../components/admin-analytics/SalesStatsCards";
import SalesOverTimeChart from "../../components/admin-analytics/SalesOverTimeChart";
import DailyBreakdownTable from "../../components/admin-analytics/DailyBreakdownTable";

// Default range — the current calendar month to date, a reasonable
// starting point before the admin picks their own custom range
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
// Every value is computed live from the real current date, nothing is
// hardcoded, so the chips stay correct on any day the admin opens the page.
// --------------------------------------------------
const getPresetRanges = () => {
  const now = new Date();
  // toISO — converts a Date object to the "YYYY-MM-DD" string shape the
  // date <Input> and the API's start_date/end_date query params both expect
  const toISO = (date) => date.toISOString().slice(0, 10);
  const today = toISO(now);

  // Last 7 Days — today minus 6 days, so the range is exactly 7 days
  // inclusive of today
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);

  // Last 30 Days — today minus 29 days, so the range is exactly 30 days
  // inclusive of today
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);

  // This Month — the 1st of the current month through today
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Last Month — the full previous calendar month, start to end
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

const SalesReport = () => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [isExporting, setIsExporting] = useState(false);

  // Recomputed on every render so "Today" always means today, not the day
  // the component first mounted — cheap, since it's just a handful of Date
  // objects, not a network call
  const presetRanges = getPresetRanges();

  // Shared data source for BOTH the chart's underlying data (already
  // fetched independently inside SalesOverTimeChart with its own
  // query) AND the Daily Breakdown table below — fetched once here
  // and passed down, so the table doesn't duplicate the same request
  const { data: response, isLoading } = useQuery({
    queryKey: ["salesReport", "breakdown", startDate, endDate],
    queryFn: () =>
      getSalesReport({
        start_date: startDate,
        end_date: endDate,
        period: "daily",
      }),
  });

  const dataPoints = response?.data?.data || [];

  // Applies a preset's start/end dates in one tap — both date inputs
  // update together so the chart, cards, and table all refetch in sync
  const handleSelectPreset = (preset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({
        type: "sales",
        start_date: startDate,
        end_date: endDate,
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `sales-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Report downloaded.");
    } catch (error) {
      showError("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient icon + title component, matching
          every other admin screen. The date-range pickers, CSV export
          button, and quick-range chips are passed in as `actions` so they
          render on the right side of the header (and wrap below the
          title on narrow screens, since PageHeader's outer row is
          flex-wrap).
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineLineChart />}
        title="Sales Report"
        actions={
          // w-full on mobile so the block below can stack full-width;
          // sm:w-auto lets it shrink back to its natural size once the
          // date row switches to a single horizontal line
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            {/* Date range row — stacks into a single column on mobile
                (flex-col, each field full width) and becomes one
                horizontal row with compact fixed-width fields from the
                sm breakpoint up, so it never overflows the header on a
                phone screen */}
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

              <Button
                variant="secondary"
                leftIcon={<AiOutlineDownload className="w-4 h-4" />}
                onClick={handleExport}
                isLoading={isExporting}
                className="w-full sm:w-auto shrink-0"
              >
                CSV
              </Button>
            </div>

            {/* ==========================================================
                QUICK-RANGE CHIPS — one-tap shortcuts sitting directly
                below the date pickers. Horizontally scrollable with the
                scrollbar hidden (defined project-wide in index.css) so
                all five chips stay reachable even on a narrow phone
                screen without breaking the layout.
                ========================================================== */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {presetRanges.map((preset) => {
                // A chip is "active" when both its start and end dates
                // exactly match the currently selected range
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
      {/* Note: "PDF Report" from the design is NOT included — API 90's
          documented Export Report endpoint only returns a CSV file,
          there's no PDF generation option anywhere in the API. */}

      <SalesStatsCards startDate={startDate} endDate={endDate} />

      <SalesOverTimeChart startDate={startDate} endDate={endDate} />
      {/* Note: "Sales by Category" and "Payment Methods" widgets from
          the design are NOT included — see the flag notes shared
          before this code: no category-revenue endpoint exists, and a
          multi-provider payment breakdown doesn't apply since this
          project only processes payments through Stripe. */}

      <DailyBreakdownTable dataPoints={dataPoints} isLoading={isLoading} />
    </div>
  );
};

export default SalesReport;
