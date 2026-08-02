import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlinePlus, AiOutlineTag } from "react-icons/ai";

import { getCategories, deleteCategory } from "../../api/categories.api";
// NOTE: restoreCategory is no longer imported — that function was
// removed from categories.api.js entirely. Deletion now uses the
// backend's internal is_delete flag, which has no restore path (see
// categories.api.js and CategoryRow.jsx for the full explanation).
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import PageHeader from "../../components/shared/PageHeader";
import CategoryStatsCards from "../../components/admin-categories/CategoryStatsCards";
import CategoryFilters from "../../components/admin-categories/CategoryFilters";
import CategoryFormPanel from "../../components/admin-categories/CategoryFormPanel";
import CategoryRow from "../../components/admin-categories/CategoryRow";

// --------------------------------------------------
// SORT FUNCTIONS — one per CategoryFilters "Sort By" option. Kept here
// (rather than inside CategoryFilters) since this is where the actual
// array of categories being sorted lives.
// --------------------------------------------------
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

const CategoryManagement = () => {
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState(null);
  // null = "Add" mode, a category object = "Edit" mode — this single
  // piece of state drives which mode CategoryFormPanel renders in

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Whether the Add/Edit MODAL is currently open — separate from
  // activeCategory so clicking "+ Add Category" can open a blank form
  // without needing a fake placeholder category object. Renamed from
  // "isAdding" now that the panel is a real Modal (isOpen/onClose),
  // matching the naming used by DiscountFormModal/DiscountManagement.

  const [formSessionId, setFormSessionId] = useState(0);
  // Bumped every time the modal is opened (Add OR Edit) and passed to
  // CategoryFormPanel as its "key" below. React treats a key change as
  // "this is a brand new component instance", so CategoryFormPanel's
  // internal useState/useForm values always start fresh instead of
  // carrying over whatever was left in the form the last time it was
  // open — without needing a setState-inside-useEffect reset, which
  // this project's React Compiler lint rule flags as a hard error.

  const [filters, setFilters] = useState({
    search: "", // Matched against category.name
    startDate: "", // Matched against category.created_at (inclusive lower bound)
    endDate: "", // Matched against category.created_at (inclusive upper bound)
    ordering: "-created_at", // Default sort — newest categories first
    // NOTE: the "status" field that used to live here (Active/Inactive,
    // matched against category.is_active) has been removed. Deleted
    // categories no longer come back from the API at all, so there is
    // nothing left for a status filter to distinguish between — every
    // category in this list is, by definition, a live one.
  });

  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // NOTE: the "restoringId" state that used to track which row's
  // Restore button was mid-request has been removed along with the
  // Restore feature itself — see the Delete section below.

  // --------------------------------------------------
  // CATEGORIES LIST — API 21
  // --------------------------------------------------
  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5,
  });

  const allCategories = extractListData(categoriesResponse);
  // Defensive normalizer — same pattern used throughout this codebase
  // for endpoints that may drift between flat-array and paginated shapes

  // Real total across the whole catalog — every category's own
  // product_count field, summed once here. This is the number the KPI
  // card shows; it costs nothing extra since allCategories is already
  // fetched for the table below.
  const totalCategorizedProducts = allCategories.reduce(
    (sum, category) => sum + (Number(category.product_count) || 0),
    0,
  );

  // --------------------------------------------------
  // FILTER STATE HELPERS
  // --------------------------------------------------
  const hasActiveFilters =
    !!filters.search || !!filters.startDate || !!filters.endDate;
  // Sorting alone doesn't count as an "active filter" — it doesn't
  // narrow the list, so it's excluded from both this flag and the
  // live count shown inside CategoryFilters. "status" was removed
  // from this check along with the dropdown itself.

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
      ordering: "-created_at",
    });
  };

  // --------------------------------------------------
  // CLIENT-SIDE FILTER + SORT
  // --------------------------------------------------
  // Client-side is deliberately correct here for the same reason the
  // original code used client-side search: categories are a small,
  // fixed reference list, and API 21 itself is intentionally NOT
  // paginated server-side (see its own doc note), so there's no
  // server-side query-param filtering to lean on in the first place.
  const filteredCategories = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    const filtered = allCategories.filter((category) => {
      const matchesSearch =
        !term || category.name?.toLowerCase().includes(term);

      // created_at as a real Date object — reused for both bounds below
      const createdAt = category.created_at
        ? new Date(category.created_at)
        : null;

      const matchesStartDate =
        !filters.startDate ||
        (createdAt && createdAt >= new Date(filters.startDate));
      // "Created From" — keeps only categories created ON or AFTER this date

      const matchesEndDate =
        !filters.endDate ||
        (createdAt && createdAt <= new Date(`${filters.endDate}T23:59:59`));
      // "Created To" — the "T23:59:59" suffix makes this INCLUSIVE of the
      // whole end day, instead of cutting off at midnight of that day

      // NOTE: the is_active-based status match that used to live here
      // has been removed — see the "filters" state comment above for why.

      return matchesSearch && matchesStartDate && matchesEndDate;
    });

    const sortFn = SORTERS[filters.ordering] || SORTERS["-created_at"];
    return [...filtered].sort(sortFn);
  }, [allCategories, filters]);

  // --------------------------------------------------
  // DELETE CATEGORY — API 25
  // --------------------------------------------------
  // UPDATED BEHAVIOR: the backend performs a soft delete internally
  // (sets an is_delete flag on the row so product references and
  // history stay intact), but that flag is never exposed to the
  // frontend and this category is filtered out of every list response
  // from this point on — customer-facing AND this admin table alike.
  // There is no "Inactive" state left to show here and no restore
  // endpoint for categories, so from the UI's point of view this is a
  // final action once confirmed — the confirmation copy below reflects
  // that honestly instead of promising a restore that no longer exists.
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

  // NOTE: handleRestoreClick() has been removed entirely along with
  // the restoreCategory() API call and the Restore button in
  // CategoryRow.jsx — there is no backend endpoint left for it to call.

  const handleEditClick = (category) => {
    setActiveCategory(category);
    // Passing the real category object tells CategoryFormPanel to
    // render in "edit" mode, pre-filled with this category's values
    setFormSessionId((id) => id + 1);
    setIsFormOpen(true);
  };

  const handleAddClick = () => {
    setActiveCategory(null);
    // null tells CategoryFormPanel to render in "create" mode with
    // blank default values
    setFormSessionId((id) => id + 1);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setActiveCategory(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header — shared component so this page matches every
          other admin screen's title styling (gradient icon badge +
          bold title + right-aligned action button). */}
      <PageHeader
        icon={<AiOutlineTag />}
        title="Category Management"
        actions={
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={handleAddClick}
          >
            Add Category
          </Button>
        }
      />

      {/* Compact KPI row — same size/shape as the Products page cards */}
      <CategoryStatsCards
        totalCategories={allCategories.length}
        totalCategorizedProducts={totalCategorizedProducts}
        isLoadingCounts={isLoading}
      />

      {/* Filters — search by name + created-date range + sort. The
          Status (Active/Inactive) dropdown that used to sit here is
          gone — see CategoryFilters.jsx for why. */}
      <CategoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Categories table — elevated card (soft resting shadow that
          lifts further on hover), matching the polish of this
          project's other "raised" surfaces like StatsCard and
          ProductImagesSection, instead of a flat 1px-bordered box. */}
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {/* Image column, shown before the name */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Products Count
                  </th>
                  {/* NOTE: the "Status" column (Active/Inactive) that
                      used to sit here has been removed — see
                      CategoryRow.jsx for the full explanation. */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={handleEditClick}
                    onDelete={setCategoryToDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal — same component handles both modes, popup
          style instead of the old inline panel that used to push the
          table down the page */}
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
                // Real count straight off the category object (same
                // product_count field the table's badge already shows),
                // so the admin sees the exact impact before confirming —
                // not a vague "may affect products" warning.
                const count = Number(categoryToDelete.product_count) || 0;
                const productLine =
                  count > 0
                    ? `${count} product${count === 1 ? "" : "s"} currently in this category will remain fully active and untouched — they'll still show up in Search, the Shop/All Products page, and via direct links. They just won't be filterable under "${categoryToDelete.name}" anymore.`
                    : `This category currently has no products assigned to it.`;

                // Copy updated to be honest about the new backend
                // behavior: the category is not permanently erased
                // from the database (so past product references stay
                // safe), but there is no way to bring it back into
                // this admin table or the storefront from the UI once
                // this action is confirmed.
                return `"${categoryToDelete.name}" will be permanently removed from the storefront and this admin table. ${productLine} This action cannot be undone from here.`;
              })()
            : ""
        }
        confirmLabel="Delete Category"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CategoryManagement;
