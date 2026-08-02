// ============================================================
// ChatIcon — FLOATING ENTRY POINT (STATE 01)
// ============================================================
// The collapsed circular button fixed to the bottom-right corner of
// every page. Clicking it opens the compact chat panel. Shows a small
// red badge with the unread AI-message count when the widget has been
// minimized while new messages arrived.

import { HiSparkles } from "react-icons/hi2";
// Sparkle icon — visually signals "AI assistant" at a glance, matches
// the sparkle motif used throughout the approved UI designs.

import cn from "../../utils/cn";
// Merges Tailwind class strings and resolves conflicts cleanly.

const ChatIcon = ({ unreadCount = 0, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open chat assistant"
      // Screen readers announce this button's purpose even though it
      // has no visible text label — required for accessibility (this
      // is one of the icon-only controls in the widget).
      className={cn(
        "fixed bottom-6 right-6 z-modal", // fixed to bottom-right, 24px margin, sits above normal page content
        "w-14 h-14 rounded-full", // 56px circular button
        "bg-linear-to-br from-primary to-primary-dark", // emerald gradient matching the project's brand tokens
        "shadow-lg hover:shadow-xl", // soft elevation, slightly stronger on hover
        "flex items-center justify-center", // centers the sparkle icon perfectly
        "transition-all duration-150 hover:scale-105 active:scale-95", // subtle press/hover feedback
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2", // accessible keyboard focus ring
      )}
    >
      {/* The sparkle icon itself, white so it stands out against the green gradient */}
      <HiSparkles className="w-6 h-6 text-white" />

      {/* Unread badge — only rendered when there's actually something unread,
          so it doesn't show an empty red circle at zero. */}
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1", // sits on the top-right edge of the circular button
            "min-w-5 h-5 px-1", // small pill, grows slightly wider for 2-digit counts
            "bg-danger text-white text-xs font-bold", // red badge, matches --color-danger token
            "rounded-full flex items-center justify-center",
            "border-2 border-white", // white ring separates the badge from the green icon behind it
          )}
        >
          {/* Caps the displayed number at "9+" so the badge never grows unreadably wide */}
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default ChatIcon;
