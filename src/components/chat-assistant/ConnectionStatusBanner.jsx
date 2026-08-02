// ============================================================
// ConnectionStatusBanner — LIVE CONNECTION STATE STRIP
// ============================================================
// A thin colored strip shown at the top of the message area whenever
// the WebSocket isn't in a fully healthy "connected" state. Renders
// nothing at all when everything is fine, so it never adds visual
// clutter to a normal, working conversation.

import Spinner from "../ui/Spinner";
import cn from "../../utils/cn";

// Maps each non-"connected" connectionStatus value to the message
// text and background tone shown in the banner.
const BANNER_CONFIG = {
  connecting: {
    text: "Connecting to server...",
    tone: "bg-gray-800",
    showSpinner: true,
  },
  reconnecting: {
    text: "Reconnecting...",
    tone: "bg-warning",
    showSpinner: true,
  },
  disconnected: {
    text: "Disconnected — please refresh the page.",
    tone: "bg-danger",
    showSpinner: false,
  },
  expired: {
    text: "Your session has expired — please log in again.",
    tone: "bg-danger",
    showSpinner: false,
  },
  unauthorized: {
    text: "You don't have access to this assistant.",
    tone: "bg-danger",
    showSpinner: false,
  },
};

const ConnectionStatusBanner = ({ connectionStatus }) => {
  // Fully connected — nothing to warn the user about, render nothing.
  if (connectionStatus === "connected") return null;

  const config = BANNER_CONFIG[connectionStatus];
  if (!config) return null; // defensive fallback for any unrecognized status value

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-white text-xs font-medium py-1.5 px-3",
        config.tone,
      )}
    >
      {config.showSpinner && <Spinner size="sm" className="text-white" />}
      {config.text}
    </div>
  );
};

export default ConnectionStatusBanner;
