// CHANGE EMAIL MODAL
// ============================================================
// Two-step, OTP-verified email change flow (API 8.1 / API 8.2):
//
// Step 1 ("request") — the user enters their current password and
// the new email address they want to switch to. On success, the
// backend emails a 6-digit code to that NEW address and the modal
// moves to step 2. The account's email is NOT changed yet at this
// point.
//
// Step 2 ("confirm") — the user enters the 6-digit code they
// received. On success, the backend actually updates the account's
// email and marks it verified, and this component hands the fresh
// profile object back to the parent via onSuccess so the rest of the
// page (and the navbar) can update immediately without a refresh.
//
// Deliberately built as its own small local-state form rather than
// react-hook-form + zod, since it's a simple two-field / one-field
// sequential flow with server-driven error messages, not a large
// validated form like the other profile-settings components.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HiOutlineEnvelope } from "react-icons/hi2";
import { requestEmailChange, confirmEmailChange } from "../../api/auth.api";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

const ChangeEmailModal = ({ isOpen, onClose, onSuccess }) => {
  // "request" -> step 1 (password + new email), "confirm" -> step 2 (OTP)
  const [step, setStep] = useState("request");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Resets every field back to its initial state — called whenever the
  // modal is closed, so re-opening it later always starts fresh at
  // step 1 instead of showing whatever was left over from last time.
  const resetState = () => {
    setStep("request");
    setPassword("");
    setNewEmail("");
    setOtp("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // =============================================
  // STEP 1 — POST /api/v1/auth/me/email/change/ (API 8.1)
  // =============================================
  const requestMutation = useMutation({
    mutationFn: () => requestEmailChange({ password, new_email: newEmail }),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message ||
          `A verification code has been sent to ${newEmail}.`,
      );
      setStep("confirm");
    },
    onError: (error) => {
      // API 8.1's error responses are returned under an "error" key
      // (e.g. "Incorrect password.", "That is already your current
      // email address.", "A user with this email already exists.")
      showError(
        error?.response?.data?.error ||
          "Failed to start the email change. Please try again.",
      );
    },
  });

  // =============================================
  // STEP 2 — POST /api/v1/auth/me/email/confirm/ (API 8.2)
  // =============================================
  const confirmMutation = useMutation({
    mutationFn: () => confirmEmailChange({ otp }),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message || "Email address updated successfully.",
      );
      // Hand the fresh, already-updated profile object (with the new
      // email, now verified) back up to the parent so it can update
      // both the TanStack Query cache and the Redux auth state
      // immediately — see PersonalInfoForm.jsx's usage of this prop.
      onSuccess?.(response?.data?.user);
      resetState();
      onClose();
    },
    onError: (error) => {
      // API 8.2's error responses are also returned under "error"
      // (e.g. "Invalid code.", "Code has expired. Please request a
      // new one.", "That email is no longer available.")
      showError(
        error?.response?.data?.error ||
          "Failed to confirm the code. Please try again.",
      );
    },
  });

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!password || !newEmail) return;
    requestMutation.mutate();
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
      title={
        step === "request" ? "Change Email Address" : "Enter Verification Code"
      }
      size="sm"
    >
      <div className="flex flex-col gap-5">
        {/* Icon badge — matches the visual language used by the rest
            of the profile-settings cards (gradient rounded square) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineEnvelope className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500">
            {step === "request"
              ? "Confirm your password and enter the new address you'd like to use."
              : `Enter the 6-digit code sent to ${newEmail}.`}
          </p>
        </div>

        {step === "request" ? (
          <form
            onSubmit={handleRequestSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="New Email Address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
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
                disabled={!password || !newEmail}
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
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
              className="self-start text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestMutation.isPending ? "Resending..." : "Resend code"}
            </button>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("request")}
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

export default ChangeEmailModal;
