import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsLaptop, BsPhone, BsDeviceHdd, BsShieldLock } from "react-icons/bs";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import {
  getMySessions,
  revokeAllSessions,
  enable2FA,
  verify2FAEnable,
  disable2FA,
} from "../../api/auth.api";
// Reused across the app wherever a "list" endpoint may return either a flat
// array OR a DRF-paginated object ({count, next, previous, results}).
// See utils/extractListData.js for full context — /api/v1/auth/sessions/
// is confirmed (via Network tab) to return the paginated shape, same
// contract-drift pattern already seen on categories/notifications/returns/complaints.
import extractListData from "../../utils/extractListData";
import useAuth from "../../hooks/useAuth";
import { showSuccess, showError } from "../ui/Toast";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import Toggle from "../ui/Toggle";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

// Maps a session's device name to a representative icon.
// Backend sends a free-text "device" string (e.g. "Windows PC", "iPhone 15 Pro"),
// so we do a simple keyword match rather than expecting a fixed enum.
const getDeviceIcon = (deviceName = "") => {
  const lower = deviceName.toLowerCase();
  if (
    lower.includes("iphone") ||
    lower.includes("android") ||
    lower.includes("phone")
  ) {
    return <BsPhone className="w-4 h-4" />;
  }
  if (
    lower.includes("mac") ||
    lower.includes("windows") ||
    lower.includes("pc") ||
    lower.includes("laptop")
  ) {
    return <BsLaptop className="w-4 h-4" />;
  }
  return <BsDeviceHdd className="w-4 h-4" />;
};

