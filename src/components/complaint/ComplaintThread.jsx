// COMPLAINT MESSAGE THREAD
// ============================================================
// Shared chat-style thread for a complaint, used by BOTH:
// - Customer's ComplaintDetail.jsx page
// - Admin's ComplaintDetailModal.jsx
//
// A complaint is a running back-and-forth thread — either side can
// post as many messages as they need, in chronological order, and
// posting a message NEVER changes the complaint's status (status
// only changes via the separate, admin-only, explicit status control
// elsewhere on the page).
//
// currentRole — "customer" | "admin" — decides which side of the
// thread THIS viewer's own messages align to (always the right), so
// the same component reads correctly from either perspective.
//
// otherPartyName — optional fallback display name for the OTHER side
// of the conversation, used only on a message that doesn't carry its
// own sender_name (see the per-message lookup below).

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BsArrowUpShort } from "react-icons/bs";
import {
  getComplaintMessages,
  postComplaintMessage,
} from "../../api/complaints.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import {
  getDateDividerLabel,
  formatMessageTime,
} from "../../utils/formatChatTimestamp";
import Spinner from "../ui/Spinner";
import Avatar from "../ui/Avatar";
import { showError } from "../ui/Toast";

const ComplaintThread = ({ complaintId, currentRole, otherPartyName }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  // Ref to an empty marker element placed after the last message —
  // scrolling this into view is what keeps the thread pinned to the
  // newest message, the same way a real chat app behaves.
  const bottomRef = useRef(null);

  // =============================================
  // GET MESSAGES — GET /api/v1/complaints/{id}/messages/
  // =============================================
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.COMPLAINT_MESSAGES(complaintId),
    queryFn: ({ signal }) => getComplaintMessages(complaintId, signal),
    enabled: !!complaintId,
  });

  const messages = extractListData(data);

  // Keeps the thread scrolled to the bottom whenever the number of
  // messages changes — covers both the initial load and every new
  // message sent or received afterward.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  // Fallback label/avatar name for a bubble that ISN'T the current
  // viewer's own message, used only when a particular message
  // doesn't carry its own sender_name. Admins see the real customer
  // name once the customer profile has loaded (falling back to
  // "Customer" while it's still loading); customers see "Support
  // Team", since a complaint may be handled by more than one admin.
  const fallbackOtherLabel =
    currentRole === "admin" ? otherPartyName || "Customer" : "Support Team";

  // Tracks the calendar day of the previously rendered message so a
  // divider chip is only inserted the first time a new day appears,
  // not before every single message.
  let lastDateKey = null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* ================================================================
          THREAD — scrollable chat panel. Given its own soft background
          here (rather than relying on whatever card wraps it) so the
          conversation reads identically on both the customer page and
          the admin modal, the way a chat surface should.
          ================================================================ */}
      <div className="flex flex-col gap-1 max-h-[22rem] sm:max-h-[28rem] overflow-y-auto rounded-2xl bg-gray-50/80 p-2.5 sm:p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No messages yet — start the conversation below.
          </p>
        ) : (
          <>
            {messages.map((msg) => {
              // isOwn decides which side of the thread this bubble sits
              // on — always the right for whichever role is currently
              // viewing the thread, regardless of who actually sent it.
              //
              // IMPORTANT: the API's "sender" field is the numeric id
              // of whoever posted the message (e.g. 88), NOT a role
              // string — "sender_role" is the actual "customer" |
              // "admin" value this comparison needs (see API 72.1,
              // Complaint Messages Thread — Corrected).
              const isOwn = msg.sender_role === currentRole;

              // Prefer the real name the backend sends with each
              // message (sender_name — e.g. "Test Admin 2") so, on a
              // complaint handled by more than one admin, the
              // customer can see exactly who they're talking to on
              // each individual reply. Only falls back to a generic
              // label if a particular message is missing that field.
              const otherName = msg.sender_name || fallbackOtherLabel;

              // Insert a centered date divider the first time a new
              // calendar day is reached while walking through the
              // (chronologically ordered) messages.
              const dateKey = new Date(msg.created_at).toDateString();
              const showDivider = dateKey !== lastDateKey;
              lastDateKey = dateKey;

              return (
                <div key={msg.id} className="flex flex-col">
                  {showDivider && (
                    <div className="flex justify-center my-1.5">
                      <span className="text-[10px] font-medium text-gray-500 bg-white px-2.5 py-0.5 rounded-full shadow-sm">
                        {getDateDividerLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Entrance animation — a small, deliberate lift-in
                      on each bubble as it mounts, matching the kind of
                      one-moment motion used elsewhere in this module. */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`flex items-end gap-1.5 ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Small avatar on the OTHER party's messages only —
                        own messages sit flush to the right without one,
                        which keeps the own side of the thread compact. */}
                    {!isOwn && (
                      <Avatar name={otherName} size="sm" className="mb-3.5" />
                    )}

                    <div
                      className={`flex flex-col max-w-[78%] sm:max-w-[65%] ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      {!isOwn && (
                        <span className="text-[10px] font-semibold text-gray-400 mb-0.5 px-1">
                          {otherName}
                        </span>
                      )}

                      <div
                        className={`rounded-2xl px-3 py-1.5 shadow-sm ${
                          isOwn
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-[13px] leading-snug whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <p
                          className={`text-[9px] mt-0.5 text-right ${
                            isOwn ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
            {/* Empty marker scrolled into view on every new message —
                see the bottomRef effect above. */}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ================================================================
          COMPOSER — a compact pill input with a circular icon-only
          send button, matching the density of a modern chat app
          rather than a full form-style textarea + labeled button.
          ================================================================ */}
      <div className="flex items-center gap-2">
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
          rows={1}
          className="flex-1 min-w-0 resize-none rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sendMutation.isPending}
          aria-label="Send message"
          className="shrink-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary-dark active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          {sendMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <BsArrowUpShort className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ComplaintThread;
