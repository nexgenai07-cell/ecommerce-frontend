import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineLoading3Quarters,
} from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import { verifyPhone } from "../../api/auth.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";

// VerifyPhone — the phone-number counterpart to VerifyEmail.jsx, reached
// from the link sendPhoneVerification() emails to the account's own
// address. Structurally identical to VerifyEmail.jsx (same query
// options, same three-state render, same auto-redirect countdown) —
// the only real differences are which endpoint is called and where the
// customer is sent afterward: back to Checkout, not to Login, since
// they're already signed in when this flow starts.
const VerifyPhone = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Route: "/verify-phone/:token" — token comes from the URL PATH,
  // same pattern as VerifyEmail.jsx's own :token param.
  const { token } = useParams();

  // Countdown shown before auto-redirecting back to Checkout, so the
  // success message isn't just a flash on screen.
  const [secondsLeft, setSecondsLeft] = useState(3);

  // =============================================
  // VERIFY PHONE QUERY
  // Same options as VerifyEmail.jsx's own query — retry: false and the
  // refetch flags off because this is a one-time, single-use action;
  // staleTime: Infinity because a result for a given token never goes
  // stale.
  // =============================================
  const verifyQuery = useQuery({
    queryKey: ["verifyPhone", token],
    queryFn: ({ signal }) => verifyPhone(token, signal),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // The moment phone verification succeeds, the cached profile (which
  // now carries the updated phone + phone_verified: true) is stale —
  // invalidating it here means Checkout's own profile query picks up
  // the fresh, verified state the instant the customer returns to it,
  // instead of showing the old unverified phone until something else
  // happens to refetch it.
  useEffect(() => {
    if (!verifyQuery.isSuccess) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
  }, [verifyQuery.isSuccess, queryClient]);

  // =============================================
  // AUTO-REDIRECT — back to Checkout, since verifying a phone only
  // ever happens mid-checkout. A customer who opens this link on a
  // different device (or after their session expired) simply lands on
  // Checkout normally and can pick up from there.
  // =============================================
  useEffect(() => {
    if (!verifyQuery.isSuccess) return;

    if (secondsLeft <= 0) {
      navigate(ROUTES.CHECKOUT, { replace: true });
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
            from your email again, or request a new one from the Checkout page.
          </p>
        </>
      );
    }

    if (verifyQuery.isPending) {
      return (
        <>
          <AiOutlineLoading3Quarters className="w-14 h-14 text-primary animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900">
            Verifying your phone number...
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
          <h1 className="text-2xl font-bold text-gray-900">Phone Verified!</h1>
          <p className="text-sm text-gray-500">
            {verifyQuery.data?.data?.message ||
              "Your phone number has been verified successfully."}
          </p>
          <p className="text-xs text-gray-400">
            Redirecting to checkout in {secondsLeft}...
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
            "This link has expired or has already been used. Please return to Checkout and request a new verification link."}
        </p>
      </>
    );
  };

  return (
    <AuthLayout variant="login">
      <div className="flex flex-col items-center text-center gap-4">
        {renderContent()}

        <Link to={ROUTES.CHECKOUT} className="w-full mt-2">
          <Button variant="primary" fullWidth>
            Go to Checkout
          </Button>
        </Link>
      </div>
    </AuthLayout>
  );
};

export default VerifyPhone;
