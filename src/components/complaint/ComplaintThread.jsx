// ============================================================
// COMPLAINT MESSAGE THREAD
// ============================================================
// Shared chat-style thread for a complaint, used by BOTH:
// - Customer's ComplaintDetail.jsx page
// - Admin's ComplaintDetailModal.jsx
//
// A complaint is now a running back-and-forth
// thread — either side can post as many messages as they need, in
// chronological order, and posting a message NEVER changes the
// complaint's status (status only changes via the separate, admin-only,
// explicit status control elsewhere on the page).
//
// currentRole — "customer" | "admin" — decides which side of the
// thread THIS viewer's own messages align to (always the right), so
// the same component reads correctly from either perspective.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BsSendFill } from "react-icons/bs";
import {
  getComplaintMessages,
  postComplaintMessage,
} from "../../api/complaints.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import Spinner from "../ui/Spinner";
import Button from "../ui/Button";
import { showError } from "../ui/Toast";

const ComplaintThread = ({ complaintId, currentRole }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  // =============================================
  // GET MESSAGES — GET /api/v1/complaints/{id}/messages/
  // =============================================
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.COMPLAINT_MESSAGES(complaintId),
    queryFn: ({ signal }) => getComplaintMessages(complaintId, signal),
    enabled: !!complaintId,
  });

  const messages = extractListData(data);

  // =============================================
  // POST MESSAGE — POST /api/v1/complaints/{id}/messages/
  // =============================================
  // Never touches the complaint's status — that stays exclusively on
  // the separate status control the parent page/modal renders.
  const sendMutation = useMutation({
    mutationFn: (message) => postComplaintMessage(complaintId, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.COMPLAINT_MESSAGES(complaintId),
      });
      setDraft("");
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message || "Failed to send your message.",
      );
    },
  });

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Thread */}
      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No messages yet — start the conversation below.
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender === currentRole;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    isOwn
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-[11px] text-gray-400 mt-1 px-1">
                  {msg.sender === "admin" ? "Support Team" : "You"} &middot;{" "}
                  {formatDate(msg.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-gray-100 pt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter inserts a newline — standard chat
            // input behavior, matches what people expect from a thread.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a reply..."
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        <Button
          onClick={handleSend}
          isLoading={sendMutation.isPending}
          disabled={!draft.trim()}
          leftIcon={<BsSendFill className="w-3.5 h-3.5" />}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default ComplaintThread;
