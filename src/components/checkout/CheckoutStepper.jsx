// Checkout progress stepper shown at the top of the Checkout page
// Displays 3 steps: Cart → Checkout → Confirmation
// Completed steps show a filled green circle with a checkmark
// The active step shows an outlined green circle with the step number
// Future steps are grey and inactive
// Connector lines between steps also turn green as steps are completed

import { AiOutlineCheck } from "react-icons/ai";
// Checkmark icon shown inside completed step circles

import cn from "../../utils/cn";
// Utility that merges Tailwind class strings conditionally — like classnames/clsx

// Static step configuration — defines the order and labels of the 3 checkout steps
// id is used to compare against currentStep to determine each step's visual state
const STEPS = [
  { id: 1, label: "Cart" },
  { id: 2, label: "Checkout" },
  { id: 3, label: "Confirmation" },
];

// currentStep — the step the user is currently on (1, 2, or 3)
// Defaults to 2 since this stepper is primarily shown on the Checkout page
const CheckoutStepper = ({ currentStep = 2 }) => {
  return (
    // Centered horizontally with no gap — connector lines handle spacing between steps
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, index) => {
        // Any step with an id lower than currentStep has already been completed
        const isCompleted = step.id < currentStep;

        // The step whose id matches currentStep is the one the user is on right now
        const isActive = step.id === currentStep;

        // Used to skip rendering the connector line after the last step
        const isLast = index === STEPS.length - 1;

        return (
          // Each step + its connector line are grouped together in a flex row
          <div key={step.id} className="flex items-center">
            {/* ─── Step Circle + Label ─── */}
            {/* flex-col stacks the circle above its label */}
            <div className="flex flex-col items-center gap-1.5">
              {/* Step circle — color changes based on completed / active / future state */}
              <div
                className={cn(
                  // Base styles shared across all states
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",

                  isCompleted
                    ? "bg-primary border-primary text-white"
                    : // Completed: solid green fill with white icon

                      isActive
                      ? "bg-white border-primary text-primary"
                      : // Active: white background with green border and green number

                        "bg-white border-gray-200 text-gray-300",
                  // Future: white background with grey border and grey number
                )}
              >
                {/* Completed steps show a checkmark, all others show their step number */}
                {isCompleted ? <AiOutlineCheck className="w-4 h-4" /> : step.id}
              </div>

              {/* Step label below the circle — green for active/completed, grey for future */}
              <p
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  // whitespace-nowrap prevents "Confirmation" from wrapping to two lines
                  isActive || isCompleted ? "text-primary" : "text-gray-300",
                )}
              >
                {step.label}
              </p>
            </div>

            {/* ─── Connector Line ─── */}
            {/* Not rendered after the last step — no line needed after "Confirmation" */}
            {/* mb-4 nudges the line up to align with the center of the circles, not the labels */}
            {/* Turns green when the step to its left is completed */}
            {!isLast && (
              <div
                className={cn(
                  "w-16 sm:w-24 h-0.5 mx-2 mb-4 transition-all duration-300",
                  // Wider line on sm+ screens for better visual balance
                  isCompleted ? "bg-primary" : "bg-gray-200",
                  // Green if the step before this connector is done, grey otherwise
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Export so the Checkout page can import and render this stepper at the top
export default CheckoutStepper;
