import { useState } from "react";
// useLocation reads the current route/URL and any state passed to it;
// useNavigate lets us programmatically redirect the user to another route.
import { useLocation, useNavigate } from "react-router-dom";
// Icon components from react-icons: delete icon, hamburger menu icon,
// and close (X) icon, all from the "ai" (Ant Design) icon set.
import { AiOutlineDelete, AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
// Icon used for the "collapse to widget" button, from the "md" (Material
// Design) icon set.
import { MdOutlineCloseFullscreen } from "react-icons/md";

// App-wide route path constants (e.g. "/", "/admin/dashboard"), so we
// don't hardcode URL strings directly in this file.
import { ROUTES } from "../../constants/routes";
// Renders a single chat message (from either the user or the assistant).
import MessageBubble from "./MessageBubble";
// The text/voice/attachment composer bar fixed at the bottom of the chat.
import ChatInput from "./ChatInput";
// Small animated "assistant is typing..." indicator shown while waiting
// for a reply.
import TypingIndicator from "./TypingIndicator";
// Banner shown at the top of the chat when the WebSocket connection is
// reconnecting/disconnected/etc.
import ConnectionStatusBanner from "./ConnectionStatusBanner";
// The "New Chat" button + search box + scrollable list of past
// conversations. This is the SAME component already used inside the
// small floating chat widget, reused here so the full-page sidebar shows
// real chat history for both the admin and customer variants.
import ChatHistoryPanel from "./ChatHistoryPanel";
// Small utility for conditionally combining Tailwind class names.
import cn from "../../utils/cn";

// ChatFullPageLayout — the full-page (non-widget) version of the chat UI,
// used on the dedicated /chat and /admin/chat routes. Renders a sidebar
// (chat history) next to a larger main chat area, instead of the small
// floating widget seen elsewhere in the app.
const ChatFullPageLayout = ({
  role, // Which role is chatting: "customer" | "admin" — controls theming/copy differences below.
  sessionKey, // The identifier of the currently open conversation, used when deleting it.
  messages, // Array of chat messages to render in the main chat area.
  isTyping, // True while the assistant is still generating/sending its reply to the last message.
  connectionStatus, // Current WebSocket state (e.g. "connected", "reconnecting", "disconnected").
  onSend, // Callback fired when the user sends a new message from the ChatInput composer.
  onSuggestionClick, // Callback fired when the user taps a suggested quick-reply chip inside a message.
  onFeedback, // Callback fired when the user gives thumbs up/down feedback on a message.
  onAddToCart, // Callback fired when the user adds a product (shown inside a message) to their cart.
  onDeleteConversation, // Callback that deletes a given conversation by its session key.
  // ---- chat-history sidebar props ----
  historySessions, // Array of past conversations for the current role, sourced from Redux via useChat().
  isHistoryLoading, // True while historySessions is still being fetched from the server.
  onNewChat, // Starts a brand-new conversation and immediately shows it in the main area.
  onSelectSession, // Loads a previously saved conversation (by session key) into the main chat area.
}) => {
  // Hook that lets us push the user to a different route (used by the
  // "collapse to widget" button below).
  const navigate = useNavigate();
  // Hook that gives us the current route, including any state object
  // that was passed in when navigating here (used to know where to
  // return the user when they collapse back to the widget).
  const location = useLocation();

  // Tracks whether the mobile sidebar overlay is currently open. Starts
  // closed, since on a small screen the 240px-wide sidebar would
  // otherwise eat most of the available width for the conversation.
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Simple boolean flag derived from the "role" prop, used repeatedly
  // below to branch styling/copy between the admin and customer views.
  const isAdmin = role === "admin";

  // Determines which page "Collapse to widget" should send the user
  // back to. Prefers the page they were on right before auto-expanding
  // into full-page mode (passed via route state from ChatWidget.jsx).
  // Falls back to a sensible default (admin dashboard or the home page)
  // if that state is missing — e.g. if someone opened /chat directly
  // from a bookmark, with no prior page in this browser session.
  const collapseDestination =
    location.state?.from || (isAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME);

  // Handler wired to the "collapse to widget" button — simply navigates
  // to the destination computed above.
  const handleCollapse = () => navigate(collapseDestination);

  return (
    // Outer wrapper: fills the full height/width of its parent, lays
    // the sidebar and main chat area out side-by-side (flex row), and
    // clips anything that overflows (e.g. the sliding mobile sidebar).
    <div className="flex h-full w-full bg-surface-secondary overflow-hidden">
      {/* ---------------- MOBILE SIDEBAR OVERLAY ---------------- */}
      {/* Semi-transparent dark backdrop shown behind the sidebar on
          small screens, only while the mobile drawer is open. Clicking
          it closes the drawer. Hidden entirely on "md" screens and up,
          since the sidebar is always visible there instead of sliding
          in as an overlay. */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-drawer md:hidden"
        />
      )}

      {/* ---------------- SIDEBAR ---------------- */}
      {/* The <aside> itself has no inner padding — the logo row below
          carries its own top/side padding, and ChatHistoryPanel manages
          its own padding for its header and scrollable list, so the
          list can sit flush against the sidebar's edges. */}
      <aside
        className={cn(
          // Fixed width, never shrinks, lays its children out in a
          // vertical column, and animates any transform changes
          // smoothly (used for the mobile slide-in/out effect).
          "w-64 shrink-0 flex flex-col transition-transform duration-300",
          // On mobile: positioned fixed and pinned to the left edge,
          // sitting above other content (z-modal). From "md" upward it
          // becomes a normal in-flow (static) element with no transform,
          // since it's always visible there rather than sliding in.
          "fixed inset-y-0 left-0 z-modal md:static md:translate-x-0",
          // On mobile, slides fully into view when open, or fully off
          // the left edge of the screen (-translate-x-full) when closed.
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
          // Dark gradient background (matches AdminSidebar.jsx's
          // colors) used for BOTH the admin and customer roles now, so
          // the sidebar always looks identical regardless of who's
          // chatting — plus a very faint 4%-opacity white right border
          // to subtly separate it from the main chat area.
          "bg-linear-to-b from-[#0f2133] to-[#0a1622] border-r border-white/4",
        )}
      >
        {/* Logo row — top branding strip, plus the mobile-only close (X)
            button that dismisses the sidebar drawer. */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Small square gradient badge behind the "Z" letter mark. */}
            <span className="w-7 h-7 rounded-lg bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">Z</span>
            </span>
            {/* Brand name text — always white, since the sidebar
                background is always the dark gradient for both roles. */}
            <span className="font-bold text-sm text-white">Zyron</span>
          </div>

          {/* Close button — only meaningful on mobile (hidden from
              "md" upward via "md:hidden"), closes the sliding drawer. */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden text-white/60"
            aria-label="Close menu"
          >
            <AiOutlineClose className="w-5 h-5" />
          </button>
        </div>

        {/* Wrapper around the history panel. "flex-1" lets it grow to
            fill the remaining sidebar height, and "min-h-0" is required
            so this flex child can actually shrink below its natural
            content size — without it, the panel's own internal list
            couldn't scroll and would instead push the whole sidebar
            taller than the viewport. */}
        <div className="flex-1 min-h-0">
          <ChatHistoryPanel
            sessions={historySessions}
            isLoading={isHistoryLoading}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteConversation}
            onNewChat={onNewChat}
            // Always renders in its dark color variant here, matching
            // the always-dark gradient background above for both roles.
            variant="dark"
          />
        </div>
      </aside>

      {/* ---------------- MAIN CHAT AREA ---------------- */}
      {/* "min-w-0" is important on a flex child containing text that
          might overflow — without it, long unbroken text could force
          this column wider than intended instead of truncating/wrapping. */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: hamburger (mobile), assistant name, and the
            delete-conversation / collapse-to-widget action buttons. */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button — mobile only ("md:hidden"), opens the
                sidebar drawer defined above. */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden text-gray-500 shrink-0"
              aria-label="Open menu"
            >
              <AiOutlineMenu className="w-5 h-5" />
            </button>

            {/* Assistant's display name — differs by role. "truncate"
                keeps it on one line, ellipsizing if space is tight. */}
            <p className="text-sm font-semibold text-primary truncate">
              {isAdmin ? "Store Assistant" : "Zyron AI"}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Deletes the current conversation — only fires if a
                sessionKey actually exists (guards against deleting
                before any conversation has been created/loaded). */}
            <button
              type="button"
              onClick={() => sessionKey && onDeleteConversation(sessionKey)}
              aria-label="Delete this conversation"
              className="text-gray-400 hover:text-danger transition-colors"
            >
              <AiOutlineDelete className="w-4.5 h-4.5" />
            </button>
            {/* Collapses this full-page view back down into the small
                floating widget, by navigating to collapseDestination. */}
            <button
              type="button"
              onClick={handleCollapse}
              aria-label="Collapse to widget"
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <MdOutlineCloseFullscreen className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Shows a banner (e.g. "Reconnecting...") whenever the
            WebSocket connection isn't in its normal "connected" state. */}
        <ConnectionStatusBanner connectionStatus={connectionStatus} />

        {/* Scrollable message list. "flex-1" lets it fill all the
            remaining vertical space between the top bar and the
            composer below. */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 flex flex-col gap-4">
          {/* Renders one MessageBubble per message in the conversation,
              wiring up suggestion-chip clicks, feedback, and
              add-to-cart actions for each bubble. */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSuggestionClick={onSuggestionClick}
              onFeedback={onFeedback}
              onAddToCart={onAddToCart}
              isAdmin={isAdmin}
            />
          ))}
          {/* Shows the animated "typing..." indicator directly below
              the last message while the assistant is still replying. */}
          {isTyping && <TypingIndicator />}
        </div>

        {/* Composer wrapper — centers the input bar and caps its width
            on wide screens so it doesn't stretch edge-to-edge. */}
        <div className="max-w-3xl w-full mx-auto px-4 pb-4">
          <ChatInput
            onSend={onSend}
            connectionStatus={connectionStatus}
            // Passed through so ChatInput can block sending (send
            // button + Enter key) while the assistant is still
            // responding to the previous message, without locking the
            // text field itself.
            isTyping={isTyping}
            // Placeholder text differs between the admin and customer
            // experience, since admins issue commands rather than ask
            // shopping questions.
            placeholder={
              isAdmin
                ? "Type a command..."
                : "Ask follow up questions about these products..."
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ChatFullPageLayout;
