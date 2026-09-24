import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  DateRangeFilterChip,
  TextFilterChip,
  OptionRow,
} from "../shared/list-toolbar";
import { getCategories } from "../../api/categories.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "-total_amount", label: "Amount: High to Low" },
  { value: "total_amount", label: "Amount: Low to High" },
  { value: "customer_name", label: "Customer Name: A-Z" }, // Sorts orders by customer name ascending; sent as ordering=customer_name to both the filter and export endpoints
  { value: "-customer_name", label: "Customer Name: Z-A" }, // Sorts orders by customer name descending; sent as ordering=-customer_name to both the filter and export endpoints
];

const DEFAULT_ORDERING = "-created_at";

/**
 * OrderFilters
 *
 * The toolbar sitting above the orders table: search box, a "Filters"
 * toggle, an "Export" button, and — once "Filters" is opened — the
 * Status, Date Range, Product, Category, and Sort dropdown chips.
 *
 * Built on the same shared list-toolbar pieces used by every other
 * admin list page. The Order Status filter lives in its own dropdown
 * chip here (rather than an always-visible pill row) so it matches the
 * same pattern as every other dropdown filter in the admin panel.
 *
 * Props:
 * - statusTabs:       Array of { key, label } for the Status dropdown
 *                     (key: "" is the "All Statuses" option).
 * - activeStatus:     Currently selected status key.
 * - onStatusChange:   (key) => void.
 * - search:           Main search box value (order number / customer name —
 *                     this endpoint does not match phone number).
 * - onSearchChange:   (value) => void.
 * - productFilter:    Dedicated "Product" filter value (NEW, Sep 2026, API 62).
 * - onProductFilterChange: (value) => void.
 * - categoryFilter:   Dedicated "Category" filter value (NEW, Sep 2026, API 62).
 * - onCategoryFilterChange: (value) => void.
 * - startDate / endDate: Date range values ("yyyy-mm-dd" strings).
 * - onStartDateChange / onEndDateChange: (value) => void.
 * - sortBy:           Current `ordering` value.
 * - onSortChange:     (value) => void.
 * - onClearFilters:   () => void — resets every field to its default.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 * - onExport:         Handler for the Export button.
 * - isExporting:      Loading state for the Export button.
 */
const OrderFilters = ({
  statusTabs,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  productFilter,
  onProductFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  sortBy,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  // Category options for the dropdown filter below — same categories
  // list already shown in the admin Category Management page, cached
  // under the same query key so no extra request is made if that page
  // was visited earlier in this session.
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(undefined, signal),
    staleTime: 1000 * 60 * 5,
  });
  const allCategories = extractListData(categoriesResponse);

  // Sort is intentionally excluded — "Newest First" is the default
  // view, not a narrowing filter.
  const activeFilterCount = [
    activeStatus,
    startDate || endDate,
    productFilter,
    categoryFilter,
    sortBy && sortBy !== DEFAULT_ORDERING,
  ].filter(Boolean).length;

  const selectedSort = SORT_OPTIONS.find((opt) => opt.value === sortBy);
  const selectedStatus = statusTabs.find((tab) => tab.key === activeStatus);

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by order number or customer name..."
        activeFilterCount={activeFilterCount}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={() => setAreFiltersOpen((prev) => !prev)}
        onExport={onExport}
        isExporting={isExporting}
      />

      {areFiltersOpen && (
        <FilterChipsRow
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        >
          <FilterChip
            label="Status"
            valueLabel={selectedStatus ? selectedStatus.label : "select status"}
            isActive={!!activeStatus}
            onClear={() => onStatusChange("")}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {statusTabs.map((tab) => (
                  <OptionRow
                    key={tab.key || "all"}
                    label={tab.label}
                    isSelected={activeStatus === tab.key}
                    onClick={() => {
                      onStatusChange(tab.key);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <DateRangeFilterChip
            label="Date"
            heading="Order Date"
            startValue={startDate}
            endValue={endDate}
            onStartChange={onStartDateChange}
            onEndChange={onEndDateChange}
            onClear={() => {
              onStartDateChange("");
              onEndDateChange("");
            }}
          />

          {/* NEW (Sep 2026, API 62 backend fix) — the backend now
              accepts these two as standalone filters on the filter
              endpoint, combinable with everything else here. Both
              match partially and case-insensitively against any line
              item's product/category name inside an order. */}
          <TextFilterChip
            label="Product"
            heading="Product Name"
            placeholder="e.g. Wireless Mouse"
            value={productFilter}
            onChange={onProductFilterChange}
            onClear={() => onProductFilterChange("")}
          />

          <FilterChip
            label="Category"
            valueLabel={categoryFilter || "select category"}
            isActive={!!categoryFilter}
            onClear={() => onCategoryFilterChange("")}
            panelClassName="w-52 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Categories"
                  isSelected={!categoryFilter}
                  onClick={() => {
                    onCategoryFilterChange("");
                    close();
                  }}
                />
                {allCategories.map((category) => (
                  <OptionRow
                    key={category.id}
                    label={category.name}
                    isSelected={categoryFilter === category.name}
                    onClick={() => {
                      onCategoryFilterChange(category.name);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Sort"
            valueLabel={selectedSort ? selectedSort.label : "select sort"}
            isActive={sortBy !== DEFAULT_ORDERING}
            onClear={() => onSortChange(DEFAULT_ORDERING)}
            panelClassName="w-52 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {SORT_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={sortBy === opt.value}
                    onClick={() => {
                      onSortChange(opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>
        </FilterChipsRow>
      )}
    </div>
  );
};

export default OrderFilters;
