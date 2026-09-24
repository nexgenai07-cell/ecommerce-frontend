// ============================================================
// QR PAYMENT PANEL — CHECKOUT
// ============================================================
// Shown in place of the Stripe Payment Element whenever the customer
// checked out with payment_method: "qr". Checkout's response for a QR
// order includes "qr_image_url" (a static, config-driven image — one
// per gateway, not generated per transaction), "payment_reference"
// (the order_number, to write in the bank transfer note), and
// "qr_upload_deadline" (an ISO timestamp — 10 minutes from the moment
// the order was placed).
//
// Flow on this screen:
// 1. Customer sees the QR code + payment reference + a live countdown,
//    pays outside the system (Easypaisa/JazzCash app).
// 2. Customer uploads a screenshot as proof (QrProofUploadForm) any
//    time before the countdown reaches zero. Uploading is what clears
//    the cart and moves the order to "pending_payment" — until then,
//    the cart is left untouched, so a customer who never pays keeps
//    everything they had.
// 3. If the countdown reaches zero with no upload, a one-time "Need
//    more time?" button appears, extending the window by 5 minutes.
//    If that also passes with no upload, a background job cancels the
//    order automatically (this panel treats a still-expired, already-
//    extended window the same way, as a courtesy, without waiting for
//    a page refresh to find out).
// 4. Once uploaded, payment.status becomes "under_review" and this
//    panel switches to a waiting state — the order itself stays
//    "pending_payment" until an admin manually approves the proof.

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  HiCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { Link } from "react-router-dom";
import QrProofUploadForm from "../payments/QrProofUploadForm"; // Form component for uploading payment screenshot
import { extendQrUploadTime } from "../../api/payments.api";
import { ROUTES } from "../../constants/routes";
import { showError, showSuccess } from "../ui/Toast";
import Button from "../ui/Button";
import fallbackQrImage from "../../assets/easypaisa-jazzcash-qr.png"; // TEMPORARY: local placeholder QR image until backend provides qr_image_url

// Turns an ISO deadline timestamp into whole seconds remaining until
// it, clamped to 0 rather than going negative once it's passed.
const secondsUntil = (deadline) => {
  if (!deadline) return 0;
  const diffMs = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 1000));
};

// Formats a whole-seconds count as "MM:SS" for the countdown display.
const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

