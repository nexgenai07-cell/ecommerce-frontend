import { AiOutlinePhone } from "react-icons/ai"; // Phone icon shown beside the customer's contact number
import { MdLocationOn } from "react-icons/md"; // Filled location pin icon used in the section header

const DeliveryAddress = ({ order }) => {
  return (
    // Card wrapper — white background, rounded corners, border, inner padding, vertical stack with consistent gaps
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
      {/* ── Section header ────────────────────────────────────────────────────
          Location pin icon + title sit side by side
          shrink-0 on the icon prevents it from compressing if the title wraps */}
      <div className="flex items-center gap-2">
        <MdLocationOn className="w-5 h-5 text-primary shrink-0" />{" "}
        {/* Primary-colored pin icon */}
        <h2 className="text-base font-bold text-gray-900">Delivery Address</h2>
      </div>

      {/* ── Address details block ─────────────────────────────────────────────
          Stacks name, address, and phone vertically with a small gap between each */}
      <div className="flex flex-col gap-1.5">
        {/* Customer name — tries order.customer.name first (nested object), then
            order.customer_name (flat field), falls back to generic "Customer"   */}
        <p className="text-sm font-semibold text-gray-800">
          {order?.customer?.name || order?.customer_name || "Customer"}
        </p>

        {/* Full shipping address — leading-relaxed improves readability for multi-line addresses
            Falls back to a placeholder string if the address field is missing   */}
        <p className="text-sm text-gray-500 leading-relaxed">
          {order?.shipping_address || "Address not available"}
        </p>

        {/* Phone number row — only rendered when at least one phone field exists
            Checks order.customer.phone (nested) first, then order.customer_phone (flat)
            mt-1 adds a little extra space above the phone row to separate it from the address */}
        {(order?.customer?.phone || order?.customer_phone) && (
          <div className="flex items-center gap-1.5 mt-1">
            <AiOutlinePhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />{" "}
            {/* Small phone icon, muted gray */}
            <p className="text-sm text-gray-500">
              {order?.customer?.phone || order?.customer_phone}{" "}
              {/* Display whichever phone field is available */}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryAddress; // Export so it can be composed into the Order Detail page
