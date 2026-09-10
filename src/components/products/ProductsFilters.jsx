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

// Bounds and step used by both the numeric inputs and the range slider below.
const PRICE_FLOOR = 0;
const PRICE_CEILING = 100000;
const PRICE_STEP = 1000;

// Keeps whatever the user types down to digits only, so a "-" (negative),
// "e", "+", "." or any other character can never end up in the price
// fields — no need to rely on native number-input validation, which lets
// invalid characters sit in the field until blur.
const sanitizePriceInput = (raw) => {
  const digitsOnly = raw.replace(/[^0-9]/g, "");
  // Drop leading zeros ("00450" -> "450") without turning "" into "0"
  return digitsOnly.replace(/^0+(?=\d)/, "");
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

  // Typing handlers — every keystroke is sanitized so a negative sign,
  // decimal point, or letter can never land in the field.
  const handleMinPriceChange = (e) => {
    setLocal({ ...local, minPrice: sanitizePriceInput(e.target.value) });
  };
  const handleMaxPriceChange = (e) => {
    setLocal({ ...local, maxPrice: sanitizePriceInput(e.target.value) });
  };

  // On blur, enforce min <= max (an empty field means "no bound" on that
  // side, so it never gets clamped against the other one).
  const handleMinPriceBlur = () => {
    const min = local.minPrice === "" ? null : Number(local.minPrice);
    const max = local.maxPrice === "" ? null : Number(local.maxPrice);
    const newLocal =
      min !== null && max !== null && min > max
        ? { ...local, minPrice: String(max) }
        : local;
    setLocal(newLocal);
    onFiltersChange(newLocal);
  };
  const handleMaxPriceBlur = () => {
    const min = local.minPrice === "" ? null : Number(local.minPrice);
    const max = local.maxPrice === "" ? null : Number(local.maxPrice);
    const newLocal =
      min !== null && max !== null && max < min
        ? { ...local, maxPrice: String(min) }
        : local;
    setLocal(newLocal);
    onFiltersChange(newLocal);
  };

  // Slider values, resolved from the (possibly empty) local price strings.
  // An empty minPrice means the slider's lower handle sits at the floor;
  // an empty maxPrice means the upper handle sits at the ceiling.
  const sliderMinVal =
    local.minPrice === ""
      ? PRICE_FLOOR
      : Math.min(Number(local.minPrice), PRICE_CEILING);
  const sliderMaxVal =
    local.maxPrice === ""
      ? PRICE_CEILING
      : Math.min(Number(local.maxPrice), PRICE_CEILING);
  const minPercent = (sliderMinVal / PRICE_CEILING) * 100;
  const maxPercent = (sliderMaxVal / PRICE_CEILING) * 100;

  // Dragging the lower handle can never cross past the upper handle
  // (kept at least one step below it), and vice versa — this is what lets
  // any sub-range (e.g. Rs. 1000 - Rs. 2000) actually be selected.
  const handleMinSlider = (e) => {
    const val = Math.min(Number(e.target.value), sliderMaxVal - PRICE_STEP);
    const newLocal = { ...local, minPrice: String(Math.max(PRICE_FLOOR, val)) };
    setLocal(newLocal);
    onFiltersChange(newLocal);
  };
  const handleMaxSlider = (e) => {
    const val = Math.max(Number(e.target.value), sliderMinVal + PRICE_STEP);
    const newLocal = {
      ...local,
      maxPrice: String(Math.min(PRICE_CEILING, val)),
    };
    setLocal(newLocal);
    onFiltersChange(newLocal);
  };

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
        {/* Min / Max numeric inputs — plain text inputs (not type="number")
            so every keystroke can be sanitized in JS; this is what keeps
            a "-" out of the field instead of just failing validity on blur. */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              Rs.
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={local.minPrice}
              onChange={handleMinPriceChange}
              onBlur={handleMinPriceBlur}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <span className="text-gray-300 shrink-0">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              Rs.
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="50k+"
              value={local.maxPrice}
              onChange={handleMaxPriceChange}
              onBlur={handleMaxPriceBlur}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Dual-handle range slider — the lower handle now moves too, so a
            sub-range like Rs. 1,000 - Rs. 2,000 is actually selectable
            instead of the track always starting from zero. Two native
            range inputs are stacked on top of a visual track; see
            .price-slider rules in index.css for how only their thumbs
            stay clickable. */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="price-slider relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-100" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-linear-to-r from-primary to-primary-dark"
              style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
            />
            <input
              type="range"
              min={PRICE_FLOOR}
              max={PRICE_CEILING}
              step={PRICE_STEP}
              value={sliderMinVal}
              onChange={handleMinSlider}
              className="price-slider-input"
              style={{
                zIndex: sliderMinVal >= sliderMaxVal - PRICE_STEP ? 5 : 3,
              }}
              aria-label="Minimum price"
            />
            <input
              type="range"
              min={PRICE_FLOOR}
              max={PRICE_CEILING}
              step={PRICE_STEP}
              value={sliderMaxVal}
              onChange={handleMaxSlider}
              className="price-slider-input"
              style={{ zIndex: 4 }}
              aria-label="Maximum price"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Rs. 0</span>
            <span>Rs. 100k+</span>
          </div>
        </div>
      </FilterSection>

      {/* ===== IN STOCK ONLY TOGGLE ===== */}
      <div className="flex items-center justify-between gap-3 mt-1 pt-4">
        <span className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-br from-primary to-primary-dark text-white shadow-sm shadow-primary/25 shrink-0">
            <AiOutlineCheckCircle className="w-4 h-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-gray-800">
              In Stock Only
            </span>
            <span className="text-[11px] text-gray-400">
              Hide unavailable items
            </span>
          </span>
        </span>
        {/* Custom "luxury" switch — see .luxury-toggle rules in index.css
            for the gradient fill and spring-style thumb motion. */}
        <button
          onClick={() => applyFilters({ ...local, inStock: !local.inStock })}
          aria-pressed={local.inStock}
          aria-label="Toggle in stock only"
          className={cn("luxury-toggle", local.inStock && "luxury-toggle--on")}
        >
          <span className="luxury-toggle__thumb">
            <AiOutlineCheck
              className={cn(
                "luxury-toggle__icon",
                local.inStock ? "opacity-100 scale-100" : "opacity-0 scale-50",
              )}
            />
          </span>
        </button>
      </div>
    </div>
  );
};

// Export the component so Products.jsx can render it in both the desktop
// sidebar and the mobile drawer
export default ProductsFilters;
