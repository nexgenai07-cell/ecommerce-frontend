// ============================================================
// CUSTOM HOOK
// ============================================================
// A lightweight convenience hook for reading chat state from Redux
// and dispatching the chat slice's simple state-only actions —
// mirrors the existing useUI.js / useAuth.js pattern in this project.
//
// This hook does NOT make any API calls itself — all REST/WebSocket
// logic now lives in ChatProvider.jsx (mounted once at the app root),
// so the connection survives navigation to the full-page /chat route.
// ChatWidget.jsx and the chat pages read state through this hook and
// trigger actions through ChatProvider's exposed context functions.

import { useSelector, useDispatch } from "react-redux";

import {
  setRole,
  openChat,
  closeChat,
  setViewMode,
  setSessionKey,
  setMessages,
  addMessage,
  setMessageFeedback,
  setHasAutoExpanded,
  setHistorySessions,
  removeHistorySession,
  setHistoryLoading,
  startNewChat,
} from "../store/slices/chatSlice";

const useChat = () => {
  // --------------------------------------------------
  // READING STATE FROM REDUX
  // --------------------------------------------------
  const {
    isOpen,
    viewMode,
    role,
    sessionKey,
    messages,
    initialSuggestions,
    isTyping,
    connectionStatus,
    hasAutoExpanded,
    historySessions,
    isHistoryLoading,
    unreadCount,
  } = useSelector((state) => state.chat);

  const dispatch = useDispatch();

  const handleSetRole = (newRole) => dispatch(setRole(newRole));
  const handleOpenChat = () => dispatch(openChat());
  const handleCloseChat = () => dispatch(closeChat());
  const handleSetViewMode = (mode) => dispatch(setViewMode(mode));
  const handleSetSessionKey = (key) => dispatch(setSessionKey(key));
  const handleSetMessages = (newMessages) => dispatch(setMessages(newMessages));
  const handleAddMessage = (message) => dispatch(addMessage(message));
  const handleSetMessageFeedback = (id, rating) =>
    dispatch(setMessageFeedback({ id, rating }));

  // --------------------------------------------------
  // FUNCTION: handleSetHasAutoExpanded
  // --------------------------------------------------
  // Marks whether the current conversation has already been
  // auto-expanded into full-page mode once — see the big comment on
  // this field in chatSlice.js for why this lives in Redux instead of
  // a local component ref.
  const handleSetHasAutoExpanded = (value) =>
    dispatch(setHasAutoExpanded(value));

  const handleSetHistorySessions = (sessions) =>
    dispatch(setHistorySessions(sessions));
  const handleRemoveHistorySession = (key) =>
    dispatch(removeHistorySession(key));
  const handleSetHistoryLoading = (loading) =>
    dispatch(setHistoryLoading(loading));
  const handleStartNewChat = () => dispatch(startNewChat());

  return {
    isOpen,
    viewMode,
    role,
    sessionKey,
    messages,
    initialSuggestions,
    isTyping,
    connectionStatus,
    hasAutoExpanded,
    historySessions,
    isHistoryLoading,
    unreadCount,
    handleSetRole,
    handleOpenChat,
    handleCloseChat,
    handleSetViewMode,
    handleSetSessionKey,
    handleSetMessages,
    handleAddMessage,
    handleSetMessageFeedback,
    handleSetHasAutoExpanded,
    handleSetHistorySessions,
    handleRemoveHistorySession,
    handleSetHistoryLoading,
    handleStartNewChat,
  };
};

export default useChat;
