import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import useAuth from "../../hooks/useAuth";
import useChat from "../../hooks/useChat";
import useChatSocket from "../../hooks/useChatSocket";
import { ROUTES } from "../../constants/routes";
import {
  startChatSession,
  startAdminChatSession,
  getChatHistory,
  listChatSessions,
  listAdminChatSessions,
  deleteChatSession,
  sendMessageFeedback,
  removeMessageFeedback,
} from "../../api/chat.api";
import { showError } from "../ui/Toast";

const ChatActionsContext = createContext(null);

export const useChatActions = () => {
  const context = useContext(ChatActionsContext);
  if (!context) {
    throw new Error("useChatActions must be used inside <ChatProvider>");
  }
  return context;
};

// Converts one raw backend message object into the shape the chat UI
// actually renders with (renames "message" -> "text", adds the
// UI-only fields streaming/suggestions/proactive that only live
// messages need, and normalizes feedback to null when absent).
const mapHistoryMessage = (raw) => ({
  id: raw.id,
  sender: raw.sender,
  text: raw.message,
  metadata: raw.metadata,
  suggestions: [],
  proactive: false,
  isStreaming: false,
  feedback: raw.feedback ?? null,
  createdAt: raw.created_at,
});

const ChatProvider = ({ children }) => {
  // Pulls the logged-in user (or null for a guest) plus the auth flag,
  // used below to decide which role's chat endpoints to call.
  const { user, isAuthenticated } = useAuth();
  // Current route, used to know whether the user is on the dedicated
  // full-page /chat or /admin/chat screen (as opposed to the small
  // floating widget on some other page).
  const location = useLocation();

  // True only on the dedicated full-page chat routes.
  const isOnChatRoute =
    location.pathname === ROUTES.CHAT ||
    location.pathname === ROUTES.ADMIN_CHAT;

  // Admin accounts get the admin chat endpoints; everyone else
  // (logged-in customer or guest) gets the customer endpoints.
  const role = isAuthenticated && user?.role === "admin" ? "admin" : "customer";
  // "Guest" = a customer-role visitor who isn't logged in at all.
  const isGuest = role === "customer" && !user;

  const {
    isOpen,
    sessionKey,
    handleSetRole,
    handleSetSessionKey,
    handleSetMessages,
    handleSetMessageFeedback,
    handleSetHasAutoExpanded,
    handleSetHistorySessions,
    handleRemoveHistorySession,
    handleSetHistoryLoading,
    handleStartNewChat,
  } = useChat();

  // Opens/keeps the live WebSocket connection for the active session.
  const { sendMessage } = useChatSocket(sessionKey, role);

  // Storage key includes the specific account identity (user.id, or
  // the literal "guest"), not just the role — so a guest's saved
  // session and a specific logged-in account's saved session are
  // never the same slot.
  const storageKey = `zyron_chat_session_${role}_${user?.id ?? "guest"}`;

  // Remembers which identity (role + user id) the init effect has
  // already run for, so it only (re)initializes once per identity —
  // not on every re-render.
  const initializedForRef = useRef(null);
  // True while the very first session resolution (on mount/refresh)
  // is still in flight, so the UI can show a loading state instead of
  // an empty chat.
  const [isInitializing, setIsInitializing] = useState(true);

  // Creates a brand-new chat session on the backend for the current role.
  const startSessionMutation = useMutation({
    mutationFn: () =>
      role === "admin" ? startAdminChatSession() : startChatSession(),
  });
  // Fetches the full message history for one specific session_key.
  const historyMutation = useMutation({
    mutationFn: (key) => getChatHistory(key),
  });
  // Fetches the list of the current user's past chat sessions.
  const sessionsListMutation = useMutation({
    mutationFn: () =>
      role === "admin" ? listAdminChatSessions() : listChatSessions(),
  });
  // Permanently deletes one saved chat session.
  const deleteSessionMutation = useMutation({
    mutationFn: (variables) => deleteChatSession(variables),
  });
  // Sends (or clears, when rating is null) a thumbs-up/down rating on
  // one specific AI message.
  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, rating }) =>
      rating === null
        ? removeMessageFeedback(messageId)
        : sendMessageFeedback(messageId, rating),
  });

  // --------------------------------------------------
  // FUNCTION: handleLoadHistoryList
  // --------------------------------------------------
  // Fetches the saved conversation list for the current role, then
  // filters it before storing it in Redux. Defined here (ABOVE the
  // init effect below) because the init effect now calls this function
  // directly as part of its own "on page load / refresh" trigger.
  const handleLoadHistoryList = async () => {
    // Guests never have saved history on the backend at all — skip the
    // API call entirely instead of letting it fail and show an error
    if (isGuest) {
      handleSetHistorySessions([]);
      return;
    }

    handleSetHistoryLoading(true);
    try {
      const response = await sessionsListMutation.mutateAsync();

      const mappedSessions = response.data.sessions.map((session) => ({
        sessionKey: session.session_key,
        title: session.title,
        preview: session.preview,
        updatedAt: session.updated_at,
      }));

      // FILTER OUT EMPTY CONVERSATIONS: clicking "New Chat" immediately
      // creates a real session on the backend (via startChatSession/
      // startAdminChatSession), even before the user has typed a
      // single message into it. If that empty session is then left
      // behind, it would otherwise show up in "Recents" as a blank,
      // title-less entry — which isn't a real conversation and
      // shouldn't clutter the list. A session only counts as "real"
      // once it actually has preview text, i.e. at least one message
      // was sent in it.
      const nonEmptySessions = mappedSessions.filter((session) =>
        Boolean(session.preview && session.preview.trim().length > 0),
      );

      handleSetHistorySessions(nonEmptySessions);
    } catch {
      showError("Couldn't load your past conversations.");
    } finally {
      handleSetHistoryLoading(false);
    }
  };

  // --------------------------------------------------
  // EFFECT: lazily (re)initialize the session
  // --------------------------------------------------
  // FINAL AGREED BEHAVIOUR: the "Recents" history list must ONLY ever
  // refresh at exactly two moments, for both admin and customer:
  //   1) on a page load / browser refresh (handled right here, at the
  //      end of this same initialization effect — this effect already
  //      runs once whenever the app loads or the chat is first opened
  //      after a refresh, so it's the natural home for trigger #1), and
  //   2) when the user opens a brand-new chat (handled inside
  //      handleNewChat() below — trigger #2).
  // No other event (closing the widget, opening the history panel,
  // leaving the /chat page, an AI reply finishing, etc.) should ever
  // silently refetch the list anymore.
  useEffect(() => {
    const identity = `${role}:${user?.id ?? "guest"}`;

    // Already initialized for this exact identity — do nothing.
    if (initializedForRef.current === identity) {
      return;
    }

    // Don't bother initializing a session at all if neither the
    // floating widget is open nor the user is on a dedicated chat
    // route — no point calling the backend before the chat is even
    // visible.
    if (!isOpen && !isOnChatRoute) {
      return;
    }

    let isCancelled = false;

    const initialize = async () => {
      setIsInitializing(true);
      handleSetRole(role);

      // --------------------------------------------------
      // THE ACTUAL FIX: clear the previous identity's conversation
      // off-screen IMMEDIATELY, before fetching/starting anything for
      // the new identity. Without this, the old guest (or previous
      // account's) messages stay visible while a new session_key is
      // silently created underneath them.
      // --------------------------------------------------
      handleSetMessages([]);
      handleSetHasAutoExpanded(false);

      // --------------------------------------------------
      // BEHAVIOUR (per latest requirement): a browser refresh must act
      // exactly like pressing "New Chat" — the conversation that was on
      // screen before the refresh is NOT resumed here anymore. It is
      // already saved on the backend, so it simply falls into the
      // "Recents" list (via handleLoadHistoryList below), while the
      // screen in front of the user starts a brand-new, empty chat.
      // This is why the old "if (savedKey) resume it" branch was
      // removed — resuming the saved session on init was exactly what
      // kept the previous chat visible on screen after a refresh
      // instead of clearing it.
      // --------------------------------------------------
      try {
        const startResponse = await startSessionMutation.mutateAsync();
        if (isCancelled) return;
        const newKey = startResponse.data.session_key;
        localStorage.setItem(storageKey, newKey);
        handleSetSessionKey(newKey);
      } catch {
        if (!isCancelled)
          showError(
            "Couldn't start the chat assistant. Please refresh the page.",
          );
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
          initializedForRef.current = identity;

          // TRIGGER #1 — "on refresh": this line runs exactly once per
          // page load (or per fresh identity), right after the new
          // session has been created — this is what makes the sidebar
          // show the correct, up-to-date "Recents" list (including the
          // conversation that was just left behind by the refresh) as
          // soon as a browser refresh happens.
          handleLoadHistoryList();
        }
      }
    };

    initialize();

    // Cleanup: if this effect re-runs (or the component unmounts)
    // before the async initialize() finishes, ignore its result
    // instead of applying a stale session to the current identity.
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id, isOpen, isOnChatRoute]);

  // --------------------------------------------------
  // FUNCTION: handleNewChat
  // --------------------------------------------------
  // Starts a brand-new session on demand (the "New Chat" button).
  const handleNewChat = async () => {
    try {
      const startResponse = await startSessionMutation.mutateAsync();
      const newKey = startResponse.data.session_key;
      localStorage.setItem(storageKey, newKey);
      handleStartNewChat();
      handleSetSessionKey(newKey);

      // TRIGGER #2 — "on new chat": refreshes the Recents list right
      // here, right after the new session is created — this is what
      // makes the PREVIOUS conversation (the one just left behind)
      // appear in Recents at the exact moment a new chat is opened.
      handleLoadHistoryList();
    } catch {
      showError("Couldn't start a new chat. Please try again.");
    }
  };

  // Opens one specific past session from the Recents list, loading
  // its full message history into the active chat window.
  const handleSelectSession = async (key) => {
    try {
      const historyResponse = await historyMutation.mutateAsync(key);
      localStorage.setItem(storageKey, key);
      handleSetSessionKey(key);
      handleSetMessages(historyResponse.data.messages.map(mapHistoryMessage));
    } catch {
      showError("Couldn't open that conversation — it may have been deleted.");
    }
  };

  // Permanently deletes a past session. If the session being deleted
  // happens to be the one currently open on screen, a fresh new chat
  // is started right after so the user is never left staring at a
  // now-deleted conversation.
  const handleDeleteSession = async (key) => {
    try {
      await deleteSessionMutation.mutateAsync(key);
      handleRemoveHistorySession(key);

      if (key === sessionKey) {
        await handleNewChat();
      }
    } catch {
      showError("Couldn't delete that conversation. Please try again.");
    }
  };

  // Sets a message's feedback rating optimistically in the UI first,
  // then persists it to the backend.
  const handleFeedback = async (messageId, rating) => {
    handleSetMessageFeedback(messageId, rating);
    try {
      await feedbackMutation.mutateAsync({ messageId, rating });
    } catch {
      showError("Couldn't save your feedback. Please try again.");
    }
  };

  // Shortcut used by product-card suggestions inside the chat — sends
  // a plain-text "add to cart" instruction through the same chat
  // pipeline the user would type themselves.
  const handleAddToCart = (product) => {
    sendMessage(`Add ${product.name} to my cart`);
  };

  const contextValue = {
    role,
    isGuest,
    isInitializing,
    sendMessage,
    handleNewChat,
    handleLoadHistoryList,
    handleSelectSession,
    handleDeleteSession,
    handleFeedback,
    handleAddToCart,
  };

  return (
    <ChatActionsContext.Provider value={contextValue}>
      {children}
    </ChatActionsContext.Provider>
  );
};

export default ChatProvider;
