import { useState } from "react"; // useState manages the dropdown open/close toggle and the custom-range validation message
import { motion, AnimatePresence } from "framer-motion"; // motion for animated underline, AnimatePresence for dropdown mount/unmount animation
import { AiOutlineCalendar, AiOutlineDown } from "react-icons/ai"; // Calendar icon for the date button, chevron icon that rotates when dropdown is open
import { BsBagCheckFill } from "react-icons/bs"; // Filled bag icon used inside the page header's gradient icon box
import { ORDER_STATUS } from "../../constants/statusTypes"; // Centralized order status constants — keeps status strings consistent across the app
import cn from "../../utils/cn"; // Utility that merges Tailwind class names conditionally without conflicts
import Input from "../ui/Input"; // Shared input component — reused here for the two native date pickers in the Custom Range panel

// FILTER_TABS — static config array for the status tab bar
// Each tab has an id (sent to the backend as the `status` query param)
// and a display label
export const FILTER_TABS = [
  { id: "all", label: "All Orders" }, // Shows every order regardless of status
  { id: ORDER_STATUS.PENDING, label: "Pending" }, // Orders that have been placed but not yet shipped
  { id: ORDER_STATUS.CONFIRMED, label: "Confirmed" }, // Payment succeeded — order confirmed, not yet shipped
  { id: ORDER_STATUS.SHIPPED, label: "Shipped" }, // Orders currently in transit
  { id: ORDER_STATUS.DELIVERED, label: "Delivered" }, // Orders successfully received by the customer
  { id: ORDER_STATUS.CANCELLED, label: "Cancelled" }, // Orders that were cancelled before delivery
];

// DATE_RANGES — static config array for the date filter dropdown
// Each preset's id is converted to real start_date/end_date bounds by
// getDateRangeBounds and sent to the backend. "custom" is handled
// separately below — its real bounds come from the two date pickers
// shown in the dropdown once it's selected, not from getDateRangeBounds.
export const DATE_RANGES = [
  { id: "today", label: "Today" }, // Only today's orders
  { id: "last7days", label: "Last 7 days" }, // Rolling 7-day window ending today
  { id: "1month", label: "Last month" }, // Rolling 1-month window ending today
  { id: "3months", label: "Last 3 months" }, // Rolling 3-month window ending today
  { id: "6months", label: "Last 6 months" }, // Rolling 6-month window ending today
  { id: "1year", label: "Last year" }, // Rolling 12-month window ending today
  { id: "all", label: "All time" }, // Show every order ever placed — no date restriction
  { id: "custom", label: "Custom range" }, // Customer picks their own start/end dates
];

