import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a display currency string e.g. "$49.99"

const OrderItems = ({ order }) => {
  // Safely extract the items array — falls back to empty array if order.items is undefined
  const items = order?.items || [];

  // Subtotal = final total + any discount that was already deducted
  // This reconstructs the original price before the discount was applied
  const subtotal =
    parseFloat(order?.total_amount || 0) +
    parseFloat(order?.discount_amount || 0);

  // Discount amount saved by the customer — used to conditionally render the discount row
  const discount = parseFloat(order?.discount_amount || 0);

  // Final amount the customer actually paid after discount and shipping
  const total = parseFloat(order?.total_amount || 0);

  return (
    // Card wrapper — white background, rounded corners, border, clips child content cleanly
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* ── Card header ────────────────────────────────────────────────────
          Section title on the left, item count on the right
          border-b separates the header from the items list below           */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-900">Order Items</h2>
        <p className="text-sm text-gray-400">
          {items.length} {items.length === 1 ? "Item" : "Items"}{" "}
          {/* singular/plural grammar */}
        </p>
      </div>

      {/* ── Items list ─────────────────────────────────────────────────────
          divide-y draws a thin separator line between each item row        */}
      <div className="divide-y divide-gray-50 max-h-85 overflow-y-auto scrollbar-hide">
        {items.map((item, index) => (
          // Single item row — image on the left, info in the middle, price on the right
          <div
            key={index} // index is safe here since the items list is read-only and never reordered
            className="flex items-center gap-4 px-5 py-4"
          >
            {/* Product thumbnail — fixed 56×56px box, crops the image to fill evenly */}
            <div className="w-14 h-14 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
              <img
                src={
                  item.product?.primary_image || // use the product's main image if it exists
                  "/placeholder-product.png" // generic fallback if image is missing
                }
                alt={item.product_name} // descriptive alt for screen readers and broken image state
                className="w-full h-full object-cover" // fill the box and crop rather than stretch or letterbox
              />
            </div>

            {/* Product name + quantity — flex-1 lets this column take remaining space; min-w-0 enables text truncation */}
            <div className="flex-1 min-w-0">
              {/* Product name — truncated to one line so long names don't break the layout */}
              <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                {item.product_name}
              </p>

              {/* Quantity ordered */}
              <p className="text-xs text-gray-400 mt-0.5">
                Qty: {item.quantity}
              </p>
            </div>

            {/* Line price block — right-aligned, shrink-0 keeps it from compressing */}
            <div className="text-right shrink-0">
              {/* Total price for this line (unit price × quantity) */}
              <p className="text-sm font-semibold text-gray-800">
                {formatPrice(parseFloat(item.total_price || 0))}
              </p>

              {/* Unit price — smaller text below so the customer can see the per-item cost */}
              <p className="text-xs text-gray-400 mt-0.5">
                {formatPrice(parseFloat(item.price || 0))} each
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Price breakdown ────────────────────────────────────────────────
          Slightly tinted background distinguishes this section from the items list
          border-t separates it from the last item row above                */}
      <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-2.5">
        {/* Subtotal row — original price before any discount was applied */}
        <div className="flex justify-between text-sm">
          <p className="text-gray-500">Subtotal</p>
          <p className="font-medium text-gray-800">{formatPrice(subtotal)}</p>
        </div>

        {/* Discount row — only rendered when a discount was actually applied (discount > 0) */}
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <p className="text-gray-500">
              Discount
              {/* Coupon code shown inline in parentheses if one was used */}
              {order?.coupon && (
                <span className="ml-1 text-xs text-gray-400">
                  ({order.coupon})
                </span>
              )}
            </p>
            {/* Negative sign + success color makes it clear this is money saved */}
            <p className="font-medium text-success">-{formatPrice(discount)}</p>
          </div>
        )}

        {/* Shipping row — shows shipping method name in parentheses if available */}
        <div className="flex justify-between text-sm">
          <p className="text-gray-500">
            Shipping
            {/* Shipping method name e.g. "Standard" or "Express" shown as a hint */}
            {order?.shipping_method && (
              <span className="ml-1 text-xs text-gray-400">
                ({order.shipping_method})
              </span>
            )}
          </p>
          {/* Shows formatted shipping cost, or "Free" if no cost was charged */}
          <p className="font-medium text-gray-800">
            {order?.shipping_cost
              ? formatPrice(parseFloat(order.shipping_cost))
              : "Free"}
          </p>
        </div>

        {/* Thin horizontal rule separating the individual rows from the final total */}
        <div className="h-px bg-gray-200 my-1" />

        {/* Total row — larger font and bolder weight to visually anchor the breakdown */}
        <div className="flex justify-between">
          <p className="text-base font-bold text-gray-900">Total</p>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(total)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderItems; // Export so it can be used on the Order Detail page
