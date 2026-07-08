// Return Request 3-step Stepper
// Select Order → Select Items → Submit
// Active step emerald, completed emerald filled
// Connector lines between steps
// Fully responsive

// Import a checkmark icon from the "ai" icon set, used inside completed step circles
import { AiOutlineCheck } from "react-icons/ai";
// Import a utility function "cn" used to conditionally join CSS class names together
import cn from "../../utils/cn";

// Steps config
// Define the array of steps for this 3-step return request flow, each with a numeric id and display label
const STEPS = [
  { id: 1, label: "Select Order" },
  { id: 2, label: "Select Items" },
  { id: 3, label: "Submit" },
];

// Main functional component that renders the return request stepper; receives "currentStep" (numeric) as a prop
const ReturnStepper = ({ currentStep }) => {
  // Begin returning the JSX markup for this component
  return (
    // Outer row container that centers all steps horizontally, items aligned to the top
    <div className="flex items-start justify-center">
      {/* Loop through every step in STEPS and render it along with its index */}
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep; // Pehle wale steps complete
        // Check whether this step is the currently active one
        const isActive = step.id === currentStep; // Current step
        // Check whether this is the last step in the array (so we know not to render a connector line after it)
        const isLast = index === STEPS.length - 1;

        // Return the JSX for a single step (circle + label + optional connector line)
        return (
          // Wrapper for one step, using the step's id as the React key
          <div key={step.id} className="flex items-center">
            {/* Step circle + label */}
            {/* Column container holding the circle on top and the label text below it, centered, with gap between them, and shrink-0 so it doesn't shrink */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              {/* Circle */}
              {/* Circular div showing either a checkmark (if completed) or the step number, with border and smooth transition for state changes */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",
                  // Conditional styling based on step state: completed (filled emerald), active (white with emerald border/text), or future (gray)
                  isCompleted
                    ? "bg-primary border-primary text-white" // Completed — emerald filled
                    : isActive
                      ? "bg-white border-primary text-primary" // Active — emerald border
                      : "bg-white border-gray-200 text-gray-300", // Future — gray
                )}
              >
                {/* Show a checkmark icon if the step is completed, otherwise show the step's numeric id */}
                {isCompleted ? <AiOutlineCheck className="w-4 h-4" /> : step.id}
              </div>
              {/* Label */}
              {/* Text label shown below the circle for this step */}
              <p
                className={cn(
                  // Base classes: small medium-weight text, no line wrapping
                  "text-xs font-medium whitespace-nowrap",
                  // Conditional text color based on step state
                  isActive
                    ? "text-primary"
                    : isCompleted
                      ? "text-gray-600"
                      : "text-gray-300",
                )}
              >
                {/* Display the step's label text */}
                {step.label}
              </p>
            </div>
            {/* Connector line — last step pe nahi */}
            {/* Only render the connector line if this is NOT the last step */}
            {!isLast && (
              // Horizontal connector line between this step's circle and the next one
              <div
                className={cn(
                  // Base classes: fixed width (wider on small+ screens), thin height, horizontal margin, bottom margin to align with circle center, smooth transition
                  "w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all duration-300",
                  // Color the connector emerald if this step is completed, otherwise gray
                  isCompleted ? "bg-primary" : "bg-gray-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default ReturnStepper;
