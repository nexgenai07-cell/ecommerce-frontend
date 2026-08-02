import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineArrowRight,
  AiOutlineUndo,
} from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import {
  loginUser,
  verify2FALogin,
  sendVerificationEmail,
} from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";
import { showSuccess, showError } from "../../components/ui/Toast";
import { ROUTES } from "../../constants/routes";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || ROUTES.HOME;
  const registeredEmail = location.state?.registeredEmail;

  // ----------------------------------------------------------------
  // SAFE REDIRECT TARGET — always land on the CUSTOMER portal
  // ----------------------------------------------------------------
  // "from" above is whatever page originally redirected the person here
  // (e.g. AdminProtectedRoute sends an unauthenticated visitor who typed
  // an admin URL to /login and remembers that admin URL in state.from).
  // Per the new single-login-page rule, EVERY successful login — admin
  // or customer — must land on the customer-facing site first. An admin
  // only reaches the admin panel afterwards by clicking "Go to Admin
  // Portal" from the navbar avatar menu, never automatically. So if the
  // remembered "from" path starts with "/admin", we deliberately throw
  // it away and send the person to the customer homepage instead; any
  // other "from" (e.g. /checkout) is still honoured normally, since
  // that is a normal customer-side deep link with no admin implications.
  const safeFrom = from.startsWith("/admin") ? ROUTES.HOME : from;

  const { login, isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  // =============================================
  // 2FA LOGIN STEP STATE
  // When API 2 (login) responds with { require_2fa: true, user_id }, we switch
  // this form into a second step asking for the 6-digit authenticator code,
  // instead of the normal email/password form.
  // =============================================
  const [pendingUserId, setPendingUserId] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // =============================================
  // EMAIL VERIFICATION BLOCK STATE (Double Opt-In flow)
  // When API 2 (login) responds with { email_not_verified: true, email },
  // we switch this form into a block-screen telling the user to verify
  // their email first, with a "Resend Verification Email" action —
  // same pattern/shape as the 2FA step above, kept separate since these
  // are two independent gates the backend can return.
  // =============================================
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  // =============================================
  // ACCOUNT DEACTIVATED BLOCK STATE ★ NEW
  // When API 2 (login) responds with { account_deactivated: true, email },
  // the account was soft-deleted (is_delete: true / is_active: false) via
  // API 11 (Delete My Account). We switch this form into a block-screen
  // offering to reactivate the account instead — same pattern/shape as
  // unverifiedEmail above, kept as its own separate state since this is
  // a third, independent gate the backend can return. This check happens
  // AFTER email_not_verified and BEFORE require_2fa, matching the
  // priority order confirmed in the backend spec (see loginMutation
  // below).
  // =============================================
  const [deactivatedEmail, setDeactivatedEmail] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (registeredEmail) {
      setValue("email", registeredEmail);
      return;
    }
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setValue("email", rememberedEmail);
      setValue("rememberMe", true);
    }
  }, [setValue, registeredEmail]);

  useEffect(() => {
    // Regardless of role, a person who is already logged in has no
    // business sitting on the login page — send them onward. Both
    // customer AND admin accounts go to safeFrom (customer portal by
    // default), never straight to the admin dashboard. An admin can
    // always reach the admin panel afterwards via the navbar's
    // "Go to Admin Portal" button.
    if (isAuthenticated) {
      navigate(safeFrom, { replace: true });
    }
  }, [isAuthenticated, navigate, safeFrom]);

  // Shared success handler — used both by a normal (no-2FA) login AND by the
  // 2FA verify step (API 10), since both ultimately return { user, tokens }.
  const completeLogin = (user, tokens) => {
    if (document.getElementById("rememberMe")?.checked) {
      localStorage.setItem("rememberedEmail", user.email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    login({ user, tokens });
    showSuccess(`Welcome back, ${user.name}!`);

    // Single-login-page rule: EVERY successful login lands on the
    // customer portal (safeFrom), whether this account is "customer"
    // or "admin". We deliberately do NOT branch on user.role here and
    // send admins to ROUTES.ADMIN_DASHBOARD — an admin only reaches the
    // admin panel by clicking "Go to Admin Portal" in the navbar avatar
    // menu after landing here, never automatically on login.
    navigate(safeFrom, { replace: true });
  };

  // =============================================
  // LOGIN API MUTATION — API 2
  // =============================================
  const loginMutation = useMutation({
    mutationFn: loginUser,

    onSuccess: (response) => {
      // Double opt-in flow — backend blocks login until email is verified.
      // Checked FIRST: an unverified account shouldn't even reach the 2FA
      // step, since 2FA is itself a security feature on top of a confirmed
      // identity, and email isn't confirmed yet at this point.
      if (response.data?.email_not_verified) {
        setUnverifiedEmail(response.data.email);
        return;
      }

      // ★ NEW — checked SECOND, after email_not_verified and before
      // require_2fa, exactly matching the priority order in the
      // backend spec: an unverified account is caught first, then a
      // deactivated one, then finally 2FA on an account that's both
      // verified and active.
      if (response.data?.account_deactivated) {
        setDeactivatedEmail(response.data.email);
        return;
      }

      // v2 backend doc — when 2FA is active on this account, login returns
      // { require_2fa: true, user_id } instead of tokens. Switch to the OTP step.
      if (response.data?.require_2fa) {
        setPendingUserId(response.data.user_id);
        return;
      }

      const { user, tokens } = response.data;
      completeLogin(user, tokens);
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Invalid email or password. Please try again.";
      showError(message);
    },
  });

  // =============================================
  // 2FA LOGIN VERIFY MUTATION — API 10
  // Second step, only reached when loginMutation returned require_2fa: true.
  // =============================================
  const verify2FAMutation = useMutation({
    mutationFn: () => verify2FALogin({ user_id: pendingUserId, otp }),

    onSuccess: (response) => {
      const { user, tokens } = response.data;
      completeLogin(user, tokens);
    },

    onError: (error) => {
      setOtpError(error?.response?.data?.error || "Invalid or expired code.");
    },
  });

  // =============================================
  // RESEND VERIFICATION EMAIL MUTATION — API 17
  // Reachable from the block-screen below, where the user has no access
  // token (login was blocked) — so this call must be unauthenticated,
  // identified only by email. See api/auth.api.js for that change.
  // =============================================
  const resendVerificationMutation = useMutation({
    mutationFn: () => sendVerificationEmail(unverifiedEmail),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message || "Verification email has been resent.",
      );
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to resend verification email. Please try again.",
      );
    },
  });

  const handleBackFromVerify = () => {
    setUnverifiedEmail(null);
  };

  // ★ NEW — resets the account-deactivated block screen back to the
  // normal login form, same pattern as handleBackFromVerify above
  const handleBackFromDeactivated = () => {
    setDeactivatedEmail(null);
  };

  const onSubmit = (data) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  const handleBackToLogin = () => {
    setPendingUserId(null);
    setOtp("");
    setOtpError("");
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    verify2FAMutation.mutate();
  };

  // =============================================
  // STEP — Email verification required (Double Opt-In block)
  // Shown instead of the normal form when API 2 returns email_not_verified.
  // =============================================
  if (unverifiedEmail) {
    return (
      <AuthLayout variant="login">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Verify Your Email
            </h1>
            <p className="text-sm text-gray-500">
              Your account for{" "}
              <span className="font-medium text-gray-700">
                {unverifiedEmail}
              </span>{" "}
              hasn&apos;t been verified yet. Please check your inbox and click
              the verification link before signing in.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="primary"
              fullWidth
              isLoading={resendVerificationMutation.isPending}
              onClick={() => resendVerificationMutation.mutate()}
            >
              Resend Verification Email
            </Button>

            <button
              type="button"
              onClick={handleBackFromVerify}
              disabled={resendVerificationMutation.isPending}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // =============================================
  // STEP — Account deactivated (soft-deleted) block ★ NEW
  // Shown instead of the normal form when API 2 returns
  // account_deactivated: true. Checked in the same order the backend
  // returns it in — after the unverifiedEmail block above, before the
  // 2FA step below.
  // =============================================
  if (deactivatedEmail) {
    return (
      <AuthLayout variant="login">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <AiOutlineUndo className="w-7 h-7 text-primary" />
            </div>

            <div className="text-center flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                This Account Was Deactivated
              </h1>
              <p className="text-sm text-gray-500">
                The account for{" "}
                <span className="font-medium text-gray-700">
                  {deactivatedEmail}
                </span>{" "}
                has been deleted. Good news — you can bring it back yourself, no
                admin needed. Your orders, cart, and wishlist are all still
                safely preserved.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Passes the email along via router state so the
                reactivation request form doesn't make the person type
                it out a second time — see ReactivateAccount.jsx */}
            <Link
              to={ROUTES.REACTIVATE_ACCOUNT}
              state={{ email: deactivatedEmail }}
              className="w-full"
            >
              <Button type="button" variant="primary" fullWidth>
                Reactivate My Account
              </Button>
            </Link>

            <button
              type="button"
              onClick={handleBackFromDeactivated}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // =============================================
  // STEP 2 OF 2 — Two-factor code entry
  // =============================================
  if (pendingUserId) {
    return (
      <AuthLayout variant="login">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Two-Factor Verification
            </h1>
            <p className="text-sm text-gray-500">
              Enter the 6-digit code from your authenticator app to finish
              signing in.
            </p>
          </div>

          <form
            onSubmit={handleVerifyOtp}
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-otp"
                className="text-sm font-medium text-gray-700"
              >
                Authentication Code
              </label>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpError) setOtpError("");
                }}
                disabled={verify2FAMutation.isPending}
                className={`
                  w-full px-4 py-2.5 text-sm text-center tracking-[0.5em] rounded-lg border bg-white
                  placeholder:text-gray-400 placeholder:tracking-normal text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  transition-all duration-150 disabled:opacity-50
                  ${otpError ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
                `}
              />
              {otpError && <p className="text-xs text-danger">{otpError}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={verify2FAMutation.isPending}
              rightIcon={
                !verify2FAMutation.isPending && (
                  <AiOutlineArrowRight className="w-4 h-4" />
                )
              }
            >
              Verify &amp; Sign In
            </Button>

            <button
              type="button"
              onClick={handleBackToLogin}
              disabled={verify2FAMutation.isPending}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
            >
              ← Back to login
            </button>
          </form>
        </div>
      </AuthLayout>
    );
  }

  // =============================================
  // STEP 1 OF 2 (default) — Normal email/password form
  // =============================================
  return (
    <AuthLayout variant="login">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
          <p className="text-sm text-gray-500">
            {registeredEmail
              ? "Your account has been created. Please sign in to continue."
              : "Enter your credentials to access your dashboard."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              {...register("email")}
              className={`
                w-full px-4 py-2.5 text-sm rounded-lg border bg-white
                placeholder:text-gray-400 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all duration-150
                ${errors.email ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
              `}
            />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
                className={`
                  w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border bg-white
                  placeholder:text-gray-400 text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  transition-all duration-150
                  ${errors.password ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible className="w-4 h-4" />
                ) : (
                  <AiOutlineEye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="rememberMe"
                type="checkbox"
                {...register("rememberMe")}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>

            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-sm text-primary font-medium hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loginMutation.isPending}
            rightIcon={
              !loginMutation.isPending && (
                <AiOutlineArrowRight className="w-4 h-4" />
              )
            }
          >
            Sign In
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => showError("Google OAuth coming soon")}
            leftIcon={<FcGoogle className="w-4 h-4" />}
          >
            Google
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default Login;
