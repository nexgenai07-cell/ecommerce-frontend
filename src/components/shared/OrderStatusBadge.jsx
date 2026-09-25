// Displays a colored badge based on the order's current status
// Uses the Badge component and the getStatusColor utility for coloring
// Used in OrderList, OrderDetail, and AdminOrders

// Import the shared Badge component used to render the colored pill
import Badge from "../ui/Badge";
// Import the shared status-to-label mapping so this badge and any other
// place that needs the same human-readable wording (e.g. the Track
// Order page's fallback timeline) stay in sync from one source.
import getOrderStatusLabel from "../../utils/getOrderStatusLabel";

// Define the OrderStatusBadge functional component and destructure its props with default values
const OrderStatusBadge = ({
  status = "", // The order's current status value
  size = "md", // Badge size — sm or md
  className = "", // Any extra CSS classes passed in from the parent component
}) => {
  // Return the JSX that will be rendered on the screen
  return (
    <Badge
      label={getOrderStatusLabel(status)} // Pass the readable label text computed above
      status={status} // Pass the raw status — Badge will use getStatusColor internally to pick a color
      size={size} // Pass the size prop through to the Badge component
      rounded // Make the badge fully rounded (pill shape)
      className={className} // Pass any extra classes through to the Badge component
    />
  );
};

// Export the component so it can be imported and used in other files
export default OrderStatusBadge;
