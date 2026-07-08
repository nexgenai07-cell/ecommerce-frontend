import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AiOutlineClose,
  AiOutlineDown,
  AiOutlineControl,
  AiOutlineAppstore,
  AiOutlineDollarCircle,
  AiOutlineCheckCircle,
  AiOutlineCheck,
} from "react-icons/ai";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import cn from "../../utils/cn";

// Default empty filters — only fields the backend actually supports
export const DEFAULT_FILTERS = {
  categories: [],
  minPrice: "",
  maxPrice: "",
  inStock: false,
};

// Small reusable collapsible section with an icon-led header and animated content
const FilterSection = ({ icon, title, expanded, onToggle, children }) => (
  <div className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-1 text-sm font-bold text-gray-800 hover:text-primary transition-colors"
    >
      <span className="flex items-center gap-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 text-primary">
          {icon}
        </span>
        {title}
      </span>
      <AiOutlineDown
        className={cn(
          "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
          expanded && "rotate-180 text-primary",
        )}
      />
    </button>
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-3 mt-3 pl-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Custom styled checkbox — replaces the plain native checkbox look
const CheckRow = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <span className="relative shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all duration-150",
          checked
            ? "bg-primary border-primary"
            : "border-gray-300 group-hover:border-primary/60",
        )}
      >
        <AiOutlineCheck
          className={cn(
            "w-3 h-3 text-white transition-opacity",
            checked ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    </span>
    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
      {label}
    </span>
  </label>
);

const ProductsFilters = ({ filters, onFiltersChange, onClose }) => {
  const [local, setLocal] = useState(filters || DEFAULT_FILTERS);

  useEffect(() => {
    setLocal(filters || DEFAULT_FILTERS);
  }, [filters]);

  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);

  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
  // API_Documentation_Final.pdf (API 11) documents this endpoint as a
  // flat array, but real responses show a DRF-paginated object — a
  // backend/docs contract mismatch. extractListData() safely handles
  // either shape.
  const categories = extractListData(categoriesData);

  // Applies filter changes immediately (categories, stock — instant filters)
  const applyFilters = (newLocal) => {
    setLocal(newLocal);
    onFiltersChange(newLocal);
  };

  const handleClear = () => {
    setLocal(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  };

  const selectedCategoryCount = local.categories?.length || 0;
  const hasAnyFilter =
    selectedCategoryCount > 0 ||
    local.minPrice ||
    local.maxPrice ||
    local.inStock;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary-dark text-white shadow-sm shadow-primary/20">
            <AiOutlineControl className="w-4.5 h-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Filters</h3>
            <p className="text-xs text-gray-400">Refine your search</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasAnyFilter && (
            <button
              onClick={handleClear}
              className="text-xs text-primary font-semibold hover:underline whitespace-nowrap"
            >
              Clear All
            </button>
          )}
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

      {/* ===== CATEGORY ===== */}
      <FilterSection
        icon={<AiOutlineAppstore className="w-4 h-4" />}
        title="Category"
        expanded={categoriesExpanded}
        onToggle={() => setCategoriesExpanded(!categoriesExpanded)}
      >
        {categories.length === 0 ? (
          <p className="text-xs text-gray-400">Loading categories…</p>
        ) : (
          categories.map((cat) => (
            <CheckRow
              key={cat.id}
              checked={(local.categories || []).includes(cat.id)}
              label={cat.name}
              onChange={() =>
                applyFilters({
                  ...local,
                  categories: (local.categories || []).includes(cat.id)
                    ? local.categories.filter((c) => c !== cat.id)
                    : [...(local.categories || []), cat.id],
                })
              }
            />
          ))
        )}
      </FilterSection>

      {/* ===== PRICE RANGE ===== */}
      <FilterSection
        icon={<AiOutlineDollarCircle className="w-4 h-4" />}
        title="Price Range"
        expanded={priceExpanded}
        onToggle={() => setPriceExpanded(!priceExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              Rs.
            </span>
            <input
              type="number"
              placeholder="0"
              value={local.minPrice}
              onChange={(e) => setLocal({ ...local, minPrice: e.target.value })}
              onBlur={() => onFiltersChange(local)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

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

      {/* ===== STOCK TOGGLE ===== */}
      <div className="flex items-center justify-between pt-5">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <AiOutlineCheckCircle className="w-4 h-4 text-primary" />
          In Stock Only
        </span>
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

export default ProductsFilters;
