import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlinePlus, AiOutlineEye, AiOutlineMessage } from "react-icons/ai";

import {
  getWhatsAppSessions,
  getWhatsAppConversations,
} from "../../api/whatsapp.api";
// getWhatsAppConversations — NEW (API 116.1, 16 Sep 2026 Filtering Fix
// pass). One row per distinct phone number that has EVER exchanged a
// message, already paired with its linked customer's name and total
// message count server-side. getWhatsAppSessions is kept ONLY for the
// two stat cards below ("Active Sessions" / "Bot-Handled"), since that
// is a genuinely different, still-small-and-bounded concept —
// currently mid-flow bot sessions — not the full conversation history.
import { exportReport } from "../../api/analytics.api";
import { ROUTES } from "../../constants/routes";
import extractListData from "../../utils/extractListData";
import formatRelativeTime from "../../utils/formatRelativeTime";
import downloadExportCsv from "../../utils/downloadExportCsv";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import StatsCard from "../../components/ui/StatsCard";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen, replacing this page's own custom
// header row so it finally matches the rest of the panel.
import ManualEntryModal from "../../components/admin-whatsapp/ManualEntryModal";
import NumbersFilters from "../../components/admin-whatsapp/NumbersFilters";
// NumbersFilters — the shared-style toolbar above the table (search +
// Export).

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const NumbersManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many WhatsApp numbers are shown per page, sent to
  // the backend as `page_size` alongside `page` on every request.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Waits 400ms after the admin stops typing before actually
  // searching — avoids firing a new network request on every single
  // keystroke, same pattern used on every other admin list page.
  const debouncedSearch = useDebounce(search, 400);

  // --------------------------------------------------
  // ACTIVE SESSION STATS — API 94, unrelated to the table below. These
  // two stat cards specifically describe numbers currently mid-flow
  // with the bot right now, which is a different, smaller concept than
  // "every number that has ever messaged" (the table's data source).
  // --------------------------------------------------
  const { data: sessionsResponse, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["whatsappNumbers", "sessions"],
    queryFn: ({ signal }) => getWhatsAppSessions(signal),
  });
  const activeSessions = extractListData(sessionsResponse);

  // --------------------------------------------------
  // CONVERSATIONS TABLE QUERY — API 116.1 (NEW, 16 Sep 2026 Filtering
  // Fix pass). Real server-side search (phone number OR linked
  // customer name) and real pagination, already paired with each
  // number's customer name and message count — no more per-session
  // customer lookups or per-row chat-count requests.
  // --------------------------------------------------
  const {
    data: conversationsResponse,
    isLoading: isLoadingConversations,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "whatsappNumbers",
      "conversations",
      debouncedSearch,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getWhatsAppConversations(
        {
          search: debouncedSearch || undefined,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    keepPreviousData: true,
  });

  const tableRows = extractListData(conversationsResponse);
  const totalCount = conversationsResponse?.data?.count ?? tableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isLoading = isLoadingSessions || isLoadingConversations;

  const columns = [
    {
      key: "customer_name",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.customer_name || row.phone_number} size="sm" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-medium text-gray-900 truncate leading-tight">
              {/* customer_name is null when no matching customer record
                  is found (API 116.1) — show just the phone number in
                  that case, matching the confirmed frontend note. */}
              {row.customer_name || "Unknown"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone_number",
      label: "Phone Number",
    },
    {
      key: "message_count",
      label: "Total Chats",
    },
    {
      key: "last_message_at",
      label: "Last Active",
      render: (row) => formatRelativeTime(row.last_message_at),
    },
    {
      key: "is_admin",
      label: "Last Message From",
      render: (row) => (
        <Badge
          label={row.is_admin ? "Admin" : "Customer"}
          variant={row.is_admin ? "info" : "gray"}
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Stops this click from also bubbling up to the row's own
            // onClick, which navigates to the same logs page — avoids a
            // redundant double navigation when the icon itself is clicked
            navigate(ROUTES.ADMIN_WHATSAPP_LOGS);
          }}
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          aria-label="View conversation"
        >
          <AiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // --------------------------------------------------
  // EXPORT — API 99, type=whatsapp_numbers. The backend builds and
  // returns the CSV file directly for the current search, so this is
  // one request instead of looping every page of results and building
  // the file in the browser.
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { success, message } = await downloadExportCsv(
        exportReport,
        {
          type: "whatsapp_numbers",
          search: debouncedSearch || undefined,
        },
        "whatsapp-numbers",
      );

      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to export numbers. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-6 to gap-2 so the page matches the tighter rhythm
    // already used on Product Management, instead of leaving large empty
    // bands between each section.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Shared gradient PageHeader — matches every other admin screen. */}
      <PageHeader
        icon={<AiOutlineMessage />}
        title="WhatsApp Numbers"
        actions={
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Manual Entry
          </Button>
        }
      />
      {/* Note: "Total WhatsApp Users" and "Blocked Numbers" stat cards
          from the design are not included here, since neither figure
          is computable and no blocking system exists anywhere in the
          API. */}

      {/* Layout: a flex-wrap row rather than a two-column grid.
          StatsCard sizes itself to its own content, so a grid column
          stretches far wider than the card and leaves a visible gap
          beside it on anything wider than a phone screen. A wrapping
          flex row keeps the two cards close together and still drops
          to a single column on narrow screens. */}
      <div className="flex flex-wrap gap-2">
        <StatsCard
          title="Active Sessions"
          value={isLoadingSessions ? "—" : activeSessions.length}
        />
        <StatsCard
          title="Bot-Handled"
          value={
            isLoadingSessions
              ? "—"
              : activeSessions.filter((s) => !s.is_admin).length
          }
        />
      </div>

      {/* Toolbar — search and Export. Same shared toolbar pattern used
          on every other admin list page. */}
      <NumbersFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <DataTable
        columns={columns}
        data={tableRows}
        keyField="phone_number"
        onRowClick={() => navigate(ROUTES.ADMIN_WHATSAPP_LOGS)}
        // Opens the same conversation log page as the eye icon when any
        // part of the row is clicked
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

      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default NumbersManagement;
