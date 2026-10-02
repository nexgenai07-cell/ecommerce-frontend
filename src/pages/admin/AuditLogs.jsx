// React state hook for filters, paging and the selected log
import { useState } from "react";
// TanStack Query hook for server data fetching
import { useQuery } from "@tanstack/react-query";
// Ant Design outline icons used by the header and the stat cards
import {
  AiOutlineFileText,
  AiOutlinePlusCircle,
  AiOutlineEdit,
  AiOutlineDelete,
} from "react-icons/ai";

// Audit log API calls: the log list and the two filter option lists
import {
  getAuditLogs,
  getAuditLogEntities,
  getAuditLogUsers,
} from "../../api/admin.api";
// Analytics API used to download the audit log CSV export
import { exportReport } from "../../api/analytics.api";
// Normalises plain-array and paginated responses into one array
import extractListData from "../../utils/extractListData";
// Query options that keep the audit views up to date without a refresh
import { AUDIT_LOG_REFRESH_OPTIONS } from "../../constants/auditLogRefresh";
// Formats an ISO date string for display
import formatDate from "../../utils/formatDate";
// Delays a fast-changing value so it is not used on every keystroke
import useDebounce from "../../hooks/useDebounce";
// Downloads a backend-generated CSV file and reports success or failure
import downloadExportCsv from "../../utils/downloadExportCsv";
// Toast helpers for success and error feedback
import { showSuccess, showError } from "../../components/ui/Toast";
// Shared UI building blocks
import StatsCard from "../../components/ui/StatsCard";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
// Shared gradient icon and title header used on every admin screen
import PageHeader from "../../components/shared/PageHeader";
// Modal that shows the full details of one log entry
import AuditLogDetailModal from "../../components/admin-audit/AuditLogDetailModal";
// Toolbar above the table: search, filters toggle, export, entity and user chips
import AuditLogFilters from "../../components/admin-audit/AuditLogFilters";

// Badge colour for each kind of action. A stock adjustment is a kind of
// update, so it shares the update colour.
const ACTION_BADGE_VARIANT = {
  create: "success",
  update: "info",
  adjust: "info",
  delete: "danger",
};

// The backend sends specific actions such as "update_product" or
// "adjust_stock", so the colour is chosen from the leading word of the
// action. Any other action gets the neutral gray badge.
const getActionBadgeVariant = (action = "") =>
  ACTION_BADGE_VARIANT[String(action).toLowerCase().split("_")[0]] || "gray";

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
// The page size used until the admin picks a different one
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// Returns the text shown in the Entity ID column for one log row.
// The backend sends a ready-made entity_label such as "7 — Red Cotton Shirt"
// (or just "7" when no name exists). When the label is missing, the text is
// assembled from the entity id and customer name so the column never
// goes blank for a row that has an id.
const getEntityLabel = (row) => {
  // Preferred value: the label prepared by the backend
  if (row.entity_label) return row.entity_label;

  // Fallback: join whichever of the id and the customer name exist
  const fallbackLabel = [row.entity_id, row.customer_name]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(" — ");

  // A dash tells the admin that this row has no entity to show
  return fallbackLabel || "—";
};

