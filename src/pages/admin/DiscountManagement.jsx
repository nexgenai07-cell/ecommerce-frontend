import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AiOutlinePlus,
  AiOutlineSearch,
  AiOutlineDownload,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePercentage,
} from "react-icons/ai";

import { getDiscounts, deleteDiscount } from "../../api/discounts.api";
import { exportReport } from "../../api/analytics.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import useDebounce from "../../hooks/useDebounce";

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

/**
 * Status filter tabs shown above the table. Each tab's key maps
 * directly to a value returned by getDiscountStatus().
 */
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
];

/**
 * Discount type options for the Type filter dropdown.
 */
const TYPE_OPTIONS = [
  { value: "percent", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
];

const PAGE_SIZE = 10;

/**
 * Determines a coupon's effective status. This is the single source
 * of truth used by the status tabs, the table's Status column, and the
 * summary stat cards, so their numbers always agree with one another.
 *
 * An expired end date always takes priority over the stored is_active
 * flag — a coupon that lapsed but was never manually deactivated
 * should still read as "expired", not "active".
 */
const getDiscountStatus = (discount) => {
  const isExpired =
    discount.end_date && new Date(discount.end_date) < new Date();
  if (isExpired) return "expired";
  return discount.is_active === false ? "inactive" : "active";
};

const DiscountManagement = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState(null);

  // Single-discount deletion flow, triggered from a row's delete icon.
  const [discountToDelete, setDiscountToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection flow. `selectedIds` holds the ids of every discount
  // currently checked in the table, driven by DataTable's built-in
  // selection support. This operates independently of the single-row
  // delete flow above — both can be used interchangeably without
  // interfering with each other.
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // --------------------------------------------------
  // Discounts list query
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

  // --------------------------------------------------
  // Client-side filtering
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
  // Client-side pagination
  // --------------------------------------------------
  const totalCount = filteredDiscounts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDiscounts = filteredDiscounts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // --------------------------------------------------
  // Summary stat card counts, derived from the same status function
  // used everywhere else on this page.
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
  // Single discount deletion
  // --------------------------------------------------
  // The backend performs a soft delete internally, preserving historical
  // order and analytics references, but exposes no restore endpoint —
  // so from the admin's perspective this action is final once confirmed.
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

  // --------------------------------------------------
  // Bulk deletion
  // --------------------------------------------------
  // There is no dedicated bulk-delete endpoint, so each selected
  // discount is deleted with its own request, issued in parallel.
  const selectedCodes = allDiscounts
    .filter((d) => selectedIds.includes(d.id))
    .map((d) => d.code);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteDiscount(id)));
      showSuccess(
        `${selectedIds.length} discount${selectedIds.length === 1 ? "" : "s"} deleted.`,
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOUNTS });
      setSelectedIds([]);
      setConfirmBulkDeleteOpen(false);
    } catch (error) {
      showError(
        error?.response?.data?.message || "Failed to delete discounts.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // --------------------------------------------------
  // Export handler
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({ type: "discounts" });

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
  // Table column configuration
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
      render: (row) => (
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
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        icon={<AiOutlinePercentage />}
        title="Discount Management"
        actions={
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              leftIcon={<AiOutlineDownload className="w-4 h-4" />}
              onClick={handleExport}
              isLoading={isExporting}
              className="w-full sm:w-auto"
            >
              Export Data
            </Button>
            <Button
              variant="primary"
              leftIcon={<AiOutlinePlus className="w-4 h-4" />}
              onClick={openCreateForm}
              className="w-full sm:w-auto"
            >
              Create Discount
            </Button>
          </div>
        }
      />

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

      {/* Bulk action bar — appears only while one or more rows are
          checked. Stacks vertically on narrow screens and sits on one
          line from the small breakpoint upward. */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<AiOutlineDelete className="w-4 h-4" />}
            onClick={() => setConfirmBulkDeleteOpen(true)}
            className="w-full sm:w-auto"
          >
            Delete
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginatedDiscounts}
        keyField="id"
        selectable
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        currentPage={safePage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
      />

      <DiscountFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        activeDiscount={activeDiscount}
      />

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

      <ConfirmModal
        isOpen={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Discounts?"
        message={`${selectedIds.length} discount code${selectedIds.length === 1 ? "" : "s"}${selectedCodes.length ? ` (${selectedCodes.join(", ")})` : ""} will immediately stop working at checkout and will be permanently removed from this table. This action cannot be undone from here — if you need any of these codes again later, you'll have to create new coupons with the same codes.`}
        confirmLabel="Delete Discounts"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DiscountManagement;
