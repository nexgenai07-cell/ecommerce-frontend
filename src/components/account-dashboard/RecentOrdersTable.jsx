import { Link } from "react-router-dom"; // Link renders anchor tags that navigate without a full page reload
import { BsTruck } from "react-icons/bs"; // Truck icon for the Shipped "Track" button
import { ORDER_STATUS } from "../../constants/statusTypes"; // Shared status constants used to decide which action button to show
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a display currency string e.g. "$49.99"
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import OrderStatusBadge from "../shared/OrderStatusBadge"; // Reusable colored pill that renders the order's current status

const RecentOrdersTable = ({ orders }) => {
  return (
    // Card wrapper — white background, rounded corners, border, clips table overflow cleanly
    // shadow-sm at rest + hover:shadow-xl + hover:-translate-y-1 gives the
    // whole card a genuine raised feel, consistent with the stat cards above
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* ── Card header ────────────────────────────────────────────────────────
          Section title on the left, "View All" link on the right
          border-b separates the header from the table/list below              */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
        <Link
          to={ROUTES.ACCOUNT_ORDERS} // navigates to the full Order History page
          className="text-sm text-primary font-medium hover:underline"
        >
          View All
        </Link>
      </div>

      {/* ── Desktop table ──────────────────────────────────────────────────────
          hidden on mobile (sm:block shows it from the sm breakpoint upward)
          overflow-x-auto allows horizontal scrolling if the viewport is tight  */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          {/* Table header row — column labels */}
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {/* Render each column header from an array — keeps the markup DRY */}
              {["Order ID", "Items", "Total", "Status", "Date", "Actions"].map(
                (col) => (
                  <th
                    key={col}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>

          {/* Table body — one row per order, separated by subtle dividers */}
          <tbody className="divide-y divide-gray-50">
            {/* Render order rows when data exists */}
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr
                  key={order.order_number} // stable unique key for React's reconciler
                  className="hover:bg-gray-50/50 transition-colors" // subtle row highlight on hover
                >
                  {/* Order ID — bold so it stands out as the primary identifier */}
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    {order.order_number}
                  </td>

                  {/* Item count — falls back to 1 if the items array is missing */}
                  <td className="px-5 py-4 text-gray-500">
                    {order.items?.length || 1}{" "}
                    {order.items?.length === 1 ? "item" : "items"}{" "}
                    {/* singular/plural grammar */}
                  </td>

                  {/* Order total — formatted as currency */}
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    {formatPrice(parseFloat(order.total_amount))}
                  </td>

                  {/* Status badge — colored pill showing current order state */}
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.status} size="sm" />
                  </td>

                  {/* Order date — muted color since it's secondary information */}
                  <td className="px-5 py-4 text-gray-400">
                    {formatDate(order.created_at)}
                  </td>

                  {/* Actions column — button shown depends on the order's current status */}
                  <td className="px-5 py-4">
                    {order.status === ORDER_STATUS.DELIVERED ? (
                      // Delivered orders — outlined "Track" link to the order detail page
                      // Hover now tints emerald instead of plain gray, matching the
                      // brand-consistent outline button style used elsewhere in the app
                      <Link
                        to={ROUTES.ACCOUNT_ORDER_DETAIL.replace(
                          ":id",
                          order.order_number,
                        )}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark transition-all"
                      >
                        Track
                      </Link>
                    ) : order.status === ORDER_STATUS.SHIPPED ? (
                      // Shipped orders — brand gradient "Track" pill to the live tracking page
                      // Replaces the old flat bg-gray-900 fill, matching the same
                      // gradient CTA language used for Track Order on OrderCard
                      <Link
                        to={ROUTES.ACCOUNT_ORDER_TRACKING.replace(
                          ":id",
                          order.order_number,
                        )}
                        className="
                          flex items-center gap-1.5 w-fit px-3 py-1.5 text-xs font-semibold rounded-lg
                          bg-linear-to-r from-primary to-primary-dark text-white
                          shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:brightness-105
                          transition-all
                        "
                      >
                        <BsTruck className="w-3 h-3" /> {/* Truck icon */}
                        Track
                      </Link>
                    ) : (
                      // All other statuses (Pending, Confirmed, Cancelled) — disabled "Wait" label
                      // Rendered as a span (not a button) since there is no action to take yet
                      <span className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-100 rounded-lg">
                        Wait
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              // Empty state row — spans all 6 columns and centers a "No orders yet" message
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm text-gray-400"
                >
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list ───────────────────────────────────────────────────
          Shown only on screens smaller than sm — hides at sm and above
          Each order is a compact two-row card instead of a full table row
          divide-y draws a separator line between cards                         */}
      <div className="sm:hidden divide-y divide-gray-50">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.order_number}
              className="px-5 py-4 flex flex-col gap-2"
            >
              {/* Top row — order number on the left, status badge on the right */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">
                  {order.order_number}
                </p>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              {/* Bottom row — formatted total on the left, order date on the right */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {formatPrice(parseFloat(order.total_amount))}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>
          ))
        ) : (
          // Empty state — mirrors the desktop table's empty row so both layouts stay consistent
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No orders yet
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOrdersTable; // Export so it can be composed into the Customer Account Dashboard page
