// import { useRef, useState } from "react";
// import { AiOutlineDownload, AiOutlineFilter } from "react-icons/ai";
// import { FaSearch } from "react-icons/fa";
// import Button from "../../ui/Button";
// import cn from "../../../utils/cn";

// /**
//  * ListToolbarBar
//  *
//  * The single top row shared by every admin list page: a collapsible
//  * round search button on the left of the group, a "Filters" toggle in
//  * the middle (with a live count badge once any filter is active), and
//  * an optional "Export" button on the right. An optional extra action
//  * (e.g. "Add Product") can be rendered before the group via
//  * `leadingActions`.
//  *
//  * This component owns nothing about WHICH filters exist — that is left
//  * to each page's own FilterChip row, rendered separately below this bar
//  * (see FilterChipsRow). ListToolbarBar only renders the search box, the
//  * toggle, and the export button, so every admin list page gets the
//  * exact same bar regardless of what it is listing.
//  *
//  * Props:
//  * - searchValue:        Current text in the search box.
//  * - onSearchChange:      (value) => void, called on every keystroke.
//  * - searchPlaceholder:   Placeholder text for the search input.
//  * - activeFilterCount:   Number shown in the badge on the Filters button.
//  * - areFiltersOpen:      Whether the filter-chips row below is expanded.
//  * - onToggleFilters:     Toggles areFiltersOpen in the parent page.
//  * - onExport:            Optional export handler. When omitted, no
//  *                        Export button is rendered at all (some list
//  *                        pages, like Category Management, have nothing
//  *                        to export).
//  * - exportLabel:         Text on the export button (default "Export").
//  * - isExporting:         Optional loading state for the export button.
//  * - leadingActions:      Optional extra node rendered before the
//  *                        search/filters/export group (rare — most pages
//  *                        put page-level actions like "Add Product" in
//  *                        PageHeader instead, not in this toolbar).
//  */
// const ListToolbarBar = ({
//   searchValue,
//   onSearchChange,
//   searchPlaceholder = "Search...",
//   activeFilterCount = 0,
//   areFiltersOpen,
//   onToggleFilters,
//   onExport,
//   exportLabel = "Export",
//   isExporting = false,
//   leadingActions = null,
// }) => {
//   // Whether the search input is expanded inline in the top bar. Starts
//   // expanded if a search term already exists (e.g. coming back to this
//   // page after navigating away), collapsed otherwise.
//   const [isSearchOpen, setIsSearchOpen] = useState(!!searchValue);

//   const searchInputRef = useRef(null);
//   const blurTimeoutRef = useRef(null);

//   // Collapses the search pill back to an icon shortly after it loses
//   // focus, but only if it's empty — gives the round search button a
//   // moment to register its own click before the blur would close it.
//   const handleSearchBlur = () => {
//     blurTimeoutRef.current = setTimeout(() => {
//       if (!searchValue) setIsSearchOpen(false);
//     }, 150);
//   };

//   const handleSearchIconClick = () => {
//     if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
//     if (!isSearchOpen) {
//       setIsSearchOpen(true);
//       // Wait for the pill to mount, then focus it.
//       requestAnimationFrame(() => searchInputRef.current?.focus());
//     } else {
//       searchInputRef.current?.focus();
//     }
//   };

//   return (
//     <div
//       className={cn(
//         "flex items-center gap-1.5 px-3 py-2 flex-wrap sm:flex-nowrap",
//         !areFiltersOpen && "rounded-xl",
//       )}
//     >
//       {leadingActions}

//       <div className="flex-1" />

//       {isSearchOpen ? (
//         <div className="relative w-full sm:w-52 shrink-0">
//           <input
//             ref={searchInputRef}
//             autoFocus
//             type="text"
//             placeholder={searchPlaceholder}
//             value={searchValue}
//             onChange={(e) => onSearchChange(e.target.value)}
//             onBlur={handleSearchBlur}
//             className="w-full h-8 pl-3 pr-9 text-xs rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
//           />
//           <button
//             type="button"
//             onClick={handleSearchIconClick}
//             aria-label="Search"
//             className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-primary hover:text-primary-dark transition-colors"
//           >
//             <FaSearch className="w-4 h-4" />
//           </button>
//         </div>
//       ) : (
//         <button
//           type="button"
//           onClick={handleSearchIconClick}
//           aria-label="Search"
//           className="w-7 h-7 flex items-center justify-center shrink-0 text-primary hover:text-primary-dark transition-colors"
//         >
//           <FaSearch className="w-4 h-4" />
//         </button>
//       )}

//       <Button
//         type="button"
//         variant="outline"
//         size="sm"
//         leftIcon={<AiOutlineFilter className="w-3.5 h-3.5" />}
//         onClick={onToggleFilters}
//         className="shrink-0 font-semibold border-0 pl-2 pr-2.5 py-1 text-[11px] gap-1 text-white shadow-sm bg-linear-to-br from-primary/90 to-primary-dark/90 hover:opacity-90 focus:outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0"
//       >
//         Filters
//         {activeFilterCount > 0 && (
//           <span className="inline-flex items-center justify-center min-w-[11px] h-[11px] px-0.5 ml-0.5 rounded-full bg-white/25 text-white text-[8px] font-bold leading-none">
//             {activeFilterCount}
//           </span>
//         )}
//       </Button>

