import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineLoading3Quarters,
} from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import { verifyEmail } from "../../api/auth.api";
import { ROUTES } from "../../constants/routes";

const VerifyEmail = () => {
  const navigate = useNavigate();

  // Route: "/verify-email/:token" — token comes from the URL PATH,
  // exactly like ResetPassword.jsx's uid/token pattern.
  const { token } = useParams();

  // Countdown shown to the user before we auto-redirect to Login, so the
  // "Email Verified!" message isn't just a flash — same idea as OTP-style
  // confirmation screens elsewhere in the app.
  const [secondsLeft, setSecondsLeft] = useState(3);

  // =============================================
  // VERIFY EMAIL QUERY — API 18
  // - queryKey includes the token, so a different link always triggers a
  //   fresh fetch, but the SAME token is only ever fetched once and cached.
  // - enabled: !!token — never fires if there's no token in the URL at all.
  // - retry: false — a 400 (expired/already used) is a final answer, not a
  //   transient failure worth retrying.
  // - refetchOnWindowFocus/refetchOnMount: false — this is a one-time,
  //   single-use action; refetching would re-hit an already-consumed token.
  // - staleTime: Infinity — once we have a result for this token, it never
  //   needs to be treated as "stale" and re-fetched.
  // =============================================
  const verifyQuery = useQuery({
    queryKey: ["verifyEmail", token],
    queryFn: ({ signal }) => verifyEmail(token, signal),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // =============================================
  // AUTO-REDIRECT TO LOGIN — only once verification succeeds.
  // Ticks a 3-second countdown, then navigates to Login. User can also
  // click "Go to Login" immediately without waiting.
  // =============================================
  useEffect(() => {
    if (!verifyQuery.isSuccess) return;

    if (secondsLeft <= 0) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [verifyQuery.isSuccess, secondsLeft, navigate]);

  const renderContent = () => {
    if (!token) {
      return (
        <>
          <AiOutlineCloseCircle className="w-14 h-14 text-danger" />
          <h1 className="text-2xl font-bold text-gray-900">
            Invalid Verification Link
          </h1>
          <p className="text-sm text-gray-500">
            This link is missing its verification token. Please use the link
            from your email again, or request a new one from your Profile
            Settings page.
          </p>
        </>
      );
    }

    if (verifyQuery.isPending) {
      return (
        <>
          <AiOutlineLoading3Quarters className="w-14 h-14 text-primary animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900">
            Verifying your email...
          </h1>
          <p className="text-sm text-gray-500">
            Please wait a moment, this only takes a second.
          </p>
        </>
      );
    }

    if (verifyQuery.isSuccess) {
      return (
        <>
          <AiOutlineCheckCircle className="w-14 h-14 text-success" />
          <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
          <p className="text-sm text-gray-500">
            {verifyQuery.data?.data?.message ||
              "Your email has been verified successfully."}
          </p>
          <p className="text-xs text-gray-400">
            Redirecting to login in {secondsLeft}...
          </p>
        </>
      );
    }

    // isError state — request settled with a failure (400/404/500/etc.)
    return (
      <>
        <AiOutlineCloseCircle className="w-14 h-14 text-danger" />
        <h1 className="text-2xl font-bold text-gray-900">
          Verification Failed
        </h1>
        <p className="text-sm text-gray-500">
          {verifyQuery.error?.response?.data?.error ||
            "This link has expired or has already been used. Please request a new verification email from your Profile Settings page."}
        </p>
      </>
    );
  };

  return (
    <AuthLayout variant="login">
      <div className="flex flex-col items-center text-center gap-4">
        {renderContent()}

        <Link to={ROUTES.LOGIN} className="w-full mt-2">
          <Button variant="primary" fullWidth>
            Go to Login
          </Button>
        </Link>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
