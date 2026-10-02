// React core hooks for local state, side effects
import { useEffect, useState } from "react";
// TanStack Query hooks for server data fetching, mutations and cache access
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Ant Design outline icons used by the page header, table and buttons
import {
  AiOutlinePlus,
  AiOutlineTag,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlinePicture,
} from "react-icons/ai";

// Category API calls: list, delete and the Active / Inactive switch
import {
  getCategories,
  deleteCategory,
  setCategoryActive,
} from "../../api/categories.api";
// Analytics API used to download the categories CSV export
import { exportReport } from "../../api/analytics.api";
// Central registry of TanStack Query cache keys
import { QUERY_KEYS } from "../../constants/queryKeys";
// Normalises plain-array and paginated responses into one array
import extractListData from "../../utils/extractListData";
// Formats an ISO date string for display
import formatDate from "../../utils/formatDate";
// Downloads a backend-generated CSV file and reports success or failure
import downloadExportCsv from "../../utils/downloadExportCsv";
// Extracts the most readable message from a failed backend response
import getApiErrorMessage from "../../utils/getApiErrorMessage";
// Delays a fast-changing value so it is not used on every keystroke
import useDebounce from "../../hooks/useDebounce";
// Toast helpers for success and error feedback
import { showSuccess, showError } from "../../components/ui/Toast";
// Shared UI building blocks
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Toggle from "../../components/ui/Toggle";
import ConfirmModal from "../../components/ui/ConfirmModal";
import DataTable from "../../components/ui/DataTable";
// Shared page title bar used on every admin screen
import PageHeader from "../../components/shared/PageHeader";
// Category-specific page sections
import CategoryStatsCards from "../../components/admin-categories/CategoryStatsCards";
import CategoryFilters from "../../components/admin-categories/CategoryFilters";
import CategoryFormPanel from "../../components/admin-categories/CategoryFormPanel";

// Selectable "rows per page" values shown in the pagination dropdown.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
// The page size used until the admin picks a different one
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// Writes one updated category into a cached list response, whether the
// cache holds a plain array or a paginated { results: [...] } object.
// Any other cache shape is returned untouched.
const mergeUpdatedCategory = (cachedResponse, updatedCategory) => {
  // The body of the cached axios response
  const payload = cachedResponse?.data;

  // Replaces only the matching row and keeps every other row as it was
  const replaceMatchingRow = (rows) =>
    rows.map((row) =>
      row.id === updatedCategory.id ? { ...row, ...updatedCategory } : row,
    );

  // Plain array response: update the matching row directly
  if (Array.isArray(payload)) {
    return { ...cachedResponse, data: replaceMatchingRow(payload) };
  }

  // Paginated response: update the matching row inside results
  if (Array.isArray(payload?.results)) {
    return {
      ...cachedResponse,
      data: { ...payload, results: replaceMatchingRow(payload.results) },
    };
  }

  // Unknown shape: leave the cache entry exactly as it was
  return cachedResponse;
};

/**
 * Renders a single category's thumbnail cell in the table.
 * Falls back to a placeholder icon when the category has no image, or
 * when the configured image URL fails to load in the browser. The
 * fallback state has to live per row, which is why this is a small
 * component rather than an inline render function.
 */
const CategoryImageCell = ({ category }) => {
  // Becomes true when the browser could not load the image URL
  const [imageFailed, setImageFailed] = useState(false);
  // A real image is shown only when a URL exists and it has not failed
  const hasImage = !!category.image && !imageFailed;

  // Real image branch
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

  // Placeholder branch
  return (
    <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0 ring-1 ring-black/5">
      {/* Same 28px size as the real-image branch above, so the placeholder icon
          box never exceeds the fixed row height either */}
      <AiOutlinePicture className="w-4 h-4" />
    </div>
  );
};

