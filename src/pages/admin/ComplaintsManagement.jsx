import { useState, useEffect } from "react";

// TanStack Query hooks — data fetching + caching, plus manual cache
// invalidation after the bulk status-update mutation below
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AiOutlineFileText } from "react-icons/ai";

import {
  getComplaints,
  bulkUpdateComplaintStatus,
} from "../../api/complaints.api";
// getComplaints — GET /api/v1/complaints/. Role-based on the backend: an
// admin calling this gets EVERY complaint from every customer, no
// separate admin-only endpoint is needed.
//
// `status`, `search` and `page` filter and paginate on the server — this
// page sends them straight through and only ever fetches ONE
// already-filtered page at a time, rather than downloading the entire
// complaint list and filtering it in the browser. `priority` is sent
// through as an additional filter — see the note on getComplaints() in
// complaints.api.js.

import { exportReport } from "../../api/analytics.api";
// exportReport — `type: "complaints"` is an accepted value

import { COMPLAINT_STATUS } from "../../constants/statusTypes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import { canTransitionComplaintStatus } from "../../utils/complaintStatusWorkflow";
import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
import formatDate from "../../utils/formatDate";
import chunkArray from "../../utils/chunkArray";
import downloadExportCsv from "../../utils/downloadExportCsv";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the shared gradient icon + title header used on every
// admin screen (Orders, Products, Returns...).
import ComplaintStatsCards from "../../components/admin-complaints/ComplaintStatsCards";
import ComplaintDetailModal from "../../components/admin-complaints/ComplaintDetailModal";
import ComplaintFilters from "../../components/admin-complaints/ComplaintFilters";

// --------------------------------------------------
// STATUS TABS — one pill per real COMPLAINT_STATUS value, plus "All".
// --------------------------------------------------
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: COMPLAINT_STATUS.OPEN, label: "Open" },
  { key: COMPLAINT_STATUS.IN_PROGRESS, label: "In Review" },
  { key: COMPLAINT_STATUS.RESOLVED, label: "Resolved" },
  { key: COMPLAINT_STATUS.CLOSED, label: "Closed" },
];

