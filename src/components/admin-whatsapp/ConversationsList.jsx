// ============================================================
// ConversationsList — BOT LOGS SUB-COMPONENT
// ============================================================
// Built from API 94 (WhatsApp Sessions) — "everyone currently
// mid-conversation with the bot". This is the only REAL, bounded
// data source for a conversation list; there's no paginated,
// conversation-grouped view of the full historical message log
// anywhere in the API, so this deliberately does NOT claim to show
// "all 12,482 conversations" the way the original design implied.
//
// Customer names are resolved via a REAL cross-reference against the
// Customers list (API 87) matching on phone number — WhatsApp Sessions
// itself has no name field at all, only phone_number. If no matching
// customer is found, the raw phone number is shown instead of a
// fabricated name.

import { useQuery, useQueries } from "@tanstack/react-query";

import { getWhatsAppSessions } from "../../api/whatsapp.api";
import { getCustomers } from "../../api/customers.api";
import extractListData from "../../utils/extractListData";
import formatRelativeTime from "../../utils/formatRelativeTime";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

const ConversationsList = ({ selectedPhone, onSelect }) => {
  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["whatsappBotLogs", "sessions"],
    queryFn: ({ signal }) => getWhatsAppSessions(signal),
    staleTime: 1000 * 30, // short cache — this is meant to reflect near-live state
  });
  const sessions = extractListData(sessionsResponse);

  // Real customer name lookup — one precise search-by-phone request
  // PER SESSION, instead of the old approach of fetching up to 200
  // customers and hoping the match was somewhere in there. `sessions`
  // is already a small, bounded list (people currently mid-conversation
  // with the bot), so resolving every session's real name this way is
  // safe and accurate — and no longer silently fails once the customer
  // base grows past 200. The backend's `search` param is now confirmed
  // to match phone numbers directly.
  const customerLookupQueries = useQueries({
    queries: sessions.map((session) => ({
      queryKey: ["whatsappBotLogs", "customerLookup", session.phone_number],
      queryFn: ({ signal }) => getCustomers({ search: session.phone_number, page_size: 1 }, signal),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const findCustomerName = (phone) => {
    const index = sessions.findIndex((s) => s.phone_number === phone);
    const match = extractListData(customerLookupQueries[index]?.data)[0];
    return match?.name || null;
  };
  // CONFIRMED: the backend's `search` param now normalizes phone
  // formatting before matching (spaces, dashes, and a "+" country
  // code prefix are stripped, then compared as digits) — so this
  // correctly matches even when WhatsApp's phone_number format
  // differs from how the customer's phone was originally stored.

  return (
    <div className="bg-white rounded-xl border border-gray-100 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Active Conversations
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Currently mid-conversation with the bot
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Spinner size="sm" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8">
            <EmptyState
              variant="noResults"
              title="No Active Chats"
              description="No one is currently talking with the bot."
            />
          </div>
        ) : (
          sessions.map((session) => {
            const name = findCustomerName(session.phone_number);
            const isSelected = session.phone_number === selectedPhone;
            return (
              <button
                key={session.phone_number}
                onClick={() => onSelect(session.phone_number)}
                className={`w-full flex items-center gap-3 p-3 text-left border-l-2 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary-50"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <Avatar name={name || session.phone_number} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {name || session.phone_number}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {session.current_flow || "In conversation"}
                  </p>
                </div>
                <span className="text-xs text-gray-300 shrink-0">
                  {formatRelativeTime(session.last_active)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationsList;