const CategoryManagement = () => {
  // Gives access to the shared query cache for invalidation and patching
  const queryClient = useQueryClient();

  // Add/Edit form modal state. `activeCategory` being null means the
  // form renders in create mode; a real category object means edit mode.
  const [activeCategory, setActiveCategory] = useState(null);
  // Whether the Add/Edit modal is currently visible
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Incremented every time the modal opens, and passed to
  // CategoryFormPanel as its React `key`. This forces the form to
  // remount with fresh internal state each time it opens, instead of
  // carrying over values left behind from a previous session.
  const [formSessionId, setFormSessionId] = useState(0);

  // Every filter the admin can set above the table
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    ordering: "name",
  });

  // Waits 400ms after the admin stops typing before actually filtering —
  // avoids firing a new network request on every single keystroke, same
  // pattern used on Product/Discount/Audit Log Management.
  const debouncedSearch = useDebounce(filters.search, 400);

  // The page of results currently shown
  const [currentPage, setCurrentPage] = useState(1);
  // pageSize — how many categories are shown per page, sent to the
  // backend as `page_size` alongside `page` on every request.
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    // Store the newly chosen page size
    setPageSize(size);
    // Return to the first page of the re-sized result set
    setCurrentPage(1);
  };

  // Single-category deletion flow, triggered from a row's delete icon.
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  // True while a delete request is running
  const [isDeleting, setIsDeleting] = useState(false);

  // Id of the category whose Active / Inactive switch is waiting for the
  // server, so only that one switch is disabled while the request runs.
  const [togglingCategoryId, setTogglingCategoryId] = useState(null);

  // Bulk selection flow. `selectedIds` holds the ids of every category
  // currently checked in the table, driven by DataTable's built-in
  // selection support. This operates independently of the single-row
  // delete flow above — both can be used interchangeably without
  // interfering with each other.
  const [selectedIds, setSelectedIds] = useState([]);
  // Whether the bulk delete confirmation dialog is open
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
  // The complete category list as a plain array
  const allCategories = extractListData(allCategoriesResponse);

  // Sum of the product counts of every category, shown on a stat card
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
    // Every filter is part of the key so each combination is cached apart
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
    // Sends only the filters that actually have a value
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
    // Results stay fresh for 30 seconds before a background refetch
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });

  // The rows for the current page of the table
  const tableCategories = extractListData(categoriesResponse);
  // Total number of matching categories across every page
  const totalCount = categoriesResponse?.data?.count ?? tableCategories.length;
  // Total number of pages, never lower than one
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // If the backend rejects the request (for example an invalid date
  // range), show the reason it gives instead of only the generic table
  // error.
  useEffect(() => {
    if (!listError?.response) return;
    // Read the backend's explanation, when there is one
    const message = getApiErrorMessage(listError, "");
    // Surface it to the admin as a toast
    if (message) showError(message);
  }, [listError]);

  // --------------------------------------------------
  // Filter helpers
  // --------------------------------------------------
  // True when the admin has narrowed the list by search or date range
  const hasActiveFilters =
    !!filters.search || !!filters.startDate || !!filters.endDate;

  // Updates one filter and returns to the first page of the new result set
  const handleFilterChange = (key, value) => {
    // Merge the single changed value into the existing filters
    setFilters((prev) => ({ ...prev, [key]: value }));
    // A different filter means the old page number may not exist any more
    setCurrentPage(1);
  };

  // Restores every filter to its default value
  const handleClearFilters = () => {
    // Reset all four filter fields
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
      ordering: "name",
    });
    // Start again from the first page
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // EXPORT — type=categories. The backend builds and returns
  // the CSV file directly for the currently applied filters, so this
  // is one request instead of looping every page of results and
  // building the file in the browser.
  // --------------------------------------------------
  const handleExport = async () => {
    // Request the CSV with the same filters the table is using
    const { success, message } = await downloadExportCsv(
      exportReport,
      {
        type: "categories",
        search: debouncedSearch || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        ordering: filters.ordering,
      },
      "categories",
    );

    // Report the outcome to the admin
    if (success) {
      showSuccess("Categories exported.");
    } else {
      showError(message || "Failed to export categories. Please try again.");
    }
  };

  // --------------------------------------------------
  // ACTIVE / INACTIVE SWITCH — PATCH with only { is_active }.
  // Inactive categories stay visible here, but customers and guests no
  // longer receive them from the category list.
  // --------------------------------------------------
  const toggleActiveMutation = useMutation({
    // Sends the new status for one category
    mutationFn: ({ id, isActive }) => setCategoryActive(id, isActive),
    // Remember which row is waiting so only its switch is disabled
    onMutate: ({ id }) => setTogglingCategoryId(id),
    // The response is the full updated category
    onSuccess: (response) => {
      // The updated category exactly as the backend now stores it
      const updatedCategory = response?.data;
      // Without a usable body there is nothing to merge into the cache
      if (!updatedCategory) return;

      // Refresh the matching row in every cached category list straight
      // from the response, so the switch reflects the saved state at once
      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.CATEGORIES },
        (cachedResponse) =>
          cachedResponse
            ? mergeUpdatedCategory(cachedResponse, updatedCategory)
            : cachedResponse,
      );
      // Then refetch so every list also reflects any server-side effects
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });

      // Confirm the new status to the admin
      showSuccess(
        `"${updatedCategory.name}" is now ${
          updatedCategory.is_active ? "active" : "inactive"
        }.`,
      );
    },
    // Show the backend's own explanation when the switch failed
    onError: (error) => {
      showError(
        getApiErrorMessage(error, "Failed to update the category status."),
      );
    },
    // Re-enable the switch whether the request worked or not
    onSettled: () => setTogglingCategoryId(null),
  });

  // Flips a category between Active and Inactive
  const handleToggleActive = (category) => {
    // A missing flag is treated as active, matching how the row is drawn
    const isCurrentlyActive = category.is_active !== false;
    // Request the opposite status
    toggleActiveMutation.mutate({
      id: category.id,
      isActive: !isCurrentlyActive,
    });
  };

  // --------------------------------------------------
  // Table column configuration
  // --------------------------------------------------
  const columns = [
    {
      // Thumbnail of the category image
      key: "image",
      label: "Image",
      render: (row) => <CategoryImageCell category={row} />,
    },
    {
      // Category name
      key: "name",
      label: "Name",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] font-medium text-gray-900">
          {row.name}
        </span>
      ),
    },
    {
      // Number of active products assigned to the category
      key: "product_count",
      label: "Products Count",
      render: (row) => {
        // Missing or invalid counts are shown as zero
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
      // Active / Inactive switch with a text badge next to it
      key: "is_active",
      label: "Status",
      render: (row) => {
        // A missing flag is treated as active
        const isActive = row.is_active !== false;
        return (
          <div className="flex items-center gap-2">
            {/* Switch that sends the quick status change for this row */}
            <Toggle
              id={`category-active-${row.id}`}
              checked={isActive}
              onChange={() => handleToggleActive(row)}
              disabled={togglingCategoryId === row.id}
            />
            {/* Text label so the state is readable without the switch */}
            <Badge
              label={isActive ? "Active" : "Inactive"}
              variant={isActive ? "success" : "gray"}
              size="sm"
              rounded
            />
          </div>
        );
      },
    },
    {
      // Creation date of the category
      key: "created_at",
      label: "Created Date",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      // Edit and delete buttons for the row
      key: "actions",
      skeleton: "icons", // loading placeholder shape (see DataTable)
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* Opens the edit form for this category */}
          <button
            onClick={() => handleEditClick(row)}
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
            aria-label={`Edit ${row.name}`}
          >
            <AiOutlineEdit className="w-4 h-4" />
          </button>

          {/* Opens the delete confirmation for this category */}
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
    // Lock the confirmation dialog while the request runs
    setIsDeleting(true);
    try {
      // Ask the backend to delete the chosen category
      await deleteCategory(categoryToDelete.id);
      // Confirm the deletion to the admin
      showSuccess(`"${categoryToDelete.name}" has been deleted.`);
      // Refresh every category list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
      // Close the confirmation dialog
      setCategoryToDelete(null);
    } catch (error) {
      // Show the backend's message, with a generic fallback
      showError(getApiErrorMessage(error, "Failed to delete category."));
    } finally {
      // Unlock the dialog again
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
  // Total products affected by the bulk delete, shown in the warning
  const selectedProductCount = selectedCategories.reduce(
    (sum, c) => sum + (Number(c.product_count) || 0),
    0,
  );

  // Deletes every selected category
  const handleBulkDelete = async () => {
    // Lock the confirmation dialog while the requests run
    setIsDeleting(true);
    try {
      // Fire one delete request per selected category and wait for all
      await Promise.all(selectedIds.map((id) => deleteCategory(id)));
      // Confirm how many categories were removed
      showSuccess(
        `${selectedIds.length} categor${selectedIds.length === 1 ? "y" : "ies"} deleted.`,
      );
      // Refresh every category list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
      // Clear the checked rows
      setSelectedIds([]);
      // Close the confirmation dialog
      setConfirmBulkDeleteOpen(false);
    } catch (error) {
      // Show the backend's message, with a generic fallback
      showError(getApiErrorMessage(error, "Failed to delete categories."));
    } finally {
      // Unlock the dialog again
      setIsDeleting(false);
    }
  };

  // Opens the form in edit mode for the chosen category
  const handleEditClick = (category) => {
    // Remember which category is being edited
    setActiveCategory(category);
    // Force the form to remount with fresh state
    setFormSessionId((id) => id + 1);
    // Show the modal
    setIsFormOpen(true);
  };

  // Opens the form in create mode
  const handleAddClick = () => {
    // No active category means create mode
    setActiveCategory(null);
    // Force the form to remount with fresh state
    setFormSessionId((id) => id + 1);
    // Show the modal
    setIsFormOpen(true);
  };

  // Hides the form and forgets which category was being edited
  const handleFormClose = () => {
    // Hide the modal
    setIsFormOpen(false);
    // Forget the edited category
    setActiveCategory(null);
  };

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // is kept tight so the page matches the rhythm used on Product
    // Management, instead of leaving large empty bands between sections.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Page title with the "Add Category" action */}
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

      {/* Summary cards: total categories and total categorized products */}
      <CategoryStatsCards
        totalCategories={allCategories.length}
        totalCategorizedProducts={totalCategorizedProducts}
        isLoadingCounts={isLoadingAllCategories}
      />

      {/* Search, date range, sort and export toolbar */}
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
          {/* Number of rows currently checked */}
          <span className="text-xs font-medium text-gray-700">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          {/* Opens the bulk delete confirmation */}
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

      {/* Add / Edit category modal, remounted on every open through its key */}
      <CategoryFormPanel
        key={formSessionId}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        activeCategory={activeCategory}
      />

      {/* Confirmation dialog for deleting one category */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category?"
        message={
          categoryToDelete
            ? (() => {
                // Number of products that currently belong to the category
                const count = Number(categoryToDelete.product_count) || 0;
                // Sentence explaining what happens to those products
                const productLine =
                  count > 0
                    ? `${count} product${count === 1 ? "" : "s"} currently in this category will remain fully active and untouched — they'll still show up in Search, the Shop/All Products page, and via direct links. They just won't be filterable under "${categoryToDelete.name}" anymore.`
                    : `This category currently has no products assigned to it.`;

                // Full warning shown in the dialog body
                return `"${categoryToDelete.name}" will be permanently removed from the storefront and this admin table. ${productLine} This action cannot be undone from here.`;
              })()
            : ""
        }
        confirmLabel="Delete Category"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Confirmation dialog for deleting every checked category */}
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
