// ============================================================
// PAYMENT METHOD SELECTOR — CHECKOUT
// ============================================================
// Lets the customer choose how they'll pay before placing the order:
// - Card (Stripe) — the existing fully-automated flow, unchanged.
// - QR Payment (Easypaisa/JazzCash) — a static QR code the customer
//   pays outside the system, then proves with an uploaded screenshot.
// Whichever is selected here is sent as "payment_method" on the
// Checkout request, and decides what the Checkout page shows next:
// the Stripe Payment Element, or the QR payment panel.

import { HiOutlineCreditCard, HiOutlineQrCode } from "react-icons/hi2";
import cn from "../../utils/cn";
import { PAYMENT_METHOD } from "../../constants/statusTypes";

const OPTIONS = [
  {
    value: PAYMENT_METHOD.STRIPE,
    label: "Card",
    description: "Pay instantly with a debit or credit card",
    icon: HiOutlineCreditCard,
  },
  {
    value: PAYMENT_METHOD.QR,
    label: "QR Payment",
    description: "Pay via Easypaisa or JazzCash, then upload proof",
    icon: HiOutlineQrCode,
  },
];

const PaymentMethodSelector = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <span
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  selected
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                <Icon className="w-4.5 h-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
