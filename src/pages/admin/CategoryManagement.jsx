import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlinePlus,
  AiOutlineTag,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePicture,
} from "react-icons/ai";

import { getCategories, deleteCategory } from "../../api/categories.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
import CategoryStatsCards from "../../components/admin-categories/CategoryStatsCards";
import CategoryFilters from "../../components/admin-categories/CategoryFilters";
import CategoryFormPanel from "../../components/admin-categories/CategoryFormPanel";

/**
 * Sort comparator functions, keyed by the "ordering" value produced by
 * CategoryFilters' Sort By dropdown. Each function receives two category
 * objects and follows the standard Array.prototype.sort contract.
 */
const SORTERS = {
  "-created_at": (a, b) => new Date(b.created_at) - new Date(a.created_at),
  created_at: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  name: (a, b) => (a.name || "").localeCompare(b.name || ""),
  "-name": (a, b) => (b.name || "").localeCompare(a.name || ""),
  "-product_count": (a, b) =>
    (Number(b.product_count) || 0) - (Number(a.product_count) || 0),
  product_count: (a, b) =>
    (Number(a.product_count) || 0) - (Number(b.product_count) || 0),
};

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

/**
 * Renders a single category's thumbnail cell in the table.
 * Falls back to a placeholder icon when the category has no image, or
 * when the configured image URL fails to load in the browser. The
 * fallback state has to live per row, which is why this is a small
 * component rather than an inline render function.
 */