// onProofUploaded() — called the moment proof upload succeeds, so the
// parent Checkout page can clear the cart at exactly this point (not
// when the order was first placed) and freeze its order-summary
// snapshot, matching the backend's own cart-preservation behavior.
//
// qrExtensionUsed — the REAL, backend-confirmed value of the order's
// qr_extension_used field, as of whenever this panel last received
// fresh order data. Only ever meaningful on a page (like Order Detail)
// that re-renders this panel with real order data on every visit —
// Checkout doesn't pass this at all, since a QR order it just placed
// has never had its extension used yet. Without this, a customer who
// used their one-time extension, then left and came back later, would
// see the "Need more time?" button again (it would just fail when
// clicked, since the backend still correctly remembers the extension
// was already used — but showing it at all is misleading).
const QrPaymentPanel = ({
  orderNumber,
  qrImageUrl,
  paymentReference,
  qrUploadDeadline,
  qrExtensionUsed = false,
  onProofUploaded,
}) => {
  // Tracks whether proof has been submitted yet in THIS session — once
  // true, the upload form is replaced with the "Under Review" state.
  const [proofSubmitted, setProofSubmitted] = useState(false);

  // Set when either the upload form itself reports the "window expired
  // and the order has been cancelled" error, or this panel's own
  // countdown runs out a second time after the one-time extension was
  // already used — see the render logic below.
  const [windowCancelled, setWindowCancelled] = useState(false);

  // The deadline currently in effect — starts as whatever Checkout
  // received when the order was placed, and is replaced with the new,
  // 5-minutes-later value the moment the one-time extension succeeds.
  const [deadline, setDeadline] = useState(qrUploadDeadline || null);
  // Starts from the backend-confirmed qrExtensionUsed prop (true for a
  // returning visit where the extension was already used in an earlier
  // session), then flips to true locally the moment a fresh extension
  // succeeds in THIS session — see extendMutation below.
  const [extensionUsed, setExtensionUsed] = useState(!!qrExtensionUsed);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(qrUploadDeadline),
  );

  // Ticks secondsLeft down once a second from the current deadline.
  // Stops entirely once proof is submitted or the order is cancelled —
  // there's nothing left to count down toward at that point. The first
  // tick is deferred via setTimeout rather than called directly in the
  // effect body, so the state update happens asynchronously instead of
  // synchronously re-rendering mid-effect.
  useEffect(() => {
    if (!deadline || proofSubmitted || windowCancelled) return undefined;

    const tick = () => setSecondsLeft(secondsUntil(deadline));
    const immediate = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [deadline, proofSubmitted, windowCancelled]);

  const windowExpired = !!deadline && secondsLeft <= 0;

  // =============================================
  // "NEED MORE TIME?" — one-time 5-minute extension
  // =============================================
  const extendMutation = useMutation({
    mutationFn: () => extendQrUploadTime(orderNumber),
    onSuccess: (response) => {
      setDeadline(response.data?.qr_upload_deadline);
      setExtensionUsed(true);
      showSuccess(
        response.data?.message ||
          "You have been given 5 more minutes to upload your payment proof.",
      );
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error ||
          "Couldn't extend the upload window. Please try uploading your proof now.",
      );
    },
  });

  // TEMPORARY: use the backend-provided QR image if it exists, otherwise fall back to the local placeholder image
  const displayedQrImage = qrImageUrl || fallbackQrImage;

  // =============================================
  // STATE 1 — proof already submitted this session
  // =============================================
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

  // =============================================
  // STATE 2 — the upload window is gone for good: either the upload
  // form itself was refused with the "expired and cancelled" error, or
  // the one-time extension was already used and its own 5 minutes have
  // now also run out with nothing uploaded.
  // =============================================
  if (windowCancelled || (windowExpired && extensionUsed)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center">
          <HiOutlineExclamationTriangle className="w-7 h-7 text-danger" />
        </span>
        <h2 className="text-lg font-bold text-gray-900">
          Payment Window Expired
        </h2>
        <p className="text-sm text-gray-500 max-w-sm">
          The time to upload payment proof for order{" "}
          <span className="font-semibold text-gray-700">{orderNumber}</span> has
          passed, so it's been cancelled. Nothing was charged, and the items are
          still in your cart — you're welcome to check out again.
        </p>
        <Link to={ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber)}>
          <Button variant="outline" className="mt-1">
            View Order
          </Button>
        </Link>
      </div>
    );
  }

  // =============================================
  // STATE 3 — countdown reached zero, but the one-time extension is
  // still available.
  // =============================================
  if (windowExpired) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-full bg-warning-light flex items-center justify-center">
          <HiOutlineClock className="w-7 h-7 text-warning" />
        </span>
        <h2 className="text-lg font-bold text-gray-900">Time's Up</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Your 10-minute window to upload payment proof has ended. You can get 5
          more minutes, once, to finish uploading.
        </p>
        <Button
          onClick={() => extendMutation.mutate()}
          isLoading={extendMutation.isPending}
          className="mt-1"
        >
          Need more time?
        </Button>
      </div>
    );
  }

  // =============================================
  // STATE 4 — normal state: QR code, countdown, and the upload form
  // =============================================
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <h2 className="text-lg font-bold text-gray-900">
          Scan &amp; Pay via Easypaisa / JazzCash
        </h2>

        {/* Countdown — only shown once a deadline actually exists (a
            resumed order that has already moved past order_placed
            would have no deadline, but by then this panel is replaced
            by the "Payment Under Review" state above anyway). */}
        {deadline && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning-light text-warning text-xs font-bold">
            <HiOutlineClock className="w-3.5 h-3.5" />
            Upload proof within {formatCountdown(secondsLeft)}
            {extensionUsed && " (extended)"}
          </div>
        )}

        <div className="w-48 h-48 rounded-xl border border-gray-200 p-3 bg-white">
          <img
            src={displayedQrImage} // Uses backend QR image when available, otherwise the temporary local placeholder
            alt="QR code for Easypaisa/JazzCash payment" // Accessible description of the image for screen readers
            className="w-full h-full object-contain" // Keeps QR code proportions intact within its container
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
          onUploaded={() => {
            setProofSubmitted(true);
            onProofUploaded?.();
          }}
          onWindowExpired={() => setWindowCancelled(true)}
        />
      </div>
    </div>
  );
};

export default QrPaymentPanel;
