import { useState } from "react";
import {
  AiOutlineShoppingCart,
  AiOutlineDollarCircle,
  AiOutlineAppstore,
  AiOutlineTeam,
  AiOutlineHome,
  AiOutlineDownload,
} from "react-icons/ai";

import { exportReport } from "../../api/analytics.api";
import downloadExportCsv from "../../utils/downloadExportCsv";
import { showSuccess, showError } from "../../components/ui/Toast";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen, replacing this page's own plain
// <h1> so it finally matches the rest of the panel.
import ExportReportCard from "../../components/admin-export/ExportReportCard";

// Predefined report cards — "Sales by Category" from the design was
// dropped entirely, not just its PDF button: there's no
// category-revenue data anywhere in the schema for the backend to
// even generate that report from.
// All 6 `type` values below (sales, orders, revenue, products,
// customers, inventory) are now CONFIRMED accepted by the export
// endpoint.
const REPORT_TYPES = [
  {
    type: "sales",
    title: "Sales Report",
    description:
      "Daily/weekly/monthly sales totals from the Sales Report data.",
    icon: <AiOutlineShoppingCart className="w-5 h-5" />,
  },
  {
    type: "orders",
    title: "Orders Report",
    description:
      "Order status, totals, and customer info from the orders table.",
    icon: <AiOutlineDollarCircle className="w-5 h-5" />,
  },
  {
    type: "revenue",
    title: "Revenue Report",
    description: "Aggregate revenue totals over time.",
    icon: <AiOutlineDollarCircle className="w-5 h-5" />,
  },
  {
    type: "products",
    title: "Products Report",
    description: "Catalog products and sales performance stats.",
    icon: <AiOutlineAppstore className="w-5 h-5" />,
  },
  {
    type: "customers",
    title: "Customers Report",
    description: "Registered customers with order history and lifetime value.",
    icon: <AiOutlineTeam className="w-5 h-5" />,
  },
  {
    type: "inventory",
    title: "Inventory Report",
    description: "Current stock levels and low-stock alerts.",
    icon: <AiOutlineHome className="w-5 h-5" />,
  },
];

const CUSTOM_TYPE_OPTIONS = REPORT_TYPES.map((r) => ({
  value: r.type,
  label: r.title,
}));

// STATUS_OPTIONS — the optional status filter API 99 now accepts, but
// ONLY when the chosen report type is "sales" or "revenue" (see the
// conditional rendering below). Same accepted values as the Sales
// Report / Revenue Report pages.
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

const ExportData = () => {
  const [exportingType, setExportingType] = useState(null);
  // Tracks WHICH card's export is currently in flight, so only that
  // one card's button shows a loading spinner instead of all of them

  const defaultRange = getDefaultRange();
  const [customType, setCustomType] = useState("sales");
  const [customStartDate, setCustomStartDate] = useState(
    defaultRange.startDate,
  );
  const [customEndDate, setCustomEndDate] = useState(defaultRange.endDate);
  const [customStatus, setCustomStatus] = useState("sold");
  const [isCustomExporting, setIsCustomExporting] = useState(false);

  // Shared download-trigger logic — used by both the quick report
  // cards and the custom export builder below, so the actual
  // "turn the CSV blob into a downloaded file, or read a validation
  // error back out of it" mechanics live in one place.
  const triggerDownload = (type, startDate, endDate, status) => {
    return downloadExportCsv(
      exportReport,
      {
        type,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        // status only means anything to the backend for type "sales" or
        // "revenue" — left undefined for every other report type so it's
        // simply omitted from the request
        status: type === "sales" || type === "revenue" ? status : undefined,
      },
      `${type}-export-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const handleQuickExport = async (type) => {
    setExportingType(type);
    try {
      const { success, message } = await triggerDownload(type);
      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(
          message ||
            `Failed to export "${type}". This report type may not be supported by the backend yet.`,
        );
      }
    } finally {
      setExportingType(null);
    }
  };

  const handleCustomExport = async () => {
    setIsCustomExporting(true);
    try {
      const { success, message } = await triggerDownload(
        customType,
        customStartDate,
        customEndDate,
        customStatus,
      );
      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to generate export. Please try again.");
      }
    } finally {
      setIsCustomExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader icon={<AiOutlineDownload />} title="Export Data" />

      {/* Quick predefined reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report) => (
          <ExportReportCard
            key={report.type}
            icon={report.icon}
            title={report.title}
            description={report.description}
            isExporting={exportingType === report.type}
            onExport={() => handleQuickExport(report.type)}
          />
        ))}
      </div>

      {/* Custom export — only the parts that map to real, documented
          params (type + date range). Field selection and
          CSV/PDF/Excel format choice from the design were removed —
          API 90 doesn't support either. */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Custom Export
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Select
            label="Report Type"
            options={CUSTOM_TYPE_OPTIONS}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Input
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            onClick={handleCustomExport}
            isLoading={isCustomExporting}
          >
            Generate Export
          </Button>
        </div>

        {/* Status filter — only meaningful (and only accepted by the
            backend) when the chosen report type is "sales" or
            "revenue", so it's hidden entirely for every other type
            instead of being sent and silently ignored. */}
        {(customType === "sales" || customType === "revenue") && (
          <div className="w-full sm:w-60">
            <Select
              label="Order Status"
              options={STATUS_OPTIONS}
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
            />
          </div>
        )}

        <p className="text-xs text-gray-400">
          Output format is always CSV — the backend's export endpoint doesn't
          support PDF or Excel.
        </p>
      </div>
      {/* Note: "Recent Exports" history table from the design is NOT
          included — there is no export-history-tracking endpoint
          anywhere in the API; every export here is generated and
          downloaded on the spot, nothing is stored server-side to list. */}
    </div>
  );
};

export default ExportData;
