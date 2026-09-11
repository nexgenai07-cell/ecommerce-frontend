import { useState, useRef } from "react";
import {
  AiOutlineFilter,
  AiOutlineDownload,
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineDown,
  AiOutlinePlus,
} from "react-icons/ai";
import { FaSearch } from "react-icons/fa";
// FaSearch -- solid/filled search icon (bolder than the outline BsSearch
// used before), sized up again per request.
// AiOutlineCheck -- small checkmark next to the currently-selected option
// inside each chip's dropdown panel.
// AiOutlineClose / AiOutlineDown / AiOutlinePlus -- used by the redesigned
// FilterChip pill below (bordered "X | Label | Value v" / "+ Label" style).

import Popover from "../ui/Popover";
import Button from "../ui/Button";
import Input from "../ui/Input";
import cn from "../../utils/cn";

const STATUS_OPTIONS = [
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "low_stock", label: "Low Stock" },
];

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest" },
  { value: "created_at", label: "Oldest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "name", label: "Name: A-Z" },
];

const DEFAULT_ORDERING = "-created_at";

// A single selectable row inside a chip's dropdown panel: label on the
// left, a small brand-green checkmark on the right only when this row is
// the currently active selection. Replaces the old plain-text-only rows
// with something that reads as more deliberately designed, and gives
// selected options a clearer visual confirmation than color alone.
const OptionRow = ({ label, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors",
      "hover:bg-primary-50 hover:text-primary",
      isSelected
        ? "text-primary font-semibold bg-primary-50"
        : "text-gray-600 font-medium",
    )}
  >
    <span className="truncate">{label}</span>
    {isSelected && (
      <AiOutlineCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
    )}
  </button>
);

// A single filter chip, redesigned to match the "X | Label | Value v" pill
// style: a bordered rounded-full pill where the WHOLE pill opens the
// dropdown panel (via Popover), except the little X/+ icon on the left,
// which has its own click handler:
//   - No value picked yet -> a "+" icon + just the label (e.g. "+ Sort").
//   - A value picked ("active") -> an "X" icon (clears just this filter,
//     independent of opening the dropdown) + "Label | Value" + a caret.
// "Label | Value" is always shown (a placeholder like "select category"
// stands in for Value until something's picked). "isActive" controls the
// X vs + icon and the pill's highlight color.
const FilterChip = ({
  label,
  valueLabel,
  isActive,
  onClear,
  panelClassName,
  children,
}) => (
  <Popover
    align="left"
    panelClassName={cn("py-1 z-dropdown", panelClassName || "w-52")}
    trigger={
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 shrink-0 cursor-pointer transition-colors select-none",
          isActive
            ? "border-primary/40 bg-primary-50"
            : "border-gray-300 bg-white hover:bg-gray-50",
        )}
      >
        {isActive ? (
          // Independent click target: stopPropagation so clicking the X
          // clears the filter WITHOUT also toggling the dropdown open,
          // since the whole pill above it is itself the popover trigger.
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label={`Clear ${label} filter`}
            className="flex items-center justify-center text-gray-400 hover:text-danger transition-colors shrink-0"
          >
            <AiOutlineClose className="w-3 h-3" />
          </button>
        ) : (
          <AiOutlinePlus className="w-3 h-3 text-gray-400 shrink-0" />
        )}

        <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
          {label}
        </span>

        <span className="text-gray-300">|</span>
        <span className="text-xs font-semibold text-primary truncate max-w-[100px] sm:max-w-[140px]">
          {valueLabel}
        </span>

        <AiOutlineDown className="w-2.5 h-2.5 text-gray-400 shrink-0" />
      </div>
    }
  >
    {children}
  </Popover>
);

