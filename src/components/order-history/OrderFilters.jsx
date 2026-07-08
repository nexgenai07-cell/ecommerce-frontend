import { useState } from "react"; // useState manages the dropdown open/close toggle
import { motion, AnimatePresence } from "framer-motion"; // motion for animated underline, AnimatePresence for dropdown mount/unmount animation
import { AiOutlineCalendar, AiOutlineDown } from "react-icons/ai"; // Calendar icon for the date button, chevron icon that rotates when dropdown is open
import { BsBagCheckFill } from "react-icons/bs"; // Filled bag icon used inside the page header's gradient icon box
import { ORDER_STATUS } from "../../constants/statusTypes"; // Centralized order status constants — keeps status strings consistent across the app
import cn from "../../utils/cn"; // Utility that merges Tailwind class names conditionally without conflicts

// FILTER_TABS — static config array for the status tab bar
// Each tab has an id (matched against order.status) and a display label
export const FILTER_TABS = [
  { id: "all", label: "All Orders" }, // Shows every order regardless of status
  { id: ORDER_STATUS.PENDING, label: "Pending" }, // Orders that have been placed but not yet shipped
  { id: ORDER_STATUS.SHIPPED, label: "Shipped" }, // Orders currently in transit
  { id: ORDER_STATUS.DELIVERED, label: "Delivered" }, // Orders successfully received by the customer
  { id: ORDER_STATUS.CANCELLED, label: "Cancelled" }, // Orders that were cancelled before delivery
];

// DATE_RANGES — static config array for the date filter dropdown
// Each option has an id (passed up to parent for filtering logic) and a human-readable label
export const DATE_RANGES = [
  { id: "3months", label: "Last 3 months" }, // Show orders from the past 3 months
  { id: "6months", label: "Last 6 months" }, // Show orders from the past 6 months
  { id: "1year", label: "Last year" }, // Show orders from the past 12 months
  { id: "all", label: "All time" }, // Show every order ever placed — no date restriction
];

const OrderFilters = ({
  activeTab, // string — id of the currently selected status tab
  onTabChange, // function — called with the new tab id when user clicks a tab
  dateRange, // string — id of the currently selected date range option
  onDateRangeChange, // function — called with the new range id when user picks a date option
  orders = [], // array — full list of orders; used to calculate per-tab counts (defaults to empty array)
}) => {
  // dropdownOpen tracks whether the date range dropdown menu is visible or hidden
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
            {/* Subtitle — real, data-driven order count within the currently selected date window */}
            <p className="text-sm text-gray-400 mt-0.5">
              {orders.length > 0
                ? `${orders.length} order${orders.length !== 1 ? "s" : ""} found`
                : "Track and manage your purchase history"}
            </p>
          </div>
        </div>

        {/* ── Date range dropdown ───────────────────────────────────────────
            position:relative on this wrapper so the dropdown menu can be
            absolutely positioned relative to the button, not the viewport   */}
        <div className="relative">
          {/* Trigger button — shows the currently selected date range label
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

            {/* Display the label of whichever DATE_RANGES entry matches the current dateRange id */}
            {DATE_RANGES.find((d) => d.id === dateRange)?.label}

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

                {/* Dropdown panel — fades and slides in from slightly below the button */}
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }} // starts invisible, nudged down 4px, slightly shrunk
                  animate={{ opacity: 1, y: 0, scale: 1 }} // animates to fully visible, natural position and size
                  exit={{ opacity: 0, y: 4, scale: 0.98 }} // reverses on close
                  transition={{ duration: 0.15 }} // quick 150ms transition feels snappy
                  className="
                    absolute right-0 top-full mt-2 w-44 z-20
                    bg-white border border-gray-100 rounded-xl shadow-lg
                    overflow-hidden
                  "
                >
                  {/* Render one button per date range option */}
                  {DATE_RANGES.map((range) => (
                    <button
                      key={range.id} // stable key for React's reconciler
                      onClick={() => {
                        onDateRangeChange(range.id); // notify parent of the new selection
                        setDropdownOpen(false); // close the dropdown after selection
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors",
                        dateRange === range.id
                          ? "bg-primary-50 text-primary font-medium" // highlight the currently active range
                          : "text-gray-600 hover:bg-gray-50", // subtle hover for inactive options
                      )}
                    >
                      {range.label}{" "}
                      {/* Human-readable label e.g. "Last 3 months" */}
                    </button>
                  ))}
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
          border-b draws the gray baseline that the active underline sits on  */}
      <div className="bg-white rounded-2xl border border-gray-100 px-2">
        <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-gray-100">
          {FILTER_TABS.map((tab) => {
            // Calculate how many orders match this tab's status
            // "all" tab counts every order; other tabs filter by o.status
            const count =
              tab.id === "all"
                ? orders.length
                : orders.filter((o) => o.status === tab.id).length;

            return (
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

                {/* Order count badge — shown next to the label when count > 0
                    Hidden on the "all" tab to avoid redundancy with the subtitle */}
                {count > 0 && tab.id !== "all" && (
                  <span className="ml-1.5 text-xs text-gray-400">
                    ({count})
                  </span>
                )}

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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderFilters; // Export so it can be used inside the Order History page
