import { BsClockHistory, BsShop } from "react-icons/bs";
import {
  AiOutlinePlus,
  AiOutlineClose,
  AiOutlineArrowLeft,
} from "react-icons/ai";
import { HiSparkles } from "react-icons/hi2";
import { MdOutlineOpenInFull } from "react-icons/md";
// MdOutlineOpenInFull — "expand to full page" icon. Pairs with
// MdOutlineCloseFullscreen (the "collapse back to widget" icon already
// used on ChatFullPageLayout.jsx), so expanding and collapsing the
// chat use two icons from the same visual family.

import cn from "../../utils/cn";

// Maps every possible connectionStatus value to the dot color and the
// text shown next to the assistant's name — kept in one place so the
// header's status display always stays in sync with every state the
// WebSocket hook can report.
const STATUS_DISPLAY = {
  connecting: { label: "Connecting...", dotClass: "bg-warning animate-pulse" },
  connected: { label: "Online", dotClass: "bg-success" },
  reconnecting: {
    label: "Reconnecting...",
    dotClass: "bg-warning animate-pulse",
  },
  disconnected: { label: "Offline", dotClass: "bg-gray-300" },
  expired: { label: "Session expired", dotClass: "bg-danger" },
  unauthorized: { label: "Unauthorized", dotClass: "bg-danger" },
};

const ChatHeader = ({
  role, // "customer" | "admin" — decides the title text and icon
  viewMode, // "compact" | "history" — decides which header layout to show
  connectionStatus,
  showHistory = true, // false for guest customers, who have no session list to view
  onOpenHistory,
  onBackFromHistory,
  onNewChat,
  onExpand, // opens this same conversation in the full-page /chat or /admin/chat view
  onClose,
}) => {
  const status =
    STATUS_DISPLAY[connectionStatus] || STATUS_DISPLAY.disconnected;
  const title = role === "admin" ? "Store Assistant" : "Zyron AI";

  // --------------------------------------------------
  // HISTORY MODE HEADER
  // --------------------------------------------------
  if (viewMode === "history") {
    return (
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
        <button
          type="button"
          onClick={onBackFromHistory}
          aria-label="Back to chat"
          className="text-gray-500 hover:text-gray-800 transition-colors"
        >
          <AiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-gray-800">Chat History</h2>
      </div>
    );
  }

  // --------------------------------------------------
  // NORMAL MODE HEADER
  // --------------------------------------------------
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-t-2xl
        bg-linear-to-r from-primary to-primary-dark"
      // Emerald gradient header, matching the brand tokens exactly
      // (--color-primary -> --color-primary-dark)
    >
      <div className="flex items-center gap-2.5">
        {/* Small circular avatar — sparkle for the customer assistant,
            a storefront icon for the admin/store-ops assistant, so
            the two are visually distinguishable at a glance. */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          {role === "admin" ? (
            <BsShop className="w-4 h-4 text-white" />
          ) : (
            <HiSparkles className="w-4 h-4 text-white" />
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-white leading-tight">{title}</p>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", status.dotClass)} />
            <span className="text-[11px] text-white/85">{status.label}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Expand-to-full-page icon — takes the user straight to the
            dedicated /chat (customer) or /admin/chat (admin) route
            with this exact conversation already loaded, instead of
            waiting for the automatic long-conversation expand to kick
            in. Always shown in normal mode, for both roles. */}
        <button
          type="button"
          onClick={onExpand}
          aria-label="Open full-page chat"
          className="text-white/85 hover:text-white transition-colors"
        >
          <MdOutlineOpenInFull className="w-4 h-4" />
        </button>

        {/* History icon — only rendered when this widget instance is
            allowed to show history (hidden for guest customers). */}
        {showHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Chat history"
            className="text-white/85 hover:text-white transition-colors"
          >
            <BsClockHistory className="w-4.5 h-4.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Start new chat"
          className="text-white/85 hover:text-white transition-colors"
        >
          <AiOutlinePlus className="w-4.5 h-4.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize chat"
          className="text-white/85 hover:text-white transition-colors"
        >
          <AiOutlineClose className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
