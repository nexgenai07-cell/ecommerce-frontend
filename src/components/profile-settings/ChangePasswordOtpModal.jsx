// CHANGE PASSWORD OTP MODAL
// ============================================================
// Second step of the two-step, code-verified password change.
//
// The first step (in ChangePasswordForm) validates the current and new
// password and makes the backend email a 6-digit code to the account's
// address. The password has NOT changed at that point. This modal
// collects that code and confirms it; only a successful confirmation
// changes the password.
//
// Behaviors handled here:
// - Digits only, exactly six, before Confirm is enabled.
// - Resend, which repeats step 1 with the same validated values through
//   the onResend callback owned by the parent form.
// - Server messages are shown inline. When the server says the request
//   is no longer usable (too many wrong attempts, expired code, or no
//   pending change), the modal reports it to the parent through
//   onRestartRequired so the customer starts over from the form.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { confirmPasswordChange } from "../../api/auth.api";
import { showSuccess } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

// Messages that mean the pending change can no longer be confirmed and a
// new code has to be requested from the form.
const RESTART_MESSAGE_PATTERN =
  /too many wrong attempts|expired|no pending password change/i;

const ChangePasswordOtpModal = ({
  isOpen, // boolean — whether the modal is visible
  email, // string — optional address the code was sent to, used in the helper text
  onClose, // function — called when the customer dismisses the modal
  onSuccess, // function — called after the password was changed successfully
  onResend, // function — asks the parent to send a fresh code; returns a promise
  isResending, // boolean — true while a resend request is in flight
  onRestartRequired, // function — called when the pending change is gone and the form must be submitted again
}) => {
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const resetState = () => {
    setOtp("");
    setErrorMessage("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const confirmMutation = useMutation({
    mutationFn: () => confirmPasswordChange({ otp }),

    onSuccess: (response) => {
      showSuccess(response?.data?.message || "Password changed successfully.");
      resetState();
      onSuccess?.();
    },

    onError: (error) => {
      const message =
        error?.response?.data?.error ||
        "Failed to confirm the code. Please try again.";

      if (RESTART_MESSAGE_PATTERN.test(message)) {
        resetState();
        onRestartRequired?.(message);
        return;
      }

      setErrorMessage(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length !== 6 || confirmMutation.isPending) return;
    setErrorMessage("");
    confirmMutation.mutate();
  };

  const handleResend = async () => {
    setErrorMessage("");
    setOtp("");
    await onResend?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirm Password Change"
      size="sm"
      closeOnBackdrop={!confirmMutation.isPending}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineShieldCheck className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">
            {email
              ? `Enter the 6-digit code sent to ${email}. Your password changes only after the code is confirmed.`
              : "Enter the 6-digit code sent to your email. Your password changes only after the code is confirmed."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <Input
            label="6-Digit Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (errorMessage) setErrorMessage("");
            }}
            error={errorMessage}
            hint="The code is valid for 10 minutes."
            required
          />

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || confirmMutation.isPending}
            className="self-start text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Resending..." : "Resend code"}
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={confirmMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={confirmMutation.isPending}
              disabled={otp.length !== 6}
            >
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ChangePasswordOtpModal;
