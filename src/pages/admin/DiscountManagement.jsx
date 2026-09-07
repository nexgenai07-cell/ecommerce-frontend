import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AiOutlinePlus, // Icon for the "Create Discount" button
  AiOutlineSearch, // Icon for the search input's magnifying glass
  AiOutlineDownload, // Icon for the "Export Data" button
  AiOutlineEdit, // Icon for the per-row "Edit" action
  AiOutlineDelete, // Icon for the per-row "Delete" action
  AiOutlinePercentage, // Page header icon
} from "react-icons/ai";
// NOTE: AiOutlineUndo (the restore icon) is no longer imported here —
// see the "Actions column" note further down for why.

import { getDiscounts, deleteDiscount } from "../../api/discounts.api";
// getDiscounts   — API 26: GET /api/v1/discounts/ — called ONCE with
//                  no params now; every filter below is applied to
//                  the already-fetched array, not sent to the server
// deleteDiscount — API 30: DELETE /api/v1/discounts/{id}/ — now a
//                  real soft delete on the backend using an internal
//                  is_delete flag with NO restore path (see
//                  api/discounts.api.js for the full explanation).
// NOTE: restoreDiscount is no longer imported — that function was
// removed from discounts.api.js entirely, since there is no backend
// endpoint left for it to call.

import { exportReport } from "../../api/analytics.api";
// exportReport — API 77, same `type` assumption flagged in every
// other admin list page's export button ("discounts" isn't confirmed
// as a valid type string, only "sales" is given as a doc example)

import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";
// useDebounce — still used to smooth out re-filtering the table while
// the admin is actively typing, even though this no longer triggers
// a network request — recalculating the filtered/sorted array on
// every single keystroke is unnecessary extra work

import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
import DiscountStatsCards from "../../components/admin-discounts/DiscountStatsCards";
import DiscountFormModal from "../../components/admin-discounts/DiscountFormModal";

// Status tabs — "Scheduled" from the original design was dropped: it
// would require a confirmed real `start_date` field on the LIST
// response to know a coupon hasn't started yet, and that field isn't
// documented as present there (only in the create/update request
// shape).
//
// NOTE: these tabs (and the "Inactive" state in general) still work
// exactly as before — they are driven by the coupon's is_active
// field, which is a genuine, independent business toggle (pause/
// enable) that the admin controls through the Edit form. That field
// is completely separate from the new internal is_delete flag used
// by the Delete action below, so nothing here needed to change.
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
];

