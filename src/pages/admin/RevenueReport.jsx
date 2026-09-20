import { useState } from "react";

// Icon — the dollar-circle icon shown in the page header badge (the same
// icon used for "Revenue Report" in the admin sidebar)
import { AiOutlineDollarCircle } from "react-icons/ai";

import { exportReport } from "../../api/analytics.api";
// exportReport — `type: "revenue"` downloads this report as a CSV file

import { showSuccess, showError } from "../../components/ui/Toast";

import AnalyticsPageHeader from "../../components/admin-analytics/AnalyticsPageHeader";
// AnalyticsPageHeader — the page title with the Filters and Export buttons
// at the top right, and the filter chips (date range with quick ranges, and
// status) that open under it

import RevenueStatsCards from "../../components/admin-analytics/RevenueStatsCards";
import RevenueByPeriodChart from "../../components/admin-analytics/RevenueByPeriodChart";
import RevenueYearComparisonChart from "../../components/admin-analytics/RevenueYearComparisonChart";
import RevenueHeatmap from "../../components/admin-analytics/RevenueHeatmap";

// STATUS_OPTIONS — the same status filter as the Sales Report. "sold" is the
// default and shows paid orders only; the other options show cancelled or
// refunded orders, or lift the filter entirely with "all".
const STATUS_OPTIONS = [
  { value: "sold", label: "Sold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "all", label: "All Statuses" },
];

const getDefaultRange = () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: firstOfMonth.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
};

// --------------------------------------------------
// QUICK-RANGE PRESETS — one-tap shortcuts shown as chips next to the date
// range (Today / Last 7 Days / Last 30 Days / This Month / Last Month).
// Every value is computed live from the real current date, nothing is
// hardcoded, so the chips stay correct on any day the admin opens the page.
// Same preset set as the Sales Report page.
// --------------------------------------------------
const getPresetRanges = () => {
  const now = new Date();
  // toISO — converts a Date object to the "YYYY-MM-DD" string shape the
  // date inputs and the API's start_date/end_date query params both expect
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

const RevenueReport = () => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [status, setStatus] = useState("sold");
  const [isExporting, setIsExporting] = useState(false);

  // Recomputed on every render so "Today" always means today, not the day
  // the component first mounted — cheap, since it's just a handful of Date
  // objects, not a network call
  const presetRanges = getPresetRanges();

  // Applies a preset's start/end dates in one tap — both dates update
  // together so the stats cards and charts below all refetch in sync
  const handleSelectPreset = (preset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({
        type: "revenue",
        start_date: startDate,
        end_date: endDate,
        status, // same filter currently selected on screen, so the downloaded file always matches what's shown
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `revenue-report-${startDate}-to-${endDate}.csv`;
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
          PAGE HEADER — the title, the Filters / Export buttons at the top
          right, and the filter chips that open under them (date range with
          the quick ranges inside its dropdown, and the status filter).
          ================================================================ */}
      <AnalyticsPageHeader
        icon={<AiOutlineDollarCircle />}
        title="Revenue Report"
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
            key: "status",
            label: "Status",
            options: STATUS_OPTIONS,
            value: status,
            defaultValue: "sold",
            onChange: setStatus,
          },
        ]}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <RevenueStatsCards
        startDate={startDate}
        endDate={endDate}
        status={status}
      />

      <RevenueByPeriodChart
        startDate={startDate}
        endDate={endDate}
        status={status}
      />
      {/* The status filter does not apply to the year comparison chart or the
          heatmap below: both load their own multi-year / multi-month data
          windows, unrelated to the date range above. */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueYearComparisonChart />
        <RevenueHeatmap />
      </div>
    </div>
  );
};

export default RevenueReport;
