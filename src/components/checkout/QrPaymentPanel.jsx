// ============================================================
// QR PAYMENT PANEL — CHECKOUT
// ============================================================
// Shown in place of the Stripe Payment Element whenever the customer
// checked out with payment_method: "qr". Checkout's response for a QR
// order includes "qr_image_url" (a static, config-driven image — one
// per gateway, not generated per transaction) and "payment_reference"
// (the order_number, to write in the bank transfer note).
//
// Flow on this screen:
// 1. Customer sees the QR code + payment reference, pays outside the
//    system (Easypaisa/JazzCash app).
// 2. Customer uploads a screenshot as proof (QrProofUploadForm).
// 3. Once uploaded, payment.status becomes "under_review" and this
//    panel switches to a waiting state — the order itself stays
//    "pending_payment" until an admin manually approves the proof.

import { useState } from "react";
import { HiCheckCircle, HiOutlineClock } from "react-icons/hi2";
import QrProofUploadForm from "../payments/QrProofUploadForm";

const QrPaymentPanel = ({ orderNumber, qrImageUrl, paymentReference }) => {
  // Tracks whether proof has been submitted yet in THIS session — once
  // true, the upload form is replaced with the "Under Review" state.
  // (If the customer reloads the page, the Order Detail page itself
  // is the source of truth for payment.status going forward — this is
  // just what Checkout shows immediately after the upload succeeds.)
  const [proofSubmitted, setProofSubmitted] = useState(false);

  if (proofSubmitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-full bg-warning-light flex items-center justify-center">
          <HiOutlineClock className="w-7 h-7 text-warning" />
        </span>
        <h2 className="text-lg font-bold text-gray-900">
          Payment Under Review
        </h2>
        <p className="text-sm text-gray-500 max-w-sm">
          We've received your payment proof for order{" "}
          <span className="font-semibold text-gray-700">{orderNumber}</span>.
          Our team will verify it shortly and confirm your order — you'll get a
          notification either way.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <h2 className="text-lg font-bold text-gray-900">
          Scan &amp; Pay via Easypaisa / JazzCash
        </h2>
        <div className="w-48 h-48 rounded-xl border border-gray-200 p-3 bg-white">
          <img
            src={qrImageUrl}
            alt="QR code for Easypaisa/JazzCash payment"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
          <span className="text-xs text-gray-400">
            Write this reference in your transfer note:
          </span>
          <span className="text-sm font-mono font-bold text-gray-900">
            {paymentReference}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <HiCheckCircle className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-gray-900">
            Already paid? Upload your proof below
          </p>
        </div>
        <QrProofUploadForm
          orderNumber={orderNumber}
          onUploaded={() => setProofSubmitted(true)}
        />
      </div>
    </div>
  );
};

export default QrPaymentPanel;
