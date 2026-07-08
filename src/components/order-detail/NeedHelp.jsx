import { Link, useNavigate } from "react-router-dom"; // Link renders anchor tags that navigate without a full page reload; useNavigate lets the AI button navigate programmatically
import { BsTruck, BsArrowReturnLeft, BsRobot } from "react-icons/bs"; // Truck for tracking, return arrow for returns, robot for AI chat
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { ORDER_STATUS } from "../../constants/statusTypes"; // Shared order status constants used to control button visibility

const NeedHelp = ({
  orderNumber, // string — the order's unique identifier, injected into route paths
  status, // string — current order status, determines which action buttons are visible
  hasReturn, // boolean — true if a return request already exists for this order
  onCancel, // function — callback fired when the customer clicks Cancel Order
}) => {
  const navigate = useNavigate(); // used by the "Chat with AI" button to navigate programmatically

  // canCancel — true only while the order can still be stopped before it ships
  // Once an order is Shipped, Delivered, or Cancelled it can no longer be cancelled
  const canCancel = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(
    status,
  );

  // canReturn — true only when the order has been delivered AND no return has been filed
  // Prevents a second return request from being created for the same order
  const canReturn = status === ORDER_STATUS.DELIVERED && !hasReturn;

  return (
    // Card wrapper — white background, rounded corners, subtle border, inner padding, vertical stack
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
      {/* Section heading */}
      <h2 className="text-base font-bold text-gray-900">Need Help?</h2>

      {/* ── Track Order ───────────────────────────────────────────────────────
          Always visible — brand gradient pill, navigates to the tracking page
          Upgraded from a flat bg-primary fill to the same gradient CTA
          language used on Wishlist/Orders/Notifications
          active:scale-[0.98] gives a subtle press-down feel on click           */}
      <Link
        to={ROUTES.ACCOUNT_ORDER_TRACKING.replace(":id", orderNumber)} // inject this order's id into the tracking route
        className="
          flex items-center gap-3 w-full px-4 py-3 rounded-xl
          bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold
          shadow-md shadow-primary/20
          hover:shadow-lg hover:shadow-primary/30 hover:brightness-105
          active:scale-[0.98]
          transition-all
        "
      >
        <BsTruck className="w-4 h-4 shrink-0" />{" "}
        {/* Truck icon — visually communicates shipment tracking */}
        Track Order
      </Link>

      {/* ── Return Items ──────────────────────────────────────────────────────
          Only rendered when canReturn is true (Delivered + no existing return)
          Outlined button style — less prominent than Track Order               */}
      {canReturn && (
        <Link
          to={ROUTES.ACCOUNT_RETURNS} // navigates to the returns / refund request flow
          className="
            flex items-center gap-3 w-full px-4 py-3 rounded-xl
            border border-gray-200 text-gray-700 text-sm font-medium
            hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark
            transition-all
          "
        >
          <BsArrowReturnLeft className="w-4 h-4 shrink-0" />{" "}
          {/* Return arrow — visually communicates sending back */}
          Return Items
        </Link>
      )}

      {/* ── Cancel Order ──────────────────────────────────────────────────────
          Only rendered when canCancel is true (Pending or Confirmed status)
          Danger-tinted border and text signals this is a destructive action
          Uses a button (not Link) because cancellation triggers an API call via onCancel */}
      {canCancel && (
        <button
          onClick={onCancel} // fires the parent-provided callback to open a confirmation modal or call the cancel API
          className="
            flex items-center gap-3 w-full px-4 py-3 rounded-xl
            border border-danger/30 text-danger text-sm font-medium
            hover:bg-danger-light
            transition-all
          "
        >
          Cancel Order{" "}
          {/* No icon — the red color alone is sufficient warning signal */}
        </button>
      )}

      {/* ── Chat with AI ──────────────────────────────────────────────────────
          FIXED: previously had no onClick at all — a completely dead button.
          Now navigates to the homepage, the real entry point for Zyron AI chat.
          Always visible regardless of order status
          Two-line content: bold label + smaller description below
          text-left keeps the text left-aligned inside the full-width button    */}
      <button
        onClick={() => navigate(ROUTES.HOME)} // navigates to the homepage where the Zyron AI chat is accessible
        className="
          flex items-center gap-3 w-full px-4 py-3 rounded-xl
          border border-gray-200 text-gray-700 text-sm font-medium
          hover:border-primary/40 hover:bg-primary-50
          transition-all text-left
        "
      >
        <BsRobot className="w-4 h-4 text-primary shrink-0" />{" "}
        {/* Robot icon in primary color — signals AI rather than human support */}
        {/* Two-line label block — title + supporting description */}
        <div>
          <p className="text-sm font-medium text-gray-700">Chat with AI</p>
          <p className="text-xs text-gray-400">
            Our AI agent is available 24/7 to resolve order issues instantly.
          </p>
        </div>
      </button>
    </div>
  );
};

export default NeedHelp; // Export so it can be composed into the Order Detail page sidebar
