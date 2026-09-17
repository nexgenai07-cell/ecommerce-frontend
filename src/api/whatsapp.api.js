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
// API - Manually send a WhatsApp message to a customer (Admin only)
// ----------------------------
// Allows an admin to send a one-off WhatsApp message directly to a
// customer — bypassing the automated bot flow. Useful for personal
// follow-ups, support replies, or manual order updates.
// The "data" payload is expected to include:
// - phone_number: the customer's WhatsApp number to send the message to
// - message: the actual text content of the message
export const sendWhatsAppMessage = (data, signal) => {
  return axiosInstance.post("/api/v1/whatsapp/send/", data, { signal });
};

// ----------------------------
// API - Get the list of all WhatsApp bot conversations (Admin only)
// ----------------------------
// Fetches the full log of messages exchanged between the WhatsApp
// bot and customers — both incoming (from customers) and outgoing
// (from the bot/admin), matching the WHATSAPP_DIRECTION constants.
// The "params" object can include:
// - phone_number: filter logs to only show conversation with a
//   specific customer's phone number
export const getWhatsAppLogs = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/whatsapp/logs/", { signal, params });
};

// ----------------------------
// API - Get currently active WhatsApp bot sessions (Admin only)
// ----------------------------
// Fetches a list of WhatsApp bot sessions that are CURRENTLY ACTIVE
// (i.e. users who are mid-conversation with the bot right now).
// This is primarily a DEBUGGING tool for admins/developers — it
// shows which user is currently at which STEP of the bot's
// conversation flow (e.g. "awaiting order number", "choosing product"),
// helping diagnose issues if the bot gets stuck or behaves unexpectedly.
export const getWhatsAppSessions = (signal) => {
  return axiosInstance.get("/api/v1/admin/whatsapp/sessions/", { signal });
};

// ----------------------------
// API 116.1 - Get every distinct WhatsApp conversation (Admin only)
// ----------------------------
// NEW (16 Sep 2026, Filtering Fix pass). One row per distinct phone
// number that has EVER exchanged a message — built from the full log
// history, not just currently-active sessions (that's what
// getWhatsAppSessions above is still for) — sorted with the most
// recent activity first.
//
// This replaces the admin "Numbers" page's old approach entirely: it
// used to reuse getWhatsAppSessions (a small, bounded list of only
// currently mid-flow numbers) and do search + pagination in the
// browser, PLUS a separate frontend-only lookup against the full
// customer list just to match a phone number to a customer's name.
// This one endpoint now does all of that server-side in a single
// request.
//
// params can include:
// - search    -> matches the phone number itself, or the linked
//                 customer's name (matched via last-10-digits, so
//                 formatting differences like a leading "+" or
//                 country code don't break the match)
// - page / page_size -> standard pagination
//
// Response: { count, next, previous, results: [
//   { phone_number, last_message_at, message_count, is_admin,
//     customer_name }
// ] }
// customer_name is null when no matching customer record is found —
// the Numbers page shows just the phone number in that case.
export const getWhatsAppConversations = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/whatsapp/conversations/", {
    signal,
    params,
  });
};
