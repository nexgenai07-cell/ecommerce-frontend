import { useState } from "react";
// useState — tracks which customer's "eye" icon was clicked, so the
// detail drawer knows which customer to fetch and display

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches and caches the full detail of whichever
// customer is currently selected

import { AiOutlineTrophy, AiOutlineEye } from "react-icons/ai";
// AiOutlineTrophy — rank icon for the top 3 customer rows
// AiOutlineEye — "view customer" row action icon, same icon used on
// the main /admin/customers page

import { Link } from "react-router-dom";
// Link — client-side navigation for the "View All Customers" link

import { ROUTES } from "../../constants/routes";
// ROUTES — central route constants, avoids hardcoding URL strings

import { getCustomerDetail } from "../../api/customers.api";
// getCustomerDetail — API 88, the exact same call used by the main
// Customers page's drawer, fetched here only once a row's eye icon
// is clicked

import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";
import formatPrice from "../../utils/formatPrice";

import CustomerDetailDrawer from "../admin-customers/CustomerDetailDrawer";
// CustomerDetailDrawer — the SAME side panel component used on the
// main /admin/customers page (profile summary + full order history),
// reused here so both entry points behave identically

const TROPHY_COLORS = ["text-warning", "text-gray-400", "text-amber-700"];
// Gold/Silver/Bronze-ish coloring for the top 3 ranks only — purely
// decorative styling on top of real rank order, not a fabricated
// "tier" concept

const TopCustomersTable = ({ customers, isLoading }) => {
  // This widget is intentionally capped at the top 5 entries of the
  // already-sorted list — it's a dashboard summary, not the full
  // customer list, which is why it links out to "View All Customers"
  // instead of paginating. Because there are never more than 5 rows,
  // DataTable's own pagination controls stay hidden automatically —
  // this migration only changes which component renders the table,
  // not how many rows are shown.
  const topFive = customers.slice(0, 5).map((customer, index) => ({
    ...customer,
    rank: index,
  }));

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  // selectedCustomerId — which customer's eye icon was clicked; null
  // means the drawer is closed and nothing is being fetched

  // --------------------------------------------------
  // CUSTOMER DETAIL — API 88, fetched only when a row's eye icon has
  // actually been clicked (enabled below), exactly like the main
  // Customers page does it
  // --------------------------------------------------
  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ["adminCustomers", "detail", selectedCustomerId],
    // queryKey includes selectedCustomerId — switching customers
    // triggers a fresh fetch and its own cache entry per customer
    queryFn: ({ signal }) => getCustomerDetail(selectedCustomerId, signal),
    enabled: !!selectedCustomerId,
    // enabled — only runs once a customer id is actually selected,
    // so opening this widget never fires an unnecessary request
  });

  const columns = [
    {
      key: "rank",
      label: "Rank",
      render: (row) => (
        <AiOutlineTrophy
          className={`w-4 h-4 ${TROPHY_COLORS[row.rank] || "text-gray-200"}`}
        />
      ),
    },
    {
      key: "name",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {row.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "total_orders",
      label: "Orders",
    },
    {
      key: "total_spent",
      label: "Total Spent",
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {formatPrice(row.total_spent)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Stops this click from also bubbling up to the row's own
            // onClick, which opens the same drawer — avoids a redundant
            // double open when the icon itself is clicked
            setSelectedCustomerId(row.id);
          }}
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          aria-label={`View ${row.name}`}
        >
          <AiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      {/* Header row — title on the left, "View All" link on the right */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Top Customers</h2>
        <Link
          to={ROUTES.ADMIN_CUSTOMERS}
          // Navigates to the full /admin/customers list page
          className="text-sm text-primary font-medium hover:underline"
        >
          View All Customers
        </Link>
      </div>

      {isLoading ? (
        // Loading state — shown while the parent's customer list query
        // is still in flight
        <div className="py-8 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : topFive.length === 0 ? (
        // Empty state — shown when there are no customers to rank yet
        <EmptyState
          variant="noResults"
          title="No Customers Yet"
          description="Top spenders will appear here once customers place orders."
        />
      ) : (
        <DataTable
          columns={columns}
          data={topFive}
          keyField="id"
          onRowClick={(row) => setSelectedCustomerId(row.id)}
          // Opens the same detail drawer as the eye icon when any part of
          // the row is clicked
        />
      )}

      {/* Detail drawer — same shared component used on /admin/customers,
          slides in with full profile + order history once a row's eye
          icon has been clicked */}
      <CustomerDetailDrawer
        isOpen={!!selectedCustomerId}
        // Drawer is open whenever a customer id has been selected
        onClose={() => setSelectedCustomerId(null)}
        // Closing the drawer clears the selection, which also disables
        // the detail query above until a new row is clicked
        customer={detailResponse?.data}
        // The fetched customer's full profile object
        isLoading={isDetailLoading}
        // Shows the drawer's own spinner while the detail request is in flight
      />
    </div>
  );
};

export default TopCustomersTable;
// Default export — imported by CustomerGrowth.jsx as TopCustomersTable
