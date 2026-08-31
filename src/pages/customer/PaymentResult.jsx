import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { ROUTES } from "../../constants/routes";

// How long, in seconds, the success/failure screens wait before
// automatically continuing on their own.
const AUTO_REDIRECT_SECONDS = 3;

// =============================================================
// OUTCOME RESOLUTION
// =============================================================
// This page is reachable two different ways, and both have to be
// resolved into the same three outcomes: "succeeded", "failed", or
// "processing".
//
// 1) Non-redirect flow — the customer's card didn't need any extra
//    authentication. Checkout.jsx already knows the outcome from
//    stripe.confirmPayment() and navigates here with its own
//    "status" (and "reason", for failures) query params.
//
// 2) Redirect flow (3D Secure) — Stripe itself performed a full
//    browser navigation back to this page. That means this is a
//    fresh page load with no React state left from Checkout.jsx, so
//    the outcome cannot be trusted from a query param alone — it has
//    to be confirmed directly with Stripe using the
//    payment_intent_client_secret param Stripe appends to the URL.
async function resolveOutcomeFromStripeRedirect(clientSecret) {
  const publishableKey = sessionStorage.getItem("stripe_publishable_key");

  // Without a publishable key there is no way to ask Stripe directly.
  // This should be rare (only happens if sessionStorage was cleared
  // between leaving Checkout and returning from the card issuer), so
  // fall back to a generic "processing" state rather than guessing.
  if (!publishableKey) {
    return {
      outcome: "processing",
      reason: "We're confirming your payment. This may take a moment.",
    };
  }

  const stripe = await loadStripe(publishableKey);
  const { paymentIntent, error } =
    await stripe.retrievePaymentIntent(clientSecret);

  if (error) {
    return {
      outcome: "failed",
      reason: error.message || "We couldn't confirm your payment.",
    };
  }

  switch (paymentIntent.status) {
    case "succeeded":
      return { outcome: "succeeded", reason: null };
    case "processing":
      return {
        outcome: "processing",
        reason: "Your payment is still being processed.",
      };
    default:
      return {
        outcome: "failed",
        reason:
          paymentIntent.last_payment_error?.message ||
          "Your card was not charged. Please try again.",
      };
  }
}

// =============================================================
// ANIMATED ICONS
// =============================================================
const SuccessIcon = () => (
  <motion.svg
    viewBox="0 0 100 100"
    className="w-24 h-24 sm:w-28 sm:h-28"
    initial="hidden"
    animate="visible"
  >
    <motion.circle
      cx="50"
      cy="50"
      r="46"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="4"
      variants={{
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
          pathLength: 1,
          opacity: 1,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
    />
    <motion.path
      d="M28 52 L43 66 L74 34"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        hidden: { pathLength: 0 },
        visible: {
          pathLength: 1,
          transition: { duration: 0.4, delay: 0.4, ease: "easeOut" },
        },
      }}
    />
  </motion.svg>
);

const FailureIcon = () => (
  <motion.svg
    viewBox="0 0 100 100"
    className="w-24 h-24 sm:w-28 sm:h-28"
    initial="hidden"
    animate="visible"
  >
    <motion.circle
      cx="50"
      cy="50"
      r="46"
      fill="none"
      stroke="var(--color-danger)"
      strokeWidth="4"
      variants={{
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
          pathLength: 1,
          opacity: 1,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
    />
    <motion.g
      variants={{
        hidden: { x: 0 },
        visible: {
          x: [0, -6, 6, -4, 4, 0],
          transition: { duration: 0.5, delay: 0.35 },
        },
      }}
    >
      <motion.path
        d="M35 35 L65 65"
        stroke="var(--color-danger)"
        strokeWidth="6"
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.3 } },
        }}
      />
      <motion.path
        d="M65 35 L35 65"
        stroke="var(--color-danger)"
        strokeWidth="6"
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: {
            pathLength: 1,
            transition: { duration: 0.3, delay: 0.15 },
          },
        }}
      />
    </motion.g>
  </motion.svg>
);

