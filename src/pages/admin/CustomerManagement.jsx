import { useState, useEffect, useMemo } from "react";
// useState — local component state (search text, sort choice, page, drawer)
// useEffect — resets the current page back to 1 whenever search/sort changes
// useMemo — avoids re-sorting the full customer list on every unrelated render

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches, caches, and re-fetches server data automatically

import {
  AiOutlineDownload,
  AiOutlineSearch,
  AiOutlineEye,
  AiOutlineTeam,
} from "react-icons/ai";
// AiOutlineDownload — Export button icon
// AiOutlineSearch — search input icon
// AiOutlineEye — "view customer" row action icon
// AiOutlineTeam — PageHeader icon for this page

import { getCustomerDetail, fetchAllCustomers } from "../../api/customers.api";
// getCustomerDetail — API 88, fetched only when a specific customer's
// drawer is opened
// fetchAllCustomers — loops through every page of API 87 and returns
// one complete, flat array — this is what powers the rich client-side
// sorting below

import { exportReport } from "../../api/analytics.api";
// exportReport — same type-value assumption flagged in OrderManagement
// and ReturnsManagement ("customers" as the `type`, unconfirmed)

import formatPrice from "../../utils/formatPrice";
// formatPrice — converts a raw number into "Rs. X,XXX" display format

import formatDate from "../../utils/formatDate";
// formatDate — converts a raw ISO date string into "Jul 15, 2026" format

import useDebounce from "../../hooks/useDebounce";
// useDebounce — delays updating the search value until typing pauses,
// so we don't fire a network request on every keystroke

import { showSuccess, showError } from "../../components/ui/Toast";
// showSuccess / showError — toast notification helpers for the export flow

import Button from "../../components/ui/Button";
// Button — shared button component (Export, Clear)

import Input from "../../components/ui/Input";
// Input — shared text input component (search box)

import Select from "../../components/ui/Select";
// Select — shared dropdown component (sort choice)

import Avatar from "../../components/ui/Avatar";
// Avatar — shows customer initials in a colored circle

import DataTable from "../../components/ui/DataTable";
// DataTable — shared table component with built-in pagination UI

import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen (Products, Orders, Categories,
// Dashboard, etc). Keeps this page visually consistent with the rest
// of the panel instead of using its own plain <h1>.

import CustomerStatsCards from "../../components/admin-customers/CustomerStatsCards";
// CustomerStatsCards — the 2 compact KPI cards above the table

import CustomerDetailDrawer from "../../components/admin-customers/CustomerDetailDrawer";
// CustomerDetailDrawer — the side panel that opens on "eye" click

// --------------------------------------------------
// SORT OPTIONS — this is the "rich filtering" the customer list
// supports. Since API 87 only confirms a `search` query param (no
// documented ordering param), sorting is done ENTIRELY on the
// frontend against the COMPLETE customer list (see fetchAllCustomers)
// — this is reliable because every field being sorted on
// (name, total_orders, total_spent, created_at) is a real, confirmed
// field already present on every customer object.
// --------------------------------------------------
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest Joined" },
  // Default sort — most recently joined customer first
  { value: "created_at", label: "Oldest Joined" },
  // Oldest customer account first
  { value: "name", label: "Name: A–Z" },
  // Alphabetical by customer name, ascending
  { value: "-name", label: "Name: Z–A" },
  // Alphabetical by customer name, descending
  { value: "-total_orders", label: "Most Orders" },
  // Customer with the highest order count first
  { value: "total_orders", label: "Fewest Orders" },
  // Customer with the lowest order count first
  { value: "-total_spent", label: "Highest Spender" },
  // Customer who has spent the most money first
  { value: "total_spent", label: "Lowest Spender" },
  // Customer who has spent the least money first
];

