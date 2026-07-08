import { BsCheckCircleFill, BsExclamationCircleFill } from "react-icons/bs"; // Icons for paid / failed states

// Small lookup table mapping each possible payment.status value (see
// PAYMENT_STATUS in constants/statusTypes.js) to a label + badge color.
// Keeping this local (rather than importing getStatusColor) since these
// badge colors are specific to this compact payment row, not the generic
// order/return/complaint badge styling used elsewhere.
const PAYMENT_STATUS_CONFIG = {
  paid: {
    label: "Paid",
    className: "bg-success-light text-success",
    icon: <BsCheckCircleFill className="w-3 h-3" />,
  },
  pending: {
    label: "Payment Pending",
    className: "bg-warning-light text-warning", // FIXED — was bg-yellow-100 text-yellow-800 (not a real token)
    icon: null,
  },
  failed: {
    label: "Payment Failed",
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
  // Payment sub-object comes from API 54 as:
  // { "status": "", "stripe_payment_intent_id": "", "paid_at": "" }
  const paymentStatus = order?.payment?.status || "pending";
  const config =
    PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.pending;

  // Stripe's own PaymentIntent id is the real transaction reference now —
  // no more locally-generated "-PLT-ZM00" suffix.
  const txnId = order?.payment?.stripe_payment_intent_id || "—";

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
        {/* Left group: Stripe badge + label + transaction id */}
        <div className="flex items-center gap-4">
          {/* Stripe wordmark badge — fixed width mimics a mini card/badge
              #635bff is Stripe's own real brand purple, kept exactly as-is */}
          <div className="w-14 h-9 border border-gray-200 rounded-lg flex items-center justify-center bg-white shrink-0">
            <p className="text-sm font-bold text-[#635bff] italic">Stripe</p>
          </div>

          {/* Payment method name + transaction ID stacked vertically */}
          <div>
            <p className="text-sm font-medium text-gray-800">
              Card Payment (Stripe · Test Mode)
            </p>
            {/* Stripe's real PaymentIntent id — used to look this payment up in the Stripe Dashboard */}
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              TXN: {txnId}
            </p>
          </div>
        </div>

        {/* ── Status badge ── driven entirely by order.payment.status */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${config.className}`}
        >
          {config.icon}
          {config.label}
        </span>
      </div>

      {/* Paid-at timestamp — only shown once the webhook has actually confirmed payment */}
      {paymentStatus === "paid" && order?.payment?.paid_at && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400">
            Paid on{" "}
            {new Date(order.payment.paid_at).toLocaleString("en-PK", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentInfo; // Export so it can be composed into the Order Detail page
