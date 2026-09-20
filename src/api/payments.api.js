// PAYMENTS API MODULE — Stripe + QR (Easypaisa/JazzCash)
// ============================================================
// This file contains the API calls related to payments. Stripe
// remains a fully automated card flow; QR is a static-image,
// manual-verification flow the customer completes outside the
// system, then proves with an uploaded screenshot. The admin
// verification calls (queue, approve, reject) are grouped here too.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// Create Stripe Payment Intent
// ----------------------------
// Called right after checkout() — ONLY when the customer chose
// payment_method: "stripe" at checkout. The order_number returned by
// checkout is sent to this endpoint.
// The backend creates a PaymentIntent on Stripe and returns:
// - client_secret        -> used by Stripe Elements to render and confirm the payment form
// - publishable_key      -> used to initialize Stripe.js. It is never hardcoded on the
//                           frontend; it is always taken from this response so switching
//                           between test and live keys needs no frontend change
// - amount, currency     -> for confirmation/logging
// - order_number         -> the order this intent was created for
export const createPaymentIntent = (data, signal) => {
  // data = { order_number: "ORD-2024-00001" }
  return axiosInstance.post("/api/v1/payments/create-intent/", data, {
    signal,
  });
};

// ----------------------------
// Note: the Stripe webhook is never called from the frontend.
// Only the Stripe server calls it on the backend, so there is no
// function for it in this file.
// ----------------------------

// ----------------------------
// Get the admin QR verification queue (Admin only)
// ----------------------------
// Every QR order currently sitting at payment.status: "under_review"
// — i.e. the customer has uploaded proof and it's waiting on a manual
// decision. This includes both first-time reviews and retry reviews
// after an earlier rejection; in both cases the order itself is still
// "pending_payment". Standard DRF pagination shape:
// { count, next, previous, results }. Each result: { order_number,
// customer: { id, name, phone }, amount, screenshot_url,
// transaction_id, submitted_at, duplicate_warning, rejection_count,
// order_status }. duplicate_warning is a flag only — the backend never
// auto-rejects on a match, it just surfaces it so the admin can look
// closer before deciding.
//
// rejection_count is how many times this order's proof has been
// rejected so far. A value above 0 marks a retry review, so it — not
// the order status — is what the queue uses to tell a first review
// from a retry and to show how close the order is to the 3-attempt cap.
export const getQrPendingPayments = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/payments/qr/pending/", {
    signal,
    params,
  });
};

// ----------------------------
// Approve a QR payment (Admin only)
// ----------------------------
// No request body. Moves payment.status -> "paid" and order.status ->
// "confirmed", and releases the order's reserved stock into an actual
// deduction (total_stock -= qty, reserved_stock -= qty) in the same
// step — all handled server-side. The customer gets a notification.
//
// Valid when order.status is "pending_payment" (or the legacy
// "on_hold"). Otherwise the backend answers with a 400 such as
// "Order status is <status>, not pending_payment or on_hold." under an
// "error" key.
export const approveQrPayment = (orderNumber, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/payments/qr/${orderNumber}/approve/`,
    undefined,
    { signal },
  );
};

// ----------------------------
// Reject a QR payment (Admin only)
// ----------------------------
// "reason" is mandatory — the backend 400s without it. Moves
// payment.status -> "rejected" and increments payment.qr_rejection_count
// by 1 on every rejection.
//
// - 1st and 2nd rejection: the order stays in (or returns to)
//   "pending_payment" and is NOT cancelled. Reserved stock is kept. The
//   customer is notified to upload a new proof and told how many
//   attempts are left.
// - 3rd rejection: the order becomes "cancelled", reserved stock is
//   released, and the cancellation is permanent — uploadQrProof()
//   refuses any further attempt and the customer must contact support.
//
// Response: { order_number, payment_status: "rejected", order_status,
// rejection_count, permanently_cancelled, reason, attempts_left,
// message }. Use message/attempts_left for the confirmation text and
// permanently_cancelled to tell that the order was cancelled.
export const rejectQrPayment = (orderNumber, reason, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/payments/qr/${orderNumber}/reject/`,
    { reason },
    { signal },
  );
};

// ----------------------------
// Upload QR payment proof (customer)
// ----------------------------
// Called ONLY for payment_method: "qr" orders — once the customer has
// paid via Easypaisa/JazzCash outside the system, this uploads their
// screenshot as proof. The same endpoint is used again to RE-upload
// whenever payment.status is "rejected", moving it back to
// "under_review". Every upload is hashed (SHA-256) and its
// transaction_id (if given) checked against every previous submission —
// a match against a DIFFERENT order sets duplicate_warning: true (a
// flag only, never auto-rejects).
//
// Request is multipart/form-data:
// - order_number: string (required)
// - screenshot: image file (required)
// - transaction_id: string (optional)
//
// Effect of an accepted upload: payment.status -> "under_review". The
// order stays "pending_payment" and its stock stays reserved, for a
// first upload and for a retry alike — nothing else changes until an
// admin approves or rejects the proof.
//
// Retries: after the 1st or 2nd rejection a new upload is accepted.
// After the 3rd rejection the order is permanently cancelled and any
// further upload is refused. A cancelled order for any other reason is
// refused with a generic cancelled message.
//
// Response: { order_number, order_status: "pending_payment", payment:
// { status, screenshot_url }, duplicate_warning,
// reopened_after_rejection }. reopened_after_rejection is true when
// this upload is a retry after an earlier rejection. Errors are
// returned under an "error" key — e.g. "This order has been
// cancelled." or "Maximum re-upload attempts (3) reached for this
// order...".
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
