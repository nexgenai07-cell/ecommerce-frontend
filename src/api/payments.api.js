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
// decision. This naturally includes both first-time reviews
// (order.status "pending_payment") and retry reviews after an earlier
// rejection (order.status "on_hold"), since both are "under_review"
// from the payment's perspective. Standard DRF pagination shape:
// { count, next, previous, results }. Each result: { order_number,
// customer: { id, name, phone }, amount, screenshot_url,
// transaction_id, submitted_at, duplicate_warning }. duplicate_warning
// is a flag only — the backend never auto-rejects on a match, it just
// surfaces it so the admin can look closer before deciding.
//
// UPDATED (Sep 2026, API 74.2 backend fix): each result now ALSO
// includes rejection_count (how many times this order's proof has
// been rejected so far) and order_status ("pending_payment" for a
// first-time review, "on_hold" for a retry) — so the admin can tell a
// first review apart from a retry, and how close it is to the
// 3-attempt cap, directly in the queue (see QrPaymentQueue.jsx).
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
//
// UPDATED (Sep 2026, API 74.3 backend fix): now also valid when
// order.status is "on_hold" (a retry review after an earlier
// rejection), not just "pending_payment" — approving a retry review
// used to incorrectly fail with "order.status is on_hold, not
// pending_payment". Same outcome either way. The 400 error wording
// also changed to: "Order status is <status>, not pending_payment or
// on_hold." (under an "error" key).
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
// payment.status -> "rejected".
//
// UPDATED (Sep 2026, API 74.4 backend fix) — the effect of a rejection
// has changed significantly from before: order.status now moves to
// "cancelled" (previously stayed "pending_payment"), and reserved
// stock is now released back (previously stayed reserved).
// payment.qr_rejection_count increments by 1 on every rejection. The
// response now includes { order_number, payment_status: "rejected",
// order_status: "cancelled", rejection_count, permanently_cancelled,
// reason, message } — permanently_cancelled is true once
// rejection_count reaches 3, at which point uploadQrProof() will
// refuse any further attempt for this order and the customer must be
// told to contact support instead of re-uploading. Below the cap, the
// customer CAN still re-upload via uploadQrProof() — it will reopen
// the order to "on_hold" rather than "pending_payment".
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
// "rejected", moving it back to "under_review". Every upload is
// hashed (SHA-256) and its transaction_id (if given) checked against
// every previous submission — a match against a DIFFERENT order sets
// duplicate_warning: true (a flag only, never auto-rejects).
//
// Request is multipart/form-data:
// - order_number: string (required)
// - screenshot: image file (required)
// - transaction_id: string (optional)
//
// Effect on a FIRST-TIME upload: payment.status -> "under_review".
// order.status stays "pending_payment" and stock stays reserved —
// nothing else changes until an admin approves or rejects it.
//
// UPDATED (Sep 2026, API 74.1 backend fix) — RE-upload after a
// rejection now works differently: if the order was cancelled
// specifically because its QR proof was rejected, a fresh upload is
// still accepted — up to a maximum of 3 rejected attempts total
// (tracked via payment.qr_rejection_count). On an accepted retry:
// payment.status -> "under_review", order.status -> "on_hold" (not
// "pending_payment", which is reserved for a first-time review), and
// reserved stock is re-reserved. Once qr_rejection_count reaches 3,
// any further upload for that order is refused with 400 — the order
// stays permanently cancelled and the customer is told to contact
// support. A cancelled order for any OTHER reason (customer/admin
// cancelled it, unrelated to a QR rejection) is still refused as
// before.
//
// Response: { order_number, order_status: "pending_payment" |
// "on_hold", payment: { status, screenshot_url },
// duplicate_warning, reopened_after_rejection }. New 400 errors are
// returned under an "error" key — e.g. "This order has been
// cancelled.", "Maximum re-upload attempts (3) reached for this
// order...", or a stock-ran-out-during-retry message.
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
