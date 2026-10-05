// Order progress stepper shared by the Cart and Checkout pages.
// It renders three steps: Cart -> Checkout -> Payment.
//
// Step states:
//   - Completed: soft green circle with a green checkmark
//   - Current:   solid green gradient circle with a glowing, pulsing halo
//   - Upcoming:  neutral grey circle with a muted icon
//
// The connector between two steps fills with a green gradient (animated) once
// the step on its left is completed. Passing isComplete marks every step as
// completed, which is used once the payment proof has been submitted.

import { motion } from "framer-motion";
// Animates the connector fill and the checkmark when a step is completed

import {
  AiOutlineCheck,
  AiOutlineShoppingCart,
  AiOutlineSolution,
  AiOutlineWallet,
} from "react-icons/ai";
// Step icons plus the checkmark shown inside completed circles

import cn from "../../utils/cn";
// Utility that merges Tailwind class strings conditionally

// Ordered step configuration. The id is compared against currentStep to
// determine the visual state of each step.
const STEPS = [
  { id: 1, label: "Cart", Icon: AiOutlineShoppingCart },
  { id: 2, label: "Checkout", Icon: AiOutlineSolution },
  { id: 3, label: "Payment", Icon: AiOutlineWallet },
];

// currentStep - the step the customer is on (1, 2 or 3).
// isComplete  - when true, every step is rendered as completed and no step is
//               treated as current.
const CheckoutStepper = ({ currentStep = 1, isComplete = false }) => {
  return (
    <nav
      aria-label="Order progress"
      className="w-full max-w-xl mx-auto px-1 py-1"
    >
      <ol className="flex items-start justify-center">
        {STEPS.map((step, index) => {
          // A step is completed when the whole flow is finished, or when it
          // comes before the step the customer is currently on.
          const isCompleted = isComplete || step.id < currentStep;

          // Only one step is current at a time, and none once the flow is done.
          const isActive = !isComplete && step.id === currentStep;

          // The last step has no connector after it.
          const isLast = index === STEPS.length - 1;

          const { Icon } = step;

          return (
            <li
              key={step.id}
              className={cn("flex items-start", !isLast && "flex-1")}
              aria-current={isActive ? "step" : undefined}
            >
              {/* Circle and label */}
              <div className="flex flex-col items-center gap-2 w-16 sm:w-24 shrink-0">
                <div className="relative">
                  {/* Pulsing halo behind the current step. Disabled for
                      users who prefer reduced motion. */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping"
                    />
                  )}

                  <div
                    className={cn(
                      // Base styles shared by every state
                      "relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",

                      isCompleted
                        ? // Completed: soft green fill with a green border
                          "bg-primary-50 border-primary text-primary"
                        : isActive
                          ? // Current: solid gradient with a glow and outer ring
                            "bg-linear-to-br from-primary-light to-primary-dark border-transparent text-white shadow-lg shadow-primary/40 ring-4 ring-primary/15 scale-105"
                          : // Upcoming: neutral grey
                            "bg-gray-50 border-gray-200 text-gray-300",
                    )}
                  >
                    {isCompleted ? (
                      <motion.span
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 18,
                        }}
                        className="flex"
                      >
                        <AiOutlineCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                      </motion.span>
                    ) : (
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                </div>

                <p
                  className={cn(
                    "text-xs sm:text-sm font-semibold whitespace-nowrap text-center transition-colors duration-300",
                    isActive
                      ? "text-primary-dark"
                      : isCompleted
                        ? "text-primary"
                        : "text-gray-400",
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector. Its vertical offset matches the circle radius
                  so the line passes through the center of the circles. The
                  green fill animates from left to right when the step on
                  its left becomes completed. */}
              {!isLast && (
                <div className="flex-1 min-w-4 mt-4.5 sm:mt-5.5 -mx-1 sm:mx-0">
                  <div className="relative h-1 rounded-full bg-gray-200 overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{ width: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-primary to-primary-light"
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default CheckoutStepper;
