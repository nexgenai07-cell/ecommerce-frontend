// PHONE VERIFY MODAL
// ============================================================
// Confirms a new phone number entered on the Personal Information
// form before it is actually saved to the account.
//
// Unlike ChangeEmailModal (which has its own two-step "enter new
// value, then enter code" flow), the new number here has already
// been typed into the main form and submitted via Save Changes — this
// modal only handles the verification half: it sends a 6-digit code
// to the account's registered email the moment it opens, the customer
// enters that code, and on success the account's phone number and
// phone_verified flag are updated together.
//
// Deliberately built as its own small local-state form rather than
// react-hook-form + zod, matching ChangeEmailModal's reasoning — this
// is a single-field, server-driven flow, not a large validated form.

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";
import { requestPhoneChange, confirmPhoneChange } from "../../api/auth.api";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

// phone — the new number the customer typed on the main form and is
//   trying to switch to; used both to display in the modal copy and
//   as the value sent to requestPhoneChange
// onCancel — called when the customer closes the modal without
//   completing verification; the parent form uses this to restore the
//   phone field back to the account's current (still-saved) number
// onSuccess — called with the fresh, already-updated profile object
//   once the code is confirmed, same shape ChangeEmailModal hands back
const PhoneVerifyModal = ({ isOpen, phone, onCancel, onSuccess }) => {
  const [otp, setOtp] = useState("");
  // Guards against sending a second code on a re-render while the
  // modal is already open — the code is only ever sent once per open.
  const hasSentRef = useRef(false);

  const resetState = () => {
    setOtp("");
    hasSentRef.current = false;
  };

  const handleCancel = () => {
    resetState();
    onCancel?.();
  };

  // =============================================
  // SEND CODE — POST /api/v1/auth/me/phone/change/
  // =============================================
  const requestMutation = useMutation({
    mutationFn: () => requestPhoneChange(phone),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message ||
          "A verification code has been sent to your email.",
      );
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error ||
          "Failed to send the verification code. Please try again.",
      );
      handleCancel();
    },
  });

  // Sends the code exactly once, right when the modal opens with a
  // new phone value to verify.
  useEffect(() => {
    if (isOpen && phone && !hasSentRef.current) {
      hasSentRef.current = true;
      requestMutation.mutate();
    }
    if (!isOpen) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, phone]);

  // =============================================
  // CONFIRM CODE — POST /api/v1/auth/me/phone/confirm/
  // =============================================
  const confirmMutation = useMutation({
    mutationFn: () => confirmPhoneChange({ otp }),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message || "Phone number updated successfully.",
      );
      onSuccess?.(response?.data?.user);
      resetState();
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error ||
          "Failed to confirm the code. Please try again.",
      );
    },
  });

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return;
    confirmMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Verify Your New Number"
      size="sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineDevicePhoneMobile className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">
            Enter the 6-digit code sent to your registered email to confirm{" "}
            {phone}.
          </p>
        </div>

        <form
          onSubmit={handleConfirmSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <Input
            label="6-Digit Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
          />
          <button
            type="button"
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
            className="self-start text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requestMutation.isPending ? "Resending..." : "Resend code"}
          </button>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={confirmMutation.isPending}
              disabled={otp.trim().length !== 6}
            >
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default PhoneVerifyModal;