//       {onExport && (
//         <Button
//           type="button"
//           variant="secondary"
//           size="sm"
//           isLoading={isExporting}
//           leftIcon={<AiOutlineDownload className="w-3.5 h-3.5" />}
//           onClick={onExport}
//           className="shrink-0 font-semibold px-2 py-1 text-[11px] gap-1 bg-gray-200"
//         >
//           {exportLabel}
//         </Button>
//       )}
//     </div>
//   );
// };

// export default ListToolbarBar;
import { useRef, useState } from "react";
import { AiOutlineDownload, AiOutlineFilter } from "react-icons/ai";
import { FaSearch } from "react-icons/fa";
import Button from "../../ui/Button";
import cn from "../../../utils/cn";

/**
 * ListToolbarBar
 *
 * The single top row shared by every admin list page: a collapsible
 * round search button on the left of the group, a "Filters" toggle in
 * the middle (with a live count badge once any filter is active), and
 * an optional "Export" button on the right. An optional extra action
 * (e.g. "Add Product") can be rendered before the group via
 * `leadingActions`.
 *
 * This component owns nothing about WHICH filters exist — that is left
 * to each page's own FilterChip row, rendered separately below this bar
 * (see FilterChipsRow). ListToolbarBar only renders the search box, the
 * toggle, and the export button, so every admin list page gets the
 * exact same bar regardless of what it is listing.
 *
 * Props:
 * - searchValue:        Current text in the search box.
 * - onSearchChange:      (value) => void, called on every keystroke.
 * - searchPlaceholder:   Placeholder text for the search input.
 * - activeFilterCount:   Number shown in the badge on the Filters button.
 * - areFiltersOpen:      Whether the filter-chips row below is expanded.
 * - onToggleFilters:     Toggles areFiltersOpen in the parent page. When
 *                        omitted, no "Filters" button is rendered at
 *                        all — used by pages whose only filters are
 *                        already visible as status tabs, with nothing
 *                        left to hide behind a dropdown chip.
 * - onExport:            Optional export handler. When omitted, no
 *                        Export button is rendered at all (some list
 *                        pages, like Category Management, have nothing
 *                        to export).
 * - exportLabel:         Text on the export button (default "Export").
 * - isExporting:         Optional loading state for the export button.
 * - leadingActions:      Optional extra node rendered before the
 *                        search/filters/export group (rare — most pages
 *                        put page-level actions like "Add Product" in
 *                        PageHeader instead, not in this toolbar).
 */
const ListToolbarBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  activeFilterCount = 0,
  areFiltersOpen,
  onToggleFilters,
  onExport,
  exportLabel = "Export",
  isExporting = false,
  leadingActions = null,
}) => {
  // Whether the search input is expanded inline in the top bar. Starts
  // expanded if a search term already exists (e.g. coming back to this
  // page after navigating away), collapsed otherwise.
  const [isSearchOpen, setIsSearchOpen] = useState(!!searchValue);

  const searchInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // Collapses the search pill back to an icon shortly after it loses
  // focus, but only if it's empty — gives the round search button a
  // moment to register its own click before the blur would close it.
  const handleSearchBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      if (!searchValue) setIsSearchOpen(false);
    }, 150);
  };

  const handleSearchIconClick = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!isSearchOpen) {
      setIsSearchOpen(true);
      // Wait for the pill to mount, then focus it.
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      searchInputRef.current?.focus();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 flex-wrap sm:flex-nowrap",
        !areFiltersOpen && "rounded-xl",
      )}
    >
      {leadingActions}

      <div className="flex-1" />

      {isSearchOpen ? (
        <div className="relative w-full sm:w-52 shrink-0">
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onBlur={handleSearchBlur}
            className="w-full h-8 pl-3 pr-9 text-xs rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSearchIconClick}
            aria-label="Search"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-primary hover:text-primary-dark transition-colors"
          >
            <FaSearch className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSearchIconClick}
          aria-label="Search"
          className="w-7 h-7 flex items-center justify-center shrink-0 text-primary hover:text-primary-dark transition-colors"
        >
          <FaSearch className="w-4 h-4" />
        </button>
      )}

      {onToggleFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<AiOutlineFilter className="w-3.5 h-3.5" />}
          onClick={onToggleFilters}
          className="shrink-0 font-semibold border-0 pl-2 pr-2.5 py-1 text-[11px] gap-1 text-white shadow-sm bg-linear-to-br from-primary/90 to-primary-dark/90 hover:opacity-90 focus:outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[11px] h-[11px] px-0.5 ml-0.5 rounded-full bg-white/25 text-white text-[8px] font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </Button>
      )}

      {onExport && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          isLoading={isExporting}
          leftIcon={<AiOutlineDownload className="w-3.5 h-3.5" />}
          onClick={onExport}
          className="shrink-0 font-semibold px-2 py-1 text-[11px] gap-1 bg-gray-200"
        >
          {exportLabel}
        </Button>
      )}
    </div>
  );
};

export default ListToolbarBar;
