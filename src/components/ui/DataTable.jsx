// Reusable DataTable component — main table component for the admin panel
// Search, filter, sort, pagination, and bulk select are all built-in
// Only needs a columns config array and a data array from outside
// Used for products, orders, customers, discounts — everywhere
// Fully responsive — horizontally scrollable on mobile

import { useState } from "react";
// useState — manages local state for search input, sort config, and selected row ids

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

import Pagination from "./Pagination";
// Pagination component — renders page number buttons and results count below the table

import { SkeletonTable } from "./Skeleton";
// SkeletonTable — renders animated placeholder rows while data is loading

import EmptyState from "./EmptyState";
// EmptyState — renders the "No Results Found" illustration when data array is empty

import Checkbox from "./Checkbox";
// Checkbox component — used for both the "select all" header checkbox and per-row checkboxes

const DataTable = ({
  // --- Data and structure ---
  columns = [], // Array of column config objects — each has { key, label, sortable, render, className }
  data = [], // Array of row data objects — each object maps to one table row
  keyField = "id", // The field name used as a unique key for each row — defaults to "id"

  // --- Search ---
  searchable = false, // When true, renders a search input above the table
  searchPlaceholder = "Search...", // Placeholder text inside the search input

  // --- Sorting ---
  sortable = false, // When true, column headers with sortable:true become clickable sort triggers

  // --- Pagination ---
  currentPage = 1, // Currently active page number — passed through to Pagination component
  totalPages = 1, // Total number of pages — passed through to Pagination component
  totalResults = 0, // Total record count across all pages — shown in Pagination summary
  onPageChange, // Handler called with new page number when user clicks a page button

  // --- Bulk selection ---
  selectable = false, // When true, renders checkboxes on every row and a "select all" header checkbox
  onSelectionChange, // Called with the updated array of selected row ids whenever selection changes

  // --- States ---
  isLoading = false, // When true, replaces the table body with SkeletonTable placeholder rows
  error = false, // When true, replaces the table body with an error message and retry button
  onRetry, // Called when the user clicks "Try again" in the error state

  // --- Callbacks ---
  onSearch, // Called with the current search string whenever the search input changes
  onSort, // Called with { field, direction } whenever a sortable column header is clicked

  className = "", // Extra Tailwind classes applied to the outermost wrapper div
}) => {
  // Local state for the search input value — kept in sync with the input field
  const [searchValue, setSearchValue] = useState("");

  // Local state for the active sort — tracks which column is sorted and in which direction
  const [sortConfig, setSortConfig] = useState({
    field: "", // Key of the currently sorted column — empty string means no active sort
    direction: "asc", // "asc" or "desc" — defaults to ascending
  });

  // Local state for bulk selection — array of keyField values for all selected rows
  const [selectedIds, setSelectedIds] = useState([]);

  // Handles search input changes — updates local state and notifies parent
  const handleSearch = (e) => {
    setSearchValue(e.target.value);
    // Updates the controlled input value in local state
    onSearch?.(e.target.value);
    // Notifies parent with the new search string — parent re-fetches or filters data
  };

  // Handles column header clicks for sorting — toggles direction or sets a new sort field
  const handleSort = (field) => {
    if (!sortable) return;
    // Guard — if sorting is disabled globally, do nothing regardless of which column was clicked

    const direction =
      sortConfig.field === field && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    // Same column clicked again — flip direction from asc to desc
    // Different column clicked — reset direction to asc

    setSortConfig({ field, direction });
    // Updates local sort state so the active column's arrows re-render correctly

    onSort?.({ field, direction });
    // Notifies parent with the new sort config — parent re-fetches or re-sorts data
  };

  // Handles toggling a single row's selected state
  const handleRowSelect = (id) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((sid) => sid !== id)
      : // Row was already selected — remove it from the selected ids array
        [...selectedIds, id];
    // Row was not selected — add it to the selected ids array

    setSelectedIds(newSelected);
    // Updates local selection state so checkboxes and row highlights re-render

    onSelectionChange?.(newSelected);
    // Notifies parent with the updated selected ids array for bulk action handling
  };

  // Handles the "select all" header checkbox — toggles between all selected and none selected
  const handleSelectAll = () => {
    const allSelected = selectedIds.length === data.length;
    // True when every row in the current page data is already in selectedIds

    const newSelected = allSelected
      ? []
      : // All were selected — clear the selection entirely
        data.map((row) => row[keyField]);
    // Not all were selected — select every row on the current page

    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected);
    // Both local state and parent are updated together
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Outer wrapper stacks the search bar, table, and pagination with consistent spacing */}

      {/* Search bar — only rendered when searchable prop is true */}
      {searchable && (
        <div className="flex items-center gap-3">
          {/* flex + items-center: aligns search input and selection count on the same baseline */}

          {/* Search input with absolute-positioned icon inside */}
          <div className="relative flex-1 max-w-sm">
            {/* relative: allows the search icon to be positioned inside the input */}
            {/* flex-1: input grows to fill available space */}
            {/* max-w-sm: caps the search bar width so it doesn't stretch across the full toolbar */}

            {/* Search icon — absolutely positioned inside the input on the left */}
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {/* left-3: 12px from the left edge; top-1/2 -translate-y-1/2: vertically centered */}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  // Magnifying glass path — standard search icon
                />
              </svg>
            </span>

            {/* Controlled search input */}
            <input
              type="text"
              value={searchValue}
              // Controlled by local searchValue state
              onChange={handleSearch}
              // Calls handleSearch on every keystroke
              placeholder={searchPlaceholder}
              className={cn(
                "w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white",
                // pl-9: left padding leaves space for the absolutely-positioned search icon
                // pr-4 py-2: standard right and vertical padding
                // text-sm rounded-lg border border-gray-200 bg-white: consistent with Input component
                "text-gray-900 placeholder:text-gray-400",
                // High contrast text with muted placeholder
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                // Custom emerald focus ring — consistent with Input component focus behavior
                "transition-all duration-150",
                // Smooth border and ring color transitions on focus
              )}
            />
          </div>

          {/* Selection count — only shown in selectable mode when at least one row is selected */}
          {selectable && selectedIds.length > 0 && (
            <p className="text-sm text-gray-500 shrink-0">
              <span className="font-medium text-primary">
                {selectedIds.length}
              </span>
              {/* Bold brand-colored count number stands out from the surrounding gray text */}{" "}
              selected
            </p>
          )}
        </div>
      )}

      {/* Table wrapper — enables horizontal scroll on mobile when table is wider than screen */}
      <div className="w-full overflow-x-auto rounded-xl border border-gray-100">
        {/* overflow-x-auto: allows the table to scroll horizontally on narrow viewports */}
        {/* rounded-xl + border: card-style container wrapping the entire table */}

        <table className="w-full text-sm">
          {/* w-full: table stretches to fill the scroll container */}
          {/* text-sm: base font size for all table content */}

          {/* Table header row */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {/* bg-gray-50: light gray header background distinguishes it from the white body */}
              {/* border-b border-gray-100: subtle bottom border separates header from first data row */}

              {/* Select all checkbox — only rendered in selectable mode */}
              {selectable && (
                <th className="w-10 px-4 py-3 text-left">
                  {/* w-10: narrow fixed column just wide enough for the checkbox */}
                  <Checkbox
                    checked={
                      selectedIds.length === data.length && data.length > 0
                    }
                    // Checked only when every row is selected AND there is at least one row
                    onChange={handleSelectAll}
                    // Triggers select all / deselect all on click
                  />
                </th>
              )}

              {/* Column header cells — one per column in the columns config */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  // key uses the column key — unique across the columns array
                  onClick={() => col.sortable && handleSort(col.key)}
                  // Only triggers sort when this specific column has sortable:true
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap",
                    // px-4 py-3: consistent header cell padding
                    // text-xs font-semibold text-gray-500: small, bold, muted header label style
                    // uppercase tracking-wider: all-caps with letter spacing — classic table header style
                    // whitespace-nowrap: prevents header labels from wrapping to a second line
                    col.sortable &&
                      "cursor-pointer hover:text-gray-700 select-none",
                    // cursor-pointer: hand cursor signals this header is clickable
                    // hover:text-gray-700: darkens label on hover to confirm interactivity
                    // select-none: prevents text selection when rapidly clicking to sort
                    col.className,
                    // Column-specific extra classes from the columns config object
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {/* flex + items-center: aligns the label text and sort arrows on the same baseline */}
                    {/* gap-1.5: small gap between label and sort indicator */}
                    {col.label}
                    {/* Renders the column header label text */}

                    {/* Sort arrows — only rendered when this column has sortable:true */}
                    {col.sortable && (
                      <span className="flex flex-col gap-0.5">
                        {/* flex-col: stacks up and down arrows vertically */}
                        {/* gap-0.5: tight spacing between the two arrows */}

                        {/* Up arrow — highlighted in brand color when this column is sorted ascending */}
                        <svg
                          className={cn(
                            "w-2.5 h-2.5",
                            // w-2.5 h-2.5: 10px — tiny arrow indicator that doesn't overpower the label
                            sortConfig.field === col.key &&
                              sortConfig.direction === "asc"
                              ? "text-primary" // Active ascending sort — brand color
                              : "text-gray-300", // Inactive — very muted gray
                          )}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 5l7 7H5z" />
                          {/* Solid upward triangle — represents ascending sort direction */}
                        </svg>

                        {/* Down arrow — highlighted when this column is sorted descending */}
                        <svg
                          className={cn(
                            "w-2.5 h-2.5",
                            sortConfig.field === col.key &&
                              sortConfig.direction === "desc"
                              ? "text-primary" // Active descending sort — brand color
                              : "text-gray-300", // Inactive — very muted gray
                          )}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 19l7-7H5z" />
                          {/* Solid downward triangle — represents descending sort direction */}
                        </svg>
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table body — renders one of four states: loading, error, empty, or data rows */}
          <tbody className="divide-y divide-gray-50 bg-white">
            {/* divide-y divide-gray-50: very subtle lines between rows — lighter than header border */}
            {/* bg-white: white body background contrasts with the gray header */}

            {isLoading ? (
              // Loading state — full-width skeleton placeholder replaces the data rows
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  {/* colSpan spans all data columns plus the optional checkbox column */}
                  <SkeletonTable rows={5} cols={columns.length} />
                  {/* 5 skeleton rows matching the number of real columns */}
                </td>
              </tr>
            ) : error ? (
              // Error state — shown when the data fetch failed
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="py-8 text-center">
                    {/* py-8: vertical breathing room around the error message */}
                    <p className="text-sm text-danger">Failed to load data.</p>
                    {/* text-danger: red text signals the failure clearly */}
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-2 text-sm text-primary hover:underline"
                        // mt-2: small gap between error text and retry link
                        // text-primary: brand color signals this is a clickable action
                        // hover:underline: underline on hover confirms it is interactive
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              // Empty state — shown when the fetch succeeded but returned zero records
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <EmptyState variant="noResults" />
                  {/* noResults variant: magnifying glass icon with "No Results Found" message */}
                </td>
              </tr>
            ) : (
              // Data rows — one <tr> per item in the data array
              data.map((row) => (
                <tr
                  key={row[keyField]}
                  // key uses the row's unique keyField value for stable React reconciliation
                  className={cn(
                    "hover:bg-gray-50 transition-colors duration-100",
                    // hover:bg-gray-50: subtle row highlight on hover for scannability
                    // transition-colors duration-100: fast smooth hover color change
                    selectedIds.includes(row[keyField]) && "bg-primary-50",
                    // Selected rows get a light emerald background to visually distinguish them
                  )}
                >
                  {/* Row checkbox — only rendered in selectable mode */}
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(row[keyField])}
                        // Checked when this row's id is in the selectedIds array
                        onChange={() => handleRowSelect(row[keyField])}
                        // Toggles this row's selection state on click
                      />
                    </td>
                  )}

                  {/* Data cells — one per column in the columns config */}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-gray-700 whitespace-nowrap",
                        // px-4 py-3: consistent cell padding matching header cells
                        // text-gray-700: dark readable text for cell content
                        // whitespace-nowrap: prevents cell content from wrapping to multiple lines
                        col.className,
                        // Column-specific extra classes for alignment or width overrides
                      )}
                    >
                      {
                        col.render
                          ? col.render(row)
                          : // Custom render function provided — called with the full row object.
                            // Every admin page's column config (ProductList, OrderManagement,
                            // DiscountManagement, CustomerManagement, ComplaintsManagement,
                            // ReturnsManagement) writes `render: (row) => ...` expecting the
                            // whole row, so this must match that contract.
                            (row[col.key] ?? "-")
                        // No render function — displays the raw value or a dash if null/undefined
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — only rendered when not loading and there is at least one data row */}
      {!isLoading && data.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalResults}
          onPageChange={onPageChange}
          // All pagination props passed straight through from DataTable's own props
        />
      )}
    </div>
  );
};

export default DataTable;
// Default export — imported anywhere as: import DataTable from "..."
