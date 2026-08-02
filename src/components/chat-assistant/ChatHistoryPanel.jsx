import { useState, useMemo } from "react";
import {
  AiOutlineSearch,
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineMessage,
} from "react-icons/ai";

import groupChatSessionsByDate from "../../utils/groupChatSessionsByDate";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import cn from "../../utils/cn";

const ChatHistoryPanel = ({
  sessions,
  isLoading,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  // "light" = original white-background look used inside the small
  // floating widget. "dark" = high-contrast look used when this same
  // panel is reused inside the dark admin full-page sidebar, so text,
  // borders, and hover states stay readable on the dark gradient
  // background instead of looking like a stray white box.
  // DEFAULT CHANGED TO "dark": per the latest requirement, the
  // customer chat sidebar must now look exactly the same as the admin
  // one (same dark theme for both), instead of admin being dark and
  // customer being light. Both ChatFullPageLayout.jsx and
  // ChatWidget.jsx now explicitly pass variant="dark" too, but the
  // default is flipped here as well so this panel is dark everywhere
  // it's used, even if a future caller forgets to pass the prop.
  variant = "dark",
}) => {
  // Text currently typed into the "Search conversations..." box.
  const [searchQuery, setSearchQuery] = useState("");
  const isDark = variant === "dark";

  // Filters sessions by title/preview text before grouping, recalculated
  // only when the underlying sessions list or the search text changes.
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.title.toLowerCase().includes(query) ||
        session.preview.toLowerCase().includes(query),
    );
  }, [sessions, searchQuery]);

  // Groups the filtered sessions into the single "Recents" bucket
  // (see groupChatSessionsByDate.js for why it's still an object).
  const groupedSessions = useMemo(
    () => groupChatSessionsByDate(filteredSessions),
    [filteredSessions],
  );

  // CHANGED PER LATEST REQUIREMENT: each row used to show a clock
  // TIME (e.g. "14:20"), which only made sense back when sessions were
  // grouped separately under "Today". Now that every session sits
  // together under one "Recents" heading, a time alone is confusing
  // (you can't tell if "14:20" was today or three weeks ago) — so this
  // now formats and returns a short DATE instead (e.g. "01 Aug").
  // CHANGED PER LATEST REQUIREMENT: the year must always be shown next
  // to the day + month (e.g. "01 Aug 2026"), not only when the session
  // is from a previous calendar year. Previously the year was left out
  // for rows from the current year, which made it harder to tell at a
  // glance exactly which year an entry belonged to.
  const formatSessionDate = (isoString) => {
    const date = new Date(isoString);

    // Day + short month name + full year, always — e.g. "01 Aug 2026".
    const dateFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };

    return date.toLocaleDateString([], dateFormatOptions);
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "p-4 flex flex-col gap-3 border-b",
          // Dark variant gets a low-opacity white border instead of the
          // light-mode gray-100 border, so it stays visible against the
          // dark admin sidebar gradient.
          isDark ? "border-white/8" : "border-gray-100",
        )}
      >
        {/* Search box */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2",
            isDark ? "bg-white/10" : "bg-gray-100",
          )}
        >
          <AiOutlineSearch
            className={cn(
              "w-4 h-4 shrink-0",
              isDark ? "text-white/40" : "text-gray-400",
            )}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations..."
            className={cn(
              "bg-transparent outline-none text-sm flex-1",
              isDark
                ? "text-white placeholder:text-white/40"
                : "placeholder:text-gray-400",
            )}
          />
        </div>

        {/* New Chat button */}
        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full py-2 rounded-lg",
            "border border-dashed border-primary text-primary text-sm font-semibold",
            "transition-colors",
            isDark ? "hover:bg-primary/10" : "hover:bg-primary-50",
          )}
        >
          <AiOutlinePlus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Scrollable, grouped session list — "scrollbar-hide" is the
          shared utility class defined once in index.css (used
          elsewhere in the app, e.g. category pill rows) so the list
          keeps scrolling normally but never shows a visible
          scrollbar track/thumb, matching the rest of the product. */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : filteredSessions.length === 0 ? (
          isDark ? (
            // EmptyState's icon/title/description colors are hardcoded
            // for a light background (text-gray-300/700), so on the
            // dark admin sidebar they'd be nearly invisible. A small
            // dedicated dark-mode message is used here instead, kept
            // visually simple to match the rest of this dark sidebar.
            <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
              <AiOutlineMessage className="w-8 h-8 text-white/20" />
              <p className="text-sm font-semibold text-white/70">
                No conversations yet
              </p>
              <p className="text-xs text-white/40">
                Start a new chat to begin.
              </p>
            </div>
          ) : (
            // "noChats" is one of EmptyState's built-in variants, already
            // defined in ui/EmptyState.jsx — reused here instead of
            // passing a custom title/description, for full consistency
            // with every other empty state in the app.
            <EmptyState variant="noChats" />
          )
        ) : (
          Object.entries(groupedSessions).map(([groupLabel, groupSessions]) => {
            // Skips rendering a section header entirely for empty
            // buckets (won't normally happen now there's only one
            // "Recents" bucket, but kept as a safe guard).
            if (groupSessions.length === 0) return null;

            return (
              <div key={groupLabel} className="mb-3">
                <p
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wide px-2 mb-1.5",
                    isDark ? "text-white/35" : "text-gray-400",
                  )}
                >
                  {groupLabel}
                </p>

                {groupSessions.map((session) => (
                  <div
                    key={session.sessionKey}
                    onClick={() => onSelectSession(session.sessionKey)}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group flex items-start gap-2.5 px-2 py-2.5 rounded-lg cursor-pointer transition-colors",
                      isDark ? "hover:bg-white/6" : "hover:bg-gray-50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        isDark ? "bg-white/10" : "bg-primary-50",
                      )}
                    >
                      <AiOutlineMessage
                        className={cn(
                          "w-4 h-4",
                          isDark ? "text-primary-light" : "text-primary",
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          isDark ? "text-white" : "text-gray-800",
                        )}
                      >
                        {session.title}
                      </p>
                      <p
                        className={cn(
                          "text-xs truncate",
                          isDark ? "text-white/40" : "text-gray-400",
                        )}
                      >
                        {session.preview}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={cn(
                          "text-[11px]",
                          isDark ? "text-white/35" : "text-gray-400",
                        )}
                      >
                        {formatSessionDate(session.updatedAt)}
                      </span>

                      {/* Delete button — only visually appears on hover
                          (via the "group" utility above), keeping the
                          resting list visually clean. */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation(); // prevents this click from also opening the session
                          onDeleteSession(session.sessionKey);
                        }}
                        aria-label="Delete conversation"
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          isDark
                            ? "text-white/25 hover:text-danger"
                            : "text-gray-300 hover:text-danger",
                        )}
                      >
                        <AiOutlineDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatHistoryPanel;
