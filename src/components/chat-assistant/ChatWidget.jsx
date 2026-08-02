import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import useChat from "../../hooks/useChat";
import { useChatActions } from "./ChatProvider";
import { ROUTES } from "../../constants/routes";
import Spinner from "../ui/Spinner";

import ChatIcon from "./ChatIcon";
import ChatHeader from "./ChatHeader";
import ChatHistoryPanel from "./ChatHistoryPanel";
import ChatInput from "./ChatInput";
import ConnectionStatusBanner from "./ConnectionStatusBanner";
import MessageBubble from "./MessageBubble";
import SuggestionChips from "./SuggestionChips";
import TypingIndicator from "./TypingIndicator";

// After how many messages (in the compact widget view) the widget
// auto-expands itself into the full-page /chat route.
const AUTO_EXPAND_MESSAGE_THRESHOLD = 6;

const ChatWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isOpen,
    viewMode,
    role,
    messages,
    initialSuggestions,
    isTyping,
    connectionStatus,
    hasAutoExpanded,
    historySessions,
    isHistoryLoading,
    unreadCount,
    handleOpenChat,
    handleCloseChat,
    handleSetViewMode,
    handleSetHasAutoExpanded,
  } = useChat();

  const {
    isGuest,
    isInitializing,
    sendMessage,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    handleFeedback,
    handleAddToCart,
  } = useChatActions();

  // Ref to the invisible div at the bottom of the message list, used
  // purely as a scroll target so new messages auto-scroll into view.
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-expands the compact widget into the full-page chat route once
  // the conversation gets long enough or a reply includes product
  // cards — a cramped 380px-wide widget isn't a good place to browse
  // several product results.
  useEffect(() => {
    if (hasAutoExpanded) return;
    if (viewMode !== "compact") return;
    if (!isOpen) return;

    const lastMessage = messages[messages.length - 1];
    const hasProductsInLastMessage = Boolean(
      lastMessage?.metadata?.products?.length,
    );
    const isLongConversation = messages.length >= AUTO_EXPAND_MESSAGE_THRESHOLD;

    if (hasProductsInLastMessage || isLongConversation) {
      handleSetHasAutoExpanded(true);
      navigate(role === "admin" ? ROUTES.ADMIN_CHAT : ROUTES.CHAT, {
        state: { from: location.pathname },
      });
    }
  }, [
    messages,
    viewMode,
    isOpen,
    hasAutoExpanded,
    role,
    navigate,
    location.pathname,
    handleSetHasAutoExpanded,
  ]);

  // --------------------------------------------------
  // HANDLER: open the chat-history panel
  // --------------------------------------------------
  // FINAL AGREED BEHAVIOUR: this used to also call handleLoadHistoryList()
  // every time the History icon was clicked. That's been removed — the
  // list is now only ever refreshed at exactly two moments, handled
  // centrally inside ChatProvider.jsx: on page load/refresh, and when a
  // new chat is opened. Clicking the History icon now just SWITCHES the
  // view to show whatever list is already sitting in Redux state.
  const handleOpenHistory = () => {
    handleSetViewMode("history");
  };

  // --------------------------------------------------
  // HANDLER: pick a past session, then return to the normal view
  // --------------------------------------------------
  const handlePickSession = async (key) => {
    await handleSelectSession(key);
    handleSetViewMode("compact");
  };

  // --------------------------------------------------
  // FIXED HANDLER: start a new chat, then ALWAYS return to the normal
  // "compact" conversation view — this is the actual bug fix. Used by
  // BOTH the header's "+" icon (where viewMode was already "compact",
  // so this was invisible) and the history panel's "+ New Chat"
  // button (where viewMode was "history", so the fresh empty
  // conversation never became visible without this).
  // --------------------------------------------------
  const handleStartNewChatAndShow = async () => {
    await handleNewChat();
    handleSetViewMode("compact");
  };

  // --------------------------------------------------
  // HANDLER: manually expand the widget into the full-page chat route
  // --------------------------------------------------
  // Triggered by the new "expand" icon in ChatHeader.jsx. Marks
  // hasAutoExpanded as true first, so the automatic long-conversation
  // effect above doesn't also try to navigate a second time right
  // after this manual one — then navigates to the same route the
  // auto-expand effect uses, carrying the current page in route state
  // so the full page's "collapse" button knows where to return to.
  const handleExpandToFullPage = () => {
    handleSetHasAutoExpanded(true);
    navigate(role === "admin" ? ROUTES.ADMIN_CHAT : ROUTES.CHAT, {
      state: { from: location.pathname },
    });
  };

  // Widget is collapsed — just render the small floating launcher icon.
  if (!isOpen) {
    return <ChatIcon unreadCount={unreadCount} onClick={handleOpenChat} />;
  }

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-modal w-95 h-140
        max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl
        flex flex-col overflow-hidden"
      // RESPONSIVE FIX: bottom/right offset is now smaller on phones
      // (bottom-4/right-4 = 16px) and only widens to the original 24px
      // (bottom-6/right-6) from the "sm" breakpoint up. On very small
      // phones the extra 8px on each side previously ate noticeably
      // into the already-tight max-w-[calc(100vw-2rem)] width, making
      // the panel feel cramped — this gives it a little more breathing
      // room on the smallest screens without changing anything on
      // tablet/desktop.
    >
      <ChatHeader
        role={role}
        viewMode={viewMode}
        connectionStatus={connectionStatus}
        showHistory={!isGuest}
        onOpenHistory={handleOpenHistory}
        onBackFromHistory={() => handleSetViewMode("compact")}
        onNewChat={handleStartNewChatAndShow}
        onExpand={handleExpandToFullPage}
        onClose={handleCloseChat}
      />

      {viewMode === "history" ? (
        <ChatHistoryPanel
          sessions={historySessions}
          isLoading={isHistoryLoading}
          onSelectSession={handlePickSession}
          onDeleteSession={handleDeleteSession}
          onNewChat={handleStartNewChatAndShow}
          // ACTUAL FIX: this small floating widget's own container
          // (see the outer <div> below) is "bg-white" — a LIGHT
          // background — unlike the full-page /chat and /admin/chat
          // routes, whose sidebar is a genuinely dark gradient
          // (#0f2133 -> #0a1622, see ChatFullPageLayout.jsx). The
          // panel was previously forced to variant="dark" here too,
          // which renders every title/preview/date in near-white text
          // — invisible against this widget's white background (only
          // the green icon and "New Chat" button, whose colors don't
          // depend on the variant, stayed visible). "light" is the
          // correct variant for this specific white container.
          variant="light"
        />
      ) : (
        <>
          <ConnectionStatusBanner connectionStatus={connectionStatus} />

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {isInitializing ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-800">Hi there!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {role === "admin"
                      ? "What would you like to manage today?"
                      : "I'm your Zyron AI assistant. I can help you find products, track orders, or find the best deals. How can I help you today?"}
                  </p>
                </div>
                <SuggestionChips
                  suggestions={initialSuggestions}
                  onSelect={sendMessage}
                />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onSuggestionClick={sendMessage}
                    onFeedback={handleFeedback}
                    onAddToCart={handleAddToCart}
                    isAdmin={role === "admin"}
                  />
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSend={sendMessage}
            connectionStatus={connectionStatus}
            isTyping={isTyping}
          />
        </>
      )}
    </div>
  );
};

export default ChatWidget;
