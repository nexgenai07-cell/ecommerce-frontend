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
import Badge from "../ui/Badge";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
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
  const topFive = customers.slice(0, 5);
  // topFive — only the first 5 entries of the already-sorted list are
  // shown on this dashboard-style widget

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
    queryFn: () => getCustomerDetail(selectedCustomerId),
    enabled: !!selectedCustomerId,
    // enabled — only runs once a customer id is actually selected,
    // so opening this widget never fires an unnecessary request
  });

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
        // Data state — the actual ranked table of top 5 customers
        <div className="overflow-x-auto">
          {/* overflow-x-auto — lets the table scroll horizontally on
              narrow screens instead of breaking the page layout */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Rank
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Customer
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Orders
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Spent
                </th>
                {/* "Status" column REMOVED — replaced with "Actions" below */}
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {topFive.map((customer, index) => (
                <tr
                  key={customer.id}
                  // key — unique per row, required by React for list rendering
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                  // hover:bg-gray-50/50 — subtle row highlight on hover
                >
                  <td className="px-3 py-3">
                    {/* Trophy icon — colored gold/silver/bronze for the
                        top 3 ranks, plain gray for ranks 4 and 5 */}
                    <AiOutlineTrophy
                      className={`w-4 h-4 ${TROPHY_COLORS[index] || "text-gray-200"}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {/* Avatar — initials-based circle using the customer's name */}
                      <Avatar name={customer.name} size="sm" />
                      <div className="min-w-0">
                        {/* min-w-0 lets the truncate classes below actually
                            work inside this flex container */}
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">
                    {customer.total_orders}
                    {/* Real total_orders field from the customer object */}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                    {formatPrice(customer.total_spent)}
                    {/* Real total_spent field, formatted as currency */}
                  </td>
                  <td className="px-3 py-3">
                    {/* Actions column — eye icon opens the shared detail
                        drawer for this exact customer, same behaviour as
                        the /admin/customers page's Actions column */}
                    <button
                      onClick={() => setSelectedCustomerId(customer.id)}
                      // Sets this row's id as selected, which triggers the
                      // detail query above and opens the drawer below
                      className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
                      // Same icon-button styling used on the main Customers page
                      aria-label={`View ${customer.name}`}
                      // Screen-reader label since the button only shows an icon
                    >
                      <AiOutlineEye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
