// ============================================================
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
// onUploaded(paymentData) — called with the response's "payment" object
// right after a successful upload, so the parent can flip straight to
// its own "Payment Under Review" state without waiting on a refetch.
const QrProofUploadForm = ({ orderNumber, onUploaded }) => {
  const queryClient = useQueryClient();
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [fieldError, setFieldError] = useState("");

  const uploadMutation = useMutation({
    mutationFn: () =>
      uploadQrProof({
        order_number: orderNumber,
        screenshot,
        transaction_id: transactionId || undefined,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ORDER_DETAIL(orderNumber),
      });
      onUploaded?.(response.data?.payment);
    },
    onError: (error) => {
      showError(
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
        onChange={(e) => setTransactionId(e.target.value)}
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
