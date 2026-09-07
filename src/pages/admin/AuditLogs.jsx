import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineFileText,
  AiOutlinePlusCircle,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineDownload,
} from "react-icons/ai";

import { getAuditLogs } from "../../api/admin.api";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import downloadCsv from "../../utils/downloadCsv";
import { showSuccess } from "../../components/ui/Toast";
import StatsCard from "../../components/ui/StatsCard";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import AuditLogDetailModal from "../../components/admin-audit/AuditLogDetailModal";

const ACTION_BADGE_VARIANT = {
  create: "success",
  update: "info",
  delete: "danger",
};

const PAGE_SIZE = 10;

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  // --------------------------------------------------
  // MAIN LOG LIST — API 82. `page`, `entity`, `user`, and `search` are
  // now confirmed to filter and paginate correctly on the backend, so
  // this always returns exactly one already-filtered page of logs.
  // --------------------------------------------------
  const {
    data: logsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "auditLogs",
      "list",
      entityFilter,
      userFilter,
      debouncedSearch,
      currentPage,
    ],
    queryFn: ({ signal }) => getAuditLogs({
        entity: entityFilter || undefined,
        user: userFilter || undefined,
        search: debouncedSearch || undefined,
        page: currentPage,
      }, signal),
  });

  const logs = extractListData(logsResponse);
  const totalCount = logsResponse?.data?.count ?? logs.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Real, derived from what's already loaded — no separate
  // "list all admins" endpoint exists to build this dropdown from
  const uniqueEntities = [
    ...new Set(logs.map((l) => l.entity).filter(Boolean)),
  ];
  const uniqueUsers = [
    ...new Set(
      logs
        .map((l) => (typeof l.user === "object" ? l.user?.name : l.user))
        .filter(Boolean),
    ),
  ];

  const entityOptions = [
    { value: "", label: "Entity: All" },
    ...uniqueEntities.map((e) => ({ value: e, label: e })),
  ];
  const userOptions = [
    { value: "", label: "User: All" },
    ...uniqueUsers.map((u) => ({ value: u, label: u })),
  ];

  // --------------------------------------------------
  // ACTION-TYPE COUNTS — 3 separate queries, same pattern used on
  // Complaints/Discounts stat cards. `action` is now a CONFIRMED
  // working filter param.
  // --------------------------------------------------
  const { data: createResponse } = useQuery({
    queryKey: ["auditLogs", "count", "create"],
    queryFn: ({ signal }) => getAuditLogs({ action: "create" }, signal),
  });
  const { data: updateResponse } = useQuery({
    queryKey: ["auditLogs", "count", "update"],
    queryFn: ({ signal }) => getAuditLogs({ action: "update" }, signal),
  });
  const { data: deleteResponse } = useQuery({
    queryKey: ["auditLogs", "count", "delete"],
    queryFn: ({ signal }) => getAuditLogs({ action: "delete" }, signal),
  });

  const getCount = (response) =>
    response?.data?.count ?? extractListData(response).length;

  const handleExport = () => {
    downloadCsv(
      logs.map((log) => ({
        timestamp: formatDate(log.created_at),
        user: typeof log.user === "object" ? log.user?.name : log.user,
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id,
        ip_address: log.ip_address,
      })),
      [
        { key: "timestamp", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "action", label: "Action" },
        { key: "entity", label: "Entity" },
        { key: "entity_id", label: "Entity ID" },
        { key: "ip_address", label: "IP Address" },
      ],
      "audit-logs",
    );
    showSuccess("Export downloaded.");
  };

  const columns = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {(typeof row.user === "object" ? row.user?.name : row.user) ||
            "System"}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <Badge
          label={row.action}
          variant={ACTION_BADGE_VARIANT[row.action] || "gray"}
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "entity",
      label: "Entity",
      render: (row) => (
        <span className="text-sm text-gray-700">{row.entity}</span>
      ),
    },
    {
      key: "entity_id",
      label: "Entity ID",
      render: (row) => (
        <span className="text-sm text-gray-500 font-mono">{row.entity_id}</span>
      ),
    },
    {
      key: "ip_address",
      label: "IP Address",
      render: (row) => (
        <span className="text-sm text-gray-500 font-mono">
          {row.ip_address}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="text-sm text-primary font-medium hover:underline"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">
          Complete record of all admin actions in your store.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Create Actions"
          value={getCount(createResponse)}
          icon={<AiOutlinePlusCircle />}
          iconBg="bg-success-light"
          iconColor="text-success"
        />
        <StatsCard
          title="Update Actions"
          value={getCount(updateResponse)}
          icon={<AiOutlineEdit />}
          iconBg="bg-info-light"
          iconColor="text-info"
        />
        <StatsCard
          title="Delete Actions"
          value={getCount(deleteResponse)}
          icon={<AiOutlineDelete />}
          iconBg="bg-danger-light"
          iconColor="text-danger"
        />
      </div>
      {/* Note: "Total Actions Today" card from the design is NOT
          included — no date-scoped count is reliably available
          without a confirmed date filter param. */}

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row items-center gap-2">
        <Input
          placeholder="Filter by ID or user..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Select
          options={entityOptions}
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Select
          options={userOptions}
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Button
          variant="secondary"
          leftIcon={<AiOutlineDownload className="w-4 h-4" />}
          onClick={handleExport}
        >
          Export Logs
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        keyField="id"
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
      />

      <AuditLogDetailModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
};

export default AuditLogs;
