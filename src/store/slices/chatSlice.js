import { createSlice } from "@reduxjs/toolkit";

// ----------------------------
// INITIAL STATE
// ----------------------------
const initialState = {
  // Whether the chat widget is currently open at all (icon vs panel).
  isOpen: false,

  // Which "view" the open COMPACT widget is currently showing.
  // "compact" -> the normal conversation view
  // "history" -> the chat history sidebar list (STATE 03)
  // (full-page is now a real route, not a value here — see the big
  // comment above)
  viewMode: "compact",

  // Which assistant this widget instance represents.
  // "customer" -> shopping assistant (search, cart, orders, FAQs)
  // "admin"    -> store-ops assistant (products, inventory, analytics)
  role: "customer",

  // The unique key identifying the CURRENT conversation.
  sessionKey: null,

  // Every message in the currently open conversation, in order.
  messages: [],

  // Quick-suggestion chips shown when the conversation is empty/fresh.
  initialSuggestions: [],

  // True while the AI is composing a reply.
  isTyping: false,

  // Tracks the live WebSocket connection health.
  // "connecting" | "connected" | "reconnecting" | "disconnected" | "expired" | "unauthorized"
  connectionStatus: "disconnected",

  // Whether this conversation has ALREADY triggered the auto-expand-
  // to-full-page rule once. Stored in Redux (not a component ref)
  // specifically because the component that checks this condition
  // (ChatWidget.jsx) now fully unmounts every time the user is on the
  // full-page route — a plain component ref would reset to false on
  // every remount and could send the user bouncing back into
  // full-page mode immediately after they manually collapse out of it.
  hasAutoExpanded: false,

  // The list of the user's past chat sessions, shown in the Chat
  // History panel (STATE 03).
  historySessions: [],

  // True while historySessions is being fetched from the backend.
  isHistoryLoading: false,

  // Number of AI messages received while the widget was closed/minimized.
  unreadCount: 0,
};

// ----------------------------
// CREATING THE SLICE
// ----------------------------
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    // --------------------------------------------------
    // REDUCER: setRole
    // --------------------------------------------------
    setRole: (state, action) => {
      state.role = action.payload; // "customer" | "admin"
    },

    // --------------------------------------------------
    // REDUCER: openChat
    // --------------------------------------------------
    openChat: (state) => {
      state.isOpen = true;
      state.unreadCount = 0;
    },

    // --------------------------------------------------
    // REDUCER: closeChat
    // --------------------------------------------------
    closeChat: (state) => {
      state.isOpen = false;
      state.viewMode = "compact";
    },

    // --------------------------------------------------
    // REDUCER: setViewMode
    // --------------------------------------------------
    // Only ever set to "compact" or "history" now.
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: setSessionKey
    // --------------------------------------------------
    setSessionKey: (state, action) => {
      state.sessionKey = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: setMessages
    // --------------------------------------------------
    setMessages: (state, action) => {
      state.messages = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: addMessage
    // --------------------------------------------------
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },

    // --------------------------------------------------
    // REDUCER: startStreamingMessage
    // --------------------------------------------------
    startStreamingMessage: (state, action) => {
      state.messages.push({
        id: action.payload.id,
        sender: "ai",
        text: "",
        metadata: null,
        suggestions: [],
        proactive: false,
        isStreaming: true,
        feedback: null,
        createdAt: new Date().toISOString(),
      });
    },

    // --------------------------------------------------
    // REDUCER: appendStreamChunk
    // --------------------------------------------------
    appendStreamChunk: (state, action) => {
      const { id, chunk } = action.payload;
      const message = state.messages.find((message) => message.id === id);
      if (message) {
        message.text += chunk;
      }
    },

    // --------------------------------------------------
    // REDUCER: finalizeStreamingMessage
    // --------------------------------------------------
    finalizeStreamingMessage: (state, action) => {
      const { id, metadata, suggestions } = action.payload;
      const message = state.messages.find((message) => message.id === id);
      if (message) {
        message.metadata = metadata;
        message.suggestions = suggestions;
        message.isStreaming = false;
      }
    },

    // --------------------------------------------------
    // REDUCER: setMessageFeedback
    // --------------------------------------------------
    setMessageFeedback: (state, action) => {
      const { id, rating } = action.payload;
      const message = state.messages.find((message) => message.id === id);
      if (message) {
        message.feedback = rating;
      }
    },

    // --------------------------------------------------
    // REDUCER: setTyping
    // --------------------------------------------------
    setTyping: (state, action) => {
      state.isTyping = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: setConnectionStatus
    // --------------------------------------------------
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: setInitialSuggestions
    // --------------------------------------------------
    setInitialSuggestions: (state, action) => {
      state.initialSuggestions = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: setHasAutoExpanded
    // --------------------------------------------------
    // Marks whether the auto-expand-to-full-page rule has already
    // fired for the CURRENT conversation. Set to true the moment
    // ChatWidget.jsx navigates to the full-page route, and reset back
    // to false only when a genuinely new/different conversation
    // starts (see startNewChat and setSessionKey usage in
    // ChatProvider.jsx).
    setHasAutoExpanded: (state, action) => {
      state.hasAutoExpanded = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: setHistorySessions
    // --------------------------------------------------
    setHistorySessions: (state, action) => {
      state.historySessions = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: removeHistorySession
    // --------------------------------------------------
    removeHistorySession: (state, action) => {
      state.historySessions = state.historySessions.filter(
        (session) => session.sessionKey !== action.payload,
      );
    },

    // --------------------------------------------------
    // REDUCER: setHistoryLoading
    // --------------------------------------------------
    setHistoryLoading: (state, action) => {
      state.isHistoryLoading = action.payload;
    },

    // --------------------------------------------------
    // REDUCER: incrementUnread
    // --------------------------------------------------
    incrementUnread: (state) => {
      state.unreadCount += 1;
    },

    // --------------------------------------------------
    // REDUCER: startNewChat
    // --------------------------------------------------
    // Resets the conversation back to a blank slate. Also resets
    // hasAutoExpanded to false, since a brand new conversation should
    // be allowed to trigger the auto-expand rule again from scratch.
    startNewChat: (state) => {
      state.sessionKey = null;
      state.messages = [];
      state.initialSuggestions = [];
      state.isTyping = false;
      state.hasAutoExpanded = false;
    },
  },
});

// ----------------------------
// EXPORTING ACTIONS
// ----------------------------
export const {
  setRole,
  openChat,
  closeChat,
  setViewMode,
  setSessionKey,
  setMessages,
  addMessage,
  startStreamingMessage,
  appendStreamChunk,
  finalizeStreamingMessage,
  setMessageFeedback,
  setTyping,
  setConnectionStatus,
  setInitialSuggestions,
  setHasAutoExpanded,
  setHistorySessions,
  removeHistorySession,
  setHistoryLoading,
  incrementUnread,
  startNewChat,
} = chatSlice.actions;

// ----------------------------
// EXPORTING THE REDUCER
// ----------------------------
export default chatSlice.reducer;
