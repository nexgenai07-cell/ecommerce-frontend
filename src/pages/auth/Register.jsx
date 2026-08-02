import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  AiOutlineReload,
  AiOutlineMail,
  AiOutlineExclamationCircle,
} from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import { registerUser, sendVerificationEmail } from "../../api/auth.api";
import { showError, showSuccess } from "../../components/ui/Toast";
import { ROUTES } from "../../constants/routes";
import {
  getPasswordStrength,
  PASSWORD_STRENGTH,
  PASSWORD_REQUIREMENTS,
  generateStrongPassword,
} from "../../utils/passwordStrength";

// =============================================
// ZOD VALIDATION SCHEMA
// =============================================
const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Full name is required")
      .min(3, "Name must be at least 3 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(
        /^(\+92|0)[0-9]{10}$/,
        "Please enter a valid Pakistani phone number",
      ),
    address: z
      .string()
      .min(1, "Address is required")
      .min(10, "Please enter a complete address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        "Password must contain at least one special character",
      ),
    confirm_password: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to the terms"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);

  // =============================================
  // CONFIRMATION-CARD STATE (Double Opt-In)
  // Mirrors ForgotPassword.jsx's emailSent/submittedEmail pattern exactly —
  // same project convention, same UX: after a successful action that
  // triggers an email, we swap the FORM out for a confirmation card on
  // the SAME page. No toast, no navigation away.
  // =============================================
  const [verificationSent, setVerificationSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  // =============================================
  // EMAIL-ALREADY-REGISTERED CARD STATE ★ NEW
  // Shown instead of a plain toast when the backend rejects
  // registration because this email already has an account — whether
  // that account is active OR deactivated (is_delete: true). Both
  // cases show the EXACT SAME generic wording and the exact same two
  // buttons (Log In / Recover Account) — this is a deliberate security
  // choice: the register form must never confirm or deny whether a
  // given email specifically belongs to a DEACTIVATED account, since
  // that would let anyone probe arbitrary emails (no password
  // required here) to learn who has deleted their account. The
  // Login page is the only place that's allowed to reveal
  // "deactivated" specifically, and only AFTER a correct password has
  // already been verified — see Login.jsx's account_deactivated block.
  // =============================================
  const [emailTaken, setEmailTaken] = useState(false);
  const [takenEmail, setTakenEmail] = useState("");

  const passwordStrength = getPasswordStrength(passwordValue);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirm_password: "",
      agreeToTerms: false,
    },
  });

  const watchedPassword = watch("password");

  useEffect(() => {
    setPasswordValue(watchedPassword || "");
    if (watchedPassword) {
      setShowRequirements(true);
    }
  }, [watchedPassword]);

  const handleSuggestPassword = () => {
    const strongPassword = generateStrongPassword();
    setValue("password", strongPassword);
    setValue("confirm_password", strongPassword);
    setShowPassword(true);
    setShowConfirmPassword(true);
    setPasswordValue(strongPassword);
    setShowRequirements(true);
  };

  // =============================================
  // REGISTER API MUTATION — API 1
  // DOUBLE OPT-IN FLOW (final decision): account banta hai, LEKIN turant
  // login nahi hota. Backend verification email bhejta hai. Instead of a
  // toast + redirect, we swap this page into an in-page confirmation card
  // (same UX pattern as ForgotPassword.jsx) — user stays here, sees exactly
  // which email the link was sent to, and can resend it from here too.
  // Requires backend changes to API 1 (no tokens on register) and API 2
  // (block login until email_verified) — confirmed already implemented.
  // =============================================
  const registerMutation = useMutation({
    mutationFn: registerUser,

    onSuccess: (response) => {
      const { user } = response.data;
      setSubmittedEmail(user.email);
      setVerificationSent(true);
    },

    onError: (error, variables) => {
      // DRF's standard validation-error shape for a unique-field clash
      // is { email: ["This field must be unique.", ...] } — this is
      // the SAME field the codebase already reads from in the message
      // fallback below, so checking for its presence here is a
      // reliable, existing signal that this specific error is about
      // the email already being taken (active OR deactivated account
      // — the response never distinguishes which, by design).
      const emailErrors = error?.response?.data?.email;

      if (Array.isArray(emailErrors) && emailErrors.length > 0) {
        setTakenEmail(variables.email);
        setEmailTaken(true);
        return;
      }

      // Every other kind of registration failure (validation errors on
      // other fields, network issues, server errors, etc.) keeps the
      // existing toast behavior, unchanged.
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.detail ||
        "Registration failed. Please try again.";
      showError(message);
    },
  });

  // =============================================
  // RESEND VERIFICATION EMAIL MUTATION — API 17
  // Available directly from the confirmation card, in case the email
  // didn't arrive. Same unauthenticated, email-based call used by
  // Login.jsx's block-screen and Profile Settings.
  // =============================================
  const resendMutation = useMutation({
    mutationFn: () => sendVerificationEmail(submittedEmail),
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

  const onSubmit = (data) => {
    registerMutation.mutate({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      confirm_password: data.confirm_password,
    });
  };

  // Resets the emailTaken card back to the normal form, in case the
  // person typed the wrong email by mistake and wants to correct it
  // themselves instead of using either of the two offered buttons.
  const handleTryDifferentEmail = () => {
    setEmailTaken(false);
    setTakenEmail("");
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

  return (
    <AuthLayout variant="register">
      {/* CONFIRMATION-CARD STATE — shown in place of the form after a
          successful registration. Same pattern as ForgotPassword.jsx. */}
      {verificationSent ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <AiOutlineMail className="w-8 h-8 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Check Your Email
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              We've sent a verification link to{" "}
              <span className="font-medium text-gray-700">
                {submittedEmail}
              </span>
              . Please click that link to verify your account, then sign in.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Didn't receive the email?{" "}
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              className="text-primary font-medium hover:underline disabled:opacity-50"
            >
              {resendMutation.isPending ? "Sending..." : "Resend it"}
            </button>
          </p>

          <Link to={ROUTES.LOGIN} className="w-full">
            <Button variant="outline" fullWidth>
              Go to Login
            </Button>
          </Link>
        </div>
      ) : emailTaken ? (
        // ★ NEW — EMAIL-ALREADY-REGISTERED CARD
        // Deliberately generic: this exact same card, with this exact
        // same wording, shows up whether takenEmail belongs to a
        // perfectly normal active account OR a deactivated one. See
        // the emailTaken state comment above for why that distinction
        // is never surfaced here.
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <AiOutlineExclamationCircle className="w-8 h-8 text-warning" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              This Email Is Already Registered
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700">{takenEmail}</span>{" "}
              already has an account on our platform.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Link to={ROUTES.LOGIN} state={{ registeredEmail: takenEmail }}>
              <Button variant="primary" fullWidth>
                Log In
              </Button>
            </Link>

            <Link to={ROUTES.REACTIVATE_ACCOUNT} state={{ email: takenEmail }}>
              <Button variant="outline" fullWidth>
                Recover / Reactivate Account
              </Button>
            </Link>
          </div>

          <button
            onClick={handleTryDifferentEmail}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            ← Try a different email
          </button>
        </div>
      ) : (
        // FORM STATE
        <div className="flex flex-col gap-8 ">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-500">
              Fill in your details to start your journey with us.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            {/* Name + Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register("name")}
                  className={`w-full px-4 py-2.5 text-sm rounded-lg border bg-white placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${errors.name ? "border-danger focus:ring-danger" : "border-gray-200"}`}
                />
                {errors.name && (
                  <p className="text-xs text-danger">{errors.name.message}</p>
                )}
              </div>

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
                  className={`w-full px-4 py-2.5 text-sm rounded-lg border bg-white placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${errors.email ? "border-danger focus:ring-danger" : "border-gray-200"}`}
                />
                {errors.email && (
                  <p className="text-xs text-danger">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Phone + Address row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  {...register("phone")}
                  className={`w-full px-4 py-2.5 text-sm rounded-lg border bg-white placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${errors.phone ? "border-danger focus:ring-danger" : "border-gray-200"}`}
                />
                {errors.phone && (
                  <p className="text-xs text-danger">{errors.phone.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="address"
                  className="text-sm font-medium text-gray-700"
                >
                  Primary Address
                </label>
                <input
                  id="address"
                  type="text"
                  placeholder="123 AI Lane, Tech City"
                  autoComplete="street-address"
                  {...register("address")}
                  className={`w-full px-4 py-2.5 text-sm rounded-lg border bg-white placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${errors.address ? "border-danger focus:ring-danger" : "border-gray-200"}`}
                />
                {errors.address && (
                  <p className="text-xs text-danger">
                    {errors.address.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Create Password
                </label>
                <button
                  type="button"
                  onClick={handleSuggestPassword}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <AiOutlineReload className="w-3 h-3" />
                  Suggest Strong Password
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  onFocus={() => setShowRequirements(true)}
                  className={`w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border bg-white placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${errors.password ? "border-danger focus:ring-danger" : "border-gray-200"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

              {showRequirements && passwordValue && (
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

              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm_password"
                className="text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("confirm_password")}
                  className={`w-full pl-4 pr-10 py-2.5 text-sm rounded-lg border bg-white placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 ${errors.confirm_password ? "border-danger focus:ring-danger" : "border-gray-200"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

            {/* Terms */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register("agreeToTerms")}
                  className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer shrink-0"
                />
                <span className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-primary hover:underline font-medium"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-primary hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-xs text-danger">
                  {errors.agreeToTerms.message}
                </p>
              )}
            </div>

            {/* Submit — reusable Button component */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={registerMutation.isPending}
              rightIcon={
                !registerMutation.isPending && (
                  <AiOutlineArrowRight className="w-4 h-4" />
                )
              }
            >
              Create Account
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => showError("Google OAuth coming soon")}
              leftIcon={<FcGoogle className="w-4 h-4" />}
            >
              Sign up with Google
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};

export default Register;
