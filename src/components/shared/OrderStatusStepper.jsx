// Reusable OrderStatusStepper component
// Displays a horizontal stepper on the order tracking page
// Completed steps are shown in emerald, the active step is highlighted, and pending steps are gray
// Used in OrderDetail and OrderTracking pages
// Fully responsive — vertical layout on mobile, horizontal layout on desktop

// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";
// Import the ORDER_STATUS constants object containing valid status values
import { ORDER_STATUS } from "../../constants/statusTypes";
// Import a helper function that formats a date/timestamp into a readable string
import formatDate from "../../utils/formatDate";

// Array containing all possible order steps, in the correct sequence
const ORDER_STEPS = [
  {
    status: ORDER_STATUS.PENDING, // Matches this step to the PENDING order status
    label: "Order Placed", // Text label shown for this step
    description: "Your order has been placed successfully", // Longer description shown for this step
    icon: (
      // Shopping bag icon — represents an order being placed
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
  },
  {
    status: ORDER_STATUS.CONFIRMED, // Matches this step to the CONFIRMED order status
    label: "Order Confirmed",
    description: "Your order has been confirmed",
    icon: (
      // Checkmark icon — represents order confirmation
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    status: ORDER_STATUS.SHIPPED, // Matches this step to the SHIPPED order status
    label: "Order Shipped",
    description: "Your order is on the way",
    icon: (
      // Truck icon — represents shipping/dispatch
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    status: ORDER_STATUS.DELIVERED, // Matches this step to the DELIVERED order status
    label: "Order Delivered",
    description: "Your order has been delivered",
    icon: (
      // Home icon — represents successful delivery
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
];

// Define the OrderStatusStepper functional component and destructure its props with default values
const OrderStatusStepper = ({
  currentStatus = "", // The order's current status
  history = [], // The order's status history — array of objects like {status, timestamp}
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Find the index of the current status within the ORDER_STEPS array — tells us how many steps are completed
  const currentStepIndex = ORDER_STEPS.findIndex(
    (step) => step.status === currentStatus,
  );

  // Function to get the timestamp for a given step's status from the history array
  const getTimestamp = (status) => {
    const historyItem = history.find((h) => h.status === status); // Find the matching history entry
    return historyItem ? formatDate(historyItem.timestamp) : ""; // Format and return the date, or empty string if not found
  };

  // Function to check whether a given step (by index) is completed
  const isCompleted = (index) => {
    // Special case for cancelled orders — only steps before the current one count as completed
    if (currentStatus === ORDER_STATUS.CANCELLED) {
      return index < currentStepIndex;
    }
    return index <= currentStepIndex; // Normal case — everything up to and including the current step is completed
  };

  // Function to check whether a given step (by index) is the currently active one
  const isActive = (index) => index === currentStepIndex;

  // Return the JSX that will be rendered on the screen
  return (
    <div className={cn("w-full", className)}>
      {/* Cancelled order banner — only shown if the order status is CANCELLED */}
      {currentStatus === ORDER_STATUS.CANCELLED && (
        <div className="mb-4 px-4 py-3 bg-danger-light rounded-lg border border-red-100">
          <p className="text-sm font-medium text-danger">
            This order has been cancelled
          </p>
        </div>
      )}

      {/* Container holding both the desktop and mobile stepper layouts */}
      <div className="relative">
        {/* Desktop view — horizontal stepper, hidden on small screens, shown from "sm" breakpoint up */}
        <div className="hidden sm:flex items-start justify-between relative">
          {/* Background progress line that runs behind all the step circles */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0">
            {/* Foreground progress fill — emerald color, grows based on current step */}
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                // Calculate how far the line should fill based on the current step index
                width:
                  currentStepIndex >= 0
                    ? `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%`
                    : "0%",
              }}
            />
          </div>

          {/* Loop through each step and render its circle + label */}
          {ORDER_STEPS.map((step, index) => (
            <div
              key={step.status} // Unique key based on the step's status
              className="flex flex-col items-center gap-2 z-10 flex-1" // Centered column layout, sits above the progress line
            >
              {/* Step circle — shows icon or checkmark depending on state */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300", // Base circle styling
                  isCompleted(index)
                    ? "bg-primary border-primary text-white" // Completed step — filled emerald circle
                    : isActive(index)
                      ? "bg-white border-primary text-primary" // Active step — white circle with emerald border/text
                      : "bg-white border-gray-200 text-gray-300", // Pending step — plain gray circle
                )}
              >
                {/* If the step is completed AND not the active one, show a checkmark; otherwise show the step's own icon */}
                {isCompleted(index) && !isActive(index) ? (
                  <svg
                    className="w-4 h-4"
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
                  step.icon // Fallback to the step's defined icon
                )}
              </div>

              {/* Step label and timestamp, centered below the circle */}
              <div className="flex flex-col items-center gap-0.5 text-center">
                <p
                  className={cn(
                    "text-xs font-medium",
                    isCompleted(index) || isActive(index)
                      ? "text-gray-800" // Completed or active step — darker text
                      : "text-gray-400", // Pending step — lighter gray text
                  )}
                >
                  {step.label} {/* Display the step's label text */}
                </p>

                {/* Only render the timestamp paragraph if a timestamp actually exists for this step */}
                {getTimestamp(step.status) && (
                  <p className="text-xs text-gray-400">
                    {getTimestamp(step.status)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile view — vertical stepper, shown only below the "sm" breakpoint */}
        <div className="flex sm:hidden flex-col gap-0">
          {ORDER_STEPS.map((step, index) => (
            <div key={step.status} className="flex gap-4">
              {" "}
              {/* Each step is a horizontal row: circle/line on the left, text on the right */}
              {/* Left side — step circle and the connecting vertical line */}
              <div className="flex flex-col items-center">
                {/* Step circle — same logic as the desktop version */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-300", // Base circle styling, prevents shrinking
                    isCompleted(index)
                      ? "bg-primary border-primary text-white" // Completed — filled emerald circle
                      : isActive(index)
                        ? "bg-white border-primary text-primary" // Active — white circle with emerald border/text
                        : "bg-white border-gray-200 text-gray-300", // Pending — plain gray circle
                  )}
                >
                  {/* Show checkmark for completed-but-not-active steps, otherwise show the step's icon */}
                  {isCompleted(index) && !isActive(index) ? (
                    <svg
                      className="w-4 h-4"
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
                    step.icon
                  )}
                </div>

                {/* Vertical connecting line — not rendered after the last step */}
                {index < ORDER_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 my-1 min-h-6", // Thin vertical line with minimum height
                      isCompleted(index)
                        ? "bg-primary" // Completed step — emerald colored line
                        : "bg-gray-200", // Pending step — gray colored line
                    )}
                  />
                )}
              </div>
              {/* Right side — step label, description, and timestamp */}
              <div className="flex flex-col gap-0.5 pb-6">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted(index) || isActive(index)
                      ? "text-gray-800" // Completed or active — darker text
                      : "text-gray-400", // Pending — lighter gray text
                  )}
                >
                  {step.label} {/* Display the step's label text */}
                </p>

                <p className="text-xs text-gray-400">
                  {step.description} {/* Display the step's description text */}
                </p>

                {/* Only render the timestamp paragraph if a timestamp actually exists for this step */}
                {getTimestamp(step.status) && (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {getTimestamp(step.status)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export the component so it can be imported and used in other files
export default OrderStatusStepper;
