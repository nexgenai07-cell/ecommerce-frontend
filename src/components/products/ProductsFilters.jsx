// React state + lifecycle hooks
import { useState, useEffect } from "react";
// React Query — used to fetch the category list from the backend
import { useQuery } from "@tanstack/react-query";
// Framer Motion — powers the smooth expand/collapse animation on each section
import { AnimatePresence, motion } from "framer-motion";
// Icon set used throughout this panel (header icon, section icons, chevrons)
import {
  AiOutlineClose,
  AiOutlineDown,
  AiOutlineControl,
  AiOutlineAppstore,
  AiOutlineDollarCircle,
  AiOutlineCheckCircle,
  AiOutlineCheck,
} from "react-icons/ai";
// Central place where all React Query cache keys are defined
import { QUERY_KEYS } from "../../constants/queryKeys";
// API call that fetches the list of product categories
import { getCategories } from "../../api/categories.api";
// Defensive normalizer — the categories endpoint sometimes returns a flat
// array and sometimes a paginated { results: [...] } object; this utility
// always hands back a plain array either way
import extractListData from "../../utils/extractListData";
// Small helper that merges Tailwind class strings conditionally
import cn from "../../utils/cn";

// Default/empty filter state — this is the shape the parent page (Products.jsx)
// resets back to whenever the user clears all filters. Only fields the
// backend search endpoint actually understands are included here.
export const DEFAULT_FILTERS = {
  categories: [], // Array of selected category IDs
  minPrice: "", // Minimum price string (kept as string to match the input value)
  maxPrice: "", // Maximum price string
  inStock: false, // Whether "In Stock Only" toggle is on
};