// NOTE FOR BACKEND TEAM: API 7's response doesn't currently include a field indicating
// whether 2FA is active on the account (e.g. "two_factor_enabled": true/false). This
// component reads user?.two_factor_enabled defensively, but until that field is added
// to the profile response, the toggle will always start OFF on a fresh page load —
// even for users who already have 2FA enabled. Please add this field to API 7.
const AccountSecurity = ({ user }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logoutUser: logoutRedux } = useAuth();

  const [twoFAEnabled, setTwoFAEnabled] = useState(
    Boolean(user?.two_factor_enabled),
  );

  // --- Enable flow (Step 1: QR modal, Step 2: OTP verify) ---
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // --- Disable flow (password confirmation modal) ---
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableError, setDisableError] = useState("");

  // =============================================
  // ACTIVE SESSIONS QUERY — API 12
  // =============================================
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: QUERY_KEYS.MY_SESSIONS,
    queryFn: ({ signal }) => getMySessions(signal),
    staleTime: 1000 * 60,
  });
  // extractListData safely handles BOTH shapes:
  //   - flat array (as per API_Documentation_Final.pdf)
  //   - DRF-paginated object { count, results } (confirmed actual behavior)
  // This means `.map()` below can never crash, regardless of which shape
  // the backend is currently returning.
  const sessions = extractListData(sessionsData);

  // =============================================
  // SIGN OUT ALL DEVICES MUTATION — API 13
  // =============================================
  const signOutMutation = useMutation({
    mutationFn: () => revokeAllSessions(),
    onSuccess: () => {
      logoutRedux();
      showSuccess("Signed out from all devices");
      navigate(ROUTES.LOGIN);
    },
    onError: () => {
      logoutRedux();
      navigate(ROUTES.LOGIN);
      showError("Signed out (some devices may still be active)");
    },
  });

  // =============================================
  // ENABLE 2FA — STEP 1 — API 14
  // =============================================
  const enableMutation = useMutation({
    mutationFn: () => enable2FA(),
    onSuccess: (response) => {
      setQrCode(response?.data?.qr_code_base64 || "");
      setManualKey(response?.data?.manual_entry_key || "");
      setShowQRModal(true);
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to start 2FA setup. Please try again.",
      );
    },
  });

  // =============================================
  // ENABLE 2FA — STEP 2 (Verify & Activate) — API 15
  // =============================================
  const verifyMutation = useMutation({
    mutationFn: () => verify2FAEnable({ otp }),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message ||
          "Two-factor authentication enabled successfully.",
      );
      setTwoFAEnabled(true);
      closeQRModal();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
    },
    onError: (error) => {
      setOtpError(error?.response?.data?.error || "Invalid or expired code.");
    },
  });

  // =============================================
  // DISABLE 2FA — API 16
  // =============================================
  const disableMutation = useMutation({
    mutationFn: () => disable2FA({ password: disablePassword }),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message || "Two-factor authentication disabled.",
      );
      setTwoFAEnabled(false);
      closeDisableModal();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
    },
    onError: (error) => {
      setDisableError(error?.response?.data?.error || "Incorrect password.");
    },
  });

  const closeQRModal = () => {
    setShowQRModal(false);
    setQrCode("");
    setManualKey("");
    setOtp("");
    setOtpError("");
  };

  const closeDisableModal = () => {
    setShowDisableModal(false);
    setDisablePassword("");
    setDisableError("");
  };

  const handleToggleChange = (e) => {
    if (e.target.checked) {
      enableMutation.mutate();
    } else {
      setShowDisableModal(true);
    }
  };

  return (
    <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
          <HiOutlineShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Account Security</h2>
          <p className="text-xs text-gray-400">
            Two-factor authentication and active sessions
          </p>
        </div>
      </div>

      {/* 2FA Toggle */}
      <div
        className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-300 ${
          twoFAEnabled
            ? "bg-linear-to-r from-primary-50 to-primary-50/40 border-primary/20"
            : "bg-gray-50 border-gray-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              twoFAEnabled
                ? "bg-primary text-white"
                : "bg-white text-gray-400 border border-gray-200"
            }`}
          >
            <HiOutlineShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              2FA Authentication
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {twoFAEnabled
                ? "Enabled — your account is protected"
                : "Secure your login with an authenticator app"}
            </p>
          </div>
        </div>

        <Toggle
          checked={twoFAEnabled}
          onChange={handleToggleChange}
          disabled={enableMutation.isPending}
          id="2fa-toggle"
        />
      </div>

      {/* Active Sessions */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Active Sessions
        </p>

        <div className="flex flex-col gap-2 max-h-76 overflow-y-auto scrollbar-hide pr-1">
          {sessionsLoading ? (
            <>
              <div className="h-14 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            </>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              No active sessions found.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors duration-200 ${
                  session.is_current
                    ? "border-primary/30 bg-primary-50/40"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    session.is_current
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {getDeviceIcon(session.device)}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {session.device}
                    {session.browser ? ` • ${session.browser}` : ""}
                    {session.location ? ` • ${session.location}` : ""}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      session.is_current
                        ? "text-primary font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {session.is_current
                      ? "Current session"
                      : `Last active ${session.last_active || "recently"}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => signOutMutation.mutate()}
          disabled={signOutMutation.isPending}
          className="
            text-sm font-semibold text-danger hover:text-red-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors text-left w-fit
          "
        >
          {signOutMutation.isPending
            ? "Signing out..."
            : "Sign out all devices"}
        </button>
      </div>

      {/* ENABLE 2FA MODAL — QR code (Step 1) + OTP input (Step 2) */}
      <Modal
        isOpen={showQRModal}
        onClose={closeQRModal}
        title="Set Up Two-Factor Authentication"
        size="sm"
        closeOnBackdrop={!verifyMutation.isPending}
      >
        <div className="flex flex-col gap-5 items-center text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            Scan this QR code with Google Authenticator, Authy, or any TOTP app.
          </p>

          {qrCode && (
            <img
              src={qrCode}
              alt="2FA QR code"
              className="w-40 h-40 rounded-2xl border border-gray-100 p-2 shadow-sm"
            />
          )}

          {manualKey && (
            <div className="w-full flex flex-col gap-1">
              <p className="text-xs text-gray-400">
                Can't scan? Enter this key manually:
              </p>
              <code className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 break-all">
                {manualKey}
              </code>
            </div>
          )}

          <div className="w-full flex flex-col gap-1.5 text-left">
            <label
              htmlFor="2fa-otp"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              Enter the 6-digit code
            </label>
            <input
              id="2fa-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (otpError) setOtpError("");
              }}
              disabled={verifyMutation.isPending}
              className={`
                w-full px-4 py-3 text-sm text-center tracking-[0.4em] rounded-xl border bg-gray-50/50
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                transition-all disabled:opacity-50
                ${otpError ? "border-danger" : "border-gray-200"}
              `}
            />
            {otpError && <p className="text-xs text-danger">{otpError}</p>}
          </div>

          <Button
            fullWidth
            onClick={() => verifyMutation.mutate()}
            isLoading={verifyMutation.isPending}
            disabled={otp.length !== 6}
          >
            Verify &amp; Activate
          </Button>
        </div>
      </Modal>

      {/* DISABLE 2FA MODAL — password confirmation */}
      <Modal
        isOpen={showDisableModal}
        onClose={closeDisableModal}
        title="Disable Two-Factor Authentication?"
        size="sm"
        closeOnBackdrop={!disableMutation.isPending}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 p-3 bg-warning-light rounded-xl border border-warning/20">
            <BsShieldLock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning leading-relaxed">
              Your account will be less secure without 2FA. Enter your password
              to confirm.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="disable-2fa-password"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="disable-2fa-password"
                type={showDisablePassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => {
                  setDisablePassword(e.target.value);
                  if (disableError) setDisableError("");
                }}
                disabled={disableMutation.isPending}
                className={`
                  w-full pl-4 pr-10 py-3 text-sm rounded-xl border bg-gray-50/50
                  focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger focus:bg-white
                  transition-all disabled:opacity-50
                  ${disableError ? "border-danger" : "border-gray-200"}
                `}
              />
              <button
                type="button"
                onClick={() => setShowDisablePassword(!showDisablePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={
                  showDisablePassword ? "Hide password" : "Show password"
                }
              >
                {showDisablePassword ? (
                  <AiOutlineEyeInvisible className="w-4 h-4" />
                ) : (
                  <AiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {disableError && (
              <p className="text-xs text-danger">{disableError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closeDisableModal}
              disabled={disableMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!disablePassword) {
                  setDisableError("Please enter your password to confirm.");
                  return;
                }
                disableMutation.mutate();
              }}
              isLoading={disableMutation.isPending}
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountSecurity;
