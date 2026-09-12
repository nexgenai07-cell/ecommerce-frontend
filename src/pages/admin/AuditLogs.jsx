import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineFileText,
  AiOutlinePlusCircle,
  AiOutlineEdit,
  AiOutlineDelete,
} from "react-icons/ai";

import { getAuditLogs } from "../../api/admin.api";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import downloadCsv from "../../utils/downloadCsv";
import { showSuccess } from "../../components/ui/Toast";
import StatsCard from "../../components/ui/StatsCard";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen, replacing this page's own plain
// <h1> so it finally matches the rest of the panel.
import AuditLogDetailModal from "../../components/admin-audit/AuditLogDetailModal";
import AuditLogFilters from "../../components/admin-audit/AuditLogFilters";
// AuditLogFilters — the shared-style toolbar above the table (search,
// Filters toggle, Export, Entity/User chips).

const ACTION_BADGE_VARIANT = {
  create: "success",
  update: "info",
  delete: "danger",
};

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many logs the backend returns per page, controlled by
  // the "Rows per page" dropdown in the table footer. Sent to the
  // backend as `page_size` alongside `page` on every request.
  const [selectedLog, setSelectedLog] = useState(null);

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const debouncedSearch = useDebounce(search, 400);

  const hasActiveFilters = !!search || !!entityFilter || !!userFilter;
  // Drives the "Clear all" link's visibility in the toolbar.

  const handleClearFilters = () => {
    setSearch("");
    setEntityFilter("");
    setUserFilter("");
    setCurrentPage(1);
  };

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
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getAuditLogs(
        {
          entity: entityFilter || undefined,
          user: userFilter || undefined,
          search: debouncedSearch || undefined,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
  });

  const logs = extractListData(logsResponse);
  const totalCount = logsResponse?.data?.count ?? logs.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

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
    { value: "", label: "All Entities" },
    ...uniqueEntities.map((e) => ({ value: e, label: e })),
  ];
  const userOptions = [
    { value: "", label: "All Users" },
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
          onClick={(e) => {
            e.stopPropagation();
            // Stops this click from also bubbling up to the row's own
            // onClick, which opens the same modal — avoids a redundant
            // double open when the link itself is clicked
            setSelectedLog(row);
          }}
          className="text-sm text-primary font-medium hover:underline"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineFileText />} title="Audit Logs" />

      {/* Layout: a flex-wrap row rather than a three-column grid.
          StatsCard sizes itself to its own content, so a grid column
          stretches far wider than the card and leaves a visible gap
          beside it on anything wider than a phone screen. A wrapping
          flex row keeps the three cards close together and still
          drops to a single column on narrow screens. */}
      <div className="flex flex-wrap gap-2">
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

      {/* Toolbar — search, Filters, Export, and (once opened) the
          Entity/User dropdown chips. Same shared toolbar pattern used
          on every other admin list page. */}
      <AuditLogFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        entityOptions={entityOptions}
        entityFilter={entityFilter}
        onEntityChange={(value) => {
          setEntityFilter(value);
          setCurrentPage(1);
        }}
        userOptions={userOptions}
        userFilter={userFilter}
        onUserChange={(value) => {
          setUserFilter(value);
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        onExport={handleExport}
      />

      <DataTable
        columns={columns}
        data={logs}
        keyField="id"
        onRowClick={(row) => setSelectedLog(row)}
        // Opens the same detail modal as the "Details" link when any part
        // of the row is clicked
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
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
