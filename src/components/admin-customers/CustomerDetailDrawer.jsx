import { useState, useEffect, useRef } from "react";
// useState — local state for the orders sub-table's filters/page
// useEffect — resets those filters whenever a different customer is opened
// useRef — used by the custom status/sort dropdowns below to detect
// clicks outside them so they close automatically

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches, caches, and re-fetches the orders list

import {
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineEnvironment,
  AiOutlineSearch,
  AiOutlineShoppingCart,
  AiOutlineWallet,
  AiOutlineRise,
  AiOutlineFilter,
  AiOutlineSortAscending,
  AiOutlineDown,
  AiOutlineCheck,
} from "react-icons/ai";
// AiOutlineMail / Phone / Environment — contact info icons
// AiOutlineSearch — orders search box icon
// AiOutlineShoppingCart — "Total Orders" metric icon
// AiOutlineWallet — "Lifetime Value" metric icon
// AiOutlineRise — "Average Order Value" metric icon
// AiOutlineFilter / AiOutlineSortAscending — leading icons for the
// status and sort dropdown buttons
// AiOutlineDown — chevron on the dropdown buttons, rotates when open
// AiOutlineCheck — checkmark next to the currently selected option in
// the custom dropdown menu

import cn from "../../utils/cn";
// cn — merges Tailwind classes, used by the custom FilterDropdown below

import Drawer from "../ui/Drawer";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";
import Badge from "../ui/Badge";
import Input from "../ui/Input";
import Pagination from "../ui/Pagination";
import EmptyState from "../ui/EmptyState";

import { getCustomerOrders } from "../../api/orders.api";
// getCustomerOrders — NEW, wraps the admin orders filter endpoint
// with customer_id always set to this drawer's customer

import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
import { ORDER_STATUS } from "../../constants/statusTypes";

// --------------------------------------------------
// Status filter dropdown options — one per real ORDER_STATUS value
// --------------------------------------------------
const ORDER_STATUS_OPTIONS = [
  { value: ORDER_STATUS.PENDING, label: "Pending Payment" },
  { value: ORDER_STATUS.CONFIRMED, label: "Confirmed" },
  { value: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { value: ORDER_STATUS.DELIVERED, label: "Delivered" },
  { value: ORDER_STATUS.CANCELLED, label: "Cancelled" },
];

// The custom status dropdown below needs its own explicit "All
// Statuses" (value: "") entry — the shared Select component used to
// add that automatically as its built-in placeholder option, but the
// custom dropdown renders exactly the list it's given.
const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...ORDER_STATUS_OPTIONS,
];

// Human-readable label for each status value, used on the order row
// badges (e.g. "pending_payment" -> "Pending Payment")
const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: "Pending Payment",
  [ORDER_STATUS.CONFIRMED]: "Confirmed",
  [ORDER_STATUS.SHIPPED]: "Shipped",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
};

// --------------------------------------------------
// Sort options — re-orders whichever page of orders is CURRENTLY
// loaded (there is no documented `ordering` param on the orders
// filter endpoint, so this does not trigger a new network request —
// same pattern already used on the main Orders page)
// --------------------------------------------------
const ORDERS_SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "-total_amount", label: "Amount: High to Low" },
  { value: "total_amount", label: "Amount: Low to High" },
];

const ORDERS_SORTERS = {
  "-created_at": (a, b) => new Date(b.created_at) - new Date(a.created_at),
  created_at: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  "-total_amount": (a, b) =>
    (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0),
  total_amount: (a, b) =>
    (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0),
};

// Selectable "rows per page" values shown in the orders sub-table's
// pagination dropdown, matching the backend's page_size cap of 100.
const ORDERS_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ORDERS_PAGE_SIZE = ORDERS_PAGE_SIZE_OPTIONS[0];

