// ============================================================
// PAYMENTS API MODULE — Stripe + QR (Easypaisa/JazzCash)
// ============================================================
// This file contains the API calls related to payments. Stripe is a
// fully automated card flow; QR is a manual-verification flow the
// customer completes outside the system and then proves with an
// uploaded screenshot. The admin calls (QR payments list and stats,
// approve, reject, bulk actions and the store QR image management)
// are grouped here too.

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
// Get the store's payment QR image (customer)
// ----------------------------
// Returns the QR image the customer scans on the QR payment screen, as
// uploaded by the store admin. One image exists per store.
//
// Response (200): { store_id, qr_image_url, is_default, updated_at }
// - qr_image_url — absolute https URL of the image to display
// - is_default   — true when the admin has not uploaded a real QR yet.
//                  The URL then points to a sample image that must never
//                  be shown as a payment target.
// - updated_at   — when the store record was last saved
// A 404 with { error: "Store not found." } means the store record is
// missing.
export const getStoreQrImage = (signal) => {
  return axiosInstance.get("/api/v1/payments/qr/image/", { signal });
};

// ----------------------------
// Get the admin QR payments list (Admin only)
// ----------------------------
// Every QR payment that has a submitted proof, in any status
// (under_review, paid, rejected or refunded), with filtering,
// searching, sorting and pagination all done on the server. QR orders
// still waiting for the customer to upload a proof are not rows here;
// they are only counted as awaiting_proof by getQrPaymentStats().
//
// Query params (all optional):
// - status      -> under_review | paid | rejected | refunded | all
//                  (omitted or any other value means all)
// - search      -> order number, customer name, phone or email, or
//                  transaction ID
// - start_date / end_date -> YYYY-MM-DD, the day the proof was submitted
// - min_amount / max_amount -> bounds on the order total
// - duplicate   -> true | false (proofs flagged / not flagged as a
//                  possible duplicate)
// - ordering    -> submitted_at | -submitted_at | amount | -amount |
//                  customer_name | -customer_name (default -submitted_at)
// - page, page_size -> standard pagination
//
// Response (200): { count, next, previous, results: [ { id,
// order_number, customer: { id, name, phone }, amount, status,
// screenshot_url, transaction_id, submitted_at, paid_at,
// duplicate_warning, rejection_count, reject_reason, order_status } ] }
//
// duplicate_warning is a flag only — the backend never auto-rejects on
// a match, it just surfaces it so the admin can look closer before
// deciding. rejection_count is how many times the proof has been
// rejected so far, and reject_reason is the admin's reason for a
// rejected payment (an empty string otherwise).
//
// A 400 response carries a field-keyed message for an invalid amount
// bound or date range.
export const getQrPayments = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/payments/qr/", { signal, params });
};

// ----------------------------
// Get the admin QR payments stats (Admin only)
// ----------------------------
// The numbers behind the stat cards at the top of the QR payments
// page. The optional start_date / end_date narrow the counts to proofs
// submitted in that period. The list's status and search filters do
// not apply here: the cards always show the overall picture for the
// period. awaiting_proof is a live count and ignores the dates.
//
// Response (200): { total, pending_review, approved, rejected,
// refunded, duplicate_warnings, submitted_today, awaiting_proof,
// approved_amount, pending_amount } — the two amounts are decimal
// strings.
export const getQrPaymentStats = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/payments/qr/stats/", {
    signal,
    params,
  });
};

// ----------------------------
// Get the store's payment QR image (Admin only)
// ----------------------------
// Returns the image currently shown to customers, in the same shape as
// getStoreQrImage(). is_default is true while no custom image is
// uploaded.
export const getAdminQrImage = (signal) => {
  return axiosInstance.get("/api/v1/admin/payments/qr/image/", { signal });
};

// ----------------------------
// Upload or replace the store's payment QR image (Admin only)
// ----------------------------
// Uploads the image, or replaces the existing one (the previous file is
// deleted from storage). The file must be a real image of at most 5 MB;
// the backend validates both and answers with a 400 carrying an
// "image" error list otherwise.
//
// Request is multipart/form-data:
// - image: image file (required)
//
// Response (200): the same shape as getAdminQrImage().
export const uploadAdminQrImage = (file, signal) => {
  const formData = new FormData();
  formData.append("image", file);

  // axiosInstance sets a default JSON Content-Type at the instance
  // level, so it must be explicitly cleared here for axios and the
  // browser to generate the correct "multipart/form-data; boundary=..."
  // header on their own.
  return axiosInstance.post("/api/v1/admin/payments/qr/image/", formData, {
    signal,
    headers: { "Content-Type": undefined },
  });
};

