import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  DateRangeFilterChip,
  RangeFilterChip,
  OptionRow,
} from "../shared/list-toolbar";

// Payment status values the backend accepts. An empty key means "all
// statuses", which is sent by omitting the parameter entirely.
const STATUS_OPTIONS = [
  { key: "", label: "All Statuses" },
  { key: "under_review", label: "Pending Review" },
  { key: "paid", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "refunded", label: "Refunded" },
];

// Duplicate-warning filter. An empty key shows every proof, whether or not
// it was flagged.
const DUPLICATE_OPTIONS = [
  { key: "", label: "All Proofs" },
  { key: "true", label: "Possible Duplicates" },
  { key: "false", label: "Not Flagged" },
];

const SORT_OPTIONS = [
  { value: "-submitted_at", label: "Newest First" },
  { value: "submitted_at", label: "Oldest First" },
  { value: "-amount", label: "Amount: High to Low" },
  { value: "amount", label: "Amount: Low to High" },
  { value: "customer_name", label: "Customer Name: A-Z" },
  { value: "-customer_name", label: "Customer Name: Z-A" },
];

const DEFAULT_ORDERING = "-submitted_at";

/**
 * QrPaymentFilters
 *
 * The toolbar above the QR payments table: a search box, a "Filters"
 * toggle, an "Export" button and, once "Filters" is opened, the Status,
 * Submitted date, Amount, Duplicate and Sort chips.
 *
 * Built from the same shared list-toolbar pieces as every other admin list
 * page. All filtering happens on the server; this component only collects
 * the values.
 *
 * Props:
 * - search / onSearchChange:       Main search box (order number, customer
 *                                  name, phone or email, transaction ID).
 * - status / onStatusChange:       Selected payment status key ("" = all).
 * - startDate / endDate:           Submitted-date range ("yyyy-mm-dd").
 * - onStartDateChange / onEndDateChange: (value) => void.
 * - minAmount / maxAmount:         Order total bounds as digit strings.
 * - onMinAmountChange / onMaxAmountChange: (value) => void.
 * - duplicate / onDuplicateChange: "true" | "false" | "" duplicate filter.
 * - sortBy / onSortChange:         Current `ordering` value.
 * - onClearFilters:                () => void, resets every field.
 * - hasActiveFilters:              Whether the "Clear all" link is shown.
 * - onExport / isExporting:        Export button handler and loading state.
 */
const QrPaymentFilters = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
  duplicate,
  onDuplicateChange,
  sortBy,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  // Counts every filter that narrows the result set, plus a non-default
  // sort, so the badge reflects everything the admin has changed.
  const activeFilterCount = [
    status,
    startDate || endDate,
    minAmount || maxAmount,
    duplicate,
    sortBy && sortBy !== DEFAULT_ORDERING,
  ].filter(Boolean).length;

  const selectedStatus = STATUS_OPTIONS.find((opt) => opt.key === status);
  const selectedDuplicate = DUPLICATE_OPTIONS.find(
    (opt) => opt.key === duplicate,
  );
  const selectedSort = SORT_OPTIONS.find((opt) => opt.value === sortBy);

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by order, customer, phone or transaction ID..."
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
            isActive={!!status}
            onClear={() => onStatusChange("")}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {STATUS_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.key || "all"}
                    label={opt.label}
                    isSelected={status === opt.key}
                    onClick={() => {
                      onStatusChange(opt.key);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <DateRangeFilterChip
            label="Date"
            heading="Submitted Date"
            startValue={startDate}
            endValue={endDate}
            onStartChange={onStartDateChange}
            onEndChange={onEndDateChange}
            onClear={() => {
              onStartDateChange("");
              onEndDateChange("");
            }}
          />

          <RangeFilterChip
            label="Amount"
            heading="Order Total"
            minValue={minAmount}
            maxValue={maxAmount}
            onMinChange={onMinAmountChange}
            onMaxChange={onMaxAmountChange}
            onClear={() => {
              onMinAmountChange("");
              onMaxAmountChange("");
            }}
          />

          <FilterChip
            label="Duplicate"
            valueLabel={
              selectedDuplicate ? selectedDuplicate.label : "select option"
            }
            isActive={!!duplicate}
            onClear={() => onDuplicateChange("")}
            panelClassName="w-52 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {DUPLICATE_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.key || "all"}
                    label={opt.label}
                    isSelected={duplicate === opt.key}
                    onClick={() => {
                      onDuplicateChange(opt.key);
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

export default QrPaymentFilters;
