// Danger Zone Section
// Delete Account button — red border card
// Custom password-confirmation modal (backend requires the password as proof of identity)
// Fully responsive

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  AiOutlineWarning,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import { ROUTES } from "../../constants/routes";
import useAuth from "../../hooks/useAuth";
import { showSuccess, showError } from "../ui/Toast";
// Modal directly (ConfirmModal doesn't support extra input fields, and this flow needs a password input)
import Modal from "../ui/Modal";
import Button from "../ui/Button";
// Import the real Delete Account API function (API 11 — v2 backend doc)
import { deleteMyAccount } from "../../api/auth.api";

const DangerZone = () => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const closeModal = () => {
    setShowModal(false);
    setPassword("");
    setPasswordError("");
  };

  // =============================================
  // DELETE ACCOUNT MUTATION
  // API 11 — DELETE /api/v1/auth/me/delete/   (v2 backend doc)
  // Request: { password }  — soft-delete (deactivate), tokens invalidated server-side
  // Response 200: { message: "Your account has been deleted." }
  // Response 400: { error: "Incorrect password." }
  // =============================================
  const deleteMutation = useMutation({
    mutationFn: () => deleteMyAccount({ password }),

    onSuccess: (response) => {
      showSuccess(response?.data?.message || "Your account has been deleted.");
      logoutUser(); // Redux + localStorage clear karo
      closeModal();
      navigate(ROUTES.HOME);
    },
    onError: (error) => {
      // Wrong password — backend returns 400 { error: "Incorrect password." }
      const message = error?.response?.data?.error;
      if (error?.response?.status === 400 && message) {
        setPasswordError(message);
        return;
      }
      showError("Failed to delete account. Please contact support.");
      closeModal();
    },
  });

  const handleConfirmDelete = () => {
    if (!password) {
      setPasswordError("Please enter your password to confirm.");
      return;
    }
    setPasswordError("");
    deleteMutation.mutate();
  };

  return (
    <>
      {/* Danger Zone card — red border */}
      <div className="relative bg-white rounded-3xl border border-danger/20 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 overflow-hidden">
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-linear-to-br from-danger/10 to-danger/0 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-danger to-red-600 flex items-center justify-center shadow-md shadow-danger/20 shrink-0">
            <AiOutlineWarning className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-gray-900">Danger Zone</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              Deleting your account is permanent. All your order history,
              wishlist, and preferences will be wiped instantly.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="
            relative px-6 py-3 border-2 border-danger text-danger
            text-sm font-semibold rounded-xl
            hover:bg-danger hover:text-white active:scale-[0.98]
            transition-all shrink-0 w-full sm:w-auto
          "
        >
          Delete Account
        </button>
      </div>

      {/* Confirm modal — password required, since the backend needs it to verify identity */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Delete Account?"
        size="sm"
        closeOnBackdrop={!deleteMutation.isPending}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            This action is permanent and cannot be undone. All your data
            including orders, wishlist, and preferences will be deleted forever.
          </p>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="delete-account-password"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              Enter your password to confirm
            </label>
            <div className="relative">
              <input
                id="delete-account-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                disabled={deleteMutation.isPending}
                className={`
                  w-full pl-4 pr-10 py-3 text-sm rounded-xl border bg-gray-50/50
                  placeholder:text-gray-300 text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger focus:bg-white
                  transition-all disabled:opacity-50
                  ${passwordError ? "border-danger" : "border-gray-200"}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible className="w-4 h-4" />
                ) : (
                  <AiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-danger">{passwordError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Yes, Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DangerZone;
