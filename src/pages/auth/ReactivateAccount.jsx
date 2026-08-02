import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AiOutlineMail,
  AiOutlineArrowRight,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineLoading3Quarters,
  AiOutlineUndo,
} from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import {
  requestAccountReactivation,
  confirmAccountReactivation,
} from "../../api/auth.api";
import { showError } from "../../components/ui/Toast";
import { ROUTES } from "../../constants/routes";

// Same validation shape as ForgotPassword's schema — just an email field
const requestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// ============================================================
// ReactivateAccount — ONE page, TWO steps, driven entirely by whether
// a ?token= query param is present in the URL:
//
//   STEP 1 (REQUEST) — no token in the URL. Shown when a person clicks
//   "Reactivate Account" from Login.jsx's account_deactivated block
//   screen. A simple "enter your email" form, exactly like
//   ForgotPassword.jsx, that calls API 11-B and always shows a
//   generic "check your email" success message (never confirms or
//   denies whether that email actually belongs to a deactivated
//   account — same security reasoning as the password-reset flow).
//
//   STEP 2 (CONFIRM) — ?token=xxxx is present, exactly matching the
//   URL shape called out in the backend spec. The moment this page
//   mounts with a token, it automatically calls API 11-C — the person
//   never has to click anything, same pattern as VerifyEmail.jsx.
// ============================================================
const ReactivateAccount = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // The token, if this link came from the reactivation email —
  // null/undefined when this page was reached via the "Reactivate
  // Account" button on Login.jsx instead (no token yet at that point)
  const token = searchParams.get("token");

  // If Login.jsx sent us here after an account_deactivated response,
  // it passes the email along via router state so the request form
  // below doesn't make the person type it out a second time.
  const prefilledEmail = location.state?.email || "";

  // =============================================
  // STEP 2 — CONFIRM QUERY (only runs when a token is present)
  // Same exact pattern as VerifyEmail.jsx's verifyQuery: enabled only
  // with a real token, no retry (a 400/expired token is a final
  // answer), and never silently refetched on focus/remount since this
  // token is single-use and would just fail a second call anyway.
  // =============================================
  const confirmQuery = useQuery({
    queryKey: ["confirmReactivation", token],
    queryFn: () => confirmAccountReactivation({ token }),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // =============================================
  // STEP 1 — REQUEST FORM STATE
  // =============================================
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: prefilledEmail },
  });

  const requestMutation = useMutation({
    mutationFn: requestAccountReactivation,

    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
      setEmailSent(true);
    },

    onError: (error) => {
      // The backend's one documented error case is "already active" —
      // everything else (including "no such account") comes back as a
      // generic 200 success, by design, so there's little for this
      // branch to normally hit besides a real network/server failure.
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Something went wrong. Please try again.";
      showError(message);
    },
  });

  const onSubmit = (data) => {
    requestMutation.mutate({ email: data.email });
  };

  // ============================================================
  // RENDER — STEP 2, CONFIRM (a token is present in the URL)
  // ============================================================
  if (token) {
    return (
      <AuthLayout variant="resetPassword">
        <div className="flex flex-col items-center text-center gap-4">
          {confirmQuery.isPending && (
            <>
              <AiOutlineLoading3Quarters className="w-14 h-14 text-primary animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900">
                Reactivating your account...
              </h1>
              <p className="text-sm text-gray-500">
                Please wait a moment, this only takes a second.
              </p>
            </>
          )}

          {confirmQuery.isSuccess && (
            <>
              <AiOutlineCheckCircle className="w-14 h-14 text-success" />
              <h1 className="text-2xl font-bold text-gray-900">
                Account Reactivated!
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {confirmQuery.data?.data?.message ||
                  "Your account has been reactivated. You can now log in."}{" "}
                Everything is exactly as you left it — your orders, cart, and
                wishlist are all still here.
              </p>
            </>
          )}

          {confirmQuery.isError && (
            <>
              <AiOutlineCloseCircle className="w-14 h-14 text-danger" />
              <h1 className="text-2xl font-bold text-gray-900">
                Reactivation Failed
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {confirmQuery.error?.response?.data?.error ||
                  "This reactivation link is invalid or has expired. Please request a new one."}
              </p>
            </>
          )}

          <Link
            to={confirmQuery.isError ? ROUTES.REACTIVATE_ACCOUNT : ROUTES.LOGIN}
            className="w-full mt-2"
          >
            <Button variant="primary" fullWidth>
              {confirmQuery.isError ? "Request a New Link" : "Go to Login"}
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ============================================================
  // RENDER — STEP 1, REQUEST (no token — plain "/reactivate-account")
  // ============================================================
  return (
    <AuthLayout variant="forgotPassword">
      {/* SUCCESS STATE — link sent */}
      {emailSent ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <AiOutlineMail className="w-8 h-8 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Check Your Email
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              If{" "}
              <span className="font-medium text-gray-700">
                {submittedEmail}
              </span>{" "}
              belongs to a deactivated account, we've sent a reactivation link
              to it. Please check your inbox.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email?{" "}
            <button
              onClick={() => setEmailSent(false)}
              className="text-primary font-medium hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      ) : (
        // FORM STATE
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <AiOutlineUndo className="w-7 h-7 text-primary" />
            </div>

            <div className="text-center flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-gray-900">
                Reactivate Your Account
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enter the email on your deactivated account and we&apos;ll send
                you a link to bring it back — no admin needed.
              </p>
            </div>
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

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={requestMutation.isPending}
              rightIcon={
                !requestMutation.isPending && (
                  <AiOutlineArrowRight className="w-4 h-4" />
                )
              }
            >
              Send Reactivation Link
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};

export default ReactivateAccount;