// ----------------------------
// Remove the store's custom payment QR image (Admin only)
// ----------------------------
// Deletes the custom image. Customers see the default sample image
// afterwards, which the response reports with is_default: true.
//
// Response (200): the same shape as getAdminQrImage().
export const removeAdminQrImage = (signal) => {
  return axiosInstance.delete("/api/v1/admin/payments/qr/image/", { signal });
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
// Approve multiple QR payments in one request (Admin only)
// ----------------------------
// Approves several QR payments in a single call. Each order in the
// batch goes through the exact same rule as approveQrPayment() (only a
// QR order whose payment is under review can be approved),
// independently of the others, so one order failing never blocks the
// rest of the batch.
//
// orderNumbers — a non-empty array of order numbers, maximum 100 per
// call. A selection larger than 100 rows must be split into batches
// of 100 and sent as separate calls (see chunkArray in
// utils/chunkArray.js).
//
// The response is always 200 OK for a well-formed request, even if
// some orders could not be approved, so the result must be read from
// the response body rather than the HTTP status:
//   approved_ids — order numbers approved successfully
//   missing_ids  — order numbers that no longer exist, or are stale in
//                  the current selection; these should be dropped from
//                  the list and the selection quietly, without an error
//   failed       — orders that exist but could not be approved (for
//                  example the payment is no longer under review, or
//                  the order isn't a QR payment order); each entry is
//                  { id, error }
//   message      — a ready-made summary sentence, suitable for a toast
//   results      — one small object per approved order, e.g. its new
//                  payment_status and order_status
//
// A 400 response means the request itself was invalid (empty ids,
// invalid order numbers, or more than 100 ids) and nothing was
// processed. Refresh the QR payments list after this call, the same as
// after the single-order approve.
export const bulkApproveQrPayments = (orderNumbers, signal) => {
  return axiosInstance.post(
    "/api/v1/admin/payments/qr/bulk-approve/",
    { order_numbers: orderNumbers },
    { signal },
  );
};

// ----------------------------
// Reject multiple QR payments in one request (Admin only)
// ----------------------------
// Rejects several QR payment proofs in a single call, all with the
// same reason. Each order in the batch goes through the exact same
// rule as rejectQrPayment() (payment.qr_rejection_count goes up by 1;
// the 3rd rejection cancels the order permanently and releases its
// reserved stock), independently of the others, so one order failing
// never blocks the rest of the batch.
//
// orderNumbers — a non-empty array of order numbers, maximum 100 per
// call. A selection larger than 100 rows must be split into batches
// of 100 and sent as separate calls (see chunkArray in
// utils/chunkArray.js).
// reason — required, cannot be blank; the same reason is applied to
// every selected order and shown to each customer.
//
// The response is always 200 OK for a well-formed request, even if
// some orders could not be rejected, so the result must be read from
// the response body rather than the HTTP status:
//   rejected_ids — order numbers rejected successfully
//   missing_ids  — order numbers that no longer exist, or are stale in
//                  the current selection; these should be dropped from
//                  the list and the selection quietly, without an error
//   failed       — orders that exist but could not be rejected; each
//                  entry is { id, error }
//   message      — a ready-made summary sentence, suitable for a toast
//   results      — one small object per rejected order:
//                  { id, order_number, payment_status, order_status,
//                  rejection_count, permanently_cancelled }.
//                  permanently_cancelled: true means that order just
//                  reached its 3rd rejection and is now cancelled.
//
// A 400 response means the request itself was invalid (empty ids,
// invalid order numbers, more than 100 ids, or a missing/blank reason)
// and nothing was processed. Refresh the QR payments list after this
// call, the same as after the single-order reject.
export const bulkRejectQrPayments = (orderNumbers, reason, signal) => {
  return axiosInstance.post(
    "/api/v1/admin/payments/qr/bulk-reject/",
    { order_numbers: orderNumbers, reason },
    { signal },
  );
};

// ----------------------------
// Extend the QR payment upload window (customer)
// ----------------------------
// The customer's "Need more time?" action. Usable exactly once per
// order, and only while the order is still "order_placed" (i.e. no
// proof uploaded yet) — extends qr_upload_deadline to 5 minutes from
// the moment this is called, not from the original deadline.
//
// Request: { order_number: string }
// Response (200): { message, qr_upload_deadline } — restart the
// countdown from this new deadline.
// Possible 400 errors (under an "error" key): not a QR order, the
// order has already moved past the upload window (proof uploaded or
// already cancelled), or the one-time extension has already been used
// for this order.
export const extendQrUploadTime = (orderNumber, signal) => {
  return axiosInstance.post(
    "/api/v1/payments/qr/extend-time/",
    { order_number: orderNumber },
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
// Effect of an accepted upload: payment.status -> "under_review". If
// the order was still "order_placed" (a first, never-uploaded QR
// order, still inside its window), it also moves straight to
// "pending_payment" in this same step, and the customer's cart —
// deliberately kept untouched until now — is cleared for the first
// time right here. If the order was already "pending_payment" (a
// retry after a rejected proof), only payment.status changes; the
// order status and the cart (already cleared long before) are
// untouched.
//
// If the 10-minute window (plus its one-time 5-minute extension, see
// extendQrUploadTime above) has already passed, this call is refused
// and the order is cancelled on the spot as a safety net — see the
// windowExpired handling in QrProofUploadForm.jsx.
//
// Retries: after the 1st or 2nd rejection a new upload is accepted.
// After the 3rd rejection the order is permanently cancelled and any
// further upload is refused. A cancelled order for any other reason is
// refused with a generic cancelled message.
//
// Response: { order_number, order_status, payment: { status,
// screenshot_url }, duplicate_warning, reopened_after_rejection }.
// reopened_after_rejection is true when this upload is a retry after
// an earlier rejection. Errors are returned under an "error" key —
// e.g. "This order has been cancelled.", "Maximum re-upload attempts
// (3) reached for this order...", or "the time window ... has
// expired and the order has been cancelled."
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
