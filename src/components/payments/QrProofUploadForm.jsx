// QR PAYMENT PROOF UPLOAD FORM
// ============================================================
// Shared upload UI for the QR (Easypaisa/JazzCash) payment flow.
// Used in two places:
// 1. Checkout — right after an order is placed with payment_method:
//    "qr" (see QrPaymentPanel.jsx), so the customer can prove payment
//    immediately.
// 2. Order Detail — as a RE-upload, whenever an existing order's
//    payment.status is "rejected" and the customer needs to try again
//    with a new screenshot.
//
// Both cases call the exact same backend endpoint
// (POST /api/v1/payments/qr/proof/) — the backend itself decides
// whether this is a first upload or a re-upload based on the order's
// current payment.status.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HiOutlineCamera } from "react-icons/hi2";
import { uploadQrProof } from "../../api/payments.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { showError } from "../ui/Toast";

// orderNumber — required, identifies which order this proof belongs to.
// onUploaded(responseData) — called with the FULL response body right
// after a successful upload, so the parent can flip straight to its
// own "Payment Under Review" state without waiting on a refetch.
// UPDATED (Sep 2026, API 74.1 backend fix): the response now also
// carries order_status ("pending_payment" for a first-time review,
// "on_hold" for a retry after an earlier rejection) and
// reopened_after_rejection (boolean) alongside the existing "payment"
// object — passing the whole response lets callers distinguish a
// first upload from a retry instead of only seeing payment.status.
const QrProofUploadForm = ({ orderNumber, onUploaded }) => {
  const queryClient = useQueryClient();
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [transactionIdError, setTransactionIdError] = useState("");

  // Transaction ID is optional, but once the customer types something
  // it should actually look like a real reference number rather than
  // stray punctuation or keyboard-mashing — an empty value always
  // passes, since the field itself is optional.
  const validateTransactionId = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.length < 4) return "Transaction ID looks too short.";
    if (trimmed.length > 40) return "Transaction ID is too long.";
    if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
      return "Only letters, numbers, and hyphens are allowed.";
    }
    if (/(.)\1{3,}/.test(trimmed)) {
      return "Please enter a valid transaction ID.";
    }
    return "";
  };

  const uploadMutation = useMutation({
    mutationFn: () =>
      uploadQrProof({
        order_number: orderNumber,
        screenshot,
        transaction_id: transactionId.trim() || undefined,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
      });
      // Pass the full response body (not just .payment) so callers can
      // also read order_status / reopened_after_rejection — see the
      // comment on the onUploaded prop above.
      onUploaded?.(response.data);
    },
    onError: (error) => {
      // UPDATED (Sep 2026, API 74.1 backend fix): the new rejection-cap
      // and cancelled-order errors come back under an "error" key
      // (e.g. "Maximum re-upload attempts (3) reached for this
      // order..."), not "message" — checking both keeps every error
      // message from this endpoint visible to the customer.
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to upload payment proof. Please try again.",
      );
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setFieldError("");
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!screenshot) {
      setFieldError("Please attach a screenshot of your payment.");
      return;
    }
    const transactionIdValidationError = validateTransactionId(transactionId);
    if (transactionIdValidationError) {
      setTransactionIdError(transactionIdValidationError);
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Payment Screenshot
        </label>

        {previewUrl ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
            <img
              src={previewUrl}
              alt="Payment screenshot preview"
              className="w-full h-full object-contain bg-gray-50"
            />
            <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-xs font-semibold text-gray-700 rounded-lg cursor-pointer hover:bg-white transition-colors">
              Change
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
            <HiOutlineCamera className="w-6 h-6" />
            <span className="text-sm font-medium">
              Tap to attach a screenshot
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}

        {fieldError && <p className="text-xs text-danger">{fieldError}</p>}
      </div>

      <Input
        label="Transaction ID (optional)"
        placeholder="e.g. the reference number from your app"
        value={transactionId}
        onChange={(e) => {
          setTransactionId(e.target.value);
          if (transactionIdError) setTransactionIdError("");
        }}
        onBlur={() =>
          setTransactionIdError(validateTransactionId(transactionId))
        }
        error={transactionIdError}
      />

      <Button
        onClick={handleSubmit}
        isLoading={uploadMutation.isPending}
        fullWidth
      >
        Submit Payment Proof
      </Button>
    </div>
  );
};

export default QrProofUploadForm;
