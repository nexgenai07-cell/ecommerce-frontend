// ============================================================
// AI CHAT API MODULE
// ============================================================
// This file contains ALL API calls related to the AI Chat module.
// It supports BOTH anonymous (not logged in) and logged-in users,
// and BOTH assistants (customer shopping assistant + admin store-ops
// assistant), managing chat sessions, message history, chat-history
// list/soft-delete, admin action confirm/cancel, message feedback,
// file uploads, and the real-time WebSocket connection.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// API - Start a new customer chat session
// ----------------------------
export const startChatSession = () => {
  return axiosInstance.post("/api/v1/chat/session/start/");
};

// ----------------------------
// Start a new ADMIN chat session
// ----------------------------
export const startAdminChatSession = () => {
  return axiosInstance.post("/api/v1/chat/admin/session/start/");
};

// ----------------------------
// API- Get the chat history for an existing session
// ----------------------------
export const getChatHistory = (sessionKey) => {
  return axiosInstance.get(`/api/v1/chat/session/${sessionKey}/history/`);
};

// ----------------------------
// API - Clear the messages inside a chat session
// ----------------------------
export const clearChatSession = (sessionKey) => {
  return axiosInstance.delete(`/api/v1/chat/session/${sessionKey}/clear/`);
};

// ----------------------------
// List past chat sessions — CUSTOMER
// ----------------------------
export const listChatSessions = (limit = 20, offset = 0) => {
  return axiosInstance.get("/api/v1/chat/sessions/", {
    params: { limit, offset },
  });
};

// ----------------------------
// List past chat sessions — ADMIN
// ----------------------------
export const listAdminChatSessions = (limit = 20, offset = 0) => {
  return axiosInstance.get("/api/v1/chat/admin/sessions/", {
    params: { limit, offset },
  });
};

// ----------------------------
// Soft-delete a chat session
// ----------------------------
export const deleteChatSession = (sessionKey) => {
  return axiosInstance.delete(`/api/v1/chat/session/${sessionKey}/`);
};

// ----------------------------
// Confirm a pending admin action
// ----------------------------
export const confirmAdminAction = (actionId) => {
  return axiosInstance.post(`/api/v1/chat/admin/action/${actionId}/confirm/`);
};

// ----------------------------
// Cancel a pending admin action
// ----------------------------
export const cancelAdminAction = (actionId) => {
  return axiosInstance.post(`/api/v1/chat/admin/action/${actionId}/cancel/`);
};

// ----------------------------
// Submit thumbs up/down feedback on an AI message
// ----------------------------
export const sendMessageFeedback = (messageId, rating) => {
  return axiosInstance.post(`/api/v1/chat/message/${messageId}/feedback/`, {
    rating,
  });
};

// ----------------------------
// Remove feedback from an AI message
// ----------------------------
export const removeMessageFeedback = (messageId) => {
  return axiosInstance.delete(`/api/v1/chat/message/${messageId}/feedback/`);
};

// ----------------------------
// Upload a file/image attachment for the chat
// ----------------------------
export const uploadChatFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return axiosInstance.post("/api/v1/chat/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ----------------------------
// Helper — build the correct ws:// or wss:// base URL
// ----------------------------
const getWebSocketBaseUrl = () => {
  const restBaseUrl = import.meta.env.VITE_API_BASE_URL;
  return restBaseUrl.replace(/^http/, "ws");
};

// ----------------------------
// WebSocket Connection - Real-time customer chat
// ----------------------------
export const createChatWebSocket = (sessionKey) => {
  const wsUrl = `${getWebSocketBaseUrl()}/ws/chat/${sessionKey}/`;
  return new WebSocket(wsUrl);
};

// ----------------------------
// WebSocket Connection - Real-time ADMIN chat
// ----------------------------
// FIXED: path corrected from "/ws/admin/chat/" to "/ws/admin-chat/"
// (hyphen, not slash) — confirmed correct by the backend team.
export const createAdminChatWebSocket = (sessionKey) => {
  const wsUrl = `${getWebSocketBaseUrl()}/ws/admin-chat/${sessionKey}/`;
  return new WebSocket(wsUrl);
};