// --------------------------------------------------
// PRIORITY TABS — "normal" and "urgent" are the only two priority values
// a complaint can have.
// --------------------------------------------------
const PRIORITY_TABS = [
  { key: "", label: "All Priorities" },
  { key: "normal", label: "Normal" },
  { key: "urgent", label: "Urgent" },
];

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const ComplaintsManagement = () => {
  const queryClient = useQueryClient();

  // ---- filter/UI state ----
  const [activeStatus, setActiveStatus] = useState("");
  // activeStatus — which status pill is currently selected ("" = All).

  const [activePriority, setActivePriority] = useState("");
  // activePriority — which priority pill is currently selected.

  const [search, setSearch] = useState("");
  // search — raw text typed into the search box before debouncing.
  // Matches against Complaint ID and Subject/Message, per the input's
  // own placeholder text.

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many complaints the backend returns per page,
  // controlled by the "Rows per page" dropdown in the table footer.
  // Sent to the backend as `page_size` alongside `page` on every request.

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection — array of complaint ids currently checked in the
  // table, driven by DataTable's built-in selection support. This is
  // independent of selectedComplaint above, which drives the
  // single-row "Review" detail modal.
  const [selectedComplaintIds, setSelectedComplaintIds] = useState([]);

  // selectedStatusById — snapshot of each selected complaint's status,
  // keyed by id. DataTable only reports ids, and a selection can span
  // several pages, so the status is captured when a row is selected.
  // It is used to work out which selected complaints are eligible for
  // a given bulk action under the status workflow.
  const [selectedStatusById, setSelectedStatusById] = useState({});

  // tableResetKey — changing this key remounts the table, which clears
  // DataTable's internal checkbox selection once a bulk action is done.
  const [tableResetKey, setTableResetKey] = useState(0);
  // "resolved" | "closed" — which bulk action the confirm modal below
  // is currently open for.
  const [bulkStatusAction, setBulkStatusAction] = useState(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  // Small delay so filtering doesn't fire a network request on every
  // single keystroke.

  const hasAnyFilterActive =
    !!activeStatus || !!activePriority || !!debouncedSearch;
  // Drives the "Clear all" link's visibility in the toolbar.

  // --------------------------------------------------
  // MAIN LIST — real server-side filtering + pagination. Only ONE
  // already-filtered page of complaints is ever fetched, no matter
  // how many complaints exist in total.
  // --------------------------------------------------
  const {
    data: complaintsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.COMPLAINTS,
      "list",
      activeStatus,
      activePriority,
      debouncedSearch,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getComplaints(
        {
          status: activeStatus || undefined,
          priority: activePriority || undefined,
          search: debouncedSearch || undefined,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    keepPreviousData: true,
  });

  const visibleComplaints = extractListData(complaintsResponse);
  const totalCount = complaintsResponse?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // --------------------------------------------------
  // STAT CARD COUNTS — each is its own lightweight request that reads
  // only the real backend `count` field for that specific status; the
  // actual result rows aren't needed, just the totals.
  // --------------------------------------------------
  const { data: openCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.COMPLAINTS, "count", COMPLAINT_STATUS.OPEN],
    queryFn: ({ signal }) =>
      getComplaints(
        {
          status: COMPLAINT_STATUS.OPEN,
          page: 1,
          page_size: 1,
        },
        signal,
      ),
  });
  const openCount = openCountResponse?.data?.count ?? 0;

  const { data: urgentOpenCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.COMPLAINTS, "count", "urgentOpen"],
    queryFn: ({ signal }) =>
      getComplaints(
        {
          status: COMPLAINT_STATUS.OPEN,
          priority: "urgent",
          page: 1,
          page_size: 1,
        },
        signal,
      ),
  });
  const urgentOpenCount = urgentOpenCountResponse?.data?.count ?? 0;

  const { data: inProgressCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.COMPLAINTS, "count", COMPLAINT_STATUS.IN_PROGRESS],
    queryFn: ({ signal }) =>
      getComplaints(
        {
          status: COMPLAINT_STATUS.IN_PROGRESS,
          page: 1,
          page_size: 1,
        },
        signal,
      ),
  });
  const inProgressCount = inProgressCountResponse?.data?.count ?? 0;

  const { data: resolvedCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.COMPLAINTS, "count", COMPLAINT_STATUS.RESOLVED],
    queryFn: ({ signal }) =>
      getComplaints(
        {
          status: COMPLAINT_STATUS.RESOLVED,
          page: 1,
          page_size: 1,
        },
        signal,
      ),
  });
  const resolvedCount = resolvedCountResponse?.data?.count ?? 0;

  const { data: totalCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.COMPLAINTS, "count", "total"],
    queryFn: ({ signal }) => getComplaints({ page: 1, page_size: 1 }, signal),
  });
  const grandTotalCount = totalCountResponse?.data?.count ?? 0;

  // Whenever a filter changes, jump back to page 1 — staying on, say,
  // page 3 of a now-much-smaller filtered result set would otherwise
  // show an empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, activePriority, debouncedSearch]);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
  };

  const handlePriorityChange = (priorityKey) => {
    setActivePriority(priorityKey);
  };

  const handleClearFilters = () => {
    setActiveStatus("");
    setActivePriority("");
    setSearch("");
  };

  // --------------------------------------------------
  // EXPORT — API 99. downloadExportCsv() reads the JSON error back out
  // of the blob on a validation failure, so the real reason reaches
  // this toast instead of a generic message.
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { success, message } = await downloadExportCsv(
        exportReport,
        { type: "complaints" },
        `complaints-export-${new Date().toISOString().slice(0, 10)}`,
      );

      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to export complaints. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------
  // BULK SELECTION — keeps the selected ids together with a snapshot of
  // each selected complaint's status. Rows on the current page are read
  // from the freshly loaded list; rows selected on another page keep
  // the status captured earlier.
  // --------------------------------------------------
  const handleSelectionChange = (ids) => {
    setSelectedComplaintIds(ids);
    setSelectedStatusById((previous) => {
      const next = {};
      ids.forEach((id) => {
        const row = visibleComplaints.find((complaint) => complaint.id === id);
        next[id] = row ? row.status : previous[id];
      });
      return next;
    });
  };

  // --------------------------------------------------
  // BULK STATUS UPDATE — called once per selected complaint
  // (there is no bulk endpoint on the backend). Supports the two bulk
  // actions used on a support queue: marking handled tickets Resolved
  // and closing resolved tickets.
  //
  // The backend enforces a status workflow (open -> in_progress ->
  // resolved -> closed), so a bulk action only applies to the selected
  // complaints that can legally make that move: "Resolved" applies to
  // In Review complaints and "Close" applies to Resolved complaints.
  // Any other selected complaint is skipped instead of being sent to
  // the server to be rejected.
  // --------------------------------------------------
  const getEligibleIdsForBulkAction = (targetStatus) =>
    selectedComplaintIds.filter((id) =>
      canTransitionComplaintStatus(selectedStatusById[id], targetStatus),
    );

  const resolveEligibleCount = getEligibleIdsForBulkAction(
    COMPLAINT_STATUS.RESOLVED,
  ).length;
  const closeEligibleCount = getEligibleIdsForBulkAction(
    COMPLAINT_STATUS.CLOSED,
  ).length;

  // Ids the pending bulk action will actually be applied to, and how
  // many of the selected complaints will be skipped.
  const bulkEligibleIds = bulkStatusAction
    ? getEligibleIdsForBulkAction(bulkStatusAction)
    : [];
  const bulkSkippedCount = selectedComplaintIds.length - bulkEligibleIds.length;

  const handleRequestBulkStatusUpdate = (status) => {
    setBulkStatusAction(status);
  };

  const handleConfirmBulkStatusUpdate = async () => {
    if (bulkEligibleIds.length === 0) {
      setBulkStatusAction(null);
      return;
    }

    setIsBulkUpdating(true);
    try {
      // API 71.1 — the eligible ids are sent in batches of up to 100
      // per request instead of one request per complaint. Each
      // complaint in a batch is still evaluated independently on the
      // backend, so one that can't make this move is reported in that
      // batch's own "failed" array without stopping the rest.
      const batches = chunkArray(bulkEligibleIds, 100);
      let updatedCount = 0;
      const failures = [];

      for (const batch of batches) {
        const response = await bulkUpdateComplaintStatus(
          batch,
          bulkStatusAction,
        );
        updatedCount += response.data.updated_ids?.length ?? 0;
        // missing_ids means the complaint no longer exists in this
        // selection — not a failure, so nothing is shown for it.
        if (response.data.failed?.length) {
          failures.push(...response.data.failed);
        }
      }

      if (updatedCount > 0) {
        showSuccess(
          `${updatedCount} complaint${updatedCount === 1 ? "" : "s"} marked ${bulkStatusAction}.` +
            (bulkSkippedCount > 0
              ? ` ${bulkSkippedCount} skipped (status change not allowed).`
              : ""),
        );
      }

      if (failures.length > 0) {
        showError(
          failures[0].error ||
            `${failures.length} complaint${failures.length === 1 ? "" : "s"} could not be updated.`,
        );
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
      setSelectedComplaintIds([]);
      setSelectedStatusById({});
      setTableResetKey((key) => key + 1);
      setBulkStatusAction(null);
    } catch (error) {
      showError(
        error?.response?.data?.detail ||
          "Failed to update the selected complaints.",
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (row) => (
        <span className="font-medium text-primary">#CMP-{row.id}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <Badge
          label={getComplaintTypeLabel(row.type)}
          variant="gray"
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "message",
      label: "Subject",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-600 truncate block max-w-55">
          {row.message}
        </span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <Badge
          label={row.priority}
          variant={row.priority === "urgent" ? "danger" : "gray"}
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} status={row.status} size="sm" rounded />
      ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            // Stops this click from also bubbling up to the row's own
            // onClick, which opens the same modal — avoids a redundant
            // double open when the button itself is clicked
            setSelectedComplaint(row);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-6 to gap-2 so the page matches the tighter rhythm
    // already used on Product Management, instead of leaving large empty
    // bands between each section.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, same component
          used on every other admin page.
          ================================================================ */}
      <PageHeader icon={<AiOutlineFileText />} title="Complaints Management" />
      {/* There is deliberately no "+ New Ticket" action: the submit-complaint
          endpoint has no field to attribute a new complaint to a different
          customer, so an admin calling it would only ever create a
          complaint under their own account. */}

      {/* ================================================================
          STAT CARDS — real backend counts, one lightweight request per
          card (see above) — accurate across the ENTIRE complaint list,
          not just whatever page happens to be loaded.
          ================================================================ */}
      <ComplaintStatsCards
        totalCount={grandTotalCount}
        openCount={openCount}
        urgentOpenCount={urgentOpenCount}
        inProgressCount={inProgressCount}
        resolvedCount={resolvedCount}
      />

      {/* ================================================================
          TOOLBAR — search, Filters, Export, and (once opened) the
          Status / Priority dropdown chips. Same shared toolbar pattern
          used on every other admin list page (see
          src/components/shared/list-toolbar).
          ================================================================ */}
      <ComplaintFilters
        statusTabs={STATUS_TABS}
        activeStatus={activeStatus}
        onStatusChange={handleTabChange}
        priorityTabs={PRIORITY_TABS}
        activePriority={activePriority}
        onPriorityChange={handlePriorityChange}
        search={search}
        onSearchChange={setSearch}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasAnyFilterActive}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* ================================================================
          COMPLAINTS TABLE — wrapped in its own soft-shadow card so it
          reads as an elevated surface, matching the rest of the
          redesigned page.
          ================================================================ */}
      {/* ================================================================
          BULK ACTION BAR — appears only while one or more rows are
          checked. Lets the admin mark every selected complaint
          Resolved or Closed in one action, where the status workflow allows it.
          ================================================================ */}
      {selectedComplaintIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-medium text-gray-700">
            {selectedComplaintIds.length} complaint
            {selectedComplaintIds.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
            {/* Each button is enabled only when at least one selected
                complaint can make that move (In Review -> Resolved,
                Resolved -> Closed); the count shows how many will be
                updated. */}
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                handleRequestBulkStatusUpdate(COMPLAINT_STATUS.RESOLVED)
              }
              disabled={resolveEligibleCount === 0}
              title="Applies to selected complaints that are In Review"
              className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
            >
              Mark Resolved ({resolveEligibleCount})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleRequestBulkStatusUpdate(COMPLAINT_STATUS.CLOSED)
              }
              disabled={closeEligibleCount === 0}
              title="Applies to selected complaints that are Resolved"
              className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
            >
              Close ({closeEligibleCount})
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)] flex flex-col flex-1 min-h-0">
        <DataTable
          key={tableResetKey}
          columns={columns}
          data={visibleComplaints}
          keyField="id"
          onRowClick={(row) => setSelectedComplaint(row)}
          // Opens the same Review modal as the "Review" button when any
          // part of the row is clicked
          selectable
          onSelectionChange={handleSelectionChange}
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
      </div>

      <ComplaintDetailModal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        complaint={selectedComplaint}
      />

      {/* ================================================================
          BULK STATUS UPDATE CONFIRMATION
          ================================================================ */}
      <ConfirmModal
        isOpen={!!bulkStatusAction}
        onClose={() => setBulkStatusAction(null)}
        onConfirm={handleConfirmBulkStatusUpdate}
        title={
          bulkStatusAction === COMPLAINT_STATUS.RESOLVED
            ? "Mark Complaints as Resolved?"
            : "Close Complaints?"
        }
        message={
          `This will mark ${bulkEligibleIds.length} complaint${bulkEligibleIds.length === 1 ? "" : "s"} as ${bulkStatusAction}.` +
          (bulkSkippedCount > 0
            ? ` ${bulkSkippedCount} selected complaint${bulkSkippedCount === 1 ? "" : "s"} will be skipped because the current status does not allow this change.`
            : "")
        }
        confirmLabel={
          bulkStatusAction === COMPLAINT_STATUS.RESOLVED
            ? "Mark Resolved"
            : "Close"
        }
        variant="primary"
        isLoading={isBulkUpdating}
      />
    </div>
  );
};

export default ComplaintsManagement;