const CategoryImageCell = ({ category }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = !!category.image && !imageFailed;

  if (hasImage) {
    return (
      <img
        src={category.image}
        alt={category.name}
        onError={() => setImageFailed(true)}
        className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0 ring-1 ring-black/5">
      <AiOutlinePicture className="w-4.5 h-4.5" />
    </div>
  );
};

const CategoryManagement = () => {
  const queryClient = useQueryClient();

  // Add/Edit form modal state. `activeCategory` being null means the
  // form renders in create mode; a real category object means edit mode.
  const [activeCategory, setActiveCategory] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Incremented every time the modal opens, and passed to
  // CategoryFormPanel as its React `key`. This forces the form to
  // remount with fresh internal state each time it opens, instead of
  // carrying over values left behind from a previous session.
  const [formSessionId, setFormSessionId] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    ordering: "-created_at",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many categories are shown per page, controlled by the
  // "Rows per page" dropdown in the table footer. Categories are
  // filtered/sorted client-side above, so this only affects the slice
  // taken below — no network request is re-fired.

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Single-category deletion flow, triggered from a row's delete icon.
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk selection flow. `selectedIds` holds the ids of every category
  // currently checked in the table, driven by DataTable's built-in
  // selection support. This operates independently of the single-row
  // delete flow above — both can be used interchangeably without
  // interfering with each other.
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  // --------------------------------------------------
  // Categories list query
  // --------------------------------------------------
  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 1000 * 60 * 5,
  });

  const allCategories = extractListData(categoriesResponse);

  const totalCategorizedProducts = allCategories.reduce(
    (sum, category) => sum + (Number(category.product_count) || 0),
    0,
  );

  // --------------------------------------------------
  // Filter helpers
  // --------------------------------------------------
  const hasActiveFilters =
    !!filters.search || !!filters.startDate || !!filters.endDate;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
      ordering: "-created_at",
    });
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // Client-side filtering and sorting
  // --------------------------------------------------
  // The category list is a small, complete dataset (the API returns
  // every category in one response, unpaginated), so search, date-range
  // filtering, and sorting are all applied here in the browser.
  const filteredCategories = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    const filtered = allCategories.filter((category) => {
      const matchesSearch =
        !term || category.name?.toLowerCase().includes(term);

      const createdAt = category.created_at
        ? new Date(category.created_at)
        : null;

      const matchesStartDate =
        !filters.startDate ||
        (createdAt && createdAt >= new Date(filters.startDate));

      const matchesEndDate =
        !filters.endDate ||
        (createdAt && createdAt <= new Date(`${filters.endDate}T23:59:59`));

      return matchesSearch && matchesStartDate && matchesEndDate;
    });

    const sortFn = SORTERS[filters.ordering] || SORTERS["-created_at"];
    return [...filtered].sort(sortFn);
  }, [allCategories, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / pageSize),
  );
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // --------------------------------------------------
  // Table column configuration
  // --------------------------------------------------
  const columns = [
    {
      key: "image",
      label: "Image",
      render: (row) => <CategoryImageCell category={row} />,
    },
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      key: "product_count",
      label: "Products Count",
      render: (row) => {
        const productCount = Number(row.product_count) || 0;
        return (
          <Badge
            label={`${productCount} item${productCount === 1 ? "" : "s"}`}
            variant="gray"
            size="sm"
            rounded
          />
        );
      },
    },
    {
      key: "created_at",
      label: "Created Date",
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEditClick(row)}
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
            aria-label={`Edit ${row.name}`}
          >
            <AiOutlineEdit className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCategoryToDelete(row)}
            className="p-1.5 text-gray-400 hover:text-danger rounded-lg hover:bg-danger-light transition-colors"
            aria-label={`Delete ${row.name}`}
          >
            <AiOutlineDelete className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // --------------------------------------------------
  // Single category deletion
  // --------------------------------------------------
  // The backend performs a soft delete internally, preserving historical
  // product references, but exposes no restore endpoint — so from the
  // admin's perspective this action is final once confirmed.
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      showSuccess(`"${categoryToDelete.name}" has been deleted.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
      setCategoryToDelete(null);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  // --------------------------------------------------
  // Bulk deletion
  // --------------------------------------------------
  // There is no dedicated bulk-delete endpoint, so each selected
  // category is deleted with its own request, issued in parallel.
  const selectedCategories = allCategories.filter((c) =>
    selectedIds.includes(c.id),
  );
  const selectedProductCount = selectedCategories.reduce(
    (sum, c) => sum + (Number(c.product_count) || 0),
    0,
  );

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteCategory(id)));
      showSuccess(
        `${selectedIds.length} categor${selectedIds.length === 1 ? "y" : "ies"} deleted.`,
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
      setSelectedIds([]);
      setConfirmBulkDeleteOpen(false);
    } catch (error) {
      showError(
        error?.response?.data?.message || "Failed to delete categories.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (category) => {
    setActiveCategory(category);
    setFormSessionId((id) => id + 1);
    setIsFormOpen(true);
  };

  const handleAddClick = () => {
    setActiveCategory(null);
    setFormSessionId((id) => id + 1);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setActiveCategory(null);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        icon={<AiOutlineTag />}
        title="Category Management"
        actions={
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={handleAddClick}
            className="w-full sm:w-auto"
          >
            Add Category
          </Button>
        }
      />

      <CategoryStatsCards
        totalCategories={allCategories.length}
        totalCategorizedProducts={totalCategorizedProducts}
        isLoadingCounts={isLoading}
      />

      <CategoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div
        className="
          bg-white rounded-2xl border border-gray-100 overflow-hidden
          shadow-md
          hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
          transition-all duration-300
        "
      >
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-8">
            <EmptyState
              variant="noResults"
              title="No Categories Found"
              description={
                hasActiveFilters
                  ? "Try a different search term or date range."
                  : "Create your first category to start organizing products."
              }
            />
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            {/* Bulk action bar — appears only while one or more rows are
                checked. Stacks vertically on narrow screens and sits on
                one line from the small breakpoint upward. */}
            {selectedIds.length > 0 && (
              <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
              data={paginatedCategories}
              keyField="id"
              selectable
              onSelectionChange={setSelectedIds}
              currentPage={currentPage}
              totalPages={totalPages}
              totalResults={filteredCategories.length}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      <CategoryFormPanel
        key={formSessionId}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        activeCategory={activeCategory}
      />

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category?"
        message={
          categoryToDelete
            ? (() => {
                const count = Number(categoryToDelete.product_count) || 0;
                const productLine =
                  count > 0
                    ? `${count} product${count === 1 ? "" : "s"} currently in this category will remain fully active and untouched — they'll still show up in Search, the Shop/All Products page, and via direct links. They just won't be filterable under "${categoryToDelete.name}" anymore.`
                    : `This category currently has no products assigned to it.`;

                return `"${categoryToDelete.name}" will be permanently removed from the storefront and this admin table. ${productLine} This action cannot be undone from here.`;
              })()
            : ""
        }
        confirmLabel="Delete Category"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Categories?"
        message={`This will permanently remove ${selectedIds.length} categor${selectedIds.length === 1 ? "y" : "ies"} from the storefront and this admin table. ${selectedProductCount > 0 ? `${selectedProductCount} product${selectedProductCount === 1 ? "" : "s"} currently assigned to ${selectedIds.length === 1 ? "it" : "them"} will remain fully active and untouched — they'll just no longer be filterable under ${selectedIds.length === 1 ? "this category" : "these categories"}.` : "None of the selected categories currently have products assigned."} This action cannot be undone from here.`}
        confirmLabel="Delete Categories"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CategoryManagement;
