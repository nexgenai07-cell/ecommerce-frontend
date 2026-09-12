import { useState, useEffect } from "react";
// useState — local component state (search text, sort choice, page, drawer)
// useEffect — resets the current page back to 1 whenever search/sort changes

import { useQuery } from "@tanstack/react-query";
// useQuery — fetches, caches, and re-fetches server data automatically

import { AiOutlineEye, AiOutlineTeam } from "react-icons/ai";
// AiOutlineEye — "view customer" row action icon
// AiOutlineTeam — PageHeader icon for this page
// The search/filter/export icons now live inside the shared toolbar
// components used by CustomerFilters below.

import { getCustomers, getCustomerDetail } from "../../api/customers.api";
// getCustomers — API 110, now confirmed to filter (`search`), sort
// (`ordering`), and paginate (`page`) correctly on the backend, so
// this always returns exactly one already-sorted, already-filtered
// page of results.
// getCustomerDetail — API 88, fetched only when a specific customer's
// drawer is opened

import { exportReport } from "../../api/analytics.api";
// exportReport — confirmed accepted `type` values now include
// "customers" for this page's export button

import formatPrice from "../../utils/formatPrice";
// formatPrice — converts a raw number into "Rs. X,XXX" display format

import formatDate from "../../utils/formatDate";
// formatDate — converts a raw ISO date string into "Jul 15, 2026" format

import extractListData from "../../utils/extractListData";
// extractListData — normalizes the response into a plain array,
// regardless of whether it's a paginated object or a bare array

import useDebounce from "../../hooks/useDebounce";
// useDebounce — delays updating the search value until typing pauses,
// so we don't fire a network request on every keystroke

import { showSuccess, showError } from "../../components/ui/Toast";
// showSuccess / showError — toast notification helpers for the export flow

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

import CustomerFilters from "../../components/admin-customers/CustomerFilters";
// CustomerFilters — the shared-style toolbar above the table (search,
// Filters toggle, Export, Sort chip). The sort option list itself now
// lives inside that file, right next to where it is rendered.

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const CustomerManagement = () => {
  const [search, setSearch] = useState("");
  // search — raw text typed into the search box BEFORE debouncing

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — which SORT_OPTIONS value is currently active; defaults
  // to "Newest Joined" so the default order never surprises anyone.
  // Sent directly to the backend as the `ordering` param.

  const [currentPage, setCurrentPage] = useState(1);
  // currentPage — which page of results is currently being viewed

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many customers the backend returns per page,
  // controlled by the "Rows per page" dropdown in the table footer.
  // Sent to the backend as `page_size` alongside `page` on every request.

  const [isExporting, setIsExporting] = useState(false);
  // isExporting — true while the CSV export download is in progress

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  // selectedCustomerId — which customer's "eye" icon was clicked;
  // null means the drawer is closed

  const debouncedSearch = useDebounce(search, 400);
  // Waits 400ms after the admin stops typing before actually firing a
  // network request — prevents a new API call on every keystroke

  // --------------------------------------------------
  // CUSTOMERS — real server-side search + sort + pagination. Only
  // ONE page of already-filtered, already-sorted results is ever
  // fetched, no matter how large the customer base grows.
  // --------------------------------------------------
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "adminCustomers",
      "list",
      debouncedSearch,
      sortBy,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getCustomers(
        {
          search: debouncedSearch || undefined,
          // undefined (not empty string) so an empty search box doesn't
          // send a pointless ?search= query param
          ordering: sortBy,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    keepPreviousData: true,
    // Keeps showing the previous page's rows while the next page
    // loads, instead of flashing an empty table on every page change
  });

  const pageCustomers = extractListData(response);
  const totalCount = response?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Whenever the search term, sort option, or rows-per-page selection
  // changes, jump back to page 1 — staying on, say, page 3 of a
  // brand-new filtered/sorted/resized list would either show nothing
  // or the wrong rows
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortBy, pageSize]);

  // --------------------------------------------------
  // CUSTOMER DETAIL — API 88, fetched only when the drawer opens
  // --------------------------------------------------
  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ["adminCustomers", "detail", selectedCustomerId],
    // queryKey includes selectedCustomerId — switching customers
    // triggers a fresh fetch and its own cache entry per customer
    queryFn: ({ signal }) => getCustomerDetail(selectedCustomerId, signal),
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

  // Table column config
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
      {/* Shared gradient PageHeader — matches every other admin screen. */}
      <PageHeader icon={<AiOutlineTeam />} title="Customers" />
      {/* Note: "+ Add Customer" from the design is NOT included — there
          is no documented endpoint for an admin to manually create a
          customer account; only self-registration (API 1) exists. */}

      {/* Only 2 real, accurate, compact stat cards — see CustomerStatsCards.jsx */}
      <CustomerStatsCards />

      {/* Toolbar — search, Filters, Export, and (once opened) the Sort
          dropdown chip. Same shared toolbar pattern used on every other
          admin list page (see src/components/shared/list-toolbar).
          Search AND sort are both real backend parameters, so
          filtering/sorting always applies across the customer's entire
          matching list, not just one page. */}
      <CustomerFilters
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch("");
          setSortBy("-created_at");
        }}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <DataTable
        columns={columns}
        data={pageCustomers}
        keyField="id"
        onRowClick={(row) => setSelectedCustomerId(row.id)}
        // Opens the same detail drawer as the eye icon when any part of
        // the row is clicked
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
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
