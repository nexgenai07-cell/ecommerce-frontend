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
  pageSize, // Currently selected rows-per-page value — forwarded to Pagination; the rows-per-page dropdown only renders when this and onPageSizeChange are both provided
  pageSizeOptions, // Selectable rows-per-page values — forwarded to Pagination
  onPageSizeChange, // Handler called with the new rows-per-page value when the user changes the dropdown

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
  onRowClick, // Optional — called with the full row object when a row is clicked anywhere
  // outside its interactive controls; lets a page open the same detail view/modal that
  // its row-level "eye" action opens, without requiring a click on the icon itself

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

      {/* Table wrapper — enables horizontal scroll on mobile when table is wider than screen.
          Also now hosts the pagination footer INSIDE this same card, instead of it floating
          as a separate box below — border-t on the footer strip is what visually divides them.
          flex flex-col flex-1: lets this card stretch to fill any extra height its parent
          gives it (e.g. two DataTables placed side by side in a grid, stretched to match
          each other's height) — harmless in the normal case where nothing stretches the
          parent, since flex-grow only has effect when there's actual extra space to fill. */}
      <div className="w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1">
        {/* rounded-xl + border + shadow-sm: single card boundary wrapping the header, rows,
            AND the pagination footer together, so the whole table reads as one unit */}

        <div className="w-full overflow-x-auto scrollbar-hide flex-1">
          {/* overflow-x-auto: allows the table to scroll horizontally on narrow viewports */}
          {/* scrollbar-hide: hides the native scrollbar, matching every other
              horizontally-scrollable element in the app (still fully scrollable,
              just no visible scrollbar track) */}
          {/* flex-1: grows to consume any extra vertical space in a stretched card,
              which pushes the pagination footer below down to the very bottom of the
              card instead of leaving it floating right under a short table */}

          <table className="w-full text-[11px] sm:text-xs">
            {/* w-full: table stretches to fill the scroll container */}
            {/* text-[11px] sm:text-xs: reduced from the previous text-xs/text-sm pairing —
                the cell content was reading too large relative to the compact row height,
                so both breakpoints are dropped one notch smaller */}

            {/* Table header row — solid brand-gradient background with white uppercase
                labels, replacing the old plain gray header for a more modern, on-theme look */}
            <thead>
              <tr className="bg-linear-to-r from-primary to-primary-dark">
                {/* bg-linear-to-r from-primary to-primary-dark: same gradient token already
                    used by the active pagination pill — keeps this consistent with the
                    rest of the project's brand language instead of introducing a new color */}

                {/* Select all checkbox — only rendered in selectable mode */}
                {selectable && (
                  <th className="w-9 px-3 py-2 text-left">
                    {/* w-9 px-3 py-2: narrower, shorter header cell than before — the main
                        source of the extra vertical height is trimmed here and on every
                        other header/row cell below */}
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
                      "px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap",
                      // px-3 py-2: tighter header cell padding than the old px-4 py-3
                      // text-[10px] sm:text-[11px] font-bold text-white: small, bold,
                      // high-contrast label against the gradient background
                      col.sortable &&
                        "cursor-pointer hover:text-white/80 select-none",
                      // cursor-pointer: hand cursor signals this header is clickable
                      // hover:text-white/80: subtle dim on hover confirms interactivity
                      // (swapped from hover:text-gray-700, which was invisible on dark bg)
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

                          {/* Up arrow — highlighted in white when this column is sorted ascending */}
                          <svg
                            className={cn(
                              "w-2.5 h-2.5",
                              // w-2.5 h-2.5: 10px — tiny arrow indicator that doesn't overpower the label
                              sortConfig.field === col.key &&
                                sortConfig.direction === "asc"
                                ? "text-white" // Active ascending sort — full white against the gradient
                                : "text-white/40", // Inactive — muted white, still readable on the dark header
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
                                ? "text-white" // Active descending sort — full white against the gradient
                                : "text-white/40", // Inactive — muted white, still readable on the dark header
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
            <tbody className="divide-y divide-gray-200 bg-white">
              {/* divide-y divide-gray-200: a clearly visible light-gray rule under every row —
                  bumped up from divide-gray-50, which was too faint to actually separate rows */}
              {/* bg-white: white body background contrasts with the gradient header */}

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
                      <p className="text-sm text-danger">
                        Failed to load data.
                      </p>
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
                data.map((row, rowIndex) => (
                  <tr
                    key={row[keyField]}
                    // key uses the row's unique keyField value for stable React reconciliation
                    onClick={() => onRowClick?.(row)}
                    // Fires the optional row-click handler with the full row object — lets a
                    // page open the same detail view its "eye" action opens by clicking
                    // anywhere on the row, not just the small icon
                    className={cn(
                      "hover:bg-primary-100 transition-colors duration-100",
                      // hover:bg-primary-100: stronger, more visible green hover tint —
                      // the previous hover:bg-primary-50/60 read as almost no color change
                      // transition-colors duration-100: fast smooth hover color change
                      rowIndex % 2 === 1 && "bg-gray-50/60",
                      // Subtle zebra striping on every other row — this, together with the
                      // shorter cell padding below, is what makes long tables easy to scan
                      // at a glance without counting rows, matching the reference design
                      selectedIds.includes(row[keyField]) && "bg-primary-50",
                      // Selected rows get a light emerald background to visually distinguish
                      // them — listed last so it wins over the zebra stripe via twMerge
                      onRowClick && "cursor-pointer",
                      // Hand cursor signals the whole row is clickable, only when a page
                      // actually supplies an onRowClick handler
                    )}
                  >
                    {/* Row checkbox — only rendered in selectable mode */}
                    {selectable && (
                      <td
                        className="w-9 px-3 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                        // Stops the click from bubbling up to the row's onRowClick handler,
                        // so ticking a row's checkbox selects it instead of also opening
                        // that row's detail view
                      >
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
                          "px-3 py-1.5 text-gray-700 whitespace-nowrap",
                          // px-3 py-1.5: noticeably shorter row height than the old px-4 py-3 —
                          // this is the main "choti choti lines" change, applied consistently
                          // to every admin table through this one shared component
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

        {/* Pagination — rendered INSIDE this same card, as a compact footer strip with its
            own top border, instead of floating separately below the table. variant="compact"
            strips Pagination's own card chrome (shadow/border/rounded/large padding) since
            this wrapper already provides all of that. Only used here — every other page that
            renders <Pagination /> directly (Products, OrderHistory, etc.) is completely
            unaffected, since "compact" is opt-in and "card" (the original look) stays default. */}
        {!isLoading && data.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            onPageChange={onPageChange}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
            variant="compact"
            className="border-t border-gray-100"
            // All pagination props passed straight through from DataTable's own props
          />
        )}
      </div>
    </div>
  );
};

export default DataTable;
// Default export — imported anywhere as: import DataTable from "..."
