import { useState, useMemo } from "react";

// TanStack Query hook — data fetching + caching
import { useQuery } from "@tanstack/react-query";

import {
  AiOutlineFileText,
  AiOutlineDownload,
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineClose,
} from "react-icons/ai";

import { getComplaints } from "../../api/complaints.api";
// getComplaints — API 55: GET /api/v1/complaints/. Role-based on the
// backend: an admin calling this gets EVERY complaint from every
// customer, no separate admin-only endpoint needed.
//
// BACKEND BUG — CONFIRMED VIA NETWORK TAB (not a guess):
// This page used to send status/priority/search straight through as
// query params on this request, the same pattern that works on other
// endpoints in this project. It does NOT work here. Screenshots of
// the Network tab show FOUR separate requests — complaints/,
// ?status=open, ?status=in_progress, ?status=resolved — and every
// single one of them came back with the exact same payload: the same
// count: 24 and the same 24 rows (mostly status: "resolved"),
// regardless of which status was requested. The backend is silently
// ignoring the ?status= (and, by the same evidence, ?priority= and
// ?search=) query params on this endpoint and always returning the
// same unfiltered page. That is a backend issue, not a frontend one —
// flag this to the backend team so /api/v1/complaints/ actually
// honors these params.
//
// THE FIX APPLIED HERE: since the backend can't be trusted to filter
// OR to report accurate per-status counts, this page fetches the
// COMPLETE complaint list once (see fetchAllComplaints below) and
// does ALL filtering — status tabs, priority, search, and pagination —
// on the client, against that one real, complete dataset. Unlike the
// Returns page (where the whole dataset fit on a single page), API 55
// genuinely does paginate (the Network tab shows a real "next" URL),
// so fetchAllComplaints follows every page until "next" is null
// before handing back the full list.

import { exportReport } from "../../api/analytics.api";
// exportReport — API 90 (Export Report). FLAG: the API doc only
// confirms "sales" as an example `type` value; "complaints" is used
// here as a reasonable guess for this report — confirm the exact
// accepted type string with the backend team.

import { COMPLAINT_STATUS } from "../../constants/statusTypes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen (Orders, Products, Returns...).
// Added here so Complaints finally matches the rest of the panel
// instead of using its own plain <h1>.
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

// --------------------------------------------------
// normalizeForSearch — strips EVERYTHING except letters and digits,
// and lowercases the result, exactly like the same-named helper on
// the Returns page. Fixes the same class of bug: the table displays
// each row as "#CMP-24", so a raw compare against "CMP-24" fails the
// moment the admin types the "#" that's visibly right there on
// screen. Stripping punctuation/spaces from BOTH the query and the
// value means "#CMP-24", "CMP-24", "cmp 24", and "24" all normalize
// to the same string and match correctly.
// --------------------------------------------------
const normalizeForSearch = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// How many rows to show per page — client-side pagination, computed
// from the full dataset fetched below.
const PAGE_SIZE = 10;

// --------------------------------------------------
// fetchAllComplaints — follows every paginated page of API 55 until
// exhausted, returning one flat array with every complaint in the
// store. Necessary because, unlike Returns, this endpoint genuinely
// paginates (a real "next" URL is present in the response) — a
// single unparameterized call would silently only return page 1.
// A hard cap of 50 pages guards against ever looping forever if the
// backend's "next" field is ever wrong.
// --------------------------------------------------
const fetchAllComplaints = async () => {
  let page = 1;
  let all = [];

  while (page <= 50) {
    const response = await getComplaints({ page });
    const payload = response?.data;

    // Supports both a flat array and a DRF-paginated object, same
    // defensive shape-handling extractListData uses elsewhere.
    const results = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];

    all = all.concat(results);

    // Stop once the backend says there's no next page, or once a
    // page comes back empty (belt-and-braces against an infinite
    // loop if "next" is ever set incorrectly).
    if (!payload?.next || results.length === 0) break;
    page += 1;
  }

  return all;
};