// Maps each SORT_OPTIONS value to an actual comparator function used
// by Array.prototype.sort() below — one function per sort choice
const SORTERS = {
  "-created_at": (a, b) => new Date(b.created_at) - new Date(a.created_at),
  // Newest first — larger (more recent) date comes before smaller date
  created_at: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  // Oldest first — smaller (older) date comes before larger date
  name: (a, b) => (a.name || "").localeCompare(b.name || ""),
  // A-Z — localeCompare handles alphabetical ordering correctly
  "-name": (a, b) => (b.name || "").localeCompare(a.name || ""),
  // Z-A — same comparator, arguments swapped to reverse the order
  "-total_orders": (a, b) =>
    (Number(b.total_orders) || 0) - (Number(a.total_orders) || 0),
  // Most orders first — Number(...) || 0 guards against null/undefined
  total_orders: (a, b) =>
    (Number(a.total_orders) || 0) - (Number(b.total_orders) || 0),
  // Fewest orders first
  "-total_spent": (a, b) =>
    (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0),
  // Highest spender first
  total_spent: (a, b) =>
    (Number(a.total_spent) || 0) - (Number(b.total_spent) || 0),
  // Lowest spender first
};

const PAGE_SIZE = 10;
// How many customers are shown per page — pagination is done entirely
// on the frontend (see pageCustomers below), since we hold the
// complete, already-sorted list in memory

