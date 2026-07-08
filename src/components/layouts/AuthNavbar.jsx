// Auth Navbar — auth aur checkout pages ke liye shared navbar
// 6 variants: login, register, forgotPassword, resetPassword, checkout, orderConfirmation
// Checkout variant pe progress stepper dikhta hai
// Emerald accent color, fully responsive

import { Link, useNavigate } from "react-router-dom";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { BsShieldCheck, BsLock } from "react-icons/bs";
import cn from "../../utils/cn";
import { ROUTES } from "../../constants/routes";

// =============================================
// CHECKOUT STEPPER STEPS
// Cart → Checkout → Confirm
// =============================================
const CHECKOUT_STEPS = [
  { label: "Cart", step: 1 },
  { label: "Checkout", step: 2 },
  { label: "Confirm", step: 3 },
];

const AuthNavbar = ({
  variant = "login", // login, register, forgotPassword, resetPassword, checkout, orderConfirmation
  currentStep = 1, // Checkout stepper ke liye — 1, 2, ya 3
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-100">
      {/* ===== MAIN NAVBAR ROW ===== */}
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between max-w-7xl mx-auto relative">
        {/* =============================================
            LEFT SIDE — variant ke hisaab se
            ============================================= */}

        {/* Login variant */}
        {variant === "login" && (
          <Link
            to={ROUTES.HOME}
            className="font-bold text-lg text-black tracking-tight"
          >
            Zyron ✦
          </Link>
        )}

        {/* Register variant */}
        {variant === "register" && (
          <Link
            to={ROUTES.HOME}
            className="font-bold text-lg text-black tracking-tight"
          >
            Zyron ✦
          </Link>
        )}

        {/* ForgotPassword + ResetPassword — back to login */}
        {(variant === "forgotPassword" || variant === "resetPassword") && (
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            <AiOutlineArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </button>
        )}

        {/* Checkout variant — logo */}
        {variant === "checkout" && (
          <Link
            to={ROUTES.HOME}
            className="font-bold text-lg text-black tracking-tight"
          >
            Zyron
          </Link>
        )}

        {/* Order confirmation — logo */}
        {variant === "orderConfirmation" && (
          <Link
            to={ROUTES.HOME}
            className="font-bold text-lg text-black tracking-tight"
          >
            Zyron
          </Link>
        )}

        {/* =============================================
            CENTER — variant ke hisaab se
            ============================================= */}

        {/* ForgotPassword + ResetPassword — centered logo */}
        {(variant === "forgotPassword" || variant === "resetPassword") && (
          <Link
            to={ROUTES.HOME}
            className="absolute left-1/2 -translate-x-1/2 font-bold text-lg text-black tracking-tight"
          >
            Zyron ✦
          </Link>
        )}

        {/* Checkout — secure checkout badge */}
        {variant === "checkout" && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <BsShieldCheck className="w-4 h-4 text-primary" />
            <span>Secure Checkout</span>
          </div>
        )}

        {/* =============================================
            RIGHT SIDE — variant ke hisaab se
            ============================================= */}

        {/* Login — register link */}
        {variant === "login" && (
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to={ROUTES.REGISTER}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Register
              <AiOutlineArrowRight className="w-3 h-3" />
            </Link>
          </p>
        )}

        {/* Register — sign in link */}
        {variant === "register" && (
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to={ROUTES.LOGIN}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Sign In
              <AiOutlineArrowRight className="w-3 h-3" />
            </Link>
          </p>
        )}

        {/* Checkout — SSL encrypted badge */}
        {variant === "checkout" && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <BsLock className="w-3 h-3" />
            <span>256-bit SSL Encrypted</span>
          </div>
        )}

        {/* Order confirmation — continue shopping */}
        {variant === "orderConfirmation" && (
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Continue Shopping
            <AiOutlineArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* ForgotPassword + ResetPassword — right side khali (spacer for balance) */}
        {(variant === "forgotPassword" || variant === "resetPassword") && (
          <div />
        )}
      </div>

      {/* =============================================
          CHECKOUT STEPPER
          Sirf checkout aur orderConfirmation pe
          ============================================= */}
      {(variant === "checkout" || variant === "orderConfirmation") && (
        <div className="border-t border-gray-100 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-0">
              {CHECKOUT_STEPS.map((step, index) => {
                const isCompleted = step.step < currentStep;
                const isActive = step.step === currentStep;
                const isLast = index === CHECKOUT_STEPS.length - 1;

                return (
                  <div key={step.step} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all",
                          isCompleted
                            ? "bg-primary border-primary text-white"
                            : isActive
                              ? "bg-white border-primary text-primary"
                              : "bg-white border-gray-200 text-gray-300",
                        )}
                      >
                        {isCompleted ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          step.step
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isCompleted || isActive
                            ? "text-primary"
                            : "text-gray-300",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>

                    {!isLast && (
                      <div
                        className={cn(
                          "w-16 sm:w-24 h-0.5 mx-1 mb-4 transition-all",
                          isCompleted ? "bg-primary" : "bg-gray-200",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export { AuthNavbar };
export default AuthNavbar;
