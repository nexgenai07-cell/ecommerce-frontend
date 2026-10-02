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
// Only a Pakistani mobile number is accepted, written either in the local
// form (03XXXXXXXXX) or in the international form (+923XXXXXXXXX). Spaces
// and dashes typed by the customer are ignored.
//
// Deliberately built as its own small local-state form rather than
// react-hook-form + zod, matching ChangeEmailModal's reasoning — this is
// a short, server-driven flow, not a large validated form.

// React state hook used to track the current step and every input value
import { useState } from "react";
// TanStack Query mutation hook used to call the two backend endpoints
import { useMutation } from "@tanstack/react-query";
// Phone icon displayed in the modal's header badge
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";
// API functions for requesting and confirming a phone number change
import { requestPhoneChange, confirmPhoneChange } from "../../api/auth.api";
// Extracts the most readable message from a failed backend response
import getApiErrorMessage from "../../utils/getApiErrorMessage";
// Toast helpers used to report success and failure to the customer
import { showSuccess, showError } from "../ui/Toast";
// Shared modal shell that provides the backdrop, header and close button
import Modal from "../ui/Modal";
// Shared text input with label and error support
import Input from "../ui/Input";
// Shared button component
import Button from "../ui/Button";

// Accepts exactly two shapes once spaces and dashes are removed:
// a local number (03 followed by 9 digits, 11 digits in total) or an
// international number (+92, then 3, then 9 digits).
const PAKISTANI_MOBILE_PATTERN = /^(03\d{9}|\+923\d{9})$/;

// Message shown when the typed value is not a valid Pakistani mobile number
const INVALID_PHONE_MESSAGE =
  "Enter a valid Pakistani mobile number. It must start with 03 (11 digits, e.g. 03001234567) or +92 (e.g. +923001234567).";

// Removes every space and dash so "0300 1234567" and "0300-1234567" are
// treated exactly like "03001234567"
const removeSpacesAndDashes = (rawValue) =>
  (rawValue || "").replace(/[\s-]/g, "");

// Converts the international form (+923XXXXXXXXX) to the local form
// (03XXXXXXXXX) so the same number written in either form compares as equal
const toLocalPhoneForm = (phone) =>
  phone.startsWith("+92") ? `0${phone.slice(3)}` : phone;

