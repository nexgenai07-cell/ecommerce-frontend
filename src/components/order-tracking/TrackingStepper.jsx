// Import a home icon from the "ai" icon set, used for the final "Delivered" step
import { AiOutlineHome } from "react-icons/ai";
// Import cart, shield, truck, and box icons from the "bs" (Bootstrap) icon set
import { BsCartCheck, BsShieldCheck, BsTruck, BsBoxSeam } from "react-icons/bs";
// Import the ORDER_STATUS constant object that holds all possible order status string values
import { ORDER_STATUS } from "../../constants/statusTypes";
// Import a utility function "cn" used to conditionally join CSS class names together
import cn from "../../utils/cn";

// Steps config — design ke according
// Define an array of step objects that describe each stage of the tracking stepper
const TRACKING_STEPS = [
  {
    // Unique identifier for the "Order Placed" step
    id: "placed",
    // Text label shown under the step circle
    label: "Order Placed",
    // Icon element to render inside the step circle (cart check icon, sized 5x5 with tailwind classes)
    icon: <BsCartCheck className="w-5 h-5" />,
    // List of order statuses for which this step should be considered "completed/reached"
    statuses: [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.SHIPPED,
      "out_for_delivery",
      ORDER_STATUS.DELIVERED,
    ],
  },
  {
    // Unique identifier for the "Confirmed" step
    id: "confirmed",
    // Text label shown under the step circle
    label: "Confirmed",
    // Icon element to render inside the step circle (shield check icon)
    icon: <BsShieldCheck className="w-5 h-5" />,
    // Statuses at or after which the "Confirmed" step counts as reached
    statuses: [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.SHIPPED,
      "out_for_delivery",
      ORDER_STATUS.DELIVERED,
    ],
  },
  {
    // Unique identifier for the "Shipped" step
    id: "shipped",
    // Text label shown under the step circle
    label: "Shipped",
    // Icon element to render inside the step circle (truck icon)
    icon: <BsTruck className="w-5 h-5" />,
    // Statuses at or after which the "Shipped" step counts as reached
    statuses: [
      ORDER_STATUS.SHIPPED,
      "out_for_delivery",
      ORDER_STATUS.DELIVERED,
    ],
  },
  {
    // Unique identifier for the "Out for Delivery" step
    id: "out_for_delivery",
    // Text label shown under the step circle
    label: "Out for Delivery",
    // Icon element to render inside the step circle (box/package icon)
    icon: <BsBoxSeam className="w-5 h-5" />,
    // Statuses at or after which the "Out for Delivery" step counts as reached
    statuses: ["out_for_delivery", ORDER_STATUS.DELIVERED],
  },
  {
    // Unique identifier for the "Delivered" step (final step)
    id: "delivered",
    // Text label shown under the step circle
    label: "Delivered",
    // Icon element to render inside the step circle (home icon, representing delivered to home)
    icon: <AiOutlineHome className="w-5 h-5" />,
    // Only the "DELIVERED" status counts as reaching this final step
    statuses: [ORDER_STATUS.DELIVERED],
  },
];

// Current active step index nikalna
// Helper function that converts the raw order status string into a numeric step index (0 to 4)
const getActiveIndex = (status) => {
  // Check which status was passed in and return the matching step index
  switch (status) {
    // If status is "pending", active step is index 0 ("Order Placed")
    case ORDER_STATUS.PENDING:
      return 0;
    // If status is "confirmed", active step is index 1 ("Confirmed")
    case ORDER_STATUS.CONFIRMED:
      return 1;
    // If status is "shipped", active step is index 2 ("Shipped")
    case ORDER_STATUS.SHIPPED:
      return 2;
    // If status is "out_for_delivery", active step is index 3 ("Out for Delivery")
    case "out_for_delivery":
      return 3;
    // If status is "delivered", active step is index 4 ("Delivered")
    case ORDER_STATUS.DELIVERED:
      return 4;
    // Fallback: if status doesn't match any known case, default to index 0
    default:
      return 0;
  }
};

// Main functional component that renders the tracking stepper UI, receives "status" as a prop
const TrackingStepper = ({ status }) => {
  // Compute the numeric index of the currently active step based on the passed-in status
  const activeIndex = getActiveIndex(status);

  // Begin returning the JSX markup for this component
  return (
    // Outer white card container with rounded corners, light border, and padding (more padding on small+ screens)
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">
      {/* Flex row wrapper that allows horizontal scrolling on small screens and hides the scrollbar visually */}
      <div className="flex items-start overflow-x-auto scrollbar-hide pb-1">
        {/* Loop through every step in TRACKING_STEPS and render it along with its index */}
        {TRACKING_STEPS.map((step, index) => {
          // Is step completed ya active hai
          // A step is "completed" (or currently reached) if its index is less than or equal to the active index
          const isCompleted = index <= activeIndex;
          // Active step
          // A step is the "active" one only if its index exactly matches the active index
          const isActive = index === activeIndex;
          // Last step pe connector nahi
          // Check whether this is the last step in the array (so we know not to render a connector line after it)
          const isLast = index === TRACKING_STEPS.length - 1;

          // Return the JSX for a single step (circle + label + optional connector line)
          return (
            // Wrapper for one step; flex-1 lets it grow, min-w-0 prevents flex overflow issues, key is the step id for React's list rendering
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              {/* Step circle + label */}
              {/* Column container holding the circle on top and the label text below it, centered, with gap between them, and shrink-0 so it doesn't shrink in the flex row */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                {/* Circle with icon */}
                {/* Circular div that holds the step icon; size, rounding, flex centering, border, and smooth transition for state changes */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    // Conditional styling: if completed, fill with primary (emerald) color, white text/icon, and a subtle shadow
                    isCompleted
                      ? "bg-primary border-primary text-white shadow-sm shadow-primary/20"
                      : // If not completed yet, show an empty white circle with a light gray border and light gray icon color
                        "bg-white border-gray-200 text-gray-300",
                  )}
                >
                  {/* Render the icon defined for this step */}
                  {step.icon}
                </div>

                {/* Step label */}
                {/* Paragraph element showing the step's text label below the circle */}
                <p
                  className={cn(
                    // Base classes: small bold text, centered, no line wrapping, tight line height
                    "text-xs font-semibold text-center whitespace-nowrap leading-tight",
                    // Conditional text color based on step state
                    isActive
                      ? "text-primary" // Active step — emerald
                      : isCompleted
                        ? "text-gray-700" // Completed — dark
                        : "text-gray-300", // Future — light gray
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
                    // Base classes: thin line height, grows to fill available space, horizontal margin, bottom margin to align with circle center, smooth transition
                    "h-0.5 flex-1 mx-3 mb-7 transition-all duration-500",
                    // If this step's index is before the active index, the connector is fully "completed" so color it emerald
                    index < activeIndex
                      ? "bg-primary" // Completed — emerald
                      : // Otherwise, the connector is still pending, so color it gray
                        "bg-gray-200", // Pending — gray
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default TrackingStepper;
