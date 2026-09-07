import { useState } from "react";
import {
  BsCheckCircleFill,
  BsExclamationCircleFill,
  BsClockHistory,
} from "react-icons/bs"; // Icons for paid / rejected / under-review states
import { PAYMENT_METHOD } from "../../constants/statusTypes";
import QrProofUploadForm from "../payments/QrProofUploadForm";

// Small lookup table mapping each possible payment.status value (see
// PAYMENT_STATUS in constants/statusTypes.js) to a label + badge color.
// Keeping this local (rather than importing getStatusColor) since these
// badge colors are specific to this compact payment row, not the generic
// order/return/complaint badge styling used elsewhere.
//
// Exactly five values exist now (pending | under_review | paid | rejected
// | refunded), for both Stripe and QR orders — under_review and rejected
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
  // Payment sub-object now comes back as:
  // { status, method, stripe_payment_intent_id, screenshot_url,
  //   refund_method, refund_transaction_reference, paid_at }
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

  // Stripe's own PaymentIntent id is the real transaction reference for
  // card orders — no more locally-generated "-PLT-ZM00" suffix.
  const txnId = payment.stripe_payment_intent_id || "—";

  // The customer can (re-)upload proof only while there's actually
  // something to prove — i.e. before an admin has approved/paid it.
  const canUploadProof =
    isQr &&
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
            <p className="text-sm font-medium text-gray-800">
              {isQr
                ? "QR Payment (Easypaisa/JazzCash)"
                : "Card Payment (Stripe · Test Mode)"}
            </p>
            {isQr ? (
              payment.screenshot_url && (
                <a
                  href={payment.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline mt-0.5 inline-block"
                >
                  View uploaded screenshot
                </a>
              )
            ) : (
              // Stripe's real PaymentIntent id — used to look this payment up in the Stripe Dashboard
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                TXN: {txnId}
              </p>
            )}
          </div>
        </div>

        {/* ── Status badge ── driven entirely by order.payment.status */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${config.className}`}
        >
          {config.icon}
          {justUploaded
            ? PAYMENT_STATUS_CONFIG.under_review.label
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

      {/* Rejection notice — tells the customer to check their notification
          for the admin's reason, and re-upload a corrected screenshot */}
      {paymentStatus === "rejected" && !justUploaded && (
        <div className="px-5 pb-4">
          <p className="text-xs text-danger">
            Your payment proof was rejected. Check your notifications for the
            reason, then upload a new screenshot below.
          </p>
        </div>
      )}

      {/* Upload / Re-upload proof — QR orders only, while still provable */}
      {canUploadProof && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4">
          {uploadOpen ? (
            <QrProofUploadForm
              orderNumber={order.order_number}
              onUploaded={() => {
                setJustUploaded(true);
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