const ComplaintsManagement = () => {
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

  const debouncedSearch = useDebounce(search, 300);
  // Small delay so filtering doesn't recompute on every single keystroke.

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
  // MAIN LIST — the complete, real dataset (see fetchAllComplaints and
  // the backend-bug flag near the imports for why this replaces both
  // the old parameterized single-page fetch AND ComplaintStatsCards'
  // five separate broken queries).
  // --------------------------------------------------
  const {
    data: allComplaints = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.COMPLAINTS,
    queryFn: fetchAllComplaints,
  });

  // --------------------------------------------------
  // STAT CARD COUNTS — real counts, computed directly from
  // allComplaints instead of five extra (and, per the Network tab,
  // equally broken) filtered requests.
  // --------------------------------------------------
  const openCount = allComplaints.filter(
    (c) => c.status === COMPLAINT_STATUS.OPEN,
  ).length;
  const urgentOpenCount = allComplaints.filter(
    (c) => c.status === COMPLAINT_STATUS.OPEN && c.priority === "urgent",
  ).length;
  const inProgressCount = allComplaints.filter(
    (c) => c.status === COMPLAINT_STATUS.IN_PROGRESS,
  ).length;
  const resolvedCount = allComplaints.filter(
    (c) => c.status === COMPLAINT_STATUS.RESOLVED,
  ).length;

  // --------------------------------------------------
  // FILTERED LIST — status, priority, and search, all applied
  // together on top of the one real dataset fetched above, then
  // sorted Newest First. useMemo skips redoing this work unless one
  // of its actual inputs changed.
  // --------------------------------------------------
  const filteredComplaints = useMemo(() => {
    // Step 1 — status tab.
    let result = activeStatus
      ? allComplaints.filter((c) => c.status === activeStatus)
      : allComplaints;

    // Step 2 — priority tab.
    if (activePriority) {
      result = result.filter((c) => c.priority === activePriority);
    }

    // Step 3 — search, matched against Complaint ID and Subject/
    // Message. Both the query and each field are run through
    // normalizeForSearch first — this is the actual fix for the
    // search-not-filtering bug.
    if (debouncedSearch.trim()) {
      const query = normalizeForSearch(debouncedSearch);
      result = result.filter((c) => {
        const complaintId = normalizeForSearch("CMP" + c.id);
        const subject = normalizeForSearch(c.message);
        return complaintId.includes(query) || subject.includes(query);
      });
    }

    // Step 4 — sort, fixed to Newest First (matches the Returns page's
    // default; no sort control is exposed here either).
    return [...result].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    // Spreads into a new array first — never mutates the array React
    // Query owns, which could otherwise cause subtle re-render bugs.
  }, [allComplaints, activeStatus, activePriority, debouncedSearch]);

  const totalCount = filteredComplaints.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // visibleComplaints — just the current page's slice of the filtered list.
  const visibleComplaints = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredComplaints.slice(start, start + PAGE_SIZE);
  }, [filteredComplaints, currentPage]);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
    setCurrentPage(1);
    // Any time the status filter changes, jump back to page 1 —
    // staying on e.g. page 3 of a now-much-smaller filtered result
    // set would otherwise show an empty page.
  };

  const handlePriorityChange = (priorityKey) => {
    setActivePriority(priorityKey);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveStatus("");
    setActivePriority("");
    setSearch("");
    setCurrentPage(1);
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
          STAT CARDS — all four are real counts computed straight from
          the one real, complete dataset fetched above (see the flag
          near the imports for why the old per-status queries inside
          ComplaintStatsCards were removed). Fully responsive: 1 column
          on mobile, 2 on small screens, 4 on large.
          ================================================================ */}
      <ComplaintStatsCards
        totalCount={allComplaints.length}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ================================================================
          COMPLAINTS TABLE — wrapped in its own soft-shadow card so it
          reads as an elevated surface, matching the rest of the
          redesigned page.
          ================================================================ */}
      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
        <DataTable
          columns={columns}
          data={visibleComplaints}
          keyField="id"
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
    </div>
  );
};

export default ComplaintsManagement;
