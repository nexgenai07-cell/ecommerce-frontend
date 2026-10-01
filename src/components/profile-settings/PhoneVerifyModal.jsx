// PHONE CHANGE MODAL
// ============================================================
// The two-step flow for changing the account's phone number, mirroring
// ChangeEmailModal:
//
//   Step 1 — the customer types the new number. Submitting it asks the
//            backend to email a 6-digit code to the account's own
//            registered email address (not to the new number — there is
//            no SMS gateway).
//   Step 2 — the customer enters that code. Only a valid, unexpired code
//            changes the phone number, and phone_verified becomes true at
//            the same moment.
//
// The profile form itself never edits the phone number; this modal is the
// only way to change it.
//
// Deliberately built as its own small local-state form rather than
// react-hook-form + zod, matching ChangeEmailModal's reasoning — this is
// a short, server-driven flow, not a large validated form.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";
import { requestPhoneChange, confirmPhoneChange } from "../../api/auth.api";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

// Same Pakistani phone format validated on the registration form, so the
// account-level phone number follows the exact same rule as the one
// collected at sign-up.
const PHONE_PATTERN = /^(\+92|0)[0-9]{10}$/;

// currentPhone — the account's present phone number, used to stop the
//   customer from "changing" to the number they already have.
// onClose — called when the modal is dismissed, whether or not the change
//   was completed.
// onSuccess — called with the fresh, already-updated profile object once
//   the code is confirmed, the same shape ChangeEmailModal hands back.
const PhoneVerifyModal = ({ isOpen, currentPhone, onClose, onSuccess }) => {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");

  const resetState = () => {
    setStep("phone");
    setPhone("");
    setPhoneError("");
    setOtp("");
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  // =============================================
  // STEP 1 — POST /api/v1/auth/me/phone/change/
  // =============================================
  const requestMutation = useMutation({
    mutationFn: (newPhone) => requestPhoneChange(newPhone),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message ||
          "A verification code has been sent to your email.",
      );
      setStep("otp");
    },
    onError: (error) => {
      showError(
        getApiErrorMessage(
          error,
          "Failed to send the verification code. Please try again.",
        ),
      );
    },
  });

  // =============================================
  // STEP 2 — POST /api/v1/auth/me/phone/confirm/
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
        getApiErrorMessage(
          error,
          "Failed to confirm the code. Please try again.",
        ),
      );
    },
  });

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    const trimmedPhone = phone.trim();

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setPhoneError("Please enter a valid Pakistani phone number");
      return;
    }
    if (trimmedPhone === (currentPhone || "")) {
      setPhoneError("That is already your current phone number");
      return;
    }

    setPhoneError("");
    requestMutation.mutate(trimmedPhone);
  };

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return;
    confirmMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Phone Number"
      size="sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineDevicePhoneMobile className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">
            {step === "phone"
              ? "Enter your new phone number. We'll email a 6-digit code to your registered email address to confirm it."
              : `Enter the 6-digit code we emailed to your registered email address to confirm ${phone.trim()}.`}
          </p>
        </div>

        {step === "phone" ? (
          <form
            onSubmit={handlePhoneSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <Input
              label="New Phone Number"
              type="tel"
              placeholder="03001234567"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError("");
              }}
              error={phoneError}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={requestMutation.isPending}
                disabled={!phone.trim()}
              >
                Send Code
              </Button>
            </div>
          </form>
        ) : (
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
              onClick={() => requestMutation.mutate(phone.trim())}
              disabled={requestMutation.isPending}
              className="self-start text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestMutation.isPending ? "Resending..." : "Resend code"}
            </button>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                }}
                disabled={confirmMutation.isPending}
              >
                Back
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
        )}
      </div>
    </Modal>
  );
};

export default PhoneVerifyModal;
