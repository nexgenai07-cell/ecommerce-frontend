// ============================================================
// PAYMENTS API MODULE — Stripe + QR (Easypaisa/JazzCash)
// ============================================================
// This file contains the API calls related to payments. Stripe
// remains a fully automated card flow; QR is a static-image,
// manual-verification flow the customer completes outside the
// system, then proves with an uploaded screenshot. Admin
// verification (queue, approve, reject) lives in admin.api.js, since
// only admins can access those endpoints.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// API - Create Stripe Payment Intent
// ----------------------------
// Checkout () ke turant baad call hoti hai — ONLY when the customer
// chose payment_method: "stripe" at checkout. Order banne ke baad
// jo order_number milta hai, wahi is API ko bhejte hain.
// Backend Stripe par ek PaymentIntent bana kar wapas bhejta hai:
// - client_secret        -> Stripe Elements ko is se hi payment form render/confirm karna hai
// - publishable_key      -> Stripe.js ko initialize karne ke liye (kabhi bhi frontend mein
//                           hardcode nahi karni — hamesha yahi response se lena hai, taake
//                           test/live switch par frontend code na badalna pare)
// - amount, currency     -> confirmation/logging ke liye
// - order_number         -> jis order ke liye ye intent bana hai
export const createPaymentIntent = (data, signal) => {
  // data = { order_number: "ORD-2024-00001" }
  return axiosInstance.post("/api/v1/payments/create-intent/", data, {
    signal,
  });
};

// ----------------------------
// Note: (Stripe Webhook) frontend se kabhi call nahi hoti.
// Wo sirf Stripe server khud call karta hai backend ko — isliye
// yahan is file mein uska koi function nahi hai.
// ----------------------------

// ----------------------------
// API — Get the admin QR verification queue (Admin only)
// ----------------------------
// Every QR order currently sitting at payment.status: "under_review"
// — i.e. the customer has uploaded proof and it's waiting on a manual
// decision. Standard DRF pagination shape: { count, next, previous,
// results }. Each result: { order_number, customer: { id, name,
// phone }, amount, screenshot_url, transaction_id, submitted_at,
// duplicate_warning }. duplicate_warning is a flag only — the backend
// never auto-rejects on a match, it just surfaces it so the admin can
// look closer before deciding.
export const getQrPendingPayments = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/payments/qr/pending/", {
    signal,
    params,
  });
};

// ----------------------------
// API — Approve a QR payment (Admin only)
// ----------------------------
// No request body. Moves payment.status -> "paid" and order.status ->
// "confirmed", and releases the order's reserved stock into an actual
// deduction (total_stock -= qty, reserved_stock -= qty) in the same
// step — all handled server-side. The customer gets a notification.
export const approveQrPayment = (orderNumber, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/payments/qr/${orderNumber}/approve/`,
    undefined,
    { signal },
  );
};

// ----------------------------
// API — Reject a QR payment (Admin only)
// ----------------------------
// "reason" is mandatory — the backend 400s without it. Moves
// payment.status -> "rejected". The order itself is NOT cancelled
// (order.status stays "pending_payment") and stock stays reserved, so
// the customer gets a chance to re-upload corrected proof instead of
// losing their place in the order queue. The customer's notification
// includes this reason text.
export const rejectQrPayment = (orderNumber, reason, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/payments/qr/${orderNumber}/reject/`,
    { reason },
    { signal },
  );
};
// Called ONLY for payment_method: "qr" orders — once the customer has
// paid via Easypaisa/JazzCash outside the system, this uploads their
// screenshot as proof. Also used for RE-upload: this same endpoint is
// called again for the same order_number whenever payment.status is
// "rejected", moving it back to "under_review".
//
// Request is multipart/form-data:
// - order_number: string (required)
// - screenshot: image file (required)
// - transaction_id: string (optional)
//
// Effect on success: payment.status -> "under_review". order.status
// stays "pending_payment" and stock stays reserved — nothing else
// changes until an admin approves or rejects it.
//
// Response: { order_number, payment: { status, screenshot_url } }
export const uploadQrProof = (data, signal) => {
  const formData = new FormData();
  formData.append("order_number", data.order_number);
  formData.append("screenshot", data.screenshot);
  if (data.transaction_id) {
    formData.append("transaction_id", data.transaction_id);
  }

  // Same reasoning as the multipart uploads elsewhere in this project
  // (see complaints.api.js) — axiosInstance sets a default JSON
  // Content-Type at the instance level, so it must be explicitly
  // cleared here for axios/the browser to generate the correct
  // "multipart/form-data; boundary=..." header on its own.
  return axiosInstance.post("/api/v1/payments/qr/proof/", formData, {
    signal,
    headers: { "Content-Type": undefined },
  });
};
