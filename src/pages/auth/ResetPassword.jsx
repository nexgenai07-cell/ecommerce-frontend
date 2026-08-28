import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineArrowRight,
  AiOutlineCheck,
  AiOutlineClose,
} from "react-icons/ai";
import { BsShieldLock } from "react-icons/bs";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import { resetPassword } from "../../api/auth.api";
import { showSuccess, showError } from "../../components/ui/Toast";
import { ROUTES } from "../../constants/routes";
import {
  getPasswordStrength,
  PASSWORD_STRENGTH,
  PASSWORD_REQUIREMENTS,
} from "../../utils/passwordStrength";

const resetPasswordSchema = z
  .object({
    // NOTE: no .trim() on password fields — see ChangePasswordForm.jsx
    // for why a leading/trailing space is intentionally preserved.
    new_password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        "Must contain at least one special character",
      ),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

const ResetPassword = () => {
  // Route: "/reset-password/:uid/:token" — dono URL PATH se aate hain,
  // query string (?uid=...) se nahi. Ye Django ke default password
  // reset email link format se match karta hai.
  const { uid, token } = useParams();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(passwordValue);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    // Live validation (industry-standard pattern, same one Gmail/Amazon/
    // most production sites use): a field is left completely alone while
    // the user is still typing into it for the first time -- no error,
    // no matter how invalid the in-progress value looks. The first check
    // happens on "blur", i.e. the moment the user leaves that field
    // (Tab key or clicking elsewhere) -- mode: "onTouched" below. From
    // that point on, react-hook-form's default reValidateMode ("onChange")
    // takes over automatically: if the field was invalid, it re-checks on
    // every keystroke so the error clears the instant the value becomes
    // valid, without needing another blur.
    mode: "onTouched",
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,

    onSuccess: () => {
      setResetSuccess(true);
      showSuccess("Password reset successfully!");
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.response?.data?.token?.[0] ||
        "Reset link is invalid or expired. Please request a new one.";
      showError(message);
    },
  });

  const onSubmit = (data) => {
    if (!uid || !token) {
      showError("Invalid reset link. Please request a new password reset.");
      return;
    }

    resetMutation.mutate({
      uid,
      token,
      new_password: data.new_password,
      confirm_password: data.confirm_password,
    });
  };

  const strengthConfig = {
    [PASSWORD_STRENGTH.WEAK]: {
      color: "bg-danger",
      textColor: "text-danger",
      label: "Weak",
      width: "w-1/3",
    },
    [PASSWORD_STRENGTH.MEDIUM]: {
      color: "bg-warning",
      textColor: "text-warning",
      label: "Medium",
      width: "w-2/3",
    },
    [PASSWORD_STRENGTH.STRONG]: {
      color: "bg-success",
      textColor: "text-success",
      label: "Strong",
      width: "w-full",
    },
  };

  const currentStrength = passwordStrength
    ? strengthConfig[passwordStrength]
    : null;

  // INVALID LINK STATE
  if (!uid || !token) {
    return (
      <AuthLayout variant="resetPassword">
        <div className="text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center">
            <AiOutlineClose className="w-8 h-8 text-danger" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Invalid Reset Link
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
          </div>

          <Link to={ROUTES.FORGOT_PASSWORD} className="w-full">
            <Button
              variant="primary"
              fullWidth
              rightIcon={<AiOutlineArrowRight className="w-4 h-4" />}
            >
              Request New Link
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="resetPassword">
      {/* SUCCESS STATE */}
      {resetSuccess ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
            <AiOutlineCheck className="w-8 h-8 text-success" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Password Reset!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your password has been reset successfully. You can now login with
              your new password.
            </p>
          </div>

          <Link to={ROUTES.LOGIN} className="w-full">
            <Button
              variant="primary"
              fullWidth
              rightIcon={<AiOutlineArrowRight className="w-4 h-4" />}
            >
              Continue to Login
            </Button>
          </Link>
        </div>
      ) : (
        // FORM STATE
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <BsShieldLock className="w-7 h-7 text-primary" />
            </div>

            <div className="text-center flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-gray-900">
                Set New Password
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your new password must be different from previous passwords.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="new_password"
                className="text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("new_password", {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                  className={`
                    w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border bg-white
                    placeholder:text-gray-400 text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                    transition-all duration-150
                    ${errors.new_password ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
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

              {passwordValue && currentStrength && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Password strength
                    </span>
                    <span
                      className={`text-xs font-medium ${currentStrength.textColor}`}
                    >
                      {currentStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${currentStrength.color} ${currentStrength.width}`}
                    />
                  </div>
                </div>
              )}

              {passwordValue && (
                <div className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const isMet = req.test(passwordValue);
                    return (
                      <div key={req.id} className="flex items-center gap-2">
                        {isMet ? (
                          <AiOutlineCheck className="w-3.5 h-3.5 text-success shrink-0" />
                        ) : (
                          <AiOutlineClose className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        )}
                        <span
                          className={`text-xs ${isMet ? "text-success" : "text-gray-400"}`}
                        >
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.new_password && (
                <p className="text-xs text-danger">
                  {errors.new_password.message}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm_password"
                className="text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("confirm_password")}
                  className={`
                    w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border bg-white
                    placeholder:text-gray-400 text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                    transition-all duration-150
                    ${errors.confirm_password ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <AiOutlineEyeInvisible className="w-4 h-4" />
                  ) : (
                    <AiOutlineEye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-danger">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={resetMutation.isPending}
              rightIcon={
                !resetMutation.isPending && (
                  <AiOutlineArrowRight className="w-4 h-4" />
                )
              }
            >
              Reset Password
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
