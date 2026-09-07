import { useState } from "react";
// Import React's useState hook — used here to store the search box text

import { useNavigate } from "react-router-dom";
// Import useNavigate hook — lets us redirect the user to another page (like order detail page)

import { useQuery } from "@tanstack/react-query";
// Import useQuery from React Query — handles fetching, caching, and loading state of API data

import { AiOutlineEye } from "react-icons/ai";
// Import an "eye" icon (from react-icons) — used for the "View Order" button

import { getAdminOrders } from "../../api/orders.api";
// Import the actual API call function that fetches orders from the backend
// getAdminOrders — API 57: GET /api/v1/admin/orders/
// returns { count, results: [{ order_number, customer:{name,phone}, total_amount, status, created_at }] }
// ^ This comment documents what shape of data the backend sends back

import { ROUTES } from "../../constants/routes";
// Import a constants file that stores all route paths (so we don't hardcode URLs everywhere)

import extractListData from "../../utils/extractListData";
// Import a helper function that safely pulls the array of orders out of the API response

import formatPrice from "../../utils/formatPrice";
// Import a helper function that formats numbers as currency (e.g. 9000 -> "Rs. 9,000")

import DataTable from "../ui/DataTable";
// Import the reusable table component that actually renders rows and columns

import Badge from "../ui/Badge";
// Import a small colored "pill" component used to show order status (e.g. "pending", "shipped")

import Button from "../ui/Button";
// Import a reusable styled button component

const RecentOrdersTable = () => {
  // Define this file's main component — a widget that shows the 5 most recent orders

  const navigate = useNavigate();
  // Get the navigate function so we can programmatically change pages on click

  const [searchTerm, setSearchTerm] = useState("");
  // Local search text — filters the already-fetched recent orders
  // client-side (this widget only ever holds a handful of rows, so a
  // full server round-trip per keystroke isn't needed here; the full
  // server-side search/filter belongs on the dedicated OrderManagement
  // page, which handles the complete order list).

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["adminDashboard", "recentOrders"],
    queryFn: ({ signal }) => getAdminOrders(undefined, signal),
    staleTime: 1000 * 60 * 2,
    // Data is considered "fresh" for 2 minutes (won't auto refetch during that time)
  });

  const allOrders = extractListData(ordersResponse);
  // Safely extract the array of orders from the raw API response —
  // extractListData handles both the documented {count, results} shape
  // and a possible flat-array drift, same defensive pattern used
  // everywhere else in this codebase

  const recentOrders = allOrders.slice(0, 5);
  // Dashboard widget only needs a short preview — full history lives
  // on the dedicated Orders page (ROUTES.ADMIN_ORDERS)

  const filteredOrders = searchTerm
    ? recentOrders.filter(
        (order) =>
          order.order_number
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.customer?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      )
    : recentOrders;
  // If no search text typed, just show all 5 recent orders as-is

  // Column configuration for the reusable DataTable component
  const columns = [
    {
      key: "order_number",
      label: "Order ID",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.order_number}</span>
      ),
    },
    // NOTE: Customer column re-added on Rimi's request — the data was
    // always present in API 57's response (customer: { name, phone }),
    // it had just been hidden from display before. "truncate" + a max
    // width keeps a long customer name from stretching/breaking the
    // row layout inside this widget's narrower dashboard column.
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <span className="text-gray-600 truncate block max-w-[120px]">
          {row.customer?.name || "—"}
        </span>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (row) => (
        <span className="text-gray-900">{formatPrice(row.total_amount)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} status={row.status} size="sm" rounded />
      ),
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <button
          onClick={() =>
            navigate(ROUTES.ADMIN_ORDER_DETAIL.replace(":id", row.order_number))
          }
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          aria-label={`View order ${row.order_number}`}
        >
          <AiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300
      "
      // Outer card wrapper: white background, rounded corners, border,
      // padding, vertical stacking, plus the soft "floating card"
      // elevation shared by every dashboard widget
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        keyField="order_number"
        searchable
        searchPlaceholder="Filter orders..."
        onSearch={setSearchTerm}
        isLoading={isLoading}
      />

      <div className="text-center pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
        >
          View All Orders
        </Button>
      </div>
    </div>
  );
};

export default RecentOrdersTable;
