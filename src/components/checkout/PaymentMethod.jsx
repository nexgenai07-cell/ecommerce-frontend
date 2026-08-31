import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { showError } from "../ui/Toast";

// Props:
// returnUrl -> Where Stripe redirects the customer back to after an
//              authentication step (3D Secure) that requires leaving the
//              page. Cards that don't need extra authentication never
//              trigger this redirect — the result is resolved inline,
//              on this same page, without a navigation.
// onSuccess -> Called once stripe.confirmPayment() resolves with a
//              "succeeded" PaymentIntent without needing a redirect.
// onFailure -> Called with a human-readable reason once
//              stripe.confirmPayment() resolves with a hard failure
//              (e.g. card declined) without needing a redirect. The
//              parent is responsible for taking the customer to the
//              payment result page with that reason.
const PaymentMethod = ({ returnUrl, onSuccess, onFailure }) => {
  // Stripe.js and Elements instance — both stay null until Stripe.js has
  // finished loading and the PaymentElement has mounted.
  const stripe = useStripe();
  const elements = useElements();

  // Whether a payment attempt is currently in flight — drives the
  // disabled/spinner state of the submit button.
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Stripe.js hasn't finished loading, or the Payment Element hasn't
    // mounted yet — there is nothing to submit.
    if (!stripe || !elements) return;

    setIsProcessing(true);

    // stripe.confirmPayment() sends whatever the customer entered into the
    // Payment Element to Stripe and attempts to confirm the PaymentIntent.
    // redirect: "if_required" means the browser will only navigate away
    // to returnUrl when the card genuinely requires an extra
    // authentication step (e.g. 3D Secure). When no such step is needed,
    // the result comes back directly in this same call, with no
    // navigation involved.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      // Card declined, incomplete fields, or another validation error —
      // Stripe already provides a message that is safe to show directly
      // to the customer.
      const message = error.message || "Payment failed. Please try again.";
      showError(message);
      setIsProcessing(false);
      onFailure(message);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Client-side confirmation received. This does not mark the order
      // as paid — the authoritative confirmation always comes from the
      // Stripe webhook on the backend. This only moves the customer
      // forward in the UI.
      setIsProcessing(false);
      onSuccess();
      return;
    }

    // Any other status at this point (e.g. "processing") means the
    // payment is still being finalized on Stripe's side. Treat it the
    // same way as a failure to reach the customer here, since there is
    // nothing further this page can do — send them to the result page,
    // where the PaymentIntent status is read fresh.
    setIsProcessing(false);
    onFailure(
      "Payment is still being processed. Please check your order status shortly.",
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
      {/* Section heading + Stripe test-mode badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">Payment</h2>
        <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-[#635bff] rounded-full">
          Secured by Stripe · Test Mode
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Stripe's own pre-built card/payment form — validation,
            formatting, and card network detection are all handled by
            Stripe itself. */}
        <PaymentElement options={{ layout: "tabs" }} />

        {/* Test mode helper card — reference card numbers for QA */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex flex-col gap-1">
          <p className="text-xs font-semibold text-blue-700">Test Mode</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            No real payment will be made. Use{" "}
            <span className="font-mono font-semibold">4242 4242 4242 4242</span>{" "}
            for a successful payment — any future expiry (e.g. 12/34), any
            3-digit CVC, and any ZIP/postal code. Use{" "}
            <span className="font-mono font-semibold">4000 0000 0000 0002</span>{" "}
            to test a decline.
          </p>
        </div>

        {/* Pay button — disabled until Stripe.js finishes loading, or
            while a payment attempt is already in progress. */}
        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="
            w-full py-3.5 px-6 rounded-xl
            bg-primary text-white text-sm font-bold
            hover:bg-primary-dark active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-all
          "
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            "Pay Now"
          )}
        </button>
      </form>
    </div>
  );
};

export default PaymentMethod;
