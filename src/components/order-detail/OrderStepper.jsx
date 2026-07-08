import { AiOutlineCheck, AiOutlineHome } from "react-icons/ai"; // Check icon for Confirmed and Shipped steps, Home icon for the final Delivered step
import { BsTruck, BsBoxSeam } from "react-icons/bs"; // Truck icon for Out for Delivery, Box icon for the first Placed step
import { ORDER_STATUS } from "../../constants/statusTypes"; // Shared status constants — keeps status string comparisons consistent
import cn from "../../utils/cn"; // Utility that merges Tailwind class names conditionally

// ORDER_STEPS — static ordered array that defines every stage of the delivery journey
// Each step has a unique id, a display label, and the icon rendered inside its circle
const ORDER_STEPS = [
  {
    id: "placed", // Matches the very first state when an order is submitted
    label: "Placed",
    icon: <BsBoxSeam className="w-4 h-4" />, // Box icon — represents the order being packaged
  },
  {
    id: "confirmed", // Seller has acknowledged and accepted the order
    label: "Confirmed",
    icon: <AiOutlineCheck className="w-4 h-4" />, // Check mark — order is verified
  },
  {
    id: "shipped", // Order has left the warehouse and is with the courier
    label: "Shipped",
    icon: <AiOutlineCheck className="w-4 h-4" />, // Check mark — dispatched successfully
  },
  {
    id: "out_for_delivery", // Courier is actively delivering to the customer's address
    label: "Out for Delivery",
    icon: <BsTruck className="w-4 h-4" />, // Truck icon — in transit to the door
  },
  {
    id: "delivered", // Order has been received by the customer — journey complete
    label: "Delivered",
    icon: <AiOutlineHome className="w-4 h-4" />, // Home icon — safely arrived at destination
  },
];

// getStepIndex — maps an order status string to the index of the corresponding step in ORDER_STEPS
// Returns 0 as the default so cancelled or unknown statuses don't break the stepper
const getStepIndex = (status) => {
  switch (status) {
    case ORDER_STATUS.PENDING:
      return 0; // Order placed but not yet confirmed by the seller
    case ORDER_STATUS.CONFIRMED:
      return 1; // Seller confirmed the order
    case ORDER_STATUS.SHIPPED:
      return 2; // Order is on its way
    case "out_for_delivery":
      return 3; // Courier is at the last mile — no constant exists yet so string is used directly
    case ORDER_STATUS.DELIVERED:
      return 4; // Customer received the order — all steps complete
    default:
      return 0; // Unknown or cancelled status — highlight nothing beyond the first step
  }
};

const OrderStepper = ({ status }) => {
  // Resolve the current step index once from the incoming status prop
  const currentIndex = getStepIndex(status);

  return (
    // Card wrapper — white background, rounded corners, subtle border, inner padding
    // shadow-sm gives the card a gentle resting elevation, consistent with the
    // "uthay huay" (raised) treatment applied across the rest of the account pages
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {/* Horizontal scroll container — pb-1 prevents the scrollbar from clipping the bottom of circles */}
      <div className="flex items-start overflow-x-auto scrollbar-hide pb-1">
        {ORDER_STEPS.map((step, index) => {
          const isCompleted = index <= currentIndex; // True for every step up to and including the current one
          const isActive = index === currentIndex; // True only for the exact current step
          const isLast = index === ORDER_STEPS.length - 1; // True for "Delivered" — no connector line after it

          return (
            // Each step takes equal horizontal space via flex-1
            // min-w-0 prevents the flex child from overflowing its container
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              {/* ── Step circle + label ──────────────────────────────────────
                  shrink-0 prevents the circle from squishing when space is tight */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                {/* Circle — filled with primary color when completed, white with gray border when pending */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-primary border-primary text-white shadow-sm" // completed or active — brand color fill, white icon
                      : "bg-white border-gray-200 text-gray-300", // future step — empty white circle, gray icon
                  )}
                >
                  {step.icon} {/* Icon defined in ORDER_STEPS config above */}
                </div>

                {/* Step label — primary color when completed, gray when not yet reached */}
                <p
                  className={cn(
                    "text-xs font-medium text-center whitespace-nowrap leading-tight",
                    isCompleted
                      ? "text-primary" // completed steps use brand color label
                      : "text-gray-300", // future steps use muted gray label
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* ── Connector line ───────────────────────────────────────────
                  Skipped entirely for the last step since there's no next step to connect to
                  flex-1 makes the line stretch to fill all space between the two circles
                  mx-2 adds breathing room between the circle edge and the line
                  mb-5 nudges the line upward to align it with the center of the circles
                  (circles + labels sit below, so the line needs to compensate vertically) */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 mb-5 transition-all duration-500",
                    index < currentIndex
                      ? "bg-primary" // line between two completed steps — filled with brand color
                      : "bg-gray-200", // line leading into a future step — remains light gray
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

export default OrderStepper; // Export so it can be dropped into the Order Detail and Order Tracking pages
