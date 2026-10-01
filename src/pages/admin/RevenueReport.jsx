import { useState } from "react";

// Icon — the dollar-circle icon shown in the page header badge (the same
// icon used for "Revenue Report" in the admin sidebar)
import { AiOutlineDollarCircle } from "react-icons/ai";

import { exportReport } from "../../api/analytics.api";
// exportReport — `type: "revenue"` downloads this report as a CSV file

import { showSuccess, showError } from "../../components/ui/Toast";
import downloadExportCsv from "../../utils/downloadExportCsv";
import {
  getDefaultRange,
  getPresetRanges,
} from "../../utils/getReportDateRanges";
// getDefaultRange / getPresetRanges — read the local calendar date, so
// "Today" and the other quick ranges always match the admin's own day,
// even in the hours where UTC and local time fall on different dates.

import AnalyticsPageHeader from "../../components/admin-analytics/AnalyticsPageHeader";
// AnalyticsPageHeader — the page title with the Filters and Export buttons
// at the top right, and the filter chips (date range with quick ranges, and
// status) that open under it

import RevenueStatsCards from "../../components/admin-analytics/RevenueStatsCards";
import RevenueByPeriodChart from "../../components/admin-analytics/RevenueByPeriodChart";
import RevenueYearComparisonChart from "../../components/admin-analytics/RevenueYearComparisonChart";
import RevenueHeatmap from "../../components/admin-analytics/RevenueHeatmap";

// STATUS_OPTIONS — the same status filter as the Sales Report. "sold" is the
// default and shows paid orders that were not refunded; the other options
// show cancelled orders or refunded orders (cancelled orders and returned
// delivered orders), or lift the filter entirely with "all".
const STATUS_OPTIONS = [
  { value: "sold", label: "Sold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "all", label: "All Statuses" },
];

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
      const { success, message } = await downloadExportCsv(
        exportReport,
        {
          type: "revenue",
          start_date: startDate,
          end_date: endDate,
          status, // same filter currently selected on screen, so the downloaded file always matches what's shown
        },
        `revenue-report-${startDate}-to-${endDate}`,
      );

      if (success) {
        showSuccess("Report downloaded.");
      } else {
        showError(message || "Failed to export report. Please try again.");
      }
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
