import { useState } from "react";
import {
  BsCheckCircleFill,
  BsExclamationCircleFill,
  BsClockHistory,
} from "react-icons/bs"; // Icons for paid / rejected / under-review states
import { ORDER_STATUS, PAYMENT_METHOD } from "../../constants/statusTypes";
import QrProofUploadForm from "../payments/QrProofUploadForm";
import QrRejectionHistory from "./QrRejectionHistory";

// Small lookup table mapping each possible payment.status value (see
// PAYMENT_STATUS in constants/statusTypes.js) to a label + badge color.
// Keeping this local (rather than importing getStatusColor) since these
// badge colors are specific to this compact payment row, not the generic
// order/return/complaint badge styling used elsewhere.
//
// Exactly five values exist (pending | under_review | paid | rejected |
// refunded), for both Stripe and QR orders — under_review and rejected
// only ever actually occur on QR orders.
const PAYMENT_STATUS_CONFIG = {
  paid: {
    label: "Paid",
    className: "bg-success-light text-success",
    icon: <BsCheckCircleFill className="w-3 h-3" />,
  },
  pending: {
    label: "Payment Pending",
    className: "bg-warning-light text-warning",
    icon: null,
  },
  under_review: {
    label: "Payment Under Review",
    className: "bg-warning-light text-warning",
    icon: <BsClockHistory className="w-3 h-3" />,
  },
  rejected: {
    label: "Proof Rejected",
    className: "bg-danger-light text-danger",
    icon: <BsExclamationCircleFill className="w-3 h-3" />,
  },
  refunded: {
    label: "Refunded",
    className: "bg-gray-100 text-gray-600",
    icon: null,
  },
};

