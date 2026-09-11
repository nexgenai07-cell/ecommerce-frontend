import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineTeam, AiOutlineThunderbolt } from "react-icons/ai";

import { getWhatsAppSessions } from "../../api/whatsapp.api";
import extractListData from "../../utils/extractListData";
import StatsCard from "../../components/ui/StatsCard";
import ConversationsList from "../../components/admin-whatsapp/ConversationsList";
import ChatPanel from "../../components/admin-whatsapp/ChatPanel";

const BotLogs = () => {
  const [selectedPhone, setSelectedPhone] = useState(null);

  // Only real stat available at this scale — "currently active" is
  // exactly what API 94 is built to answer. "Total Conversations",
  // "Avg Session Duration", and "Orders via WhatsApp" from the design
  // were removed — see the flags shared before this code.
  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["whatsappBotLogs", "sessions"],
    queryFn: ({ signal }) => getWhatsAppSessions(signal),
  });
  const activeSessions = extractListData(sessionsResponse);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-xl font-bold text-gray-900">WhatsApp Bot Logs</h1>
        <p className="text-sm text-gray-500">
          Monitor and reply to live bot conversations.
        </p>
      </div>

      {/* Layout: a flex-wrap row rather than a two-column grid.
          StatsCard sizes itself to its own content, so a grid column
          stretches far wider than the card and leaves a visible gap
          beside it once the viewport is wider than a phone screen. A
          wrapping flex row keeps the two cards close together and
          still drops to a single column on narrow screens. */}
      <div className="flex flex-wrap gap-2">
        <StatsCard
          title="Active Now"
          value={isLoading ? "—" : activeSessions.length}
          icon={<AiOutlineThunderbolt />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          trendLabel="Live bot interactions"
          trend="Live"
        />
        <StatsCard
          title="Bot-Handled"
          value={
            isLoading ? "—" : activeSessions.filter((s) => !s.is_admin).length
          }
          icon={<AiOutlineTeam />}
          iconBg="bg-info-light"
          iconColor="text-info"
          trendLabel="of active conversations"
          trend={
            activeSessions.length > 0
              ? `${activeSessions.filter((s) => !s.is_admin).length}/${activeSessions.length}`
              : ""
          }
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-125">
        <div className="w-full lg:w-80 shrink-0">
          <ConversationsList
            selectedPhone={selectedPhone}
            onSelect={setSelectedPhone}
          />
        </div>
        <ChatPanel phoneNumber={selectedPhone} customerName={null} />
      </div>
    </div>
  );
};

export default BotLogs;
