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

import { useQuery } from "@tanstack/react-query";

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
    queryFn: getWhatsAppSessions,
    staleTime: 1000 * 30, // short cache — this is meant to reflect near-live state
  });
  const sessions = extractListData(sessionsResponse);

  // Fetched once, used purely to resolve phone -> real customer name.
  // A large page is requested so the match has a real chance of
  // finding the customer even without a dedicated phone-lookup endpoint.
  const { data: customersResponse } = useQuery({
    queryKey: ["whatsappBotLogs", "customersForNameLookup"],
    queryFn: () => getCustomers({ page_size: 200 }),
    staleTime: 1000 * 60 * 5,
  });
  const customers = extractListData(customersResponse);

  const findCustomerName = (phone) => {
    // Simple digit-only comparison, since phone formatting (spaces,
    // dashes, country code prefixes) can differ between what's stored
    // on the customer record vs what WhatsApp reports
    const normalizedPhone = phone?.replace(/\D/g, "").slice(-10);
    const match = customers.find(
      (c) => c.phone?.replace(/\D/g, "").slice(-10) === normalizedPhone,
    );
    return match?.name || null;
  };

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
