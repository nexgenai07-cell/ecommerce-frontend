import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineCheck,
  AiOutlineClose,
} from "react-icons/ai";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { showSuccess, showError } from "../ui/Toast";
import { changePassword } from "../../api/auth.api";
import {
  getPasswordStrength,
  PASSWORD_STRENGTH,
  PASSWORD_REQUIREMENTS,
} from "../../utils/passwordStrength";
import cn from "../../utils/cn";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[!@#$%^&*]/, "Must contain special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const STRENGTH_CONFIG = {
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

const ChangePasswordForm = () => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  // Shows the requirement checklist once the user focuses the New Password
  // field — same trigger/behavior as the Register page
  const [showRequirements, setShowRequirements] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const strength = getPasswordStrength(newPasswordValue);
  const strengthConfig = strength ? STRENGTH_CONFIG[strength] : null;

  // =============================================
  // CHANGE PASSWORD MUTATION
  // API 9 — POST /api/v1/auth/change-password/  (v2 backend doc)
  // Request: { current_password, new_password }
  // Response 200: { message: "Password changed successfully." }
  // Response 400: { error: "Current password is incorrect." }
  // =============================================
  const changeMutation = useMutation({
    mutationFn: (data) =>
      changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      }),

    onSuccess: (response) => {
      showSuccess(response?.data?.message || "Password changed successfully!");
      reset();
      setNewPasswordValue("");
      setShowRequirements(false);
    },

    onError: (error) => {
      const message = error?.response?.data?.error;
      if (error?.response?.status === 400 && message) {
        setError("currentPassword", { type: "server", message });
        return;
      }
      showError(message || "Failed to change password. Please try again.");
    },
  });

  const onSubmit = (data) => {
    changeMutation.mutate(data);
  };

  return (
    <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
          <HiOutlineLockClosed className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-400">
            Keep your account secure with a strong password
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* Current Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("currentPassword")}
              className={`
                w-full pl-4 pr-10 py-3 text-sm rounded-xl border bg-gray-50/50
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                transition-all duration-200
                ${errors.currentPassword ? "border-danger" : "border-gray-200"}
              `}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
            >
              {showCurrent ? (
                <AiOutlineEyeInvisible className="w-4 h-4" />
              ) : (
                <AiOutlineEye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-danger">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("newPassword", {
                onChange: (e) => setNewPasswordValue(e.target.value),
              })}
              onFocus={() => setShowRequirements(true)}
              className={`
                w-full pl-4 pr-10 py-3 text-sm rounded-xl border bg-gray-50/50
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                transition-all duration-200
                ${errors.newPassword ? "border-danger" : "border-gray-200"}
              `}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
            >
              {showNew ? (
                <AiOutlineEyeInvisible className="w-4 h-4" />
              ) : (
                <AiOutlineEye className="w-4 h-4" />
              )}
            </button>
          </div>

          {newPasswordValue && strengthConfig && (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Password Strength:
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    strengthConfig.textColor,
                  )}
                >
                  {strengthConfig.label}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    strengthConfig.color,
                    strengthConfig.width,
                  )}
                />
              </div>
            </div>
          )}

          {/* Live requirement checklist — same tick/cross pattern as Register page.
              Shows once the field is focused, updates in real time as the user types */}
          {showRequirements && newPasswordValue && (
            <div className="flex flex-col gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 mt-1 max-h-62 overflow-y-auto scrollbar-hide">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const isMet = req.test(newPasswordValue);
                return (
                  <div key={req.id} className="flex items-center gap-2">
                    {isMet ? (
                      <AiOutlineCheck className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : (
                      <AiOutlineClose className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        isMet ? "text-success" : "text-gray-400",
                      )}
                    >
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {errors.newPassword && (
            <p className="text-xs text-danger">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={`
                w-full pl-4 pr-10 py-3 text-sm rounded-xl border bg-gray-50/50
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                transition-all duration-200
                ${errors.confirmPassword ? "border-danger" : "border-gray-200"}
              `}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
            >
              {showConfirm ? (
                <AiOutlineEyeInvisible className="w-4 h-4" />
              ) : (
                <AiOutlineEye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-danger">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={changeMutation.isPending}
          className="
            w-full mt-2 py-3 bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl
            shadow-md shadow-primary/25
            hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
            active:scale-[0.98] active:translate-y-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none disabled:hover:shadow-none
            transition-all duration-200
          "
        >
          {changeMutation.isPending ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Changing...
            </div>
          ) : (
            "Change Password"
          )}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
