// ============================================================
// PROFIT REPORT (Admin)
// ============================================================
// Shows the complete profit picture for a chosen date range: per-unit
// cost and selling price, total cost, total revenue, markup, gross
// profit, markup % and profit margin %, broken down by day, week, month
// or year.
//
// Filters mirror the Sales and Revenue reports: a date range (with the
// same quick-range presets), a Status filter (Sold / Cancelled /
// Refunded / All) and a Period grouping (Daily / Weekly / Monthly /
// Yearly).
//
// Export downloads exactly the rows the Profit Breakdown table is
// showing (one row per period, at whatever period the admin currently
// has selected), built on the client from the same data already loaded
// for the page. This is deliberately NOT the backend's Sales Report
// export: that file lists one row per order and has no period grouping,
// so it would not match a Weekly/Monthly/Yearly view on screen. An
// admin who needs that per-order detail already has it on the Sales
// Report page and on the Export Data page.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineRise } from "react-icons/ai";

import { getProfitReport } from "../../api/analytics.api";
import { showSuccess, showError } from "../../components/ui/Toast";
import downloadCsv from "../../utils/downloadCsv";
import {
  getDefaultRange,
  getPresetRanges,
  toLocalISODate,
} from "../../utils/getReportDateRanges";
import formatReportPeriodLabel from "../../utils/formatReportPeriodLabel";
import formatPrice from "../../utils/formatPrice";

import AnalyticsPageHeader from "../../components/admin-analytics/AnalyticsPageHeader";
import ProfitSummaryCards from "../../components/admin-analytics/ProfitSummaryCards";
import ProfitOverTimeChart from "../../components/admin-analytics/ProfitOverTimeChart";
import ProfitBreakdownTable from "../../components/admin-analytics/ProfitBreakdownTable";
import StatsCard from "../../components/ui/StatsCard";

// The status filter, same accepted values and default as the Sales and
// Revenue reports. The same value is sent to the CSV export so the
// downloaded file always matches what is on screen.
const STATUS_OPTIONS = [
  { value: "sold", label: "Sold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "all", label: "All Statuses" },
];

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const ProfitReport = () => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [status, setStatus] = useState("sold");
  const [period, setPeriod] = useState("daily");
  const [isExporting, setIsExporting] = useState(false);

  // Recomputed on every render so "Today" always means today, not the day
  // the component first mounted.
  const presetRanges = getPresetRanges();

  const { data: response, isLoading } = useQuery({
    queryKey: ["profitReport", startDate, endDate, status, period],
    queryFn: ({ signal }) =>
      getProfitReport(
        { start_date: startDate, end_date: endDate, period, status },
        signal,
      ),
  });

  const summary = response?.data?.summary;
  const rows = response?.data?.data || [];

  // Column labels for the exported CSV, matching the Profit Breakdown
  // table below one for one. The period column's label changes with the
  // grouping, exactly like the table's own first column.
  const periodColumnLabels = {
    daily: "Date",
    weekly: "Week Of",
    monthly: "Month",
    yearly: "Year",
  };
  const exportColumns = [
    { key: "period", label: periodColumnLabels[period] || "Period" },
    { key: "orders", label: "Orders" },
    { key: "units", label: "Units" },
    { key: "avgPrice", label: "Avg Price" },
    { key: "avgCost", label: "Avg Cost" },
    { key: "markupPerUnit", label: "Markup / Unit" },
    { key: "revenue", label: "Revenue" },
    { key: "cost", label: "Cost" },
    { key: "profit", label: "Profit" },
    { key: "markupPercent", label: "Markup %" },
    { key: "marginPercent", label: "Margin %" },
  ];

  // Plain numbers, not formatted currency strings, so the file can be
  // used directly in Excel/Sheets formulas. A value the server could not
  // calculate is left blank rather than shown as an em dash, for the
  // same reason.
  const numericOrBlank = (value) =>
    value === null || value === undefined ? "" : Number(value);

  const exportRows = [...rows]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((row) => ({
      period: formatReportPeriodLabel(row.date, period),
      orders: numericOrBlank(row.total_orders),
      units: numericOrBlank(row.units_sold),
      avgPrice: numericOrBlank(row.avg_selling_price_per_unit),
      avgCost: numericOrBlank(row.avg_cost_per_unit),
      markupPerUnit: numericOrBlank(row.markup_per_unit),
      revenue: numericOrBlank(row.total_revenue),
      cost: numericOrBlank(row.total_cost),
      profit: numericOrBlank(row.gross_profit),
      markupPercent: numericOrBlank(row.markup_percent),
      marginPercent: numericOrBlank(row.profit_margin_percent),
    }));

  // discounts_given and shipping_collected are deliberately kept separate
  // from the profit figures above (see getProfitReport in analytics.api.js):
  // discounts reduce what the customer paid, not the product's margin, and
  // shipping is not product revenue.
  const discountsGiven = Number(summary?.discounts_given) || 0;
  const shippingCollected = Number(summary?.shipping_collected) || 0;

  // Applies a preset's start/end dates in one tap — both dates update
  // together so every card, the chart and the table all refetch in sync.
  const handleSelectPreset = (preset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  // Builds and downloads the CSV directly from the rows already loaded
  // for the Profit Breakdown table, so the file always matches exactly
  // what is on screen, at whatever period the admin currently has
  // selected.
  const handleExport = () => {
    if (exportRows.length === 0) {
      showError("There is no data in this date range to export.");
      return;
    }

    setIsExporting(true);
    try {
      downloadCsv(
        exportRows,
        exportColumns,
        `profit-report-${period}-${startDate}-to-${endDate}-${toLocalISODate(new Date())}`,
      );
      showSuccess("Report downloaded.");
    } catch {
      showError("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsPageHeader
        icon={<AiOutlineRise />}
        title="Profit Report"
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
            key: "period",
            label: "Period",
            options: PERIOD_OPTIONS,
            value: period,
            defaultValue: "daily",
            onChange: setPeriod,
          },
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

      <div className="flex flex-wrap gap-2">
        <ProfitSummaryCards summary={summary} isLoading={isLoading} />
      </div>

      {/* Discounts and shipping, shown separately because neither one is
          part of product revenue, cost or profit. */}
      <div className="flex flex-wrap gap-2">
        <StatsCard
          title="Discounts Given"
          value={isLoading ? "—" : formatPrice(discountsGiven)}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
        />
        <StatsCard
          title="Shipping Collected"
          value={isLoading ? "—" : formatPrice(shippingCollected)}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
        />
      </div>

      <ProfitOverTimeChart rows={rows} period={period} isLoading={isLoading} />

      <ProfitBreakdownTable rows={rows} period={period} isLoading={isLoading} />
    </div>
  );
};

export default ProfitReport;
