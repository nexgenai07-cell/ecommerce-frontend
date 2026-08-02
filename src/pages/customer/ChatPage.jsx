import useChat from "../../hooks/useChat";
import { useChatActions } from "../../components/chat-assistant/ChatProvider";
import ChatFullPageLayout from "../../components/chat-assistant/ChatFullPageLayout";

const ChatPage = () => {
  // Pulls every piece of chat state this page needs to render straight
  // out of Redux (via useChat()) — role, the active session's key, the
  // live message list, the typing indicator, the socket connection
  // status, and now also the saved list of past conversations plus
  // whether that list is still being fetched.
  const {
    role,
    sessionKey,
    messages,
    isTyping,
    connectionStatus,
    historySessions,
    isHistoryLoading,
  } = useChat();

  // Pulls the actual action functions (API calls + side effects) from
  // the shared ChatProvider context.
  //
  // NOTE: this page no longer fetches the history list itself. That
  // used to happen in a useEffect right here, but per the final agreed
  // behaviour, the "Recents" list is now refreshed at exactly two
  // moments ONLY — on page load/refresh, and when a new chat is
  // opened — and BOTH of those are now handled centrally inside
  // ChatProvider.jsx itself (see its init effect and handleNewChat).
  // This page just reads whatever is already in Redux state.
  const {
    sendMessage,
    handleFeedback,
    handleAddToCart,
    handleDeleteSession,
    handleNewChat,
    handleSelectSession,
  } = useChatActions();

  return (
    // h-screen — fills the full viewport height, since this route has
    // no navbar/footer around it to share space with.
    <div className="h-screen w-screen">
      <ChatFullPageLayout
        role={role}
        sessionKey={sessionKey}
        messages={messages}
        isTyping={isTyping}
        connectionStatus={connectionStatus}
        onSend={sendMessage}
        onSuggestionClick={sendMessage}
        onFeedback={handleFeedback}
        onAddToCart={handleAddToCart}
        onDeleteConversation={handleDeleteSession}
        historySessions={historySessions}
        isHistoryLoading={isHistoryLoading}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />
    </div>
  );
};

export default ChatPage;
