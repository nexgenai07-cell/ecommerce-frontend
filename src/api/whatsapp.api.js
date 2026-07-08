// ============================================================
// WHATSAPP API MODULE
// ============================================================
// This file contains ALL API calls related to the WhatsApp module.
// It allows admins to view WhatsApp bot conversation logs, inspect
// currently active bot sessions (useful for debugging), and manually
// send WhatsApp messages to customers when needed.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API 92 - Manually send a WhatsApp message to a customer (Admin only)
// ----------------------------
// Allows an admin to send a one-off WhatsApp message directly to a
// customer — bypassing the automated bot flow. Useful for personal
// follow-ups, support replies, or manual order updates.
// The "data" payload is expected to include:
// - phone_number: the customer's WhatsApp number to send the message to
// - message: the actual text content of the message
export const sendWhatsAppMessage = (data) => {
  return axiosInstance.post("/api/v1/whatsapp/send/", data);
};

// ----------------------------
// API 93 - Get the list of all WhatsApp bot conversations (Admin only)
// ----------------------------
// Fetches the full log of messages exchanged between the WhatsApp
// bot and customers — both incoming (from customers) and outgoing
// (from the bot/admin), matching the WHATSAPP_DIRECTION constants.
// The "params" object can include:
// - phone_number: filter logs to only show conversation with a
//   specific customer's phone number
export const getWhatsAppLogs = (params) => {
  return axiosInstance.get("/api/v1/admin/whatsapp/logs/", { params });
};

// ----------------------------
// API 94 - Get currently active WhatsApp bot sessions (Admin only)
// ----------------------------
// Fetches a list of WhatsApp bot sessions that are CURRENTLY ACTIVE
// (i.e. users who are mid-conversation with the bot right now).
// This is primarily a DEBUGGING tool for admins/developers — it
// shows which user is currently at which STEP of the bot's
// conversation flow (e.g. "awaiting order number", "choosing product"),
// helping diagnose issues if the bot gets stuck or behaves unexpectedly.
export const getWhatsAppSessions = () => {
  return axiosInstance.get("/api/v1/admin/whatsapp/sessions/");
};