const PaymentInfo = ({ order }) => {
  // Payment sub-object shape:
  // { status, method, stripe_payment_intent_id, screenshot_url,
  //   refund_method, refund_transaction_reference, paid_at,
  //   qr_rejection_count }
  const payment = order?.payment || {};
  const paymentStatus = payment.status || "pending";
  const paymentMethod = payment.method || PAYMENT_METHOD.STRIPE;
  const config =
    PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.pending;
  const isQr = paymentMethod === PAYMENT_METHOD.QR;

  // Lets the customer open the upload/re-upload form on demand instead
  // of it always taking up space on the page.
  const [uploadOpen, setUploadOpen] = useState(false);
  // Flips to true the moment a (re-)upload succeeds in this session, so
  // the badge above updates instantly instead of waiting on a refetch
  // that the form's own mutation already triggers in the background.
  const [justUploaded, setJustUploaded] = useState(false);
  // Captures reopened_after_rejection from the upload response so the
  // just-uploaded badge can say "Under Review — Retry" after an earlier
  // rejection instead of the generic first-time "Payment Under Review"
  // wording.
  const [justUploadedAsRetry, setJustUploadedAsRetry] = useState(false);

  // A single, unified transaction reference for either payment method —
  // the QR transaction ref for QR orders, or Stripe's own PaymentIntent
  // id for card orders. Falls back to the raw stripe_payment_intent_id
  // field when no unified reference is present.
  const txnId = payment.reference || payment.stripe_payment_intent_id || "—";

  // Human-readable payment method name, e.g. "QR Payment" or "Card via
  // Stripe" — provided by the backend, with a local fallback derived from
  // payment.method when it is missing.
  const methodLabel =
    payment.method_label ||
    (isQr ? "QR Payment (Easypaisa/JazzCash)" : "Card Payment (Stripe)");

  // How many times this order's QR proof has been rejected so far —
  // included on payment whenever payment.method is "qr", 0 if it has
  // never been rejected.
  const rejectionCount = payment.qr_rejection_count || 0;
  // A QR proof can be rejected at most three times. After the third
  // rejection the order is permanently cancelled and the upload endpoint
  // refuses any further attempt.
  const MAX_QR_ATTEMPTS = 3;
  const attemptsLeft = Math.max(MAX_QR_ATTEMPTS - rejectionCount, 0);

  // isPendingPayment — the order is still waiting for its payment. A
  // rejected proof (1st or 2nd time) leaves the order in this state so
  // the customer can upload a new one.
  const isPendingPayment = order?.status === ORDER_STATUS.PENDING;

  // hasReachedRejectionCap — the order was cancelled after the third
  // rejected proof, so the customer has to contact support instead of
  // uploading again.
  const hasReachedRejectionCap =
    order?.status === ORDER_STATUS.CANCELLED &&
    rejectionCount >= MAX_QR_ATTEMPTS;

  // The customer can (re-)upload proof only while the order is still
  // waiting for its payment and nothing has been approved yet. Cancelled
  // orders are refused by the backend, so the button is never shown for
  // them.
  const canUploadProof =
    isQr &&
    isPendingPayment &&
    !justUploaded &&
    (paymentStatus === "pending" || paymentStatus === "rejected");

  return (
    // Card wrapper — white background, rounded corners, subtle border, clips overflow
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* ── Card header ── */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-900">
          Payment Information
        </h2>
      </div>

      {/* ── Payment details row ── */}
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        {/* Left group: method badge + label + transaction id */}
        <div className="flex items-center gap-4">
          {isQr ? (
            // QR payment badge — Easypaisa/JazzCash, static-image manual flow
            <div className="w-14 h-9 border border-gray-200 rounded-lg flex items-center justify-center bg-white shrink-0">
              <p className="text-xs font-bold text-primary">QR</p>
            </div>
          ) : (
            // Stripe wordmark badge — fixed width mimics a mini card/badge
            // #635bff is Stripe's own real brand purple, kept exactly as-is
            <div className="w-14 h-9 border border-gray-200 rounded-lg flex items-center justify-center bg-white shrink-0">
              <p className="text-sm font-bold text-[#635bff] italic">Stripe</p>
            </div>
          )}

          {/* Payment method name + transaction ID stacked vertically */}
          <div>
            <p className="text-sm font-medium text-gray-800">{methodLabel}</p>
            {/* Reference line — the QR transfer reference for QR orders, or
                Stripe's PaymentIntent id for card orders, both under one
                unified field so this never needs to branch by method. */}
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              Ref: {txnId}
            </p>
            {isQr && payment.screenshot_url && (
              <a
                href={payment.screenshot_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline mt-0.5 inline-block"
              >
                View uploaded screenshot
              </a>
            )}
          </div>
        </div>

        {/* ── Status badge ── driven entirely by order.payment.status */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${config.className}`}
        >
          {config.icon}
          {justUploaded
            ? justUploadedAsRetry
              ? "Under Review — Retry"
              : PAYMENT_STATUS_CONFIG.under_review.label
            : config.label}
        </span>
      </div>

      {/* Paid-at timestamp — only shown once the payment has actually been confirmed */}
      {paymentStatus === "paid" && payment.paid_at && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400">
            Paid on{" "}
            {new Date(payment.paid_at).toLocaleString("en-PK", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      )}

      {/* Rejection attempt history — mirrors the counter and per-attempt
          breakdown the admin sees on the QR verification queue, so the
          customer can see exactly how many of their three attempts have
          been used and read back every reason an admin gave, each with
          its own timestamp, rather than only the most recent one. */}
      {isQr && (
        <div className="px-5 pb-4">
          <QrRejectionHistory
            history={order?.status_history}
            rejectionCount={rejectionCount}
            maxAttempts={MAX_QR_ATTEMPTS}
          />
        </div>
      )}

      {/* Refund details — only ever set for manually-refunded QR cancellations */}
      {paymentStatus === "refunded" && payment.refund_method && (
        <div className="px-5 pb-4 flex flex-col gap-0.5">
          <p className="text-xs text-gray-400">
            Refunded manually
            {payment.refund_transaction_reference &&
              ` · Ref: ${payment.refund_transaction_reference}`}
          </p>
        </div>
      )}

      {/* Rejection notice — shown while the order is still waiting for its
          payment after a rejected proof. Tells the customer to check their
          notifications for the admin's reason, how many attempts are left,
          and to upload a corrected screenshot. */}
      {isQr &&
        isPendingPayment &&
        paymentStatus === "rejected" &&
        !justUploaded && (
          <div className="px-5 pb-4 flex flex-col gap-1">
            <p className="text-xs text-danger">
              Payment proof rejected — please upload a new proof. Check your
              notifications for the reason.
            </p>
            <p className="text-xs text-gray-400">
              {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left
            </p>
          </div>
        )}

      {/* Rejection cap reached — the order was cancelled after the third
          rejected proof and no further upload is accepted, so the upload
          button is replaced with a "contact support" message. */}
      {isQr && hasReachedRejectionCap && !justUploaded && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4">
          <p className="text-xs text-danger">
            Maximum re-upload attempts (3) reached for this order. It has been
            permanently cancelled — please contact support for help.
          </p>
        </div>
      )}

      {/* Upload / Re-upload proof — QR orders only, while still provable */}
      {canUploadProof && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4">
          {uploadOpen ? (
            <QrProofUploadForm
              orderNumber={order.order_number}
              onUploaded={(responseData) => {
                setJustUploaded(true);
                setJustUploadedAsRetry(
                  responseData?.reopened_after_rejection === true,
                );
                setUploadOpen(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {paymentStatus === "rejected"
                ? "Re-upload Payment Proof"
                : "Upload Payment Proof"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentInfo; // Export so it can be composed into the Order Detail page
