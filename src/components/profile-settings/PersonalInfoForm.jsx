// Personal Info Form Section
// Avatar, Full Name, Email (verified)
// Save Changes button — real API call
// React Hook Form + Zod validation
// Fully responsive
//
// NOTE: Phone Number field was removed from this form per client request
// (kept as UI-only decision — schema/payload updated to only send `name`).

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineCheckCircle } from "react-icons/ai";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { updateMyProfile, sendVerificationEmail } from "../../api/auth.api";
import { showSuccess, showError } from "../ui/Toast";
import Avatar from "../ui/Avatar";

const personalInfoSchema = z.object({
  name: z
    .string()
    .min(1, "Full name is required")
    .min(3, "Name must be at least 3 characters"),
});

const PersonalInfoForm = ({ user }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
      });
    }
  }, [user, reset]);

  // =============================================
  // UPDATE PROFILE MUTATION — API 8
  // =============================================
  const updateMutation = useMutation({
    mutationFn: (data) => updateMyProfile(data),
    onSuccess: () => {
      showSuccess("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    },
  });

  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  // =============================================
  // RESEND VERIFICATION EMAIL MUTATION
  // API 17 — POST /api/v1/auth/send-verification-email/
  // =============================================
  const resendMutation = useMutation({
    mutationFn: () => sendVerificationEmail(user?.email),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message || "Verification email has been sent.",
      );
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to send verification email. Please try again.",
      );
    },
  });

  return (
    <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-linear-to-br from-primary/20 to-primary-light/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineUserCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Personal Information
            </h2>
            <p className="text-xs text-gray-400">
              Manage your basic account details
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar — read-only display; upload isn't supported by the backend yet */}
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="p-1 rounded-full bg-linear-to-br from-primary via-primary-light to-primary-dark">
                <div className="bg-white p-0.5 rounded-full">
                  <Avatar src={user?.avatar} name={user?.name} size="xl" />
                </div>
              </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register("name")}
                  className={`
                    w-full px-4 py-3 text-sm rounded-xl border bg-gray-50/50
                    placeholder:text-gray-300 text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                    transition-all duration-200
                    ${errors.name ? "border-danger" : "border-gray-200"}
                  `}
                />
                {errors.name && (
                  <p className="text-xs text-danger">{errors.name.message}</p>
                )}
              </div>

              {/* Email — read only with verified checkmark */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="
                      w-full pl-4 pr-10 py-3 text-sm rounded-xl border border-gray-200
                      bg-gray-100 text-gray-500 cursor-not-allowed
                      focus:outline-none
                    "
                  />
                  {user?.email_verified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                      <AiOutlineCheckCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">Email cannot be changed</p>

                {user?.email_verified === false && (
                  <div className="flex items-center justify-between gap-3 mt-1 p-3 bg-linear-to-r from-warning-light to-warning-light/40 rounded-xl border border-warning/20">
                    <p className="text-xs text-warning leading-relaxed">
                      Your email isn't verified yet. Please check your inbox.
                    </p>
                    <button
                      type="button"
                      onClick={() => resendMutation.mutate()}
                      disabled={resendMutation.isPending}
                      className="
                        text-xs font-semibold text-primary hover:underline
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shrink-0 whitespace-nowrap
                      "
                    >
                      {resendMutation.isPending ? "Sending..." : "Resend Email"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Changes button */}
          <div className="flex justify-end pt-4 border-t border-gray-50">
            <button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="
                px-7 py-3 bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl
                shadow-md shadow-primary/25
                hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
                active:scale-[0.98] active:translate-y-0
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none disabled:hover:shadow-none
                transition-all duration-200
              "
            >
              {updateMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalInfoForm;
