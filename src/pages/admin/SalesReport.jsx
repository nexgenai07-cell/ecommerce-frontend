import { useState } from "react";

// TanStack Query — fetches the Sales Report data and caches it
import { useQuery } from "@tanstack/react-query";

// Icon — the line-chart icon shown in the page header badge (the same icon
// used for "Sales Report" in the admin sidebar)
import { AiOutlineLineChart } from "react-icons/ai";

import { getSalesReport, exportReport } from "../../api/analytics.api";
// getSalesReport — the source of all report data on this page
// exportReport   — downloads the report as a CSV file

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

import SalesStatsCards from "../../components/admin-analytics/SalesStatsCards";
import SalesOverTimeChart from "../../components/admin-analytics/SalesOverTimeChart";
import DailyBreakdownTable from "../../components/admin-analytics/DailyBreakdownTable";

// STATUS_OPTIONS — the status filter of the Sales Report. "sold" is the
// default and shows paid orders only — the other options let an admin look
// at cancelled or refunded orders instead, or lift the filter entirely with
// "all". The exact same value is also sent to the CSV export so the
// downloaded file always matches the screen.
const STATUS_OPTIONS = [
  { value: "sold", label: "Sold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "all", label: "All Statuses" },
];

const SalesReport = () => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [status, setStatus] = useState("sold");
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
    queryKey: ["salesReport", "breakdown", startDate, endDate, status],
    queryFn: ({ signal }) =>
      getSalesReport(
        {
          start_date: startDate,
          end_date: endDate,
          period: "daily",
          status,
        },
        signal,
      ),
  });

  const dataPoints = response?.data?.data || [];

  // Applies a preset's start/end dates in one tap — both dates update
  // together so the chart, cards, and table all refetch in sync
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
          type: "sales",
          start_date: startDate,
          end_date: endDate,
          status, // same filter currently selected on screen, so the downloaded file always matches what's shown
        },
        `sales-report-${startDate}-to-${endDate}`,
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
        icon={<AiOutlineLineChart />}
        title="Sales Report"
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

      <SalesStatsCards
        startDate={startDate}
        endDate={endDate}
        status={status}
      />

      <SalesOverTimeChart
        startDate={startDate}
        endDate={endDate}
        status={status}
      />

      <DailyBreakdownTable dataPoints={dataPoints} isLoading={isLoading} />
    </div>
  );
};

export default SalesReport;
