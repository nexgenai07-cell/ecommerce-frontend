// Import a utility function to format numeric price values into a display-friendly currency string
import formatPrice from "../../utils/formatPrice";
// Import a utility function to format date values into a display-friendly date string
import formatDate from "../../utils/formatDate";

// Main functional component that renders the order summary card; receives the "order" object as a prop
const TrackingOrderSummary = ({ order }) => {
  // Get the list of items in the order, defaulting to an empty array if order or items is missing
  const items = order?.items || [];
  // Parse the order's total amount into a floating point number, defaulting to 0 if missing
  const total = parseFloat(order?.total_amount || 0);
  // Calculate subtotal by adding back the discount amount to the total (so subtotal reflects pre-discount price)
  const subtotal = total + parseFloat(order?.discount_amount || 0);

  // Begin returning the JSX markup for this component
  return (
    // Outer white card container with rounded corners, light border, and hidden overflow (to clip rounded corners on header)
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header */}
      {/* Header section with horizontal/vertical padding and a bottom border separating it from the content below */}
      <div className="px-5 py-4 border-b border-gray-50">
        {/* Card title text */}
        <h3 className="text-base font-bold text-gray-900">Order Summary</h3>
      </div>

      {/* Main content wrapper with padding and vertical flex layout with gap between sections */}
      <div className="p-5 flex flex-col gap-4">
        {/* Order meta info */}
        {/* Column container holding the order ID, date, and payment rows, with a small gap between them */}
        <div className="flex flex-col gap-2.5">
          {/* Order ID */}
          {/* Row that places the "Order ID" label on the left and the actual order number on the right */}
          <div className="flex items-center justify-between">
            {/* Label text for this row */}
            <p className="text-sm text-gray-400">Order ID</p>
            {/* Display the order's order_number value, bold and dark */}
            <p className="text-sm font-bold text-gray-800">
              {order?.order_number}
            </p>
          </div>

          {/* Date */}
          {/* Row that places the "Date" label on the left and the formatted order date on the right */}
          <div className="flex items-center justify-between">
            {/* Label text for this row */}
            <p className="text-sm text-gray-400">Date</p>
            {/* Display the order's created_at date, formatted via the formatDate utility */}
            <p className="text-sm text-gray-700">
              {formatDate(order?.created_at)}
            </p>
          </div>

          {/* Payment method + SUCCESS badge */}
          {/* Row that places the "Payment" label on the left and the payment method + status badge on the right, with gap between elements */}
          <div className="flex items-center justify-between gap-2">
            {/* Label text for this row */}
            <p className="text-sm text-gray-400">Payment</p>
            {/* Inner row grouping the payment method text and the success badge together */}
            <div className="flex items-center gap-2">
              {/* All payments now go through Stripe — label reflects the actual
                  order.payment.status returned by the API instead of a
                  removed payment_method field (COD/Easypaisa/card) */}
              <p className="text-sm text-gray-700">
                {order?.payment?.status === "paid"
                  ? "Card via Stripe"
                  : "Awaiting Payment"}
              </p>
              {/* SUCCESS badge */}
              {/* Only show the "Success" badge if the order's payment status is exactly "paid" */}
              {order?.payment?.status === "paid" && (
                // Small pill-shaped badge with light green background, green text, bold uppercase letters with letter spacing
                <span className="px-2 py-0.5 text-xs font-bold bg-success-light text-success rounded-md uppercase tracking-wide">
                  Success
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        {/* Thin horizontal divider line separating the order meta info from the product list */}
        <div className="h-px bg-gray-100" />

        {/* Product items */}
        {/* Column container holding all product item rows, with gap between each item */}
        <div className="flex flex-col gap-3 max-h-32 overflow-y-auto scrollbar-hide pr-1">
          {/* Loop through every item in the order and render a row for each, using the array index as the key */}
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              {/* Product image */}
              {/* Square image container with rounded corners, border, light gray background placeholder, and clipped overflow; shrink-0 prevents it from shrinking in the flex row */}
              <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
                {/* Product thumbnail image, falling back to a placeholder image path if no primary_image is set */}
                <img
                  src={
                    item.product?.primary_image || "/placeholder-product.svg"
                  }
                  alt={item.product_name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product info */}
              {/* Column container holding the product name, quantity, and price text; grows to fill remaining space, min-w-0 prevents overflow */}
              <div className="flex-1 min-w-0">
                {/* Product name text, truncated to a single line if it's too long (line-clamp-1) */}
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                  {item.product_name}
                </p>
                {/* Display the quantity ordered for this product */}
                <p className="text-xs text-gray-400 mt-0.5">
                  Quantity: {item.quantity}
                </p>
                {/* Display the formatted price for this product, parsed as a float and defaulting to 0 if missing */}
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatPrice(parseFloat(item.price || 0))}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        {/* Thin horizontal divider line separating the product list from the price breakdown */}
        <div className="h-px bg-gray-100" />

        {/* Price breakdown */}
        {/* Column container holding the subtotal, shipping, and total rows, with a small gap between them */}
        <div className="flex flex-col gap-2">
          {/* Subtotal */}
          {/* Row showing the "Subtotal" label and its formatted value, spaced apart */}
          <div className="flex justify-between text-sm">
            {/* Label text for this row */}
            <p className="text-gray-400">Subtotal</p>
            {/* Display the calculated subtotal, formatted as currency */}
            <p className="text-gray-700 font-medium">{formatPrice(subtotal)}</p>
          </div>

          {/* Shipping — FIXED: now reads the order's real shipping_cost field,
              exactly like OrderItems.jsx does on the Order Detail page,
              instead of always hardcoding "FREE" regardless of what was
              actually charged. */}
          <div className="flex justify-between text-sm">
            {/* Label text for this row */}
            <p className="text-gray-400">Shipping</p>
            {/* Shows the real formatted shipping cost when one was charged,
                otherwise shows "Free" in success-green — same logic and
                wording as OrderItems.jsx for consistency between pages     */}
            <p
              className={
                order?.shipping_cost
                  ? "text-gray-700 font-medium"
                  : "font-semibold text-success"
              }
            >
              {order?.shipping_cost
                ? formatPrice(parseFloat(order.shipping_cost))
                : "Free"}
            </p>
          </div>

          {/* Total */}
          {/* Row showing the "Total" label and the final total amount, spaced apart, with bold text and a small top margin */}
          <div className="flex justify-between text-sm font-bold mt-1">
            {/* Label text for this row */}
            <p className="text-gray-900">Total</p>
            {/* Display the final total amount, formatted as currency, with slightly larger text size */}
            <p className="text-gray-900 text-base">{formatPrice(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default TrackingOrderSummary;
