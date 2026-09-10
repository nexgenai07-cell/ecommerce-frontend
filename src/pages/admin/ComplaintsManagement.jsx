import { useState, useEffect } from "react";

// TanStack Query hooks — data fetching + caching, plus manual cache
// invalidation after the bulk status-update mutation below
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AiOutlineFileText,
  AiOutlineDownload,
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineClose,
} from "react-icons/ai";

import { getComplaints, updateComplaintStatus } from "../../api/complaints.api";
// getComplaints — API 55: GET /api/v1/complaints/. Role-based on the
// backend: an admin calling this gets EVERY complaint from every
// customer, no separate admin-only endpoint needed.
//
// BACKEND FIX CONFIRMED: `status`, `search`, and `page` now all filter
// and paginate correctly — this page sends them straight through and
// only ever fetches ONE already-filtered page at a time, rather than
// downloading the entire complaint list and filtering it in the
// browser. `priority` is also sent through optimistically but wasn't
// part of the confirmed fix — see the note on getComplaints() in
// complaints.api.js.

import { exportReport } from "../../api/analytics.api";
// exportReport — `type: "complaints"` is now a confirmed accepted value

import { COMPLAINT_STATUS } from "../../constants/statusTypes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen (Orders, Products, Returns...).
import ComplaintStatsCards from "../../components/admin-complaints/ComplaintStatsCards";
import ComplaintDetailModal from "../../components/admin-complaints/ComplaintDetailModal";

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
// PRIORITY TABS — "normal" and "urgent" are the only two real values
// API 61's documented request shape defines for this field.
// --------------------------------------------------
const PRIORITY_TABS = [
  { key: "", label: "All Priorities" },
  { key: "normal", label: "Normal" },
  { key: "urgent", label: "Urgent" },
];

const PAGE_SIZE = 10;

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
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection — array of complaint ids currently checked in the
  // table, driven by DataTable's built-in selection support. This is
  // independent of selectedComplaint above, which still drives the
  // single-row "Review" detail modal unchanged.
  const [selectedComplaintIds, setSelectedComplaintIds] = useState([]);
  // "resolved" | "closed" — which bulk action the confirm modal below
  // is currently open for.
  const [bulkStatusAction, setBulkStatusAction] = useState(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  // Small delay so filtering doesn't fire a network request on every
  // single keystroke.

  const hasAnyFilterActive =
    !!activeStatus || !!activePriority || !!debouncedSearch;
  // Drives the "Clear all" button's visibility in the filter card header.

  const activeFilterCount = [
    activeStatus,
    activePriority,
    debouncedSearch,
  ].filter(Boolean).length;
  // Feeds the little numbered badge next to the "Filters" heading.

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
    ],
    queryFn: ({ signal }) =>
      getComplaints(
        {
          status: activeStatus || undefined,
          priority: activePriority || undefined,
          search: debouncedSearch || undefined,
          page: currentPage,
          page_size: PAGE_SIZE,
        },
        signal,
      ),
    keepPreviousData: true,
  });

  const visibleComplaints = extractListData(complaintsResponse);
  const totalCount = complaintsResponse?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
  // EXPORT — API 90, downloads the returned blob as a real .csv file
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({ type: "complaints" });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `complaints-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Export downloaded.");
    } catch {
      showError("Failed to export complaints. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------
  // BULK STATUS UPDATE — API 62, called once per selected complaint
  // (there is no bulk endpoint on the backend). Used for the two most
  // common bulk actions on a support queue: marking a batch of tickets
  // Resolved once handled, or Closed once fully wrapped up.
  // --------------------------------------------------
  const handleRequestBulkStatusUpdate = (status) => {
    setBulkStatusAction(status);
  };

  const handleConfirmBulkStatusUpdate = async () => {
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        selectedComplaintIds.map((id) =>
          updateComplaintStatus(id, { status: bulkStatusAction }),
        ),
      );
      showSuccess(
        `${selectedComplaintIds.length} complaint${selectedComplaintIds.length === 1 ? "" : "s"} marked ${bulkStatusAction}.`,
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
      setSelectedComplaintIds([]);
      setBulkStatusAction(null);
    } catch (error) {
      showError(
        error?.response?.data?.message ||
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
        <span className="text-sm text-gray-600 truncate block max-w-55">
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
        <span className="text-sm text-gray-500">
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
          onClick={() => setSelectedComplaint(row)}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, same component
          used on every other admin page.
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineFileText />}
        title="Complaints Management"
        actions={
          <Button
            variant="secondary"
            leftIcon={<AiOutlineDownload className="w-4 h-4" />}
            onClick={handleExport}
            isLoading={isExporting}
          >
            Export CSV
          </Button>
        }
      />
      {/* Note: "+ New Ticket" from the original design is NOT included —
          API 54 (Submit Complaint) has no field to attribute a new
          complaint to a DIFFERENT customer; an admin calling it would
          only ever create a complaint under their own account. */}

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
          FILTERS CARD — status pills, priority pills, and a combined
          Complaint ID / Subject search. Same visual language as the
          Returns admin page's filter card for consistency across the
          panel.
          ================================================================ */}
      <div className="bg-white rounded-2xl border border-white shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)] overflow-hidden">
        {/* Header strip — icon badge + "Filters" label + live active
            count on the left, "Clear all" on the right (only when
            something is actually active). */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
              <AiOutlineFilter className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-gray-800">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </div>

          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-danger transition-colors"
            >
              <AiOutlineClose className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>

        {/* Body — status pills, then priority pills, then the search
            box. All three stacked so nothing gets cramped on mobile. */}
        <div className="p-5 flex flex-col gap-4">
          {/* Status pills — horizontally scrollable on narrow screens,
              scrollbar hidden (defined project-wide in index.css)
              while scrolling itself still fully works. */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key || "all-status"}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-150 shrink-0 ${
                  activeStatus === tab.key
                    ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority pills — a second, visually distinct pill row
              (outlined instead of filled) so it doesn't get confused
              with the status row above it. */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {PRIORITY_TABS.map((tab) => (
              <button
                key={tab.key || "all-priority"}
                onClick={() => handlePriorityChange(tab.key)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-all duration-150 shrink-0 ${
                  activePriority === tab.key
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <Input
            placeholder="Search by ID or subject..."
            leftIcon={<AiOutlineSearch className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ================================================================
          COMPLAINTS TABLE — wrapped in its own soft-shadow card so it
          reads as an elevated surface, matching the rest of the
          redesigned page.
          ================================================================ */}
      {/* ================================================================
          BULK ACTION BAR — appears only while one or more rows are
          checked. Lets the admin mark every selected complaint
          Resolved or Closed in one action.
          ================================================================ */}
      {selectedComplaintIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedComplaintIds.length} complaint
            {selectedComplaintIds.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                handleRequestBulkStatusUpdate(COMPLAINT_STATUS.RESOLVED)
              }
              className="w-full sm:w-auto"
            >
              Mark Resolved
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleRequestBulkStatusUpdate(COMPLAINT_STATUS.CLOSED)
              }
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
        <DataTable
          columns={columns}
          data={visibleComplaints}
          keyField="id"
          selectable
          onSelectionChange={setSelectedComplaintIds}
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={setCurrentPage}
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
        message={`This will mark ${selectedComplaintIds.length} complaint${selectedComplaintIds.length === 1 ? "" : "s"} as ${bulkStatusAction}.`}
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
