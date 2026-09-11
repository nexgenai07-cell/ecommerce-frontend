import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { AiOutlinePlus, AiOutlineDownload, AiOutlineEye } from "react-icons/ai";

import { getWhatsAppSessions, getWhatsAppLogs } from "../../api/whatsapp.api";
import { getCustomers } from "../../api/customers.api";
import { ROUTES } from "../../constants/routes";
import extractListData from "../../utils/extractListData";
import formatRelativeTime from "../../utils/formatRelativeTime";
import downloadCsv from "../../utils/downloadCsv";
import { showSuccess } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import StatsCard from "../../components/ui/StatsCard";
import DataTable from "../../components/ui/DataTable";
import ManualEntryModal from "../../components/admin-whatsapp/ManualEntryModal";

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const NumbersManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many WhatsApp numbers are shown per page, controlled
  // by the "Rows per page" dropdown in the table footer. The session
  // list is filtered client-side above, so this only affects the slice
  // taken below — no network request is re-fired.
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // The numbers table is built from API 94 (currently active
  // sessions) — the only REAL, bounded source of "known numbers".
  // There's no paginated "all WhatsApp numbers ever seen" endpoint,
  // so this deliberately shows currently-active numbers rather than
  // pretending to cover the design's "2,842 total" figure.
  // --------------------------------------------------
  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["whatsappNumbers", "sessions"],
    queryFn: ({ signal }) => getWhatsAppSessions(signal),
  });
  const allSessions = extractListData(sessionsResponse);

  // Real customer name lookup — one precise search-by-phone request
  // PER SESSION, instead of the old approach of fetching up to 200
  // customers and hoping the match was somewhere in there. allSessions
  // is already a small, bounded list (currently-active WhatsApp
  // sessions only — see the comment above), so looking up every
  // session's real name this way is safe and accurate, and no longer
  // silently fails once the customer base grows past 200. The
  // backend's `search` param is now confirmed to match phone numbers
  // directly.
  const customerLookupQueries = useQueries({
    queries: allSessions.map((session) => ({
      queryKey: ["whatsappNumbers", "customerLookup", session.phone_number],
      queryFn: ({ signal }) =>
        getCustomers({ search: session.phone_number, page_size: 1 }, signal),
      staleTime: 1000 * 60 * 5,
    })),
  });

  // Builds a phone -> customer lookup map, keyed by phone number so it
  // stays correct regardless of filtering/pagination order afterward
  const customerByPhone = {};
  allSessions.forEach((session, index) => {
    const match = extractListData(customerLookupQueries[index]?.data)[0];
    if (match) customerByPhone[session.phone_number] = match;
  });

  const findCustomer = (phone) => customerByPhone[phone] || null;
  // Same signature as before — every other usage of findCustomer()
  // below (search filtering, the table render, CSV export) works
  // unchanged.
  // CONFIRMED: the backend's `search` param now normalizes phone
  // formatting before matching (spaces, dashes, and a "+" country
  // code prefix are stripped, then compared as digits) — so this
  // correctly matches even when WhatsApp's phone format differs from
  // how the customer's phone was originally stored.

  const filteredSessions = search
    ? allSessions.filter((s) => {
        const customer = findCustomer(s.phone_number);
        return (
          s.phone_number.includes(search) ||
          customer?.name?.toLowerCase().includes(search.toLowerCase())
        );
      })
    : allSessions;

  // Real pagination over the filtered list, sized by the currently
  // selected `pageSize` and moving with `currentPage`, matching how
  // every other admin table in this project paginates.
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const visibleSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    // A new search term changes which rows match, so the page count
    // can shrink. Resetting to page 1 avoids landing on a page number
    // that no longer exists for the new filtered result set.
    setCurrentPage(1);
  };

  // Real per-row chat count — only for the small, currently-VISIBLE
  // page of rows (not all sessions at once), matching the same
  // bounded-N+1 reasoning used elsewhere in this admin panel
  const chatCountQueries = useQueries({
    queries: visibleSessions.map((session) => ({
      queryKey: ["whatsappNumbers", "chatCount", session.phone_number],
      queryFn: ({ signal }) =>
        getWhatsAppLogs({ phone_number: session.phone_number }, signal),
    })),
  });

  // Rows are pre-enriched with the customer record and chat count
  // before being handed to DataTable, so each column's render function
  // can read everything it needs straight off the row object.
  const tableRows = visibleSessions.map((session, index) => ({
    ...session,
    customer: findCustomer(session.phone_number),
    chatCount: extractListData(chatCountQueries[index]?.data).length,
  }));

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.customer?.name || row.phone_number} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {row.customer?.name || "Unknown"}
            </p>
            {row.customer?.email && (
              <p className="text-xs text-gray-400 truncate">
                {row.customer.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "phone_number",
      label: "Phone Number",
    },
    {
      key: "chatCount",
      label: "Total Chats",
    },
    {
      key: "last_active",
      label: "Last Active",
      render: (row) => formatRelativeTime(row.last_active),
    },
    {
      key: "status",
      label: "Status",
      render: () => (
        <Badge label="Active" variant="success" size="sm" rounded />
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

  const handleExport = () => {
    downloadCsv(
      tableRows.map((row) => ({
        name: row.customer?.name || "Unknown",
        phone: row.phone_number,
        total_chats: row.chatCount,
        last_active: row.last_active,
      })),
      [
        { key: "name", label: "Customer" },
        { key: "phone", label: "Phone Number" },
        { key: "total_chats", label: "Total Chats" },
        { key: "last_active", label: "Last Active" },
      ],
      "whatsapp-numbers",
    );
    showSuccess("Export downloaded.");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">WhatsApp Numbers</h1>
          <p className="text-sm text-gray-500">
            Numbers currently active with the WhatsApp bot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<AiOutlineDownload className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Manual Entry
          </Button>
        </div>
      </div>
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
          value={isLoading ? "—" : allSessions.length}
        />
        <StatsCard
          title="Bot-Handled"
          value={
            isLoading ? "—" : allSessions.filter((s) => !s.is_admin).length
          }
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <Input
          placeholder="Filter by name or number..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <DataTable
        columns={columns}
        data={tableRows}
        keyField="phone_number"
        onRowClick={() => navigate(ROUTES.ADMIN_WHATSAPP_LOGS)}
        // Opens the same conversation log page as the eye icon when any
        // part of the row is clicked
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={filteredSessions.length}
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
