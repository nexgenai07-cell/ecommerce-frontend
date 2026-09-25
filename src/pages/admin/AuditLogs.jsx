import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineFileText,
  AiOutlinePlusCircle,
  AiOutlineEdit,
  AiOutlineDelete,
} from "react-icons/ai";

import {
  getAuditLogs,
  getAuditLogEntities,
  getAuditLogUsers,
} from "../../api/admin.api";
import { exportReport } from "../../api/analytics.api";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import downloadExportCsv from "../../utils/downloadExportCsv";
import { showSuccess, showError } from "../../components/ui/Toast";
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

  // --------------------------------------------------
  // ENTITY / USER DROPDOWN OPTIONS — API 82.1 / API 82.2 (NEW, 16 Sep
  // 2026 Filtering Fix pass). These two dedicated endpoints replace
  // the old approach of deriving the dropdown options from whatever
  // rows happened to already be on the current page — which never
  // showed every real option, only whatever had scrolled past.
  // --------------------------------------------------
  const { data: entitiesResponse } = useQuery({
    queryKey: ["auditLogs", "entities"],
    queryFn: ({ signal }) => getAuditLogEntities(signal),
    staleTime: 1000 * 60 * 5,
  });
  const { data: usersResponse } = useQuery({
    queryKey: ["auditLogs", "users"],
    queryFn: ({ signal }) => getAuditLogUsers(signal),
    staleTime: 1000 * 60 * 5,
  });

  // API 82.1 returns a plain array of entity name strings directly.
  const entityOptions = [
    { value: "", label: "All Entities" },
    ...extractListData(entitiesResponse).map((entity) => ({
      value: entity,
      label: entity,
    })),
  ];
  // API 82.2 returns [{ id, name, email }, ...]. The `user` query
  // param on getAuditLogs matches by name (same as before this fix —
  // only where the options now come from has changed), so `value`
  // here stays each user's `name`, not their numeric `id`.
  const userOptions = [
    { value: "", label: "All Users" },
    ...extractListData(usersResponse).map((user) => ({
      value: user.name,
      label: user.name,
    })),
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

  // --------------------------------------------------
  // EXPORT — API 99, type=audit_logs. The backend builds and returns
  // the CSV file directly for the currently applied filters, so this
  // is one request instead of looping every page of results and
  // building the file in the browser.
  // --------------------------------------------------
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { success, message } = await downloadExportCsv(
        exportReport,
        {
          type: "audit_logs",
          entity: entityFilter || undefined,
          user: userFilter || undefined,
          search: debouncedSearch || undefined,
        },
        "audit-logs",
      );

      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to export logs. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-600">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (row) => (
        // user_name — API 82 (24 Sep 2026). The acting admin's readable
        // name (e.g. "Ali Khan"; "System" for an automated action).
        // Previously this column had no readable name to fall back
        // to and showed the raw numeric user id instead.
        <span className="text-[10px] sm:text-[11px] font-medium text-gray-900">
          {row.user_name || "System"}
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
        <span className="text-[10px] sm:text-[11px] text-gray-700">
          {row.entity}
        </span>
      ),
    },
    {
      key: "entity_id",
      label: "Entity ID",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500 font-mono">
          {row.entity_id}
        </span>
      ),
    },
    {
      key: "ip_address",
      label: "IP Address",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500 font-mono">
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
          className="text-[10px] sm:text-[11px] text-primary font-medium hover:underline"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-6 to gap-2 so the page matches the tighter rhythm
    // already used on Product Management, instead of leaving large empty
    // bands between each section.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
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
        isExporting={isExporting}
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