// Only the 2 real discount types — matches API 27's documented enum.
// NOTE: this list intentionally does NOT include an empty "All"
// entry — the Select component below already renders its own
// "Type: All" placeholder option automatically. Adding a second
// value="" option here caused a real bug: with 2 <option value="">
// elements in the same dropdown, the browser always showed the
// FIRST one ("Select an option", Select's built-in generic default)
// instead of "Type: All", no matter what was actually selected.
const TYPE_OPTIONS = [
  { value: "percent", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
];

const PAGE_SIZE = 10;

// --------------------------------------------------
// getDiscountStatus — SINGLE SOURCE OF TRUTH
// --------------------------------------------------
// Returns exactly one of "active" | "expired" | "inactive" for a
// given coupon. Every part of this page that needs to know a
// coupon's real-world status — the Status column badge, the
// All/Active/Expired tabs, and the 3 stat cards — calls this SAME
// function, so their numbers can never drift out of sync with each
// other again. UNCHANGED by the is_delete update: is_active here is
// the genuine pause/enable toggle, not the deletion flag.
//
// Priority order matters: a coupon whose end_date has already passed
// reads as "expired" even if is_active is still true in the database
// (nobody ever bothered to manually deactivate it after it lapsed).
// Only once it's confirmed NOT expired does is_active decide between
// "active" and "inactive".
const getDiscountStatus = (discount) => {
  const isExpired =
    discount.end_date && new Date(discount.end_date) < new Date();
  if (isExpired) return "expired";
  return discount.is_active === false ? "inactive" : "active";
};

const DiscountManagement = () => {
  const queryClient = useQueryClient();

  // --------------------------------------------------
  // LOCAL UI STATE
  // --------------------------------------------------
  const [activeTab, setActiveTab] = useState("");
  // Which status tab is currently selected — "", "active", or "expired"

  const [typeFilter, setTypeFilter] = useState("");
  // Which discount type is currently filtered — "", "percent", or "fixed"

  const [search, setSearch] = useState("");
  // Raw (un-debounced) text currently typed into the search box

  const [currentPage, setCurrentPage] = useState(1);
  // Which page of the (client-side filtered) results is being viewed

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState(null);
  const [discountToDelete, setDiscountToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // NOTE: the "restoringId" state that used to track which row's
  // Restore button was mid-request has been removed along with the
  // Restore feature itself — see the Actions column further down.

  const debouncedSearch = useDebounce(search, 400);
  // Only re-filters the table 400ms after the admin stops typing

  // --------------------------------------------------
  // DISCOUNTS LIST — API 26, fetched ONCE, filtered client-side below
  // --------------------------------------------------
  const {
    data: discountsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.DISCOUNTS,
    queryFn: ({ signal }) => getDiscounts(signal),
  });

  const allDiscounts = extractListData(discountsResponse);
  // Always a safe array — [] while loading, [] on an unexpected shape,
  // or the real list once loaded. Any coupon with is_delete: true on
  // the backend is already excluded from this response before it
  // ever reaches the frontend.

  // --------------------------------------------------
  // CLIENT-SIDE FILTER — search + type + status, all applied together
  // --------------------------------------------------
  const term = debouncedSearch.trim().toLowerCase();
  const filteredDiscounts = allDiscounts.filter((discount) => {
    const matchesSearch = !term || discount.code?.toLowerCase().includes(term);
    const matchesType = !typeFilter || discount.type === typeFilter;
    const matchesStatus =
      !activeTab || getDiscountStatus(discount) === activeTab;
    return matchesSearch && matchesType && matchesStatus;
  });

  // --------------------------------------------------
  // CLIENT-SIDE PAGINATION — slices the filtered array into pages of
  // PAGE_SIZE, since DataTable itself expects to receive only the
  // CURRENT page's rows (it doesn't paginate for you)
  // --------------------------------------------------
  const totalCount = filteredDiscounts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  // Clamps back into range automatically if a filter change shrinks
  // the result set below whatever page was previously being viewed —
  // a safety net on top of the explicit setCurrentPage(1) calls below
  const paginatedDiscounts = filteredDiscounts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // --------------------------------------------------
  // STATS CARD COUNTS — all 3 derived from this SAME allDiscounts
  // array using the SAME getDiscountStatus() function above, so
  // Active + Expired + Inactive is always mathematically guaranteed
  // to equal Total (this is the actual fix for the bug where "Active"
  // and "Expired" used to add up to more than "Total")
  // --------------------------------------------------
  const statusCounts = allDiscounts.reduce(
    (counts, discount) => {
      const status = getDiscountStatus(discount);
      counts[status] += 1;
      return counts;
    },
    { active: 0, expired: 0, inactive: 0 },
  );

  // --------------------------------------------------
  // DELETE HANDLER — API 30
  // --------------------------------------------------
  // UPDATED BEHAVIOR: the backend now performs a real soft delete
  // (sets the internal is_delete flag so past order/analytics
  // references stay intact), but that flag is never exposed to the
  // frontend and this coupon is filtered out of every list response
  // from this point on. There is no restore endpoint for a deleted
  // coupon, so from the UI's point of view this is final once
  // confirmed — the confirmation copy below reflects that honestly.
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDiscount(discountToDelete.id);
      showSuccess(`"${discountToDelete.code}" has been deleted.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOUNTS });
      setDiscountToDelete(null);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to delete discount.");
    } finally {
      setIsDeleting(false);
    }
  };

  // NOTE: handleRestoreClick() has been removed entirely along with
  // the restoreDiscount() API call and the Restore button below —
  // there is no backend endpoint left for it to call. If an admin
  // wants a paused (is_active: false, but NOT deleted) coupon turned
  // back on, that still works exactly as before — they just open the
  // Edit form and flip the toggle back, which is a completely
  // separate, unaffected flow (see DiscountFormModal.jsx).

  // --------------------------------------------------
  // EXPORT HANDLER — API 77
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({ type: "discounts" });
      // "discounts" is now a CONFIRMED accepted `type` value

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `discounts-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Export downloaded.");
    } catch {
      showError("Failed to export discounts. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const openCreateForm = () => {
    setActiveDiscount(null);
    setIsFormOpen(true);
  };

  const openEditForm = (discount) => {
    setActiveDiscount(discount);
    setIsFormOpen(true);
  };

  // --------------------------------------------------
  // TABLE COLUMN DEFINITIONS
  // --------------------------------------------------
  const columns = [
    {
      key: "code",
      label: "Code",
      render: (row) => (
        <span className="font-mono text-sm font-semibold bg-gray-100 text-gray-800 px-2 py-1 rounded">
          {row.code}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <Badge
          label={row.type === "percent" ? "Percentage" : "Fixed"}
          variant={row.type === "percent" ? "info" : "gray"}
          size="sm"
          rounded
        />
      ),
    },
    {
      key: "value",
      label: "Value",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {row.type === "percent"
            ? `${row.value}% OFF`
            : `${formatPrice(row.value)} OFF`}
        </span>
      ),
    },
    {
      key: "min_order_amount",
      label: "Min Order",
      render: (row) =>
        row.min_order_amount ? (
          <span className="text-sm text-gray-600">
            {formatPrice(row.min_order_amount)}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        ),
    },
    {
      key: "valid_period",
      label: "Valid Period",
      render: (row) => {
        if (!row.end_date) {
          return <span className="text-sm text-gray-500">Permanent</span>;
        }
        const startText = row.start_date ? formatDate(row.start_date) : null;
        return (
          <span className="text-sm text-gray-500">
            {startText ? `${startText} - ` : "Until "}
            {formatDate(row.end_date)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        // Uses the exact same classification function as the tabs and
        // stat cards above — guaranteed consistent with both.
        // UNCHANGED: still reflects the genuine is_active toggle, not
        // deletion, so this badge continues to work exactly as before.
        const status = getDiscountStatus(row);
        const label =
          status === "expired"
            ? "Expired"
            : status === "inactive"
              ? "Inactive"
              : "Active";
        const variant =
          status === "expired"
            ? "danger"
            : status === "inactive"
              ? "gray"
              : "success";
        return <Badge label={label} variant={variant} size="sm" rounded />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => {
        // NOTE ON WHAT WAS REMOVED: this used to branch on
        // `row.is_active === false` and show a Restore button instead
        // of Delete for paused coupons — that was wrong even before
        // this update (is_active is a pause toggle, not a delete
        // flag), but it becomes definitely wrong now that a real
        // is_delete flag exists. Delete is now always available and
        // always the same action, regardless of the coupon's
        // Active/Expired/Inactive status — pausing a coupon (via Edit)
        // and deleting a coupon (via this button) are two completely
        // separate, independent actions.
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEditForm(row)}
              className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
              aria-label={`Edit ${row.code}`}
            >
              <AiOutlineEdit className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDiscountToDelete(row)}
              className="p-1.5 text-gray-400 hover:text-danger rounded-lg hover:bg-danger-light transition-colors"
              aria-label={`Delete ${row.code}`}
            >
              <AiOutlineDelete className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header — shared component so this page matches every
          other admin screen's title styling */}
      <PageHeader
        icon={<AiOutlinePercentage />}
        title="Discount Management"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<AiOutlineDownload className="w-4 h-4" />}
              onClick={handleExport}
              isLoading={isExporting}
            >
              Export Data
            </Button>
            <Button
              variant="primary"
              leftIcon={<AiOutlinePlus className="w-4 h-4" />}
              onClick={openCreateForm}
            >
              Create Discount
            </Button>
          </div>
        }
      />

      {/* Compact stat cards — counts all come from the single
          allDiscounts array above via getDiscountStatus(), so they
          can never disagree with each other or with the table.
          Unaffected by the is_delete change — is_active still drives
          Active/Inactive exactly as before. */}
      <DiscountStatsCards
        totalCount={allDiscounts.length}
        activeCount={statusCounts.active}
        expiredCount={statusCounts.expired}
        inactiveCount={statusCounts.inactive}
      />

      {/* Status tabs + search + type filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
                // Any filter change resets back to page 1, so the
                // admin doesn't land on an empty page after narrowing
                // down to a smaller result set
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-primary-50 text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <Input
            placeholder="Search promo codes..."
            leftIcon={<AiOutlineSearch className="w-4 h-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Select
            placeholder="Type: All"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Main data table — receives only the CURRENT page's slice of
          the client-side filtered array; DataTable itself just
          renders whatever rows it's given plus the pagination footer */}
      <DataTable
        columns={columns}
        data={paginatedDiscounts}
        keyField="id"
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={safePage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
      />

      {/* Create/Edit modal — same component handles both modes */}
      <DiscountFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        activeDiscount={activeDiscount}
      />

      {/* Delete confirmation — copy updated to reflect the real
          backend behavior: the coupon is not permanently erased from
          the database (past orders that used it keep their record),
          but there is no way to bring it back into this table from
          the UI once this action is confirmed. */}
      <ConfirmModal
        isOpen={!!discountToDelete}
        onClose={() => setDiscountToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Discount?"
        message={`"${discountToDelete?.code}" will immediately stop working at checkout and will be permanently removed from this table. This action cannot be undone from here — if you need this code again later, you'll have to create a new coupon with the same code.`}
        confirmLabel="Delete Discount"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DiscountManagement;
