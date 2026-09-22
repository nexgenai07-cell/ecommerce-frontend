// ============================================================
// CHECKOUT ORDER CONFIRMATION OTP STEP
// ============================================================
// Sits between the "details" step and order placement. Before the
// order is actually created, the customer has to enter the 6-digit
// Order Confirmation OTP emailed to their registered account address —
// this component only handles that confirmation UI; the actual
// send/verify API calls and the resend cooldown timer are owned by
// Checkout.jsx, exactly like every other mutation used on this page
// (checkoutMutation, createIntentMutation, cancelMutation), and passed
// down here as props.

import { AiOutlineArrowRight, AiOutlineMail } from "react-icons/ai";
import Button from "../ui/Button";

const CheckoutOtpStep = ({
  // Masked confirmation message from the backend, e.g. "An order
  // confirmation OTP has been sent to ab***@gmail.com." Falls back to a
  // generic line if the send call hasn't resolved with a message yet.
  confirmationMessage,
  // The customer's registered account email, shown read-only as the
  // address the OTP is sent to. The OTP is never sent anywhere else.
  registeredEmail,
  // Current value of the 6-digit code input, and its setter.
  otp,
  onOtpChange,
  // Inline validation/API error shown under the input.
  error,
  // Called on submit, once the code is exactly 6 digits.
  onVerify,
  // True while verify-otp (or the checkout call right after it) is
  // in flight — disables the whole form and shows the button spinner.
  isVerifying,
  // Resend controls — cooldownSeconds is 0 once resending is allowed
  // again; isResending disables the resend link mid-request.
  onResend,
  isResending,
  cooldownSeconds,
  // Takes the customer back to the details step to fix their
  // address/shipping method — the OTP is requested again automatically
  // the next time they submit that form.
  onEditDetails,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length !== 6 || isVerifying) return;
    onVerify();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <span className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <AiOutlineMail className="w-6 h-6 text-primary" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Order Confirmation OTP
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            {confirmationMessage ||
              "Enter the 6-digit Order Confirmation OTP we just sent to your registered email."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Read-only display of the address the OTP was sent to */}
        {registeredEmail && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="checkout-otp-email"
              className="text-sm font-medium text-gray-700 text-center"
            >
              OTP sent to
            </label>
            <input
              id="checkout-otp-email"
              type="email"
              value={registeredEmail}
              readOnly
              aria-readonly="true"
              className="
                w-full px-4 py-2.5 text-sm text-center rounded-lg border border-gray-200
                bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none
              "
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="checkout-otp"
            className="text-sm font-medium text-gray-700 text-center"
          >
            Order Confirmation OTP
          </label>
          <input
            id="checkout-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="123456"
            value={otp}
            onChange={(e) =>
              onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={isVerifying}
            className={`
              w-full px-4 py-2.5 text-sm text-center tracking-[0.5em] rounded-lg border bg-white
              placeholder:text-gray-400 placeholder:tracking-normal text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all duration-150 disabled:opacity-50
              ${error ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
            `}
          />
          {error && <p className="text-xs text-danger text-center">{error}</p>}
          <p className="text-xs text-gray-400 text-center mt-1">
            This OTP expires 10 minutes after it's sent.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isVerifying}
          rightIcon={
            !isVerifying && <AiOutlineArrowRight className="w-4 h-4" />
          }
        >
          Confirm OTP &amp; Place Order
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onEditDetails}
            disabled={isVerifying}
            className="text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
          >
            ← Edit order details
          </button>

          <button
            type="button"
            onClick={onResend}
            disabled={isResending || cooldownSeconds > 0 || isVerifying}
            className="text-primary hover:text-primary-dark font-semibold disabled:opacity-50 disabled:hover:text-primary"
          >
            {isResending
              ? "Sending..."
              : cooldownSeconds > 0
                ? `Resend OTP in ${cooldownSeconds}s`
                : "Resend OTP"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckoutOtpStep;
