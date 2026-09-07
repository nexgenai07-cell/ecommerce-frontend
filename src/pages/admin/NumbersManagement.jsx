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
import ManualEntryModal from "../../components/admin-whatsapp/ManualEntryModal";

const PAGE_SIZE = 10;

const NumbersManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      queryFn: ({ signal }) => getCustomers({ search: session.phone_number, page_size: 1 }, signal),
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

  const visibleSessions = filteredSessions.slice(0, PAGE_SIZE);

  // Real per-row chat count — only for the small, currently-VISIBLE
  // page of rows (not all sessions at once), matching the same
  // bounded-N+1 reasoning used elsewhere in this admin panel
  const chatCountQueries = useQueries({
    queries: visibleSessions.map((session) => ({
      queryKey: ["whatsappNumbers", "chatCount", session.phone_number],
      queryFn: ({ signal }) => getWhatsAppLogs({ phone_number: session.phone_number }, signal),
    })),
  });

  const handleExport = () => {
    downloadCsv(
      visibleSessions.map((session, index) => {
        const customer = findCustomer(session.phone_number);
        return {
          name: customer?.name || "Unknown",
          phone: session.phone_number,
          total_chats: extractListData(chatCountQueries[index]?.data).length,
          last_active: session.last_active,
        };
      }),
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
          from the design are NOT included — see the flags shared
          before this code: neither is computable, and no blocking
          system exists anywhere in the API. */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Chats
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Last Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleSessions.map((session, index) => {
                const customer = findCustomer(session.phone_number);
                const chatCount = extractListData(
                  chatCountQueries[index]?.data,
                ).length;
                return (
                  <tr
                    key={session.phone_number}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={customer?.name || session.phone_number}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {customer?.name || "Unknown"}
                          </p>
                          {customer?.email && (
                            <p className="text-xs text-gray-400 truncate">
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {session.phone_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {chatCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatRelativeTime(session.last_active)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label="Active"
                        variant="success"
                        size="sm"
                        rounded
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(ROUTES.ADMIN_WHATSAPP_LOGS)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
                        aria-label="View conversation"
                      >
                        <AiOutlineEye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default NumbersManagement;
