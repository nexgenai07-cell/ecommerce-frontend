import { useState } from "react"; // Local state for the "Custom" rows-per-page input toggle and its typed value
import {
  AiOutlineLeft,
  AiOutlineRight,
  AiOutlineDoubleLeft,
  AiOutlineDoubleRight,
} from "react-icons/ai"; // Prev/Next and First/Last chevron icons
import { motion } from "framer-motion"; // Sliding active-pill and tap/hover micro-interactions
import cn from "../../utils/cn"; // Conditional Tailwind class merge helper

// Default set of selectable "rows per page" values, matching the
// backend's page_size cap of 100.
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const Pagination = ({
  currentPage = 1, // Currently active page number (1-indexed)
  totalPages = 1, // Total number of pages available
  onPageChange, // Parent-provided callback fired with the new page number
  pageSize, // Currently selected number of rows per page — the "rows per page" dropdown is only rendered when this and onPageSizeChange are both provided
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, // Selectable preset values for the rows-per-page dropdown
  onPageSizeChange, // Parent-provided callback fired with the new page size
  maxPageSize = 100, // Upper bound accepted by the "Custom" rows-per-page input — matches the backend's page_size cap by default
  variant = "card", // "card" (default, unchanged) renders its own shadow/border/rounded
  // corners/padding, exactly as before — every page that already uses
  // <Pagination /> standalone (Products, OrderHistory, NotificationHistory,
  // ActiveTickets, PostsList, CustomerDetailDrawer) keeps looking identical.
  // "compact" strips all of that chrome and shrinks button sizes, for use
  // ONLY when DataTable renders this as a footer strip already sitting
  // inside its own card — see DataTable.jsx.
  className = "", // Optional extra classes so callers can adjust spacing/margins
}) => {
  const isCompact = variant === "compact";
  // Single flag read everywhere below instead of repeating the string
  // comparison — also makes it obvious at a glance which parts of the
  // markup change size/chrome between the two variants.

  const showPageSizeSelector = pageSize != null && !!onPageSizeChange;
  // The rows-per-page control is opt-in: callers that don't pass pageSize
  // and onPageSizeChange keep the exact Prev/Next + numbers layout they
  // already had, with no visual or behavioral change.

  // Whether the currently selected pageSize is a real preset from
  // pageSizeOptions, or a value the customer typed into the "Custom" box
  // (either just now, or on a previous visit if the parent ever passes
  // in a pageSize outside the preset list).
  const isCustomValue =
    showPageSizeSelector && !pageSizeOptions.includes(pageSize);

  // Whether the "Custom" number input should currently be shown. Starts
  // out matching isCustomValue so a pageSize outside the preset list
  // opens straight into the custom input instead of silently mismatching
  // the dropdown; afterward it's driven by the dropdown's own selection.
  const [isCustomOpen, setIsCustomOpen] = useState(isCustomValue);

  // The raw text currently typed into the custom input, kept separate
  // from pageSize so invalid/in-progress typing doesn't get pushed up
  // to the parent until it's actually confirmed.
  const [customInputValue, setCustomInputValue] = useState(
    isCustomValue ? String(pageSize) : "",
  );

  // Fired when the dropdown's own selection changes. Picking a real
  // preset applies it immediately and closes the custom input; picking
  // "Custom" instead opens the input, pre-filled with the current page
  // size, and waits for the customer to type and confirm a value.
  const handleSelectChange = (e) => {
    const { value } = e.target;

    if (value === "custom") {
      setCustomInputValue(String(pageSize ?? ""));
      setIsCustomOpen(true);
      return;
    }

    setIsCustomOpen(false);
    onPageSizeChange(Number(value));
  };

  // Validates and applies whatever's currently typed in the custom
  // input. A value outside 1..maxPageSize (or not a whole number at
  // all) is rejected and the input reverts to the last real page size,
  // rather than letting the customer send a page_size the backend would
  // reject or that would fetch an unreasonably large result set.
  const commitCustomValue = () => {
    const parsed = Number(customInputValue);

    const isValid =
      customInputValue.trim() !== "" &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= maxPageSize;

    if (isValid) {
      onPageSizeChange(parsed);
    } else {
      setCustomInputValue(String(pageSize ?? ""));
    }
  };

  // Enter confirms the typed value immediately (and un-focuses the
  // input, matching normal form behavior); Escape cancels back to the
  // last real page size without applying anything half-typed.
  const handleCustomKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    } else if (e.key === "Escape") {
      setCustomInputValue(String(pageSize ?? ""));
      e.target.blur();
    }
  };

  // With a single page and no rows-per-page control to show, there is
  // nothing useful to render. When the rows-per-page control IS present,
  // keep the component visible even on a single page — the admin may
  // still want to switch to a larger page size.
  if (totalPages <= 1 && !showPageSizeSelector) return null;

  // Page numbers are always generated from totalPages — however many
  // products, that many pages, that many number buttons.
  const getPageNumbers = () => {
    const pages = []; // Final array of numbers and "..." placeholders to render

    if (totalPages <= 7) {
      // Small list — show every page number, no "..." needed
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      // Near the start — first 5 numbers + jump to the end
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Near the end — jump from the start + last 5 numbers
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      // In the middle — a window around currentPage, "..." on both sides
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }

    return pages; // Caller maps over this to render buttons
  };

  const pageNumbers = getPageNumbers(); // Computed once, reused in render

  // Smaller button sizes so the pagination looks cleaner and more compact.
  // All navigation buttons use the same square footprint.
  const squareBtnSize = isCompact
    ? "h-6 w-6 sm:h-7 sm:w-7"
    : "h-8 w-8 sm:h-9 sm:w-9";

  // Smaller page number buttons with reduced padding/footprint.
  const pageNumSize = isCompact
    ? "w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-xs"
    : "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm";

  // Smaller icons to match the reduced button size.
  const iconSize = isCompact
    ? "w-3 h-3 sm:w-3.5 sm:h-3.5"
    : "w-3.5 h-3.5 sm:w-4 sm:h-4";

  // Shared class-builder for First/Prev/Next/Last.
  // Every button now has a visible border and dark/black icon color.
  // Hover only changes the border/background slightly without making
  // the button visually grow too much.
  const navButtonClass = (disabled) =>
    cn(
      "flex items-center justify-center rounded-lg border font-bold transition-all duration-200",
      disabled
        ? "border-gray-200 bg-white text-gray-400 cursor-not-allowed"
        : "border-gray-300 bg-white text-black hover:border-primary hover:bg-primary-50 hover:text-black hover:shadow-sm",
    );

  return (
    // The whole control gets a single entrance animation — fade + a slight
    // upward slide. Individual buttons don't get their own entrance
    // animation, so the motion doesn't feel cluttered.
    <motion.div
      initial={{ opacity: 0, y: 8 }} // Starts slightly below and invisible on mount
      animate={{ opacity: 1, y: 0 }} // Fades into its real position
      transition={{ duration: 0.3, ease: "easeOut" }} // Smooth entrance, not too slow or snappy
      className={cn(
        // Wraps onto its own row on narrow screens instead of overflowing.
        // justify-end pushes the whole control to the right side of its
        // container instead of sitting centered.
        "flex flex-wrap items-center justify-end gap-1.5 sm:gap-2",
        isCompact
          ? "px-2 py-1.5 sm:px-3 sm:py-2"
          : "shadow-lg bg-white rounded-2xl border border-gray-100 px-2 py-2 sm:px-3 sm:py-3",
        className,
      )}
    >
      {/* Page navigation cluster — First / Prev / numbers / Next / Last */}
      <div
        className={cn(
          "flex items-center justify-center",
          isCompact ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1",
        )}
      >
        {/* First-page button */}
        <motion.button
          onClick={() => onPageChange(1)} // Jumps straight to the first page
          disabled={currentPage === 1} // Disabled when already on the first page
          whileHover={currentPage !== 1 ? { scale: 1.02 } : undefined}
          whileTap={currentPage !== 1 ? { scale: 0.97 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label="Go to first page"
          className={cn(navButtonClass(currentPage === 1), squareBtnSize)}
        >
          <AiOutlineDoubleLeft className={iconSize} />
        </motion.button>

        {/* Prev button */}
        <motion.button
          onClick={() => onPageChange(currentPage - 1)} // Moves one page back
          disabled={currentPage === 1} // Disabled on the first page
          whileHover={currentPage !== 1 ? { scale: 1.02 } : undefined}
          whileTap={currentPage !== 1 ? { scale: 0.97 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label="Go to previous page"
          className={cn(navButtonClass(currentPage === 1), squareBtnSize)}
        >
          <AiOutlineLeft className={iconSize} />
        </motion.button>

        {/* Page numbers — horizontally scrollable on narrow screens */}
        <div
          className={cn(
            "flex items-center overflow-x-auto scrollbar-hide",
            isCompact ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1",
          )}
        >
          {pageNumbers.map((page, index) =>
            page === "..." ? (
              // Ellipsis — a visual gap only, not clickable
              <span
                key={`dots-${index}`}
                className={cn(
                  "flex items-center justify-center text-gray-500 font-bold shrink-0",
                  pageNumSize,
                )}
              >
                ⋯
              </span>
            ) : (
              // Every number button is relative so the active-pill can
              // be positioned inside it.
              <motion.button
                key={page}
                onClick={() => onPageChange(page)}
                whileHover={currentPage !== page ? { scale: 1.02 } : undefined}
                whileTap={{ scale: 0.97 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                className={cn(
                  "relative flex items-center justify-center rounded-lg border font-bold shrink-0 transition-all duration-200",
                  pageNumSize,
                  currentPage === page
                    ? "border-primary"
                    : "border-gray-300 bg-white hover:border-primary hover:bg-primary-50 hover:shadow-sm",
                )}
              >
                {/* Active page's gradient background */}
                {currentPage === page && (
                  <motion.span
                    layoutId="paginationActivePill"
                    className="absolute inset-0 rounded-lg bg-linear-to-br from-primary to-primary-dark shadow-sm shadow-primary/20"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}

                {/* Page number */}
                <span
                  className={cn(
                    "relative z-10 font-bold transition-colors",
                    currentPage === page ? "text-white" : "text-black",
                  )}
                >
                  {page}
                </span>
              </motion.button>
            ),
          )}
        </div>

        {/* Next button */}
        <motion.button
          onClick={() => onPageChange(currentPage + 1)} // Moves one page forward
          disabled={currentPage === totalPages} // Disabled on the last page
          whileHover={currentPage !== totalPages ? { scale: 1.02 } : undefined}
          whileTap={currentPage !== totalPages ? { scale: 0.97 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label="Go to next page"
          className={cn(
            navButtonClass(currentPage === totalPages),
            squareBtnSize,
          )}
        >
          <AiOutlineRight className={iconSize} />
        </motion.button>

        {/* Last-page button */}
        <motion.button
          onClick={() => onPageChange(totalPages)} // Jumps straight to the last page
          disabled={currentPage === totalPages} // Disabled when already on the last page
          whileHover={currentPage !== totalPages ? { scale: 1.02 } : undefined}
          whileTap={currentPage !== totalPages ? { scale: 0.97 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label="Go to last page"
          className={cn(
            navButtonClass(currentPage === totalPages),
            squareBtnSize,
          )}
        >
          <AiOutlineDoubleRight className={iconSize} />
        </motion.button>
      </div>

      {/* Rows-per-page dropdown */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-1.5 shrink-0">
          {/* "Rows" / "Rows / page" text labels removed per request —
              the select itself (with the page size number) is enough. */}

          {/* Select wrapper */}
          <div className="group relative">
            <select
              id="pagination-page-size"
              value={isCustomOpen ? "custom" : pageSize}
              onChange={handleSelectChange}
              className={cn(
                // text-center so the selected value (10 / 20 / 50 / 100 / Custom)
                // sits in the middle of the pill instead of hugging the left edge.
                "appearance-none cursor-pointer text-center rounded-full border-2 bg-linear-to-b from-primary-50 to-white font-bold text-black shadow-sm outline-none transition-all duration-200",
                "border-gray-300 hover:border-primary hover:bg-primary-50 hover:shadow-sm",
                "focus:border-primary focus:shadow-md focus:ring-4 focus:ring-primary-100",
                isCompact
                  ? "text-[10px] sm:text-xs pl-2.5 pr-6 h-7 sm:h-8"
                  : "text-xs sm:text-sm pl-3 pr-7 h-8 sm:h-9",
              )}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}

              {/* Custom option */}
              <option value="custom">Custom</option>
            </select>

            {/* Custom chevron */}
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 text-black transition-all duration-200 group-focus-within:rotate-180 group-focus-within:text-primary group-hover:text-primary",
                isCompact ? "right-2" : "right-2.5",
              )}
            >
              <svg
                className={
                  isCompact ? "w-2.5 h-2.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5"
                }
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </div>

          {/* Custom rows-per-page input */}
          {isCustomOpen && (
            <motion.input
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              type="number"
              min={1}
              max={maxPageSize}
              step={1}
              value={customInputValue}
              onChange={(e) => setCustomInputValue(e.target.value)}
              onBlur={commitCustomValue}
              onKeyDown={handleCustomKeyDown}
              placeholder={`1-${maxPageSize}`}
              aria-label={`Custom rows per page, between 1 and ${maxPageSize}`}
              className={cn(
                "rounded-full border-2 border-gray-300 bg-white text-center font-bold text-black shadow-sm outline-none transition-all duration-200 hover:border-primary hover:bg-primary-50 focus:border-primary focus:shadow-md focus:ring-4 focus:ring-primary-100",
                isCompact
                  ? "w-12 sm:w-14 text-[10px] sm:text-xs px-1.5 h-7 sm:h-8"
                  : "w-14 sm:w-16 text-xs sm:text-sm px-2 h-8 sm:h-9",
              )}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};

export default Pagination; // Shared, animated pagination control used across the whole project