const OrderFilters = ({
  activeTab, // string — id of the currently selected status tab
  onTabChange, // function — called with the new tab id when user clicks a tab
  dateRange, // string — id of the currently selected date range option (one of DATE_RANGES, including "custom")
  onDateRangeChange, // function — called with the new range id when user picks a preset or "Custom range"
  customStartDate, // string ("yyyy-mm-dd") — only meaningful while dateRange === "custom"
  customEndDate, // string ("yyyy-mm-dd") — only meaningful while dateRange === "custom"
  onCustomStartDateChange, // function — called with the new "yyyy-mm-dd" value
  onCustomEndDateChange, // function — called with the new "yyyy-mm-dd" value
  totalCount = 0, // number — real result count for the current filters, straight from the backend's paginated response
}) => {
  // dropdownOpen tracks whether the date range dropdown menu is visible or hidden
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Validation message shown under the custom date pickers when the
  // customer types an end date earlier than the start date (or vice
  // versa) — the invalid value is rejected before it ever reaches the
  // parent/backend.
  const [rangeError, setRangeError] = useState("");

  const isCustom = dateRange === "custom";

  // Trigger button label: the matching preset's label, or the two
  // picked dates once a custom range is active
  const triggerLabel = isCustom
    ? customStartDate || customEndDate
      ? `${customStartDate || "..."} - ${customEndDate || "..."}`
      : "Custom range"
    : DATE_RANGES.find((d) => d.id === dateRange)?.label;

  const handleCustomStartChange = (value) => {
    if (value && customEndDate && value > customEndDate) {
      setRangeError("Start date cannot be after the end date.");
      return;
    }
    setRangeError("");
    onCustomStartDateChange(value);
  };

  const handleCustomEndChange = (value) => {
    if (value && customStartDate && value < customStartDate) {
      setRangeError("End date cannot be before the start date.");
      return;
    }
    setRangeError("");
    onCustomEndDateChange(value);
  };

  return (
    // Outer wrapper stacks the heading row and the tab bar vertically with a gap
    <div className="flex flex-col gap-4">
      {/* ── Top row: icon box + heading/subtitle + date range dropdown ─────────
          flex-wrap lets them stack on very small screens
          items-start on mobile, items-center on sm+ so they align nicely     */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        {/* ── Left side: icon box + title + subtitle ────────────────────────────
            Same pattern as Wishlist/Notifications headers: a rounded gradient
            icon square sits to the left of a stacked title/subtitle block */}
        <div className="flex items-center gap-4">
          {/* Icon box — rounded gradient square, brand emerald tones
              shadow-primary/30 gives it a soft colored glow instead of a flat gray shadow
              shrink-0 keeps it from being squeezed on narrow screens */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
            <BsBagCheckFill className="w-5 h-5 sm:w-6 sm:h-6 text-white" />{" "}
            {/* Filled bag icon — represents purchase history */}
          </div>

          {/* Title + subtitle stack */}
          <div>
            {/* Page title — solid dark bold text, matches the reference header style */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              My Orders
            </h1>
            {/* Subtitle — real, backend-reported total for the currently
                selected status + date filters (the count of matching
                orders across every page, not just the ones on screen) */}
            <p className="text-sm text-gray-400 mt-0.5">
              {totalCount > 0
                ? `${totalCount} order${totalCount !== 1 ? "s" : ""} found`
                : "Track and manage your purchase history"}
            </p>
          </div>
        </div>

        {/* ── Date range dropdown ───────────────────────────────────────────
            position:relative on this wrapper so the dropdown menu can be
            absolutely positioned relative to the button, not the viewport   */}
        <div className="relative">
          {/* Trigger button — shows the currently selected date range label,
              or the picked "from - to" dates once a custom range is active
              Clicking toggles dropdownOpen between true and false            */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="
              flex items-center gap-2 px-4 py-2.5
              bg-white border border-gray-200 rounded-xl
              text-sm font-medium text-gray-700
              hover:border-primary/40 hover:bg-primary-50 hover:text-primary-dark
              transition-all duration-200
            "
          >
            {/* Calendar icon — purely decorative, indicates this is a date filter */}
            <AiOutlineCalendar className="w-4 h-4 text-gray-400" />

            {triggerLabel}

            {/* Chevron icon — rotates 180° when the dropdown is open to signal it can be closed */}
            <AiOutlineDown
              className={cn(
                "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
                dropdownOpen && "rotate-180", // flips the arrow upward when dropdown is open
              )}
            />
          </button>

          {/* AnimatePresence allows the dropdown to animate out smoothly when removed from the DOM */}
          <AnimatePresence>
            {dropdownOpen && (
              <>
                {/* Invisible full-screen backdrop — clicking anywhere outside closes the dropdown
                    z-10 keeps it above normal content but below the dropdown panel (z-20)        */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />

                {/* Dropdown panel — fades and slides in from slightly below the button
                    w-44 -> w-60 so the Custom Range date pickers below the
                    preset list have enough room without wrapping awkwardly */}
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }} // starts invisible, nudged down 4px, slightly shrunk
                  animate={{ opacity: 1, y: 0, scale: 1 }} // animates to fully visible, natural position and size
                  exit={{ opacity: 0, y: 4, scale: 0.98 }} // reverses on close
                  transition={{ duration: 0.15 }} // quick 150ms transition feels snappy
                  className="
                    absolute right-0 top-full mt-2 w-60 z-20
                    bg-white border border-gray-100 rounded-xl shadow-lg
                    overflow-hidden
                  "
                >
                  {/* Render one button per preset, plus the "Custom range" entry */}
                  {DATE_RANGES.map((range) => (
                    <button
                      key={range.id} // stable key for React's reconciler
                      onClick={() => {
                        onDateRangeChange(range.id); // notify parent of the new selection
                        setRangeError(""); // clear any leftover custom-range validation message
                        // Every preset applies immediately and closes the
                        // dropdown. "Custom range" stays open instead, so
                        // the customer can then pick the two dates below.
                        if (range.id !== "custom") setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors",
                        dateRange === range.id
                          ? "bg-primary-50 text-primary font-medium" // highlight the currently active range
                          : "text-gray-600 hover:bg-gray-50", // subtle hover for inactive options
                      )}
                    >
                      {range.label}
                    </button>
                  ))}

                  {/* Custom range date pickers — shown only once "Custom
                      range" is the active selection. Every change is sent
                      straight to the parent (which forwards it to the
                      backend as start_date/end_date), same as every other
                      preset above; there is no separate "Apply" button. */}
                  {isCustom && (
                    <div className="border-t border-gray-100 p-3 flex flex-col gap-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 min-w-0">
                          <span className="text-[11px] font-medium text-gray-500">
                            From
                          </span>
                          <Input
                            type="date"
                            value={customStartDate || ""}
                            max={customEndDate || undefined}
                            onChange={(e) =>
                              handleCustomStartChange(e.target.value)
                            }
                            className="py-1.5 px-2 text-xs min-w-0"
                          />
                        </label>

                        <label className="flex flex-col gap-1 min-w-0">
                          <span className="text-[11px] font-medium text-gray-500">
                            To
                          </span>
                          <Input
                            type="date"
                            value={customEndDate || ""}
                            min={customStartDate || undefined}
                            onChange={(e) =>
                              handleCustomEndChange(e.target.value)
                            }
                            className="py-1.5 px-2 text-xs min-w-0"
                          />
                        </label>
                      </div>

                      {rangeError && (
                        <p className="text-[11px] text-danger">{rangeError}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Status filter tab bar ──────────────────────────────────────────────
          Wrapped in its own white elevated card so the tab bar reads as a
          distinct, "raised" toolbar section, consistent with Notifications'
          filter bar treatment, instead of floating directly on the page
          overflow-x-auto + scrollbar-hide lets tabs scroll horizontally on
          narrow screens without showing an ugly scrollbar
          border-b draws the gray baseline that the active underline sits on
          Tabs render as plain labels with no per-tab count badge — the
          backend's order-list endpoint reports a total for the currently
          active filter only, not a separate count per status, so a
          "Cancelled (7)" style badge cannot be shown accurately without a
          dedicated per-status count endpoint. This mirrors the admin
          Orders page's status tabs, which are plain labels for the same
          reason. */}
      <div className="bg-white rounded-2xl border border-gray-100 px-2">
        <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-gray-100">
          {FILTER_TABS.map((tab) => (
            // shrink-0 prevents tabs from compressing — they scroll instead
            <button
              key={tab.id} // stable key for React's reconciler
              onClick={() => onTabChange(tab.id)} // notify parent which tab was clicked
              className={cn(
                "relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                activeTab === tab.id
                  ? "text-primary-dark" // active tab uses brand color
                  : "text-gray-400 hover:text-gray-600", // inactive tabs are muted, darken on hover
              )}
            >
              {/* Tab label text e.g. "Shipped" */}
              {tab.label}

              {/* Animated active underline — rendered only for the active tab
                  layoutId shared across all tabs so Framer Motion smoothly
                  slides the single underline element between tabs on click
                  Gradient fill instead of a flat line for a richer, on-brand feel */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="order-tab-underline" // shared layoutId — one underline morphs across tabs
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary to-primary-dark rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderFilters; // Export so it can be used inside the Order History page