// currentPhone — the account's present phone number, used to stop the
//   customer from "changing" to the number they already have.
// onClose — called when the modal is dismissed, whether or not the change
//   was completed.
// onSuccess — called with the fresh, already-updated profile object once
//   the code is confirmed, the same shape ChangeEmailModal hands back.
const PhoneVerifyModal = ({ isOpen, currentPhone, onClose, onSuccess }) => {
  // "phone" shows the number entry form, "otp" shows the code entry form
  const [step, setStep] = useState("phone");
  // The new phone number exactly as the customer is typing it
  const [phone, setPhone] = useState("");
  // Inline validation message displayed under the phone input
  const [phoneError, setPhoneError] = useState("");
  // The 6-digit verification code typed in step 2
  const [otp, setOtp] = useState("");

  // Returns every field to its initial state so the next time the modal
  // opens it always starts clean at step 1
  const resetState = () => {
    // Go back to the number entry form
    setStep("phone");
    // Clear the typed phone number
    setPhone("");
    // Clear any inline validation message
    setPhoneError("");
    // Clear the typed verification code
    setOtp("");
  };

  // Resets the form and then informs the parent that the modal was dismissed
  const handleClose = () => {
    // Discard any half-entered data
    resetState();
    // Let the parent hide the modal
    onClose?.();
  };

  // =============================================
  // STEP 1 — POST /api/v1/auth/me/phone/change/
  // =============================================
  const requestMutation = useMutation({
    // Sends the already-cleaned phone number to the backend
    mutationFn: (newPhone) => requestPhoneChange(newPhone),
    // Runs when the backend accepted the number and emailed the code
    onSuccess: (response) => {
      // Tell the customer the code went to their account email
      showSuccess(
        response?.data?.message ||
          "A verification code has been sent to your email.",
      );
      // Move on to the code entry form
      setStep("otp");
    },
    // Runs when the backend rejected the request
    onError: (error) => {
      // Show the backend's own explanation, with a generic fallback
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
    // Sends the 6-digit code for verification
    mutationFn: () => confirmPhoneChange({ otp }),
    // Runs when the code was valid and the phone number has changed
    onSuccess: (response) => {
      // Confirm the change to the customer
      showSuccess(
        response?.data?.message || "Phone number updated successfully.",
      );
      // Hand the refreshed profile back to the parent
      onSuccess?.(response?.data?.user);
      // Clear the modal state for the next use
      resetState();
    },
    // Runs when the code was wrong or expired
    onError: (error) => {
      // Show the backend's own explanation, with a generic fallback
      showError(
        getApiErrorMessage(
          error,
          "Failed to confirm the code. Please try again.",
        ),
      );
    },
  });

  // Validates the typed number locally and, when it is acceptable,
  // asks the backend to email the verification code
  const handlePhoneSubmit = (e) => {
    // Stop the browser from performing a full page form submission
    e.preventDefault();
    // The value that is validated, compared and sent to the backend
    const cleanedPhone = removeSpacesAndDashes(phone);

    // Nothing left after removing spaces and dashes means no number was given
    if (!cleanedPhone) {
      setPhoneError("Phone number is required.");
      return;
    }

    // Reject anything that is not a valid Pakistani mobile number
    if (!PAKISTANI_MOBILE_PATTERN.test(cleanedPhone)) {
      setPhoneError(INVALID_PHONE_MESSAGE);
      return;
    }

    // The same number written in the other form counts as the current number
    if (
      toLocalPhoneForm(cleanedPhone) ===
      toLocalPhoneForm(removeSpacesAndDashes(currentPhone))
    ) {
      setPhoneError("That is already your current phone number.");
      return;
    }

    // The number is acceptable, so clear any previous message
    setPhoneError("");
    // Ask the backend to email the verification code
    requestMutation.mutate(cleanedPhone);
  };

  // Submits the typed verification code once it is complete
  const handleConfirmSubmit = (e) => {
    // Stop the browser from performing a full page form submission
    e.preventDefault();
    // A code is only submitted when all 6 digits are present
    if (otp.trim().length !== 6) return;
    // Ask the backend to verify the code
    confirmMutation.mutate();
  };

  return (
    // Modal shell controlled by the parent through isOpen
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Phone Number"
      size="sm"
    >
      {/* Vertical stack holding the header row and the active form */}
      <div className="flex flex-col gap-5">
        {/* Icon badge and short instruction, matching the other profile modals */}
        <div className="flex items-center gap-3">
          {/* Gradient rounded square that frames the phone icon */}
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineDevicePhoneMobile className="w-5 h-5 text-white" />
          </div>
          {/* Instruction text that changes with the current step */}
          <p className="text-sm text-gray-500">
            {step === "phone"
              ? "Enter your new phone number. We'll email a 6-digit code to your registered email address to confirm it."
              : `Enter the 6-digit code we emailed to your registered email address to confirm ${removeSpacesAndDashes(phone)}.`}
          </p>
        </div>

        {/* Step 1 shows the number form, step 2 shows the code form */}
        {step === "phone" ? (
          // Number entry form; noValidate lets this component own the validation
          <form
            onSubmit={handlePhoneSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            {/* New phone number field with inline error support */}
            <Input
              label="New Phone Number"
              type="tel"
              placeholder="03XXXXXXXXX or +923XXXXXXXXX"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                // Keep the typed value in state
                setPhone(e.target.value);
                // Remove the old error as soon as the customer edits the value
                if (phoneError) setPhoneError("");
              }}
              error={phoneError}
              required
            />
            {/* Cancel and submit buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {/* Closes the modal without sending anything */}
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              {/* Validates the number and requests the verification code */}
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
          // Code entry form shown after the code has been emailed
          <form
            onSubmit={handleConfirmSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            {/* Six digit code field that accepts digits only */}
            <Input
              label="6-Digit Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) =>
                // Strip every non-digit character and cap the length at 6
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
            {/* Requests a fresh code for the same number */}
            <button
              type="button"
              onClick={() =>
                requestMutation.mutate(removeSpacesAndDashes(phone))
              }
              disabled={requestMutation.isPending}
              className="self-start text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestMutation.isPending ? "Resending..." : "Resend code"}
            </button>
            {/* Back and confirm buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {/* Returns to the number form so a different number can be typed */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // Show the number form again
                  setStep("phone");
                  // Discard the partially typed code
                  setOtp("");
                }}
                disabled={confirmMutation.isPending}
              >
                Back
              </Button>
              {/* Verifies the code and completes the phone change */}
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