// --------------------------------------------------
// FilterDropdown — a custom-styled dropdown used ONLY for the status
// and sort filters inside this drawer. The previous version used the
// shared <Select>, whose OPEN options list is a native browser <select>
// menu — plain white rows with no way to theme them. This component
// renders its own themed menu (rounded corners, shadow, emerald
// highlight + checkmark on the selected row, hover highlight) so the
// dropdown looks intentional instead of the plain default browser
// list. It's local to this file only, so no other page's dropdowns
// are affected.
// --------------------------------------------------
const FilterDropdown = ({ icon, value, options, onChange, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Closes the menu whenever a click lands outside this dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption =
    options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      {/* Closed state — the visible button showing the current
          selection, styled to match Input's height/border/focus so it
          sits perfectly level with the search box next to it */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border bg-gray-50 pl-3 pr-3 py-2.5 text-sm font-medium text-gray-900 transition-all duration-150",
          "hover:border-primary-300 hover:bg-white",
          isOpen
            ? "border-primary ring-2 ring-primary bg-white"
            : "border-gray-200",
        )}
      >
        <span className="text-primary shrink-0">{icon}</span>
        <span className="flex-1 text-left truncate">
          {selectedOption?.label}
        </span>
        <AiOutlineDown
          className={cn(
            "w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-150",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Open state — the themed menu, absolutely positioned right
          below the button so it never disturbs the layout of the row
          it sits in */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-200/70 py-1.5 max-h-60 overflow-y-auto"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors",
                  isSelected
                    ? "bg-primary-50 text-primary font-semibold"
                    : "text-gray-700 hover:bg-gray-50",
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <AiOutlineCheck className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CustomerDetailDrawer = ({ isOpen, onClose, customer, isLoading }) => {
  // --------------------------------------------------
  // ORDERS SUB-TABLE STATE
  // --------------------------------------------------
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(
    DEFAULT_ORDERS_PAGE_SIZE,
  );
  // ordersPageSize — how many of this customer's orders are shown per
  // page, controlled by the "Rows per page" dropdown under the orders
  // sub-table. Sent to the backend as `page_size` alongside `page`.
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("");
  const [ordersSearchInput, setOrdersSearchInput] = useState("");
  const [ordersSortBy, setOrdersSortBy] = useState("-created_at");

  const debouncedOrdersSearch = useDebounce(ordersSearchInput, 400);
  // Waits 400ms after typing stops before firing a new orders request

  // Whenever a DIFFERENT customer is opened in this drawer, reset
  // every orders filter back to its default — otherwise a filter set
  // for one customer would silently carry over to the next one opened
  useEffect(() => {
    setOrdersPage(1);
    setOrdersStatusFilter("");
    setOrdersSearchInput("");
    setOrdersSortBy("-created_at");
    setOrdersPageSize(DEFAULT_ORDERS_PAGE_SIZE);
  }, [customer?.id]);

  // Whenever the status filter, search term, or rows-per-page selection
  // changes, jump back to page 1 of the orders list — staying on a
  // later page of a new filter/size could show nothing or skip results
  useEffect(() => {
    setOrdersPage(1);
  }, [ordersStatusFilter, debouncedOrdersSearch, ordersPageSize]);

  // Resets back to page 1 whenever the admin picks a different
  // rows-per-page value for the orders sub-table.
  const handleOrdersPageSizeChange = (size) => {
    setOrdersPageSize(size);
    setOrdersPage(1);
  };

  // --------------------------------------------------
  // ORDERS QUERY — only runs when the drawer is open AND we actually
  // have a customer id to filter by
  // --------------------------------------------------
  const {
    data: ordersResponse,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
  } = useQuery({
    queryKey: [
      "adminCustomers",
      "orders",
      customer?.id,
      ordersPage,
      ordersStatusFilter,
      debouncedOrdersSearch,
      ordersPageSize,
    ],
    queryFn: ({ signal }) =>
      getCustomerOrders(
        customer.id,
        {
          status: ordersStatusFilter || undefined,
          search: debouncedOrdersSearch || undefined,
          page: ordersPage,
          page_size: ordersPageSize,
        },
        signal,
      ),
    enabled: isOpen && !!customer?.id,
  });

  const ordersList = extractListData(ordersResponse);
  // Client-side re-sort of the currently loaded page (see comment on
  // ORDERS_SORTERS above for why this isn't a backend request)
  const sortedOrders = [...ordersList].sort(
    ORDERS_SORTERS[ordersSortBy] || (() => 0),
  );

  const totalOrdersCount = ordersResponse?.data?.count ?? ordersList.length;
  const ordersTotalPages = Math.max(
    1,
    Math.ceil(totalOrdersCount / ordersPageSize),
  );

  // True when a status filter or search term is actively narrowing
  // the orders list — used to pick the right empty-state message
  const hasOrdersFilterActive = !!ordersStatusFilter || !!debouncedOrdersSearch;

  // --------------------------------------------------
  // PROFILE METRICS
  // --------------------------------------------------
  // Average Order Value = total amount this customer has ever spent,
  // divided by how many orders they've placed. This is calculated
  // entirely on the frontend — the backend does not send this number
  // directly, since it's a simple derived ratio of two fields
  // (total_spent and total_orders) that are already in the response.
  const averageOrder =
    customer?.total_orders > 0
      ? Number(customer.total_spent) / Number(customer.total_orders)
      : 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Details"
      size="lg"
      // size="lg" (480px) instead of "md" — the new Order History
      // table needs more breathing room than the old profile-only view
    >
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !customer ? (
        <p className="text-sm text-gray-400 text-center py-16">
          No customer selected.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ================= IDENTITY BANNER ================= */}
          {/* Soft gradient backdrop behind the avatar/name — visually
              matches the brand gradient already used in PageHeader,
              giving the drawer a more polished, "product-quality" feel
              instead of a plain stacked list */}
          <div className="rounded-2xl bg-linear-to-br from-primary-50 to-white border border-primary-100 p-4 flex items-center gap-4">
            <Avatar name={customer.name} size="xl" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 truncate">
                {customer.name}
              </p>
              <p className="text-xs text-gray-500">
                Customer since {formatDate(customer.created_at)}
              </p>
            </div>
          </div>

          {/* ================= QUICK METRICS ================= */}
          {/* 3 cards across — all real or directly-derived numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1.5">
              <span className="w-7 h-7 rounded-md bg-primary-100 text-primary flex items-center justify-center">
                <AiOutlineShoppingCart className="w-3.5 h-3.5" />
              </span>
              <p className="text-xs text-gray-400">Total Orders</p>
              <p className="text-base font-semibold text-gray-900">
                {customer.total_orders}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1.5">
              <span className="w-7 h-7 rounded-md bg-success-light text-success flex items-center justify-center">
                <AiOutlineWallet className="w-3.5 h-3.5" />
              </span>
              <p className="text-xs text-gray-400">Lifetime Value</p>
              <p className="text-base font-semibold text-gray-900">
                {formatPrice(customer.total_spent)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1.5">
              <span className="w-7 h-7 rounded-md bg-info-light text-info flex items-center justify-center">
                <AiOutlineRise className="w-3.5 h-3.5" />
              </span>
              {/* This is the "Average Order Value" the user asked
                  about — see the averageOrder calculation above:
                  total_spent divided by total_orders */}
              <p className="text-xs text-gray-400">Avg. Order Value</p>
              <p className="text-base font-semibold text-gray-900">
                {formatPrice(averageOrder)}
              </p>
            </div>
          </div>

          {/* ================= CONTACT INFO ================= */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Contact Information
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AiOutlineMail className="w-4 h-4 text-gray-400" />
              {customer.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AiOutlinePhone className="w-4 h-4 text-gray-400" />
              {customer.phone || "—"}
            </div>
            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AiOutlineEnvironment className="w-4 h-4 text-gray-400" />
                {customer.address}
              </div>
            )}
          </div>

          {/* ================= ORDER HISTORY ================= */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Order History
              </h3>
              <span className="text-xs text-gray-400">
                {totalOrdersCount} total
              </span>
            </div>

            {/* Filter row — search on its own full-width row (so the
                placeholder text always has room to show completely),
                then status + sort as two EQUAL-width, equal-height
                custom dropdowns below. This fixes the earlier text
                getting cut off (each control now has enough room for
                its full label) and replaces the plain native dropdown
                menu with the themed FilterDropdown menu above. */}
            <div className="flex flex-col gap-2.5">
              <Input
                placeholder="Search order number..."
                leftIcon={<AiOutlineSearch className="w-4 h-4" />}
                value={ordersSearchInput}
                onChange={(e) => setOrdersSearchInput(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <FilterDropdown
                  icon={<AiOutlineFilter className="w-4 h-4" />}
                  ariaLabel="Filter by status"
                  value={ordersStatusFilter}
                  onChange={setOrdersStatusFilter}
                  options={ORDER_STATUS_FILTER_OPTIONS}
                />
                <FilterDropdown
                  icon={<AiOutlineSortAscending className="w-4 h-4" />}
                  ariaLabel="Sort orders"
                  value={ordersSortBy}
                  onChange={setOrdersSortBy}
                  options={ORDERS_SORT_OPTIONS}
                />
              </div>
            </div>

            {/* Orders list — loading / error / empty / data states,
                same pattern as DataTable but built compact for the
                narrower drawer width */}
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              {isOrdersLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : isOrdersError ? (
                <div className="py-10 text-center text-sm text-danger">
                  Failed to load orders.
                </div>
              ) : sortedOrders.length === 0 ? (
                <EmptyState
                  variant={hasOrdersFilterActive ? "noResults" : "noOrders"}
                  title={
                    hasOrdersFilterActive
                      ? "No Matching Orders"
                      : "No Orders Yet"
                  }
                  description={
                    hasOrdersFilterActive
                      ? "No orders match these filters. Try clearing them."
                      : "This customer hasn't placed any orders yet."
                  }
                  className="py-10"
                />
              ) : (
                <div className="divide-y divide-gray-50">
                  {sortedOrders.map((order) => (
                    <div
                      key={order.order_number}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          status={order.status}
                          label={
                            ORDER_STATUS_LABELS[order.status] || order.status
                          }
                          size="sm"
                          rounded
                        />
                        <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination — only shown once orders have actually loaded */}
            {!isOrdersLoading && sortedOrders.length > 0 && (
              <Pagination
                currentPage={ordersPage}
                totalPages={ordersTotalPages}
                onPageChange={setOrdersPage}
                pageSize={ordersPageSize}
                pageSizeOptions={ORDERS_PAGE_SIZE_OPTIONS}
                onPageSizeChange={handleOrdersPageSizeChange}
              />
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default CustomerDetailDrawer;
