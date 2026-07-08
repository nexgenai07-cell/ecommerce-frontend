// Step 1 — Select Order to Return
// Dropdown — sirf delivered orders dikhao
// Status + Estimated Refund display
// Real API — getMyOrders filtered by delivered status
// NOTE: no outer card here — this renders INSIDE the single unified form card
// on ReturnRequest.jsx, so it's just a plain content section, fully responsive

// Import a downward-pointing chevron icon used as the custom dropdown arrow
import { AiOutlineDown } from "react-icons/ai";
// Import a box/package icon from the "bs" (Bootstrap) icon set, used in the section header
import { BsBoxSeam } from "react-icons/bs";
// Import "useQuery" hook from react-query (tanstack) to handle fetching and caching the orders list
import { useQuery } from "@tanstack/react-query";
// Import a constants object that holds standardized react-query cache key generator functions
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function for fetching the logged-in user's own orders
import { getMyOrders } from "../../api/orders.api";
// Import the ORDER_STATUS constant object that holds all possible order status string values
import { ORDER_STATUS } from "../../constants/statusTypes";
// Import a utility function to format numeric price values into a display-friendly currency string
import formatPrice from "../../utils/formatPrice";
// Import a utility function to format date values into a display-friendly date string
import formatDate from "../../utils/formatDate";

// Main functional component for step 1 of the return flow; receives the currently selected order number and a callback to update it
const SelectOrderStep = ({ selectedOrder, onOrderSelect }) => {
  // =============================================
  // MY ORDERS API — sirf delivered orders
  // API 43 — GET /api/v1/orders/
  // =============================================
  // Use react-query to fetch the user's full orders list, destructuring the data and loading state
  const { data: ordersData, isLoading } = useQuery({
    // Use a standardized cache key for the "my orders" query
    queryKey: QUERY_KEYS.MY_ORDERS,
    // The actual function that performs the API call to fetch the user's orders
    queryFn: getMyOrders,
    // Consider the cached data fresh for 5 minutes before refetching is allowed
    staleTime: 1000 * 60 * 5,
  });

  // Sirf delivered orders return ke liye eligible hain
  // Filter the full orders list down to only those with a "delivered" status, since only delivered orders can be returned; default to empty array if data is missing
  const deliveredOrders =
    ordersData?.data?.results?.filter(
      (order) => order.status === ORDER_STATUS.DELIVERED,
    ) || [];

  // Selected order ka full data
  // Find the full order object matching the currently selected order number, so we can display its details below
  const selectedOrderData = deliveredOrders.find(
    (o) => o.order_number === selectedOrder,
  );

  // Begin returning the JSX markup for this component — plain section, no card wrapper
  return (
    // Vertical flex column holding the section header, dropdown, and info panel, with gap between them
    <div className="flex flex-col gap-4">
      {/* Section header */}
      {/* Row grouping a small emerald icon with the section heading text */}
      <div className="flex items-center gap-2">
        {/* Box/package icon, colored emerald, shrink-0 prevents shrinking — no boxed badge, just a plain icon */}
        <BsBoxSeam className="w-4 h-4 text-primary shrink-0" />
        {/* Section heading text */}
        <h2 className="text-base font-bold text-gray-900">
          Select Order to Return
        </h2>
      </div>

      {/* Order dropdown */}
      {/* Relative wrapper so the custom dropdown arrow icon can be absolutely positioned inside the select */}
      <div className="relative">
        {/* Dropdown select listing all delivered orders eligible for return */}
        <select
          // Controlled value, falling back to empty string if no order is selected yet
          value={selectedOrder || ""}
          // When the user picks a different option, call the parent's callback with the new order number
          onChange={(e) => onOrderSelect(e.target.value)}
          // Disable the dropdown while the orders are still loading
          disabled={isLoading}
          className="
            w-full pl-4 pr-10 py-3 text-sm rounded-xl border border-gray-200
            bg-white text-gray-900 cursor-pointer appearance-none
            hover:border-primary/40
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
          "
        >
          {/* Default placeholder option — text changes depending on whether orders are still loading */}
          <option value="">
            {isLoading ? "Loading orders..." : "Select an order..."}
          </option>
          {/* Loop through the delivered orders and render an <option> for each one, showing order number, date, and total price */}
          {deliveredOrders.map((order) => (
            <option key={order.order_number} value={order.order_number}>
              Order {order.order_number} — {formatDate(order.created_at)} —{" "}
              {formatPrice(parseFloat(order.total_amount))}
            </option>
          ))}
        </select>

        {/* Custom arrow */}
        {/* Decorative dropdown arrow icon overlaid on top of the native select, pointer-events-none so it doesn't block clicks on the select itself */}
        <AiOutlineDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* No delivered orders message */}
      {/* Only show this message if loading has finished AND there are no delivered orders to choose from */}
      {!isLoading && deliveredOrders.length === 0 && (
        // Centered light gray message informing the user there's nothing eligible for return
        <p className="text-sm text-gray-400 text-center py-2">
          No delivered orders available for return.
        </p>
      )}

      {/* Selected order info — this small inline highlight panel is the ONLY accent box here,
          it's a genuine data callout (status + refund), not a repeated section card */}
      {selectedOrderData && (
        // Row container with a soft gradient tint showing the order's status on the left and estimated refund on the right, spaced apart
        <div className="flex items-center justify-between p-4 bg-linear-to-br from-primary-50 to-white rounded-xl border border-primary-100/70">
          {/* Status */}
          {/* Column holding the "Status" label and the delivery date text */}
          <div className="flex flex-col gap-0.5">
            {/* Uppercase small label */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Status
            </p>
            {/* Display the delivery status along with the formatted order creation date */}
            <p className="text-sm font-medium text-gray-700">
              Delivered {formatDate(selectedOrderData.created_at)}
            </p>
          </div>

          {/* Estimated refund */}
          {/* Column holding the "Estimated Refund" label and the refund amount, right-aligned text */}
          <div className="flex flex-col gap-0.5 text-right">
            {/* Uppercase small label */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Estimated Refund
            </p>
            {/* Display the order's total amount (used as the estimated refund), formatted as currency, in large bold gradient text */}
            <p className="text-lg font-extrabold bg-linear-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              {formatPrice(parseFloat(selectedOrderData.total_amount))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default SelectOrderStep;
