import { Link, useNavigate } from "react-router-dom"; // Link renders anchor tags that navigate without a full page reload; useNavigate drives the whole-row click
import { BsTruck } from "react-icons/bs"; // Truck icon for the Shipped "Track" button
import { ORDER_STATUS } from "../../constants/statusTypes"; // Shared status constants used to decide which action button to show
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a display currency string e.g. "$49.99"
import formatDate from "../../utils/formatDate"; // Converts an ISO date string into a readable format e.g. "Jun 29, 2026"
import OrderStatusBadge from "../shared/OrderStatusBadge"; // Reusable colored pill that renders the order's current status
import DataTable from "../ui/DataTable"; // Shared table component used across the admin panel, now also used here

const RecentOrdersTable = ({ orders }) => {
  const navigate = useNavigate();
  // navigate — drives the whole-row click; mirrors exactly what each row's own
  // Track link/button already does below, per order status

  // NOTE ON MOBILE LAYOUT: this component used to render two entirely
  // separate layouts — a <table> for sm+ screens and a hand-built card
  // list for mobile. DataTable only renders one, horizontally
  // scrollable table across every screen size, so the dedicated mobile
  // card view no longer exists after this migration. This trade-off
  // (consistency across the app vs. a mobile-specific layout for this
  // one widget) was a deliberate choice, not an oversight.
  const columns = [
    {
      key: "order_number",
      label: "Order ID",
      // Order ID — bold so it stands out as the primary identifier
      render: (row) => (
        <span className="font-semibold text-gray-800">{row.order_number}</span>
      ),
    },
    {
      key: "items",
      label: "Items",
      // Item count — falls back to 1 if the items array is missing
      render: (row) => (
        <span className="text-gray-500">
          {row.items?.length || 1} {row.items?.length === 1 ? "item" : "items"}
        </span>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      // Order total — formatted as currency
      render: (row) => (
        <span className="font-semibold text-gray-800">
          {formatPrice(parseFloat(row.total_amount))}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      // Status badge — colored pill showing current order state
      render: (row) => <OrderStatusBadge status={row.status} size="sm" />,
    },
    {
      key: "created_at",
      label: "Date",
      // Order date — muted color since it's secondary information
      render: (row) => (
        <span className="text-gray-400">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      // Actions column — button shown depends on the order's current status
      render: (row) => {
        if (row.status === ORDER_STATUS.DELIVERED) {
          // Delivered orders — outlined "Track" link to the order detail page
          return (
            <Link
              to={ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", row.order_number)}
              onClick={(e) => e.stopPropagation()}
              // Stops this click from also bubbling up to the row's own
              // onClick, which navigates to the same page — avoids a
              // redundant double navigation when the link itself is clicked
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark transition-all"
            >
              Track
            </Link>
          );
        }

        if (row.status === ORDER_STATUS.SHIPPED) {
          // Shipped orders — brand gradient "Track" pill to the live tracking page
          return (
            <Link
              to={ROUTES.ACCOUNT_ORDER_TRACKING.replace(
                ":id",
                row.order_number,
              )}
              onClick={(e) => e.stopPropagation()}
              // Stops this click from also bubbling up to the row's own
              // onClick, which navigates to the same page — avoids a
              // redundant double navigation when the link itself is clicked
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
          );
        }

        // All other statuses (Pending, Confirmed, Cancelled) — disabled "Wait" label
        // Rendered as a span (not a button) since there is no action to take yet
        return (
          <span className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-100 rounded-lg">
            Wait
          </span>
        );
      },
    },
  ];

  // Mirrors the per-row Track action above so clicking anywhere on a row does
  // exactly what its own button would do — no action for statuses that don't
  // have a destination page yet (Pending, Confirmed, Cancelled)
  const handleRowClick = (row) => {
    if (row.status === ORDER_STATUS.DELIVERED) {
      navigate(ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", row.order_number));
    } else if (row.status === ORDER_STATUS.SHIPPED) {
      navigate(ROUTES.ACCOUNT_ORDER_TRACKING.replace(":id", row.order_number));
    }
    // Pending / Confirmed / Cancelled — intentionally does nothing, matching
    // the disabled "Wait" label shown in that same cell
  };

  return (
    // Card wrapper — white background, rounded corners, border, clips table overflow cleanly
    // shadow-sm at rest + hover:shadow-xl + hover:-translate-y-1 gives the
    // whole card a genuine raised feel, consistent with the stat cards above
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* ── Card header ────────────────────────────────────────────────────────
          Section title on the left, "View All" link on the right
          border-b separates the header from the table below                   */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
        <Link
          to={ROUTES.ACCOUNT_ORDERS} // navigates to the full Order History page
          className="text-sm text-primary font-medium hover:underline"
        >
          View All
        </Link>
      </div>

      {/* DataTable's own EmptyState (variant="noResults") now covers the
          "No orders yet" case that used to be a hand-written empty row /
          empty div in each of the two old layouts. */}
      <div className="p-4">
        <DataTable
          columns={columns}
          data={orders}
          keyField="order_number"
          onRowClick={handleRowClick}
          // Opens the same Track/detail page as the row's own action
          // button when any part of the row is clicked
        />
      </div>
    </div>
  );
};

export default RecentOrdersTable; // Export so it can be composed into the Customer Account Dashboard page