// ----------------------------------------------------------------------------
// FilterSection — a single collapsible block inside the panel (Category,
// Price Range, etc). Handles its own expand/collapse animation so the main
// component below doesn't repeat this markup for every section.
// ----------------------------------------------------------------------------
const FilterSection = ({ icon, title, expanded, onToggle, children }) => (
  // Wrapper — bottom border separates sections, removed on the last child
  <div className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
    {/* Clickable header row — toggles this section open/closed */}
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-1 text-sm font-bold text-gray-800 hover:text-primary transition-colors"
    >
      {/* Icon chip + section title, grouped together on the left */}
      <span className="flex items-center gap-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 text-primary">
          {icon}
        </span>
        {title}
      </span>
      {/* Chevron — rotates 180deg and turns primary-colored when expanded */}
      <AiOutlineDown
        className={cn(
          "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
          expanded && "rotate-180 text-primary",
        )}
      />
    </button>
    {/* Animated collapse/expand — only mounts its content while expanded */}
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-2.5 mt-3 pl-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ----------------------------------------------------------------------------
// CheckRow — a single custom-styled checkbox row (used for each category).
// Replaces the plain native checkbox look with a rounded, animated one that
// matches the emerald brand color from tokens.css.
// ----------------------------------------------------------------------------
const CheckRow = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none py-0.5">
    <span className="relative shrink-0">
      {/* Real checkbox input — visually hidden but still accessible/functional */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      {/* Custom checkbox box — reflects checked state via the "checked" prop */}
      <span
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all duration-150",
          checked
            ? "bg-primary border-primary"
            : "border-gray-300 group-hover:border-primary/60",
        )}
      >
        {/* Checkmark icon — only visible (opacity-100) when checked */}
        <AiOutlineCheck
          className={cn(
            "w-3 h-3 text-white transition-opacity",
            checked ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    </span>
    {/* Category name label */}
    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors truncate">
      {label}
    </span>
  </label>
);

// ----------------------------------------------------------------------------
// ProductsFilters — main exported component
// ----------------------------------------------------------------------------
const ProductsFilters = ({ filters, onFiltersChange, onClose }) => {
  // Local draft copy of the filters — lets price inputs feel responsive
  // while typing, without firing a new API call on every keystroke
  const [local, setLocal] = useState(filters || DEFAULT_FILTERS);

  // Keep the local draft in sync whenever the parent's filters prop changes
  // (e.g. when "Clear All" is pressed from the toolbar instead of this panel)
  useEffect(() => {
    setLocal(filters || DEFAULT_FILTERS);
  }, [filters]);

  // Category and Price sections start expanded; Category defaults open since
  // it's the most commonly used filter
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);

  // Fetch categories once and cache them for 10 minutes — this list rarely changes
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 1000 * 60 * 10,
  });
  // Normalize whatever shape the backend returned into a plain array
  const categories = extractListData(categoriesData);

  // Applies an instant filter change (category checkbox, stock toggle) —
  // updates local draft AND immediately notifies the parent page
  const applyFilters = (newLocal) => {
    setLocal(newLocal);
    onFiltersChange(newLocal);
  };

  // Resets every filter back to its empty default
  const handleClear = () => {
    setLocal(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  };

  // Count of currently selected categories — shown as a small counter badge
  const selectedCategoryCount = local.categories?.length || 0;
  // Whether ANY filter is currently active — controls whether "Clear All" shows
  const hasAnyFilter =
    selectedCategoryCount > 0 ||
    local.minPrice ||
    local.maxPrice ||
    local.inStock;

  return (
    // Outer panel card. On desktop this sits inside a `sticky` sidebar, so
    // `max-h-[calc(100vh-6.5rem)]` + `overflow-y-auto` makes the PANEL itself
    // scroll internally if it's ever taller than the screen, instead of
    // stretching the whole page. On mobile the parent drawer (Products.jsx)
    // now sizes itself to this panel's actual height, so no leftover empty
    // space is left below it.
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-h-[calc(100vh-6.5rem)] overflow-y-auto scrollbar-hide">
      {/* ===== Panel header ===== */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Small gradient icon chip identifying this panel as "Filters" */}
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary-dark text-white shadow-sm shadow-primary/20">
            <AiOutlineControl className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Filters</h3>
            <p className="text-xs text-gray-400">Refine your search</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* "Clear All" only shows once at least one filter is active */}
          {hasAnyFilter && (
            <button
              onClick={handleClear}
              className="text-xs text-primary font-semibold hover:underline whitespace-nowrap"
            >
              Clear All
            </button>
          )}
          {/* Close (X) button — only rendered on the mobile drawer variant,
              where the parent passes an onClose handler */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 ml-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <AiOutlineClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ===== CATEGORY SECTION ===== */}
      <FilterSection
        icon={<AiOutlineAppstore className="w-4 h-4" />}
        title={
          // Shows a live "(2)" style counter next to the title when categories
          // are selected, so the state is visible even while collapsed
          selectedCategoryCount > 0
            ? `Category (${selectedCategoryCount})`
            : "Category"
        }
        expanded={categoriesExpanded}
        onToggle={() => setCategoriesExpanded(!categoriesExpanded)}
      >
        {categories.length === 0 ? (
          // Loading placeholder while categories are still being fetched
          <p className="text-xs text-gray-400">Loading categories…</p>
        ) : (
          // Scrollable list — capped at ~11rem tall (roughly 6 rows) so a
          // store with many categories never pushes the sidebar (and the
          // page) taller than necessary. "scrollbar-hide" keeps the scroll
          // functional while making the scrollbar itself invisible, so no
          // scroll track/thumb is ever visible to the user.
          <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1 scrollbar-hide">
            {categories.map((cat) => (
              <CheckRow
                key={cat.id}
                checked={(local.categories || []).includes(cat.id)}
                label={cat.name}
                onChange={() =>
                  applyFilters({
                    ...local,
                    // Toggle this category id in/out of the selected list
                    categories: (local.categories || []).includes(cat.id)
                      ? local.categories.filter((c) => c !== cat.id)
                      : [...(local.categories || []), cat.id],
                  })
                }
              />
            ))}
          </div>
        )}
      </FilterSection>

      {/* ===== PRICE RANGE SECTION ===== */}
      <FilterSection
        icon={<AiOutlineDollarCircle className="w-4 h-4" />}
        title="Price Range"
        expanded={priceExpanded}
        onToggle={() => setPriceExpanded(!priceExpanded)}
      >
        {/* Min / Max numeric inputs */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              Rs.
            </span>
            <input
              type="number"
              placeholder="0"
              value={local.minPrice}
              // Typing only updates the local draft — no API call yet
              onChange={(e) => setLocal({ ...local, minPrice: e.target.value })}
              // API call fires only once the user leaves the field
              onBlur={() => onFiltersChange(local)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <span className="text-gray-300 shrink-0">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              Rs.
            </span>
            <input
              type="number"
              placeholder="50k+"
              value={local.maxPrice}
              onChange={(e) => setLocal({ ...local, maxPrice: e.target.value })}
              onBlur={() => onFiltersChange(local)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Range slider — mirrors/updates the maxPrice field, applies instantly */}
        <div className="flex flex-col gap-1.5 pt-1">
          <input
            type="range"
            min="0"
            max="100000"
            step="1000"
            value={local.maxPrice || 100000}
            onChange={(e) => {
              const newLocal = { ...local, maxPrice: e.target.value };
              setLocal(newLocal);
              onFiltersChange(newLocal);
            }}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Rs. 0</span>
            <span>Rs. 100k+</span>
          </div>
        </div>
      </FilterSection>

      {/* ===== IN STOCK ONLY TOGGLE ===== */}
      <div className="flex items-center justify-between pt-4">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <AiOutlineCheckCircle className="w-4 h-4 text-primary" />
          In Stock Only
        </span>
        {/* Custom switch — toggles the inStock boolean and applies instantly */}
        <button
          onClick={() => applyFilters({ ...local, inStock: !local.inStock })}
          className={cn(
            "relative w-11 h-6 rounded-full transition-all duration-300 shrink-0",
            local.inStock ? "bg-primary" : "bg-gray-200",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
              local.inStock ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
};

// Export the component so Products.jsx can render it in both the desktop
// sidebar and the mobile drawer
export default ProductsFilters;
