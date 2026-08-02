// ============================================================
// ExportData — ADMIN DATA EXPORT PAGE
// ============================================================
// SIGNIFICANTLY simplified from the original design. The entire
// backend only has ONE export capability (API 90: GET
// /api/v1/analytics/export/, params: start_date, end_date, type),
// which only ever returns a CSV file. Everything in the mockup that
// implied more than that — PDF/Excel format choice, a field-selection
// builder, and a "Recent Exports" history with stored file sizes —
// has NO backing endpoint anywhere in the API doc and was removed
// rather than built as a non-functional shell.
//
// Only "sales" is explicitly confirmed as a real `type` value in the
// docs (given as the literal example). The other 5 report types below
// are OPTIMISTIC attempts — if the backend doesn't recognize a type
// string, that export will likely fail or return an empty file; watch
// the Network tab and toast errors to see which ones actually work,
// and send a backend request to confirm/add the rest.

import { useState } from "react";
import {
  AiOutlineShoppingCart,
  AiOutlineDollarCircle,
  AiOutlineAppstore,
  AiOutlineTeam,
  AiOutlineHome,
} from "react-icons/ai";

import { exportReport } from "../../api/analytics.api";
import { showSuccess, showError } from "../../components/ui/Toast";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import ExportReportCard from "../../components/admin-export/ExportReportCard";

// Predefined report cards — "Sales by Category" from the design was
// dropped entirely, not just its PDF button: there's no
// category-revenue data anywhere in the schema for the backend to
// even generate that report from.
const REPORT_TYPES = [
  {
    type: "sales",
    // CONFIRMED real — the one example value the API doc actually gives
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
  const [isCustomExporting, setIsCustomExporting] = useState(false);

  // Shared download-trigger logic — used by both the quick report
  // cards and the custom export builder below, so the actual
  // "turn the CSV blob into a downloaded file" mechanics live in one place
  const triggerDownload = async (type, startDate, endDate) => {
    const response = await exportReport({
      type,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const handleQuickExport = async (type) => {
    setExportingType(type);
    try {
      await triggerDownload(type);
      showSuccess("Export downloaded.");
    } catch (error) {
      showError(
        `Failed to export "${type}". This report type may not be supported by the backend yet.`,
      );
    } finally {
      setExportingType(null);
    }
  };

  const handleCustomExport = async () => {
    setIsCustomExporting(true);
    try {
      await triggerDownload(customType, customStartDate, customEndDate);
      showSuccess("Export downloaded.");
    } catch (error) {
      showError("Failed to generate export. Please try again.");
    } finally {
      setIsCustomExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Export Data</h1>
        <p className="text-sm text-gray-500">
          Download your store data as a CSV file.
        </p>
      </div>

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
