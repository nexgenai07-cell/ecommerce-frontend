// Import a location pin icon from the "md" (Material Design) icon set
import { MdLocationOn } from "react-icons/md";
// Import a phone icon shown beside the customer's contact number, matching DeliveryAddress.jsx's pattern
import { AiOutlinePhone } from "react-icons/ai";

// Main functional component that renders the delivery address card; receives the "order" object as a prop
const TrackingDeliveryAddress = ({ order }) => {
  // Begin returning the JSX markup for this component
  return (
    // Outer white card container with rounded corners, light border, and hidden overflow (to clip rounded corners on header)
    // shadow-sm gives the card a gentle resting elevation, consistent with the rest of the account pages
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header */}
      {/* Header section with horizontal/vertical padding and a bottom border separating it from the content below */}
      <div className="px-5 py-4 border-b border-gray-50">
        {/* Card title text */}
        <h3 className="text-base font-bold text-gray-900">Delivery Address</h3>
      </div>
      {/* Main content wrapper with padding and vertical flex layout with gap between sections */}
      <div className="p-5 flex flex-col gap-3">
        {/* Address details */}
        {/* Row container holding the location icon and the customer name/address text, aligned to the top, with gap between them */}
        <div className="flex items-start gap-3">
          {/* Location pin icon, colored emerald, with shrink-0 so it doesn't shrink, and slight top margin to align with text */}
          <MdLocationOn className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          {/* Column container holding the customer name and address text; grows to fill space, min-w-0 prevents overflow */}
          <div className="flex-1 min-w-0">
            {/* Display the customer's name, falling back to customer_name field, then finally to a generic "Customer" label */}
            <p className="text-sm font-bold text-gray-800">
              {order?.customer?.name || order?.customer_name || "Customer"}
            </p>
            {/* Display the shipping address, falling back to a placeholder message if not available */}
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {order?.shipping_address || "Address not available"}
            </p>

            {/* Phone number row — only rendered when at least one phone field exists
                Same fallback pattern used on DeliveryAddress.jsx (Order Detail page) */}
            {(order?.customer?.phone || order?.customer_phone) && (
              <div className="flex items-center gap-1.5 mt-2">
                <AiOutlinePhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-500">
                  {order?.customer?.phone || order?.customer_phone}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default TrackingDeliveryAddress;