const AuditLogs = () => {
  // Free-text search typed into the toolbar
  const [search, setSearch] = useState("");
  // Selected entity type filter ("" means all entities)
  const [entityFilter, setEntityFilter] = useState("");
  // Selected acting user filter ("" means all users)
  const [userFilter, setUserFilter] = useState("");
  // The page of results currently shown
  const [currentPage, setCurrentPage] = useState(1);
  // pageSize — how many logs the backend returns per page, controlled by
  // the "Rows per page" dropdown in the table footer. Sent to the
  // backend as `page_size` alongside `page` on every request.
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // The log row whose details are open in the modal, or null
  const [selectedLog, setSelectedLog] = useState(null);

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    // Store the newly chosen page size
    setPageSize(size);
    // Return to the first page of the re-sized result set
    setCurrentPage(1);
  };

  // Waits 400ms after the admin stops typing before searching
  const debouncedSearch = useDebounce(search, 400);

  // Drives the "Clear all" link's visibility in the toolbar.
  const hasActiveFilters = !!search || !!entityFilter || !!userFilter;

  // Restores every filter to its default value
  const handleClearFilters = () => {
    // Empty the search box
    setSearch("");
    // Show every entity again
    setEntityFilter("");
    // Show every user again
    setUserFilter("");
    // Start again from the first page
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // MAIN LOG LIST — `page`, `entity`, `user` and `search` are filtered and
  // paginated on the backend, so this always returns exactly one
  // already-filtered page of logs.
  // --------------------------------------------------
  const {
    data: logsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    // Every filter is part of the key so each combination is cached apart
    queryKey: [
      "auditLogs",
      "list",
      entityFilter,
      userFilter,
      debouncedSearch,
      currentPage,
      pageSize,
    ],
    // Sends only the filters that actually have a value
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
    ...AUDIT_LOG_REFRESH_OPTIONS,
  });

  // The rows for the current page of the table
  const logs = extractListData(logsResponse);
  // Total number of matching logs across every page
  const totalCount = logsResponse?.data?.count ?? logs.length;
  // Total number of pages, never lower than one
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // --------------------------------------------------
  // ENTITY / USER DROPDOWN OPTIONS — two dedicated endpoints return every
  // option that has ever been logged, rather than only the values that
  // happen to be on the current page of rows.
  // --------------------------------------------------
  // Every distinct entity type that has been logged
  const { data: entitiesResponse } = useQuery({
    queryKey: ["auditLogs", "entities"],
    queryFn: ({ signal }) => getAuditLogEntities(signal),
    staleTime: 1000 * 60 * 5,
  });
  // Every admin who has performed at least one logged action
  const { data: usersResponse } = useQuery({
    queryKey: ["auditLogs", "users"],
    queryFn: ({ signal }) => getAuditLogUsers(signal),
    staleTime: 1000 * 60 * 5,
  });

  // The entities endpoint returns a plain array of entity name strings.
  const entityOptions = [
    { value: "", label: "All Entities" },
    ...extractListData(entitiesResponse).map((entity) => ({
      value: entity,
      label: entity,
    })),
  ];
  // The users endpoint returns [{ id, name, email }, ...]. The `user`
  // query param on getAuditLogs matches by name, so `value` here is each
  // user's `name`, not their numeric `id`.
  const userOptions = [
    { value: "", label: "All Users" },
    ...extractListData(usersResponse).map((user) => ({
      value: user.name,
      label: user.name,
    })),
  ];

  // --------------------------------------------------
  // ACTION-TYPE COUNTS — 3 separate queries, same pattern used on
  // Complaints/Discounts stat cards. `action` matches by prefix, so
  // "create" also counts actions such as create_product and
  // create_notification.
  // --------------------------------------------------
  // Number of logged create actions
  const { data: createResponse } = useQuery({
    queryKey: ["auditLogs", "count", "create"],
    queryFn: ({ signal }) => getAuditLogs({ action: "create" }, signal),
    ...AUDIT_LOG_REFRESH_OPTIONS,
  });
  // Number of logged update actions
  const { data: updateResponse } = useQuery({
    queryKey: ["auditLogs", "count", "update"],
    queryFn: ({ signal }) => getAuditLogs({ action: "update" }, signal),
    ...AUDIT_LOG_REFRESH_OPTIONS,
  });
  // Number of logged delete actions
  const { data: deleteResponse } = useQuery({
    queryKey: ["auditLogs", "count", "delete"],
    queryFn: ({ signal }) => getAuditLogs({ action: "delete" }, signal),
    ...AUDIT_LOG_REFRESH_OPTIONS,
  });

  // Reads the total count from a paginated response, with a safe fallback
  const getCount = (response) =>
    response?.data?.count ?? extractListData(response).length;

  // --------------------------------------------------
  // EXPORT — type=audit_logs. The backend builds and returns
  // the CSV file directly for the currently applied filters, so this
  // is one request instead of looping every page of results and
  // building the file in the browser.
  // --------------------------------------------------
  // True while the CSV download is running
  const [isExporting, setIsExporting] = useState(false);

  // Downloads the CSV for the filters currently applied
  const handleExport = async () => {
    // Disable the export button while the request runs
    setIsExporting(true);
    try {
      // Request the CSV with the same filters the table is using
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

      // Report the outcome to the admin
      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to export logs. Please try again.");
      }
    } finally {
      // Enable the export button again
      setIsExporting(false);
    }
  };

  // Column definitions for the audit log table
  const columns = [
    {
      // When the action happened
      key: "created_at",
      label: "Timestamp",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-600">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      // Who performed the action
      key: "user",
      label: "User",
      render: (row) => (
        // user_name is the acting admin's readable name (e.g. "Ali Khan";
        // "System" for an automated action).
        <span className="text-[10px] sm:text-[11px] font-medium text-gray-900">
          {row.user_name || "System"}
        </span>
      ),
    },
    {
      // What kind of action it was
      key: "action",
      label: "Action",
      render: (row) => (
        <Badge
          label={row.action}
          variant={getActionBadgeVariant(row.action)}
          size="sm"
          rounded
        />
      ),
    },
    {
      // Which type of record the action was about
      key: "entity",
      label: "Entity",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-700">
          {row.entity}
        </span>
      ),
    },
    {
      // The record's id together with its name, for example
      // "7 — Red Cotton Shirt" or "12 — Sara Ahmed"
      key: "entity_id",
      label: "Entity ID",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500">
          {getEntityLabel(row)}
        </span>
      ),
    },
    {
      // The network address the action came from
      key: "ip_address",
      label: "IP Address",
      render: (row) => (
        // Older entries and actions performed through the AI assistant
        // have no IP address, so a dash is shown for those.
        <span className="text-[10px] sm:text-[11px] text-gray-500 font-mono">
          {row.ip_address || "—"}
        </span>
      ),
    },
    {
      // Opens the detail modal for the row
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            // Stops this click from also bubbling up to the row's own
            // onClick, which opens the same modal — avoids a redundant
            // double open when the link itself is clicked
            e.stopPropagation();
            // Show the details of this row
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
    // is kept tight so the page matches the rhythm used on Product
    // Management, instead of leaving large empty bands between sections.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Page title */}
      <PageHeader icon={<AiOutlineFileText />} title="Audit Logs" />

      {/* Layout: a flex-wrap row rather than a three-column grid.
          StatsCard sizes itself to its own content, so a grid column
          stretches far wider than the card and leaves a visible gap
          beside it on anything wider than a phone screen. A wrapping
          flex row keeps the three cards close together and still
          drops to a single column on narrow screens. */}
      <div className="flex flex-wrap gap-2">
        {/* Total create actions */}
        <StatsCard
          title="Create Actions"
          value={getCount(createResponse)}
          icon={<AiOutlinePlusCircle />}
          iconBg="bg-success-light"
          iconColor="text-success"
        />
        {/* Total update actions */}
        <StatsCard
          title="Update Actions"
          value={getCount(updateResponse)}
          icon={<AiOutlineEdit />}
          iconBg="bg-info-light"
          iconColor="text-info"
        />
        {/* Total delete actions */}
        <StatsCard
          title="Delete Actions"
          value={getCount(deleteResponse)}
          icon={<AiOutlineDelete />}
          iconBg="bg-danger-light"
          iconColor="text-danger"
        />
      </div>
      {/* Note: a "Total Actions Today" card is NOT included — no
          date-scoped count is reliably available without a confirmed
          date filter param. */}

      {/* Toolbar — search, Filters, Export, and (once opened) the
          Entity/User dropdown chips. Same shared toolbar pattern used
          on every other admin list page. */}
      <AuditLogFilters
        search={search}
        onSearchChange={(value) => {
          // Store the typed search text
          setSearch(value);
          // A new search starts from the first page
          setCurrentPage(1);
        }}
        entityOptions={entityOptions}
        entityFilter={entityFilter}
        onEntityChange={(value) => {
          // Store the chosen entity type
          setEntityFilter(value);
          // A new filter starts from the first page
          setCurrentPage(1);
        }}
        userOptions={userOptions}
        userFilter={userFilter}
        onUserChange={(value) => {
          // Store the chosen user
          setUserFilter(value);
          // A new filter starts from the first page
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* The audit log table with server-side pagination */}
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

      {/* Detail modal for the selected log row */}
      <AuditLogDetailModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
};

export default AuditLogs;