const CustomerManagement = () => {
  const [search, setSearch] = useState("");
  // search — raw text typed into the search box BEFORE debouncing

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — which SORT_OPTIONS value is currently active; defaults
  // to "Newest Joined" so the default order never surprises anyone

  const [currentPage, setCurrentPage] = useState(1);
  // currentPage — which page of the (already sorted/filtered) list
  // is currently being viewed

  const [isExporting, setIsExporting] = useState(false);
  // isExporting — true while the CSV export download is in progress

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  // selectedCustomerId — which customer's "eye" icon was clicked;
  // null means the drawer is closed

  const debouncedSearch = useDebounce(search, 400);
  // Waits 400ms after the admin stops typing before actually firing a
  // network request — prevents a new API call on every keystroke

  // --------------------------------------------------
  // CUSTOMERS — fetches the COMPLETE list matching the current search
  // term (search IS sent to the backend, since it's a confirmed real
  // param). Sorting and pagination happen afterwards, on the frontend.
  // --------------------------------------------------
  const {
    data: allCustomers = [],
    // Defaults to an empty array so .length/.map never crash before
    // the first response arrives
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["adminCustomers", "allFiltered", debouncedSearch],
    // queryKey includes debouncedSearch — a new search term triggers
    // a fresh fetch and its own cache entry
    queryFn: () => fetchAllCustomers({ search: debouncedSearch || undefined }),
    // undefined (not empty string) so an empty search box doesn't send
    // a pointless ?search= query param
  });

  // Re-sorts the complete list whenever the list itself or the chosen
  // sort option changes — useMemo avoids redoing this on every
  // unrelated re-render (e.g. when the drawer opens/closes)
  const sortedCustomers = useMemo(() => {
    const list = [...allCustomers];
    // Copies the array before sorting — Array.sort() mutates in place,
    // and mutating the react-query cached array directly would cause
    // subtle bugs elsewhere in the app

    const sorter = SORTERS[sortBy];
    // Looks up the comparator function matching the current sortBy value

    if (sorter) list.sort(sorter);
    // Only sorts if a matching comparator was actually found

    return list;
  }, [allCustomers, sortBy]);
  // Recomputes only when the source data or the sort choice changes

  const totalCount = sortedCustomers.length;
  // Total number of customers matching the current search (before pagination)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // At least 1 page even when totalCount is 0, so pagination never shows "page 0 of 0"

  // Slices out just the current page's worth of rows from the fully
  // sorted list — this is the frontend equivalent of backend pagination
  const pageCustomers = sortedCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Whenever the search term or sort option changes, jump back to
  // page 1 — staying on, say, page 3 of a brand-new filtered/sorted
  // list would either show nothing or the wrong rows
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortBy]);

  // --------------------------------------------------
  // CUSTOMER DETAIL — API 88, fetched only when the drawer opens
  // --------------------------------------------------
  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ["adminCustomers", "detail", selectedCustomerId],
    // queryKey includes selectedCustomerId — switching customers
    // triggers a fresh fetch and its own cache entry per customer
    queryFn: () => getCustomerDetail(selectedCustomerId),
    enabled: !!selectedCustomerId,
    // enabled — only runs this query once a customer id is actually selected
  });

  const handleExport = async () => {
    setIsExporting(true);
    // Shows the loading spinner on the Export button immediately
    try {
      const response = await exportReport({ type: "customers" });
      // Requests the CSV export blob from the backend

      const blobUrl = URL.createObjectURL(response.data);
      // Creates a temporary in-browser URL pointing to the downloaded file

      const link = document.createElement("a");
      // Builds a hidden <a> tag purely to trigger a file download

      link.href = blobUrl;
      link.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
      // Filename includes today's date, e.g. "customers-export-2026-07-18.csv"

      document.body.appendChild(link);
      link.click();
      // Programmatically "clicks" the link to start the download

      link.remove();
      // Cleans up the temporary <a> tag from the DOM

      URL.revokeObjectURL(blobUrl);
      // Frees the browser memory used by the temporary blob URL

      showSuccess("Export downloaded.");
      // Confirms success to the admin via a toast notification
    } catch (error) {
      showError("Failed to export customers. Please try again.");
      // Shows a friendly error toast if the export request fails
    } finally {
      setIsExporting(false);
      // Always turns off the loading spinner, whether it succeeded or failed
    }
  };

  // Table column config — STATUS COLUMN REMOVED per request (there is
  // no confirmed is_active field, so it only ever showed a dash anyway)
  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-3">
          {/* Initials-based avatar — no photo field exists in the
              documented customer object */}
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            {/* min-w-0 allows the truncate classes below to actually
                work inside a flex container */}
            <p className="text-sm font-medium text-gray-900 truncate">
              {row.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => (
        <span className="text-sm text-gray-600">{row.phone || "—"}</span>
        // Falls back to an em-dash when no phone number is on file
      ),
    },
    {
      key: "total_orders",
      label: "Orders",
      render: (row) => (
        <span className="text-sm text-gray-900">{row.total_orders}</span>
      ),
    },
    {
      key: "total_spent",
      label: "Spent",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {formatPrice(row.total_spent)}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    // "Status" column intentionally removed — see comment above
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() => setSelectedCustomerId(row.id)}
          // Opens the detail drawer for this exact customer row
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
          aria-label={`View ${row.name}`}
          // Screen-reader label since the button only shows an icon
        >
          <AiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // True the moment either the search box or the sort dropdown is set
  // to something other than the defaults — used to show a "Clear" button
  const hasActiveFilters = !!search || sortBy !== "-created_at";

  return (
    <div className="flex flex-col gap-6">
      {/* Shared gradient PageHeader — matches every other admin screen.
          Export button lives inside the header's `actions` slot. */}
      <PageHeader
        icon={<AiOutlineTeam />}
        title="Customers"
        actions={
          <Button
            variant="secondary"
            leftIcon={<AiOutlineDownload className="w-4 h-4" />}
            onClick={handleExport}
            isLoading={isExporting}
          >
            Export
          </Button>
        }
      />
      {/* Note: "+ Add Customer" from the design is NOT included — there
          is no documented endpoint for an admin to manually create a
          customer account; only self-registration (API 1) exists. */}

      {/* Only 2 real, accurate, compact stat cards — see CustomerStatsCards.jsx */}
      <CustomerStatsCards />

      {/* Filter toolbar — search (real backend param) + sort (client-side,
          rich filtering: most/least orders, highest/lowest spender, name
          A-Z/Z-A, newest/oldest joined) */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
        {/* Small section heading above the filter controls — makes it
            clear at a glance that this whole card is the filter area */}
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Filter Customers
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* flex-col on mobile (stacked vertically), sm:flex-row on
              larger screens (search, sort, and clear sit side by side) */}
          <div className="flex-1">
            {/* flex-1 lets the search box grow to fill the remaining space */}
            <Input
              placeholder="Search by name, email or phone..."
              leftIcon={<AiOutlineSearch className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Fixed-width wrapper keeps the sort dropdown from stretching
              full-width on larger screens the way the search input does */}
          <div className="sm:w-56 shrink-0">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={SORT_OPTIONS}
              placeholder="Sort by..."
            />
          </div>

          {/* "Clear" — only rendered when a filter is actually active,
              resets both the search box and the sort dropdown at once */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSortBy("-created_at");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pageCustomers}
        keyField="id"
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
      />

      <CustomerDetailDrawer
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        customer={detailResponse?.data}
        isLoading={isDetailLoading}
      />
    </div>
  );
};

export default CustomerManagement;
// Default export — this is the actual page component routed at
// /admin/customers