// =============================================================
// MAIN COMPONENT
// =============================================================
const PaymentResult = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderNumber = searchParams.get("order");

  // "loading" -> "succeeded" | "failed" | "processing"
  const [outcome, setOutcome] = useState("loading");
  const [reason, setReason] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

  // Keeps track of the interval so it can be cleared from anywhere,
  // including the "act now" buttons, without setting up a second one.
  const countdownRef = useRef(null);

  const orderDetailPath = `${ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber)}?success=true`;
  const resumeCheckoutPath = `${ROUTES.CHECKOUT}?resume=${orderNumber}`;

  // -------------------------------------------------------
  // Step 1 — figure out what actually happened
  // -------------------------------------------------------
  useEffect(() => {
    const clientSecret = searchParams.get("payment_intent_client_secret");
    const ownStatus = searchParams.get("status");
    const ownReason = searchParams.get("reason");

    if (clientSecret) {
      // Arrived via Stripe's own redirect (3D Secure) — confirm directly
      // with Stripe rather than trusting the URL.
      resolveOutcomeFromStripeRedirect(clientSecret).then((result) => {
        setOutcome(result.outcome);
        setReason(result.reason);
      });
      return;
    }

    if (ownStatus === "succeeded") {
      setOutcome("succeeded");
      return;
    }

    if (ownStatus === "failed") {
      setOutcome("failed");
      setReason(ownReason || "Payment failed. Please try again.");
      return;
    }

    // Reached directly, with no context to resolve an outcome from —
    // nothing to auto-redirect on, so this is left as "processing" and
    // handled by the fallback UI below.
    setOutcome("processing");
  }, [searchParams]);

  // -------------------------------------------------------
  // Step 2 — once resolved to succeeded/failed, start the countdown
  // -------------------------------------------------------
  useEffect(() => {
    if (outcome !== "succeeded" && outcome !== "failed") return;

    setSecondsLeft(AUTO_REDIRECT_SECONDS);

    countdownRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(countdownRef.current);
          navigate(
            outcome === "succeeded" ? orderDetailPath : resumeCheckoutPath,
          );
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  const goNow = () => {
    clearInterval(countdownRef.current);
    navigate(outcome === "succeeded" ? orderDetailPath : resumeCheckoutPath);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 flex flex-col items-center text-center gap-5">
        <AnimatePresence mode="wait">
          {outcome === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                Confirming your payment...
              </p>
            </motion.div>
          )}

          {outcome === "succeeded" && (
            <motion.div
              key="succeeded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <SuccessIcon />
              <h1 className="text-2xl font-bold text-gray-900">
                Payment Successful!
              </h1>
              {orderNumber && (
                <p className="text-sm text-gray-500">
                  Order Number{" "}
                  <span className="font-semibold text-gray-900">
                    {orderNumber}
                  </span>
                </p>
              )}
              <p className="text-sm text-gray-400">
                Redirecting to your order in {secondsLeft}...
              </p>
              <button
                onClick={goNow}
                className="
                  w-full py-3.5 px-6 rounded-xl mt-2
                  bg-primary text-white text-sm font-bold
                  hover:bg-primary-dark active:scale-[0.98]
                  transition-all
                "
              >
                View Order Now
              </button>
            </motion.div>
          )}

          {outcome === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <FailureIcon />
              <h1 className="text-2xl font-bold text-gray-900">
                Payment Failed
              </h1>
              {reason && <p className="text-sm text-danger">{reason}</p>}
              <p className="text-sm text-gray-400">
                Taking you back to try again in {secondsLeft}...
              </p>
              <button
                onClick={goNow}
                className="
                  w-full py-3.5 px-6 rounded-xl mt-2
                  bg-primary text-white text-sm font-bold
                  hover:bg-primary-dark active:scale-[0.98]
                  transition-all
                "
              >
                Try Again Now
              </button>
            </motion.div>
          )}

          {outcome === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-100 border-t-primary rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Payment Processing
              </h1>
              <p className="text-sm text-gray-500">
                {reason ||
                  "We're still confirming this payment with your bank. This can take a little longer than usual."}
              </p>
              {orderNumber && (
                <Link
                  to={orderDetailPath}
                  className="
                    w-full py-3.5 px-6 rounded-xl mt-2
                    bg-primary text-white text-sm font-bold text-center
                    hover:bg-primary-dark active:scale-[0.98]
                    transition-all
                  "
                >
                  View Order Status
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PaymentResult;
