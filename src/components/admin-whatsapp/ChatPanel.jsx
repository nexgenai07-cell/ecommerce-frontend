// ============================================================
// ChatPanel — BOT LOGS SUB-COMPONENT
// ============================================================
// Real message thread from API 93 (WhatsApp Logs), filtered to one
// phone number. Bubble side is decided by the real `direction` field
// (incoming = customer, left; outgoing = bot/admin, right). The
// outgoing label ("AI Assistant" vs "Admin") is inferred from the
// session's real `is_admin` flag — there's no per-message
// sent-by-whom field, only this session-level signal.
//
// The reply box is REAL — it calls API 92 (Send WhatsApp Message)
// directly, so an admin can genuinely message this customer from here.
//
// "Export Log" is REAL too — it builds a CSV client-side from the
// messages already loaded on screen (see utils/downloadCsv.js), not a
// backend export call (no matching export endpoint exists for
// WhatsApp data specifically).

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineDownload, AiOutlineSend } from "react-icons/ai";

import {
  getWhatsAppLogs,
  getWhatsAppSessions,
  sendWhatsAppMessage,
} from "../../api/whatsapp.api";
import { WHATSAPP_DIRECTION } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import downloadCsv from "../../utils/downloadCsv";
import { showSuccess, showError } from "../ui/Toast";
import Avatar from "../ui/Avatar";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Spinner from "../ui/Spinner";

const ChatPanel = ({ phoneNumber, customerName }) => {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ["whatsappBotLogs", "thread", phoneNumber],
    queryFn: ({ signal }) => getWhatsAppLogs({ phone_number: phoneNumber }, signal),
    enabled: !!phoneNumber,
  });
  const messages = extractListData(logsResponse).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );

  // Used only to decide the outgoing-message label — is THIS
  // conversation currently being handled by a human admin, or the bot?
  const { data: sessionsResponse } = useQuery({
    queryKey: ["whatsappBotLogs", "sessions"],
    queryFn: ({ signal }) => getWhatsAppSessions(signal),
  });
  const session = extractListData(sessionsResponse).find(
    (s) => s.phone_number === phoneNumber,
  );
  const outgoingLabel = session?.is_admin ? "Admin" : "AI Assistant";

  const sendMutation = useMutation({
    mutationFn: () =>
      sendWhatsAppMessage({ phone_number: phoneNumber, message: replyText }),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({
        queryKey: ["whatsappBotLogs", "thread", phoneNumber],
      });
    },
    onError: () => showError("Failed to send message."),
  });

  const handleExport = () => {
    if (messages.length === 0) {
      showError("No messages to export yet.");
      return;
    }
    downloadCsv(
      messages.map((m) => ({
        direction: m.direction,
        message: m.message,
        date: formatDate(m.created_at),
      })),
      [
        { key: "direction", label: "Direction" },
        { key: "message", label: "Message" },
        { key: "date", label: "Date" },
      ],
      `whatsapp-log-${phoneNumber}`,
    );
    showSuccess("Log exported.");
  };

  if (!phoneNumber) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">
          Select a conversation to view messages.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar name={customerName || phoneNumber} size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {customerName || phoneNumber}
            </p>
            {session && <p className="text-xs text-success">● Active Now</p>}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary"
        >
          <AiOutlineDownload className="w-4 h-4" />
          Export Log
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No messages yet with this number.
          </p>
        ) : (
          messages.map((message) => {
            const isOutgoing =
              message.direction === WHATSAPP_DIRECTION.OUTGOING;
            return (
              <div
                key={message.id}
                className={`max-w-[75%] flex flex-col gap-1 ${isOutgoing ? "self-end items-end" : "self-start items-start"}`}
              >
                {isOutgoing && (
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                    {outgoingLabel}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    isOutgoing
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {message.message}
                </div>
                <span className="text-[10px] text-gray-300">
                  {formatDate(message.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Reply box — real, calls API 92 */}
      <div className="p-3 border-t border-gray-100 flex items-center gap-2">
        <Input
          placeholder="Type a reply..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && replyText.trim()) {
              sendMutation.mutate();
            }
          }}
        />
        <Button
          variant="primary"
          onClick={() => sendMutation.mutate()}
          isLoading={sendMutation.isPending}
          disabled={!replyText.trim()}
        >
          <AiOutlineSend className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatPanel;