const ProductFilters = ({
  categoryOptions,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
}) => {
  // Whether the search input is expanded inline in the top bar. Starts
  // expanded if a search term already exists (e.g. coming back to this
  // page), collapsed otherwise.
  const [isSearchOpen, setIsSearchOpen] = useState(!!filters.search);

  // Whether the filter-chips row below the top bar is shown at all.
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const searchInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  const activeFilterCount = [
    filters.categoryId,
    filters.status,
    filters.minPrice || filters.maxPrice,
    filters.ordering && filters.ordering !== DEFAULT_ORDERING,
  ].filter(Boolean).length;

  const selectedCategory = categoryOptions.find(
    (opt) => opt.value === filters.categoryId,
  );
  const selectedStatus = STATUS_OPTIONS.find(
    (opt) => opt.value === filters.status,
  );
  const selectedSort = SORT_OPTIONS.find(
    (opt) => opt.value === filters.ordering,
  );

  const priceValueLabel =
    filters.minPrice || filters.maxPrice
      ? `${filters.minPrice || "0"} - ${filters.maxPrice || "max"}`
      : "select range";

  // Collapses the search pill back to an icon shortly after it loses
  // focus, but only if it's empty -- gives the round search button a
  // moment to register its own click before the blur would close it.
  const handleSearchBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      if (!filters.search) setIsSearchOpen(false);
    }, 150);
  };

  const handleSearchIconClick = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!isSearchOpen) {
      setIsSearchOpen(true);
      // Wait for the pill to mount, then focus it
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      searchInputRef.current?.focus();
    }
  };

  return (
    // NOTE: no overflow-hidden here on purpose -- clipping this card
    // was cutting off every filter chip's dropdown panel, making it
    // render (invisibly) behind the products table below instead of
    // floating above it. Corner rounding is now handled per-row
    // instead (rounded-b-xl on the last visible section).
    // "bg-white shadow-sm" removed from this wrapper -- that was the
    // highlighted/boxed look around the search+Filters+Export row the
    // user flagged. The row now sits flush against the page background
    // with no card styling of its own.
    <div className="relative">
      {/* TOP BAR -- search + Filters + Export grouped together on the
          right, with a leading spacer so they stay adjacent to each
          other regardless of whether the search pill is expanded.
          Padding/gap shrunk (px-4 py-3 gap-2 -> px-3 py-2 gap-1.5) to
          compact the whole row's footprint. */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 flex-wrap sm:flex-nowrap",
          !areFiltersOpen && "rounded-xl",
        )}
      >
        <div className="flex-1" />

        {isSearchOpen ? (
          // Expanded search pill shrunk: width 64->52, height 10->8, and
          // the inner circular search button scaled down to match (w-8 h-8
          // -> w-6 h-6, icon w-4 h-4 -> w-3.5 h-3.5).
          <div className="relative w-full sm:w-52 shrink-0">
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Search by name or SKU..."
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              onBlur={handleSearchBlur}
              className="w-full h-8 pl-3 pr-9 text-xs rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <button
              type="button"
              onClick={handleSearchIconClick}
              aria-label="Search"
              // No filled background -- just the icon itself in the
              // project's theme green color.
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-primary hover:text-primary-dark transition-colors"
            >
              <FaSearch className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Collapsed round search button shrunk from w-9 h-9 to w-7 h-7,
          // icon from w-4 h-4 to w-3.5 h-3.5, to match the rest of the bar.
          <button
            type="button"
            onClick={handleSearchIconClick}
            aria-label="Search products"
            // No filled background -- just the icon itself in the
            // project's theme green color.
            className="w-7 h-7 flex items-center justify-center shrink-0 text-primary hover:text-primary-dark transition-colors"
          >
            <FaSearch className="w-4 h-4" />
          </button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          // Extra className shrinks Button's own "sm" padding/text further
          // (px-3 py-1.5 text-xs -> px-2 py-1 text-[11px]) and tightens the
          // icon/label gap -- twMerge (via cn) resolves the conflicting
          // utilities so only these smaller values apply. The
          // focus:outline-none / focus:ring-0 / focus-visible:ring-0 /
          // focus:ring-offset-0 set removes the double-border look that
          // showed up on click -- Button's own default focus ring was
          // rendering on top of this button's border-2, which looked like
          // two stacked borders.
          // Softer gradient -- dropped the "hover:brightness-110" /
          // active "brightness-110" boosts since those were pushing the
          // color too far on hover/when filters are open. The gradient
          // itself is a fixed, less intense pairing (primary ->
          // primary-dark at 90% opacity) and stays the same whether
          // hovered, open, or idle -- only a light hover:opacity dip for
          // feedback.
          leftIcon={<AiOutlineFilter className="w-3.5 h-3.5" />}
          onClick={() => setAreFiltersOpen((prev) => !prev)}
          className="shrink-0 font-semibold border-0 pl-2 pr-2.5 py-1 text-[11px] gap-1  text-white shadow-sm bg-linear-to-br from-primary/90 to-primary-dark/90 hover:opacity-90 focus:outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0"
        >
          Filters
          {activeFilterCount > 0 && (
            // Active-count badge sits inline right next to the "Filters"
            // text with a small left margin so it doesn't crowd/overlap
            // the button's rounded border edge. Kept small (11px) and
            // in-line via the button's own flex layout. Now on a white/
            // translucent chip so it still stands out against the dark
            // gradient button background.
            <span className="inline-flex items-center justify-center min-w-[11px] h-[11px] px-0.5 ml-0.5 rounded-full bg-white/25 text-white text-[8px] font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          // "secondary" variant's own hover color (bg-gray-200) is now the
          // permanent/resting background -- no need to hover to see it.
          leftIcon={<AiOutlineDownload className="w-3.5 h-3.5" />}
          onClick={onExport}
          className="shrink-0 font-semibold px-2 py-1 text-[11px] gap-1 bg-gray-200"
        >
          Export
        </Button>
      </div>

      {/* FILTER CHIPS ROW -- shown only once "Filters" is toggled on, sits
          directly below the bar above (not below the table).
          "bg-gray-50/60 rounded-b-xl" removed -- that background was making
          this row read as its own highlighted bar/line instead of just a
          row of small chips appearing inline. Padding trimmed further
          (py-2 -> py-1.5) to match. */}
      {areFiltersOpen && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
          <FilterChip
            label="Category"
            valueLabel={
              selectedCategory ? selectedCategory.label : "select category"
            }
            isActive={!!filters.categoryId}
            onClear={() => onFilterChange("categoryId", "")}
            // Responsive width: comfortable on desktop (w-60), narrows on
            // small screens, and max-w-[90vw] stops it ever overflowing
            // past the edge of a phone screen. p-1.5 gives the option
            // list breathing room inside the panel's rounded border.
            panelClassName="w-60 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Categories"
                  isSelected={!filters.categoryId}
                  onClick={() => {
                    onFilterChange("categoryId", "");
                    close();
                  }}
                />
                {categoryOptions.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={filters.categoryId === opt.value}
                    onClick={() => {
                      onFilterChange("categoryId", opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Status"
            valueLabel={selectedStatus ? selectedStatus.label : "select status"}
            isActive={!!filters.status}
            onClear={() => onFilterChange("status", "")}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Status"
                  isSelected={!filters.status}
                  onClick={() => {
                    onFilterChange("status", "");
                    close();
                  }}
                />
                {STATUS_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={filters.status === opt.value}
                    onClick={() => {
                      onFilterChange("status", opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Price"
            valueLabel={priceValueLabel}
            isActive={!!(filters.minPrice || filters.maxPrice)}
            onClear={() => {
              onFilterChange("minPrice", "");
              onFilterChange("maxPrice", "");
            }}
            // Widened slightly (w-52 -> w-60) so the two price inputs and
            // their placeholders have proper breathing room, with
            // max-w-[90vw] as the same mobile-overflow safety net used on
            // the other panels above.
            panelClassName="w-60 max-w-[90vw] p-3"
          >
            {({ close }) => (
              // Popover content spacing tightened (gap-2 -> gap-1.5) and
              // both price Inputs given a smaller className override
              // (default py-2.5 px-4 text-sm -> py-1.5 px-2 text-xs) so the
              // mini-form matches the rest of the compacted toolbar. A
              // small "Price Range" heading added above the inputs so this
              // panel doesn't read as bare fields with no context.
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-gray-800 mb-0.5">
                  Price Range
                </p>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => onFilterChange("minPrice", e.target.value)}
                    className="py-1.5 px-2 text-xs"
                  />
                  <span className="text-gray-300 shrink-0">-</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => onFilterChange("maxPrice", e.target.value)}
                    className="py-1.5 px-2 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  fullWidth
                  onClick={close}
                  className="bg-gradient-to-r from-primary to-primary-dark font-semibold px-2 py-1 text-[11px]"
                >
                  Apply
                </Button>
              </div>
            )}
          </FilterChip>

          <FilterChip
            label="Sort"
            valueLabel={selectedSort ? selectedSort.label : "select sort"}
            isActive={filters.ordering !== DEFAULT_ORDERING}
            onClear={() => onFilterChange("ordering", DEFAULT_ORDERING)}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {SORT_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={filters.ordering === opt.value}
                    onClick={() => {
                      onFilterChange("ordering", opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-danger transition-colors shrink-0"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
