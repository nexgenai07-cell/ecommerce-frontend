import { Link } from "react-router-dom"; // Link renders anchor tags that navigate without a full page reload
import { motion } from "framer-motion"; // motion.div wraps the card so it animates on mount, update, and unmount
import { AiOutlineEye } from "react-icons/ai"; // Eye icon for the View Details button
import { BsTruck, BsArrowReturnLeft } from "react-icons/bs"; // Truck icon for Track Order, return arrow for Return Items
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import { ORDER_STATUS } from "../../constants/statusTypes"; // Shared order status constants used to decide which buttons to show
import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a localized currency string e.g. "$1,200.00"
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a human-readable date e.g. "Jun 29, 2026"
import OrderStatusBadge from "../shared/OrderStatusBadge"; // Reusable colored badge component that renders the order's current status

const OrderCard = ({ order, index = 0 }) => {
  // index defaults to 0 so the card still works when rendered outside a list

  // Safely read the items array — falls back to empty array if order.items is undefined
  const items = order.items || [];

  // Slice only the first 3 items to use as visible image thumbnails
  const previewImages = items.slice(0, 3);

  // If there are more than 3 items, calculate how many are hidden so we can show a "+X more" box
  const remainingCount = items.length > 3 ? items.length - 3 : 0;

  // Track Order button is shown for orders that are still in motion (not yet delivered or cancelled)
  const canTrack = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.SHIPPED,
  ].includes(order.status);

  // Return Items button is shown only after the order has been successfully delivered
  const canReturn = order.status === ORDER_STATUS.DELIVERED;

  return (
    // motion.div gives this card its entrance/exit animation
    // layout — smoothly repositions the card when sibling cards are filtered out
    // initial — card starts invisible and nudged 12px downward
    // animate — card fades in and slides up to its natural position
    // exit — card fades out and slides up 8px when removed from the list
    // delay is staggered by index so cards cascade in one after another
    // hover:-translate-y-1 + hover:shadow-xl gives the card real depth/lift on
    // hover, consistent with the Wishlist and Notifications card treatment
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1 hover:border-transparent transition-all duration-300"
    >
      {/* Inner padding wrapper — flex column with consistent vertical spacing between sections */}
      <div className="p-5 flex flex-col gap-4">
        {/* ── Top row: Order ID + Date + Status badge ───────────────────────
            flex-wrap lets the status badge drop below on very narrow screens */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Left side: Order ID and Date side by side, separated by a divider */}
          <div className="flex items-start gap-6 flex-wrap">
            {/* Order ID block — label above, value below */}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Order ID
              </p>
              <p className="text-sm font-bold text-gray-800">
                {order.order_number}{" "}
                {/* Unique order identifier e.g. "ORD-00123" */}
              </p>
            </div>

            {/* Thin vertical divider — only shown on sm and above to avoid clutter on mobile */}
            <div className="hidden sm:block w-px h-8 bg-gray-100" />

            {/* Date block — label above, formatted date below */}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Date
              </p>
              <p className="text-sm text-gray-700">
                {formatDate(order.created_at)} {/* e.g. "Jun 29, 2026" */}
              </p>
            </div>
          </div>

          {/* Status badge — right-aligned; shows Pending / Shipped / Delivered etc.
              Colors now come from the fixed, token-based getStatusColor.js         */}
          <OrderStatusBadge status={order.status} size="md" />
        </div>

        {/* ── Product image thumbnails ───────────────────────────────────────
            Shows up to 3 product photos; overflow is represented by a "+X more" tile
            group + overflow-hidden on each thumbnail enables a subtle zoom-on-hover  */}
        <div className="flex items-center gap-2">
          {/* Render one thumbnail per preview item (max 3) */}
          {previewImages.map((item, idx) => (
            <div
              key={idx} // idx is safe here since previewImages order never changes
              className="group w-16 h-16 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0"
            >
              <img
                src={
                  item.product?.primary_image || // use the product's main image if available
                  "/placeholder-product.png" // fall back to a generic placeholder if image is missing
                }
                alt={item.product_name || item.product?.name} // descriptive alt text for accessibility
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" // fill the box, crop rather than stretch, subtle zoom on hover
              />
            </div>
          ))}

          {/* "+X more items" tile — only rendered when there are more than 3 items in the order */}
          {remainingCount > 0 && (
            <div className="w-16 h-16 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
              <p className="text-xs font-medium text-gray-400 text-center leading-tight">
                +{remainingCount}
                <br />
                {remainingCount === 1 ? "item" : "items"}{" "}
                {/* singular vs plural grammar */}
              </p>
            </div>
          )}

          {/* Empty state thumbnail — shown when the order has no items at all */}
          {items.length === 0 && (
            <div className="w-16 h-16 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
              <p className="text-xs text-gray-300">No image</p>
            </div>
          )}
        </div>

        {/* ── Bottom row: item count + total price + action buttons ─────────
            pt-2 + border-t visually separates this from the thumbnails above
            flex-wrap lets the buttons stack below the price on small screens */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-gray-50">
          {/* Item count + total price */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Item count sentence — falls back to 1 if items array is empty */}
            <p className="text-sm text-gray-500">
              {items.length || 1} {(items.length || 1) === 1 ? "item" : "items"}{" "}
              totaling
            </p>

            {/* Total order price — bold and in brand primary-dark color to draw attention */}
            <p className="text-lg font-bold text-primary-dark">
              {formatPrice(parseFloat(order.total_amount || 0))}{" "}
              {/* parseFloat guards against string values; || 0 prevents NaN */}
            </p>
          </div>

          {/* ── Action buttons ───────────────────────────────────────────────
              All three are Links so they navigate to their respective pages  */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Details — always visible regardless of order status */}
            <Link
              to={ROUTES.ACCOUNT_ORDER_DETAIL.replace(
                ":id",
                order.order_number,
              )} // inject this order's id into the route template
              className="
                flex items-center gap-1.5 px-4 py-2
                border border-gray-200 rounded-xl
                text-sm font-medium text-gray-700
                hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark
                active:scale-[0.98] transition-all duration-200
              "
            >
              <AiOutlineEye className="w-3.5 h-3.5" /> {/* Eye icon */}
              View Details
            </Link>

            {/* Track Order — only shown for Pending, Confirmed, or Shipped orders
                Gradient fill + soft brand-colored glow shadow gives this the
                "primary action" weight, consistent with other pages' main CTAs */}
            {canTrack && (
              <Link
                to={ROUTES.ACCOUNT_ORDER_TRACKING.replace(
                  ":id",
                  order.order_number,
                )} // inject order id into tracking route
                className="
                  flex items-center gap-1.5 px-4 py-2
                  bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl
                  shadow-md shadow-primary/20
                  hover:shadow-lg hover:shadow-primary/30 hover:brightness-105
                  active:scale-[0.98] transition-all duration-200
                "
              >
                <BsTruck className="w-3.5 h-3.5" /> {/* Truck icon */}
                Track Order
              </Link>
            )}

            {/* Return Items — only shown once the order status is Delivered */}
            {canReturn && (
              <Link
                to={ROUTES.ACCOUNT_RETURNS} // navigates to the returns/refund request page
                className="
                  flex items-center gap-1.5 px-4 py-2
                  border border-gray-200 rounded-xl
                  text-sm font-medium text-gray-700
                  hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark
                  active:scale-[0.98] transition-all duration-200
                "
              >
                <BsArrowReturnLeft className="w-3.5 h-3.5" />{" "}
                {/* Return arrow icon */}
                Return Items
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderCard; // Export so it can be rendered inside the order list on the Order History page
