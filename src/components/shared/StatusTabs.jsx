/**
 * StatusTabs
 *
 * A horizontally-scrollable row of pill buttons for quick, single-click
 * filtering by a status-like field (order status, complaint status,
 * discount status, and so on). This exact markup and behaviour used to
 * be copy-pasted into every admin list page individually — it now lives
 * in one place so every status pill row in the admin panel looks and
 * scrolls identically, including on narrow mobile screens.
 *
 * Props:
 * - tabs:        Array of { key, label }. Use key: "" for the "All" tab.
 * - activeKey:   The currently selected tab's key. Ignored when
 *                `isSelected` is provided (see below).
 * - onChange:    (key) => void, called when a tab is clicked.
 * - isSelected:  Optional (tab) => boolean, used instead of matching
 *                `activeKey` when a page needs a more flexible notion
 *                of "selected" — for example multi-select status tabs
 *                on the Inventory Alerts page, where several tabs can
 *                be active at once and the "All" tab's own active state
 *                also depends on other filters (search, category) being
 *                empty. When omitted, a tab is selected exactly when
 *                `tab.key === activeKey`.
 * - variant:     "filled" (default) — solid gradient pill for the
 *                primary status row, e.g. Order Status.
 *                "outline" — lighter bordered pill, used for a second,
 *                secondary tab row on the same page (e.g. Priority)
 *                so it stays visually distinct from the primary row.
 */
const StatusTabs = ({
  tabs,
  activeKey,
  onChange,
  isSelected,
  variant = "filled",
}) => (
  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
    {tabs.map((tab) => {
      const isActive = isSelected ? isSelected(tab) : activeKey === tab.key;
      return (
        <button
          key={tab.key || "all"}
          type="button"
          onClick={() => onChange(tab.key)}
          className={
            variant === "outline"
              ? `px-3.5 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`
              : `px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`
          }
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default StatusTabs;
