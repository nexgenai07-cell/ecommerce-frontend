// Displays a colored badge based on the order's current status
// Uses the Badge component and the getStatusColor utility for coloring
// Used in OrderList, OrderDetail, and AdminOrders

// Import the shared Badge component used to render the colored pill
import Badge from "../ui/Badge";
// Import the ORDER_STATUS constants object containing valid status values
import { ORDER_STATUS } from "../../constants/statusTypes";

// Define the OrderStatusBadge functional component and destructure its props with default values
const OrderStatusBadge = ({
  status = "", // The order's current status value
  size = "md", // Badge size — sm or md
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Function to convert the raw status value into a human-readable label
  // The backend usually sends lowercase status strings — this makes them readable
  const getLabel = (status) => {
    switch (status) {
      case ORDER_STATUS.ORDER_PLACED:
        // QR order, still inside its 10-minute payment-proof upload
        // window — distinct wording from "Pending Payment" so it's
        // clear proof hasn't been uploaded yet at all
        return "Awaiting Payment Proof";
      case ORDER_STATUS.PENDING:
        return "Pending Payment"; // Order created, awaiting Stripe payment confirmation
      case ORDER_STATUS.ON_HOLD:
        // NEW (Sep 2026): a QR order reopened for a retry review after
        // an earlier proof rejection — distinct wording from "Pending
        // Payment" so it's clear this is a second attempt, not a first
        return "Under Review — Retry";
      case ORDER_STATUS.CONFIRMED:
        return "Confirmed"; // Order has been confirmed
      case ORDER_STATUS.SHIPPED:
        return "Shipped"; // Order has been dispatched for delivery
      case ORDER_STATUS.DELIVERED:
        return "Delivered"; // Order has been delivered to the customer
      case ORDER_STATUS.CANCELLED:
        return "Cancelled"; // Order has been cancelled
      default:
        return status; // Unknown status — just display it as is
    }
  };

  // Return the JSX that will be rendered on the screen
  return (
    <Badge
      label={getLabel(status)} // Pass the readable label text computed above
      status={status} // Pass the raw status — Badge will use getStatusColor internally to pick a color
      size={size} // Pass the size prop through to the Badge component
      rounded // Make the badge fully rounded (pill shape)
      className={className} // Pass any extra classes through to the Badge component
    />
  );
};

// Export the component so it can be imported and used in other files
export default OrderStatusBadge;
