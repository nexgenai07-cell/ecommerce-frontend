import { useEffect, useState } from "react";
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
import downloadCsv from "../../utils/downloadCsv";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/shared/PageHeader";
import CategoryStatsCards from "../../components/admin-categories/CategoryStatsCards";
import CategoryFilters from "../../components/admin-categories/CategoryFilters";
import CategoryFormPanel from "../../components/admin-categories/CategoryFormPanel";

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
        className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0"
        // 28px thumbnail — fits within the DataTable's fixed 36px row
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0 ring-1 ring-black/5">
      {/* Same 28px size as the real-image branch above, so the placeholder icon
          box never exceeds the fixed row height either */}
      <AiOutlinePicture className="w-4 h-4" />
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

  // Waits 400ms after the admin stops typing before actually filtering —
  // avoids firing a new network request on every single keystroke, same
  // pattern used on Product/Discount/Audit Log Management.
  const debouncedSearch = useDebounce(filters.search, 400);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many categories are shown per page, sent to the
  // backend as `page_size` alongside `page` on every request.

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
  // FULL, UNPAGINATED category list — used only for the stat cards
  // (Total Categories / Total Categorized Products). Categories are a
  // small, bounded, store-owned dataset (unlike the product catalog),
  // so pulling the complete list for an accurate total is safe here.
  // No `page` param is sent, so the backend returns a plain array — and
  // this reuses the same cache key/query as the navbar/footer/shop filter
  // checkboxes (see categories.api.js), so it costs no extra request in
  // practice; it is shared from React Query's cache.
  // --------------------------------------------------
  const { data: allCategoriesResponse, isLoading: isLoadingAllCategories } =
    useQuery({
      queryKey: QUERY_KEYS.CATEGORIES,
      queryFn: ({ signal }) => getCategories(undefined, signal),
      staleTime: 1000 * 60 * 5,
    });
  const allCategories = extractListData(allCategoriesResponse);

  const totalCategorizedProducts = allCategories.reduce(
    (sum, category) => sum + (Number(category.product_count) || 0),
    0,
  );

  // --------------------------------------------------
  // ADMIN TABLE query — server-side search, date-range filtering,
  // sorting, and pagination. `page` is explicitly sent, so the backend
  // switches into its paginated { count, next, previous, results } shape
  // for this request only — every other caller of getCategories() above
  // keeps getting the plain array, since they never send `page`.
  // --------------------------------------------------
  const {
    data: categoriesResponse,
    isLoading,
    isError,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.CATEGORIES,
      "admin-table",
      debouncedSearch,
      filters.startDate,
      filters.endDate,
      filters.ordering,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getCategories(
        {
          search: debouncedSearch || undefined,
          start_date: filters.startDate || undefined,
          end_date: filters.endDate || undefined,
          ordering: filters.ordering,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });

  const tableCategories = extractListData(categoriesResponse);
  const totalCount = categoriesResponse?.data?.count ?? tableCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // If the backend rejects the request (for example an invalid date
  // range), show the reason it gives instead of only the generic table
  // error.
  useEffect(() => {
    const message = listError?.response?.data?.error;
    if (message) showError(message);
  }, [listError]);

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

  // The backend's page_size cap on /api/v1/categories/ — the same cap used
  // for the on-screen pagination, also used here to pull a filtered export
  // in as few requests as possible.
  const EXPORT_PAGE_SIZE = 100;

  // Exports EVERY category matching the currently applied filters (not
  // just whatever page happens to be on screen right now), looping
  // pages if needed, then builds the CSV from that full set.
  const handleExport = async () => {
    try {
      const baseParams = {
        search: debouncedSearch || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        ordering: filters.ordering,
        page_size: EXPORT_PAGE_SIZE,
      };

      const allMatching = [];
      let page = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const response = await getCategories({ ...baseParams, page });
        allMatching.push(...extractListData(response));
        const matchingTotal = response?.data?.count ?? allMatching.length;
        if (allMatching.length >= matchingTotal || !response?.data?.next) {
          break;
        }
        page += 1;
      }

      downloadCsv(
        allMatching.map((category) => ({
          name: category.name,
          product_count: category.product_count ?? 0,
          created_at: category.created_at
            ? formatDate(category.created_at)
            : "",
        })),
        [
          { key: "name", label: "Name" },
          { key: "product_count", label: "Products" },
          { key: "created_at", label: "Created Date" },
        ],
        "categories",
      );
      showSuccess("Categories exported.");
    } catch (error) {
      showError("Failed to export categories. Please try again.");
    }
  };

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
        <span className="text-[10px] sm:text-[11px] font-medium text-gray-900">
          {row.name}
        </span>
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
        <span className="text-[10px] sm:text-[11px] text-gray-500">
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
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-4 sm:gap-6 to gap-2 so the page matches the tighter
    // rhythm already used on Product Management, instead of leaving large
    // empty bands between each section.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
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
        isLoadingCounts={isLoadingAllCategories}
      />

      <CategoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        onExport={handleExport}
      />

      {/* Bulk action bar — appears only while one or more rows are checked.
          Rendered as a plain sibling here (matching Product/Discount/Order
          Management), not nested inside an extra wrapper card. */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-medium text-gray-700">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<AiOutlineDelete className="w-3.5 h-3.5" />}
            onClick={() => setConfirmBulkDeleteOpen(true)}
            className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
          >
            Delete
          </Button>
        </div>
      )}

      {/* DataTable is rendered directly, without an extra card around it, like
          every other admin list page. It handles the loading skeleton and the
          empty state internally through its isLoading prop and the
          emptyTitle/emptyDescription overrides. */}
      <DataTable
        columns={columns}
        data={tableCategories}
        keyField="id"
        selectable
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
        error={isError}
        onRetry={refetch}
        emptyTitle="No Categories Found"
        emptyDescription={
          hasActiveFilters
            ? "Try a different search term or date range."
            : "Create your first category to start organizing products."
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalCount}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
      />

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
