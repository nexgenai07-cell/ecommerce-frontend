// ============================================================
// ExportReportCard — EXPORT DATA SUB-COMPONENT
// ============================================================
// One reusable card per predefined report type. Only a single "Export
// CSV" action exists on each — the design's "Export PDF" button was
// removed everywhere, since API 90 (Export Report) only ever returns
// a CSV file, full stop.

import Button from "../ui/Button";

const ExportReportCard = ({
  icon,
  title,
  description,
  isExporting,
  onExport,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      <span className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onExport}
        isLoading={isExporting}
        className="self-start"
      >
        Export CSV
      </Button>
    </div>
  );
};

export default ExportReportCard;
