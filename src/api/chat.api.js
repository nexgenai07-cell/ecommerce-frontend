// ============================================================
// AI CHAT API MODULE
// ============================================================
// This file contains ALL API calls related to the AI Chat module.
// It supports BOTH anonymous (not logged in) and logged-in users,
// managing their chat sessions, message history, and a real-time
// WebSocket connection for live chatting with the AI.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token (if logged in), and handles
// 401 errors globally.

// ----------------------------
// API 63 - Start a new chat session
// ----------------------------
// Called the FIRST TIME the chat widget is opened by a user
// (whether they're logged in or anonymous). The backend creates
// a new chat session and returns a unique "session_key" in the
// response, which should then be saved into localStorage on the
// frontend — this key is what identifies THIS specific chat
// conversation across future requests.
export const startChatSession = () => {
  return axiosInstance.post("/api/v1/chat/session/start/");
  // No "data" sent — this endpoint just creates a fresh, empty session
};

// ----------------------------
// API 64 - Get the chat history for an existing session
// ----------------------------
// Called when the chat widget is opened AGAIN (e.g. user navigates
// away and comes back, or refreshes the page). Since the
// "session_key" was already saved in localStorage from a previous
// visit, this fetches all the PREVIOUS messages tied to that session,
// so the conversation can be restored/displayed instead of starting
// from scratch.
export const getChatHistory = (sessionKey) => {
  return axiosInstance.get(`/api/v1/chat/session/${sessionKey}/history/`);
  // Template literal inserts the "sessionKey" directly into the URL path
};

// ----------------------------
// API 65 - Clear the chat history for a session
// ----------------------------
// Called when the user clicks a "Clear Chat" button inside the
// chat widget. This deletes all the MESSAGES belonging to this
// session, but importantly, the SESSION ITSELF stays active
// (i.e. the session_key remains valid) — so the user can continue
// chatting fresh without needing to start an entirely new session.
export const clearChatSession = (sessionKey) => {
  return axiosInstance.delete(`/api/v1/chat/session/${sessionKey}/clear/`);
};

// ----------------------------
// WebSocket Connection - Real-time chat
// ----------------------------
// IMPORTANT: This is NOT a normal HTTP API call like the ones above
// (it doesn't use axiosInstance at all). Instead, it opens a
// persistent WebSocket connection, which allows TWO-WAY real-time
// communication between the frontend and backend — needed so AI
// responses can stream/arrive instantly without the user having to
// repeatedly poll an API endpoint for new messages.
//
// The "sessionKey" used here MUST be the same one received earlier
// from the startChatSession() API call (API 63), so the backend
// knows which conversation this WebSocket connection belongs to.
export const createChatWebSocket = (sessionKey) => {
  // Building the WebSocket URL using the session key.
  // "ws://" is the WebSocket protocol equivalent of "http://" —
  // used here for LOCAL DEVELOPMENT only (talking to localhost:8000).
  const wsUrl = `ws://localhost:8000/ws/chat/${sessionKey}/`;
  // NOTE: In PRODUCTION, this should be changed to "wss://" instead
  // of "ws://" — "wss://" is the SECURE version of WebSocket
  // (equivalent to how "https://" is the secure version of "http://"),
  // and should also point to the actual production domain instead
  // of "localhost:8000".

  // Creating and returning an actual native browser WebSocket object,
  // which the calling component can then use to listen for messages
  // (via .onmessage), send messages (via .send()), and handle
  // connection events (via .onopen, .onclose, .onerror).
  return new WebSocket(wsUrl);
};
