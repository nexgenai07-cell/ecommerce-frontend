// Payment Method Section — Stripe Payment Element
// COD / JazzCash / manual card entry — sab hata diya gaya hai.
// Ab sirf Stripe Payment Element render hota hai (card, aur Stripe ke
// hisaab se dashboard mein enabled kiye gaye baaki methods).
// Yeh component <Elements> ke ANDAR render hona chahiye (Checkout.jsx
// mein clientSecret milne ke baad <Elements> wrap karta hai) taake
// useStripe() / useElements() hooks kaam kar sakein.
// Fully responsive

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { showError } from "../ui/Toast";

// Props:
// returnUrl -> Stripe ke liye return URL (3D Secure jaisi redirect-based
//              authentication ke liye Stripe iska use karta hai; normal
//              cards ke liye redirect nahi hota, isi page par result mil jata hai)
// onSuccess -> Payment client-side confirm hone par parent (Checkout.jsx) ko batata hai
const PaymentMethod = ({ returnUrl, onSuccess }) => {
  // Stripe.js aur Elements instance — jab tak Stripe.js load nahi hota, dono null rehte hain
  const stripe = useStripe();
  const elements = useElements();

  // Payment submit ho rahi hai ya nahi — button disable/spinner ke liye
  const [isProcessing, setIsProcessing] = useState(false);
  // Stripe se aane wala error message (card declined, incomplete details, waghera)
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Stripe.js abhi load nahi hua ya Elements mount nahi hua — submit na karein
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage("");

    // stripe.confirmPayment() — Payment Element mein jo bhi details customer
    // ne dali hain, unhe Stripe ko bhejta hai aur PaymentIntent confirm karta hai.
    // redirect: "if_required" ka matlab: agar card ko koi extra authentication
    // (jaise 3D Secure) na chahiye ho, to page redirect NAHI hoga — result
    // seedha yahin milega. Agar authentication chahiye ho, Stripe khud ek
    // secure popup/modal khol dega, phir wapas isi page par le aayega.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      // Card declined (e.g. test card 4000 0000 0000 0002), incomplete
      // fields, ya koi aur validation error — Stripe khud clear, customer
      // ko dikhaane layak message deta hai.
      const message = error.message || "Payment failed. Please try again.";
      setErrorMessage(message);
      showError(message);
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Client-side confirmation mil gayi. IMPORTANT: ye order ko khud
      // "paid" mark nahi karta — asli/final confirmation hamesha Stripe
      // Webhook (API 70) se hi backend par aati hai. Hum sirf customer ko
      // order confirmation page par le ja rahe hain.
      onSuccess();
      return;
    }

    // Kabhi kabhi status "processing" ya "requires_action" reh sakta hai —
    // is case mein bhi customer ko wait karwayein, order pending_payment
    // hi rahega jab tak webhook update na kare.
    setErrorMessage(
      "Payment is being processed. Please wait a moment and check your order status.",
    );
    setIsProcessing(false);
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
        {/* Stripe's own pre-built card/payment form — validation, formatting,
            and network detection (Visa/Mastercard/etc.) are all handled by Stripe */}
        <PaymentElement options={{ layout: "tabs" }} />

        {/* Inline error message from the last failed attempt */}
        {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

        {/* Test mode helper card — test card numbers customer/QA yahan use kar sakta hai */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex flex-col gap-1">
          <p className="text-xs font-semibold text-blue-700">Test Mode</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Koi real payment nahi hogi. Success ke liye card{" "}
            <span className="font-mono font-semibold">4242 4242 4242 4242</span>{" "}
            use karein — koi bhi future expiry (e.g. 12/34), koi bhi 3-digit
            CVC, koi bhi ZIP/postal code. Decline test karne ke liye{" "}
            <span className="font-mono font-semibold">4000 0000 0000 0002</span>{" "}
            use karein.
          </p>
        </div>

        {/* Pay button — disabled until Stripe.js finishes loading, or while a
            payment attempt is already in progress */}
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

// Exporting the component so it can be imported and used elsewhere in the application
export default PaymentMethod;
