import { useState } from "react"; // Import React hook to manage local state
import { Link, useLocation, useNavigate } from "react-router-dom"; // Import Link for navigation, useLocation to get current path, useNavigate to redirect
import { useQuery } from "@tanstack/react-query"; // Import hook to fetch data from an API and cache it
import {
  AiOutlineDashboard, // Dashboard icon
  AiOutlineShoppingCart, // Shopping cart icon (Orders)
  AiOutlineShop, // Shop icon (imported but possibly unused here)
  AiOutlineUser, // User icon (Customers)
  AiOutlineBell, // Bell icon (Notifications)
  AiOutlineSetting, // Settings icon (imported but possibly unused here)
  AiOutlineLogout, // Logout icon
  AiOutlineLeft, // Left arrow icon (collapse sidebar)
  AiOutlineRight, // Right arrow icon (expand sidebar / sub-menu arrow)
  AiOutlineTag, // Tag icon (Categories/Discounts)
  AiOutlineBarChart, // Bar chart icon (Analytics)
  AiOutlineMessage, // Message icon (Complaints)
  AiOutlineWarning, // Warning icon (imported but possibly unused here)
  AiOutlineFileText, // File/document icon (Audit Logs)
} from "react-icons/ai";
import {
  BsWhatsapp, // WhatsApp icon
  BsInstagram, // Instagram icon (Marketing)
  BsBoxSeam, // Box icon (Products)
  BsArrowReturnLeft, // Return arrow icon (Returns)
} from "react-icons/bs";
import { MdOutlineInventory2 } from "react-icons/md"; // Inventory icon
import cn from "../../utils/cn"; // Import utility function to conditionally combine class names
import { ROUTES } from "../../constants/routes"; // Import all app route paths from one central file
import { QUERY_KEYS } from "../../constants/queryKeys"; // Import query key constants used for caching with react-query
import useAuth from "../../hooks/useAuth"; // Import custom hook to access authenticated user and logout function
import useUI from "../../hooks/useUI"; // Import custom hook to access UI state like sidebar open/close
import { showSuccess } from "../ui/Toast"; // Import toast function to show success messages
import { logoutUser as logoutApi } from "../../api/auth.api"; // Import the API function that logs the user out on the backend, renamed to avoid naming conflict
import { getDashboardSummary } from "../../api/analytics.api"; // Import the API function that fetches dashboard summary stats
import Avatar from "../ui/Avatar"; // Import Avatar component to display the user's profile picture

// =============================================
// NAV ITEMS CONFIG
// Each nav item's label, icon, route, and badge key
// The badge key is used to pull a count from the dashboard summary
// =============================================
const NAV_ITEMS = [
  // Array of navigation groups, each containing a list of items
  {
    group: "Main", // Group heading
    items: [
      {
        label: "Dashboard", // Text shown for this nav item
        icon: <AiOutlineDashboard className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_DASHBOARD, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Orders", // Text shown for this nav item
        icon: <AiOutlineShoppingCart className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_ORDERS, // Route this item navigates to
        badgeKey: "pending_orders", // Pending orders count comes from the dashboard summary
      },
      {
        label: "Products", // Text shown for this nav item
        icon: <BsBoxSeam className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_PRODUCTS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Categories", // Text shown for this nav item
        icon: <AiOutlineTag className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_CATEGORIES, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Inventory", // Text shown for this nav item
        icon: <MdOutlineInventory2 className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_ANALYTICS_INVENTORY, // Route this item navigates to
        badgeKey: "low_stock_products", // Low stock alert count
      },
      {
        label: "Customers", // Text shown for this nav item
        icon: <AiOutlineUser className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_CUSTOMERS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
    ],
  },
  {
    group: "Management", // Group heading
    items: [
      {
        label: "Returns", // Text shown for this nav item
        icon: <BsArrowReturnLeft className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_RETURNS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Complaints", // Text shown for this nav item
        icon: <AiOutlineMessage className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_COMPLAINTS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Discounts", // Text shown for this nav item
        icon: <AiOutlineTag className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_DISCOUNTS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
    ],
  },
  {
    group: "Analytics", // Group heading
    items: [
      {
        label: "Analytics", // Text shown for this nav item
        icon: <AiOutlineBarChart className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_ANALYTICS_SALES, // Route this item navigates to
        badgeKey: null, // No badge count for this item
        // Sub items — expand on hover/click
        subItems: [
          { label: "Sales Report", route: ROUTES.ADMIN_ANALYTICS_SALES }, // First sub item
          { label: "Revenue", route: ROUTES.ADMIN_ANALYTICS_REVENUE }, // Second sub item
          { label: "User Growth", route: ROUTES.ADMIN_ANALYTICS_CUSTOMERS }, // Third sub item
        ],
      },
      {
        label: "Marketing", // Text shown for this nav item
        icon: <BsInstagram className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_SOCIAL_DASHBOARD, // Route this item navigates to
        badgeKey: null, // No badge count for this item
        subItems: [
          { label: "Create Post", route: ROUTES.ADMIN_SOCIAL_CREATE_POST }, // First sub item
          { label: "Schedule", route: ROUTES.ADMIN_SOCIAL_CALENDAR }, // Second sub item
          { label: "Ad Campaigns", route: ROUTES.ADMIN_SOCIAL_DASHBOARD }, // Third sub item
        ],
      },
    ],
  },
  {
    group: "System", // Group heading
    items: [
      {
        label: "WhatsApp", // Text shown for this nav item
        icon: <BsWhatsapp className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_WHATSAPP_LOGS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Notifications", // Text shown for this nav item
        icon: <AiOutlineBell className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_NOTIFICATION_TEMPLATES, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
      {
        label: "Audit Logs", // Text shown for this nav item
        icon: <AiOutlineFileText className="w-5 h-5" />, // Icon for this nav item
        route: ROUTES.ADMIN_AUDIT_LOGS, // Route this item navigates to
        badgeKey: null, // No badge count for this item
      },
    ],
  },
];

const AdminSidebar = () => {
  // Define the AdminSidebar component
  const location = useLocation(); // Get the current URL location object (used to check which route is active)
  const navigate = useNavigate(); // Get function to programmatically navigate to other pages
  const { user, logoutUser } = useAuth(); // Get the current logged-in user and a function to log out from the auth hook
  const { sidebarOpen, handleToggleSidebar } = useUI(); // Get sidebar open/closed state and toggle function from the UI hook

  // Tracking which sub menu is expanded
  const [expandedItem, setExpandedItem] = useState(null); // Stores the label of the currently expanded nav item (or null if none)

  // =============================================
  // DASHBOARD SUMMARY API
  // Real data used for badge counts
  // pending_orders, low_stock_products
  // =============================================
  const { data: summaryData } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_SUMMARY, // Unique key used by react-query to cache this data
    queryFn: getDashboardSummary, // Function that fetches the dashboard summary from the API
    staleTime: 1000 * 60 * 2, // 2 minute cache — data is considered fresh for 2 minutes before refetching
  });

  const summary = summaryData?.data || {}; // Extract the summary data, or use an empty object if not yet loaded

  // =============================================
  // LOGOUT HANDLER
  // =============================================
  const handleLogout = async () => {
    // Async function to handle the logout process
    try {
      const refreshToken = localStorage.getItem("refreshToken"); // Get the refresh token saved in localStorage
      await logoutApi({ refresh: refreshToken }); // Call the backend API to invalidate the refresh token
    } catch (error) {
      // Even if the backend call fails, still log out locally
    } finally {
      logoutUser(); // Clear the user's auth state locally (Redux)
      showSuccess("Logged out successfully"); // Show a success toast
      navigate(ROUTES.ADMIN_LOGIN); // Redirect to the admin login page
    }
  };

  // Check if a route is the currently active page
  const isActive = (route) => location.pathname === route; // Returns true if the current URL path matches this route

  // Check if any of the sub items is currently active
  const isSubActive = (subItems) =>
    subItems?.some((sub) => location.pathname === sub.route); // Returns true if any sub item's route matches the current URL path

  return (
    <>
      {/* =============================================
          SIDEBAR
          Fixed on the left side on desktop
          Becomes an overlay on mobile
          ============================================= */}
      <aside
        className={cn(
          // Base classes
          "fixed left-0 top-0 h-screen bg-[#0d1b2a] flex flex-col z-drawer", // Fixed position, full height, dark background, vertical layout, layered above other content
          "transition-all duration-300 ease-in-out", // Smooth transition for width changes
          // Width — expanded or collapsed
          sidebarOpen ? "w-60" : "w-16", // Wider when expanded, narrower when collapsed
          // Hidden on mobile by default
          "hidden md:flex", // Hidden on small screens, shown as flex on medium screens and up
        )}
      >
        {/* ===== LOGO + COLLAPSE TOGGLE ===== */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 shrink-0">
          {" "}
          {/* Header row with padding, fixed height, bottom border */}
          {/* Logo — shown when expanded */}
          {sidebarOpen && ( // Only render the logo if the sidebar is expanded
            <Link
              to={ROUTES.ADMIN_DASHBOARD} // Navigate to admin dashboard when clicked
              className="text-white font-bold text-lg tracking-tight truncate" // White bold text, truncated if too long
            >
              Zyron ✦ {/* Logo text/brand name */}
            </Link>
          )}
          {/* Collapse toggle button */}
          <button
            onClick={handleToggleSidebar} // Toggle the sidebar open/closed state when clicked
            className={cn(
              "p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors", // Base button styling
              !sidebarOpen && "mx-auto", // Center the button horizontally when collapsed
            )}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} // Accessibility label that changes based on state
          >
            {
              sidebarOpen ? (
                <AiOutlineLeft className="w-4 h-4" /> // Show left arrow icon when expanded (clicking collapses it)
              ) : (
                <AiOutlineRight className="w-4 h-4" />
              ) // Show right arrow icon when collapsed (clicking expands it)
            }
          </button>
        </div>

        {/* ===== NAV ITEMS ===== */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 scrollbar-hide">
          {" "}
          {/* Scrollable navigation area, takes remaining space */}
          {NAV_ITEMS.map(
            (
              group, // Loop through each navigation group
            ) => (
              <div key={group.group}>
                {" "}
                {/* Container for one group, keyed by group name */}
                {/* Group label — only shown when expanded */}
                {sidebarOpen && ( // Only render the group title if the sidebar is expanded
                  <p className="px-4 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.group} {/* Group heading text */}
                  </p>
                )}
                <div className="flex flex-col gap-0.5 px-2">
                  {" "}
                  {/* Container for the items within this group */}
                  {group.items.map((item) => {
                    // Loop through each item within this group
                    const active =
                      isActive(item.route) || isSubActive(item.subItems); // Determine if this item (or one of its sub items) is currently active
                    const badgeCount = item.badgeKey
                      ? summary[item.badgeKey]
                      : null; // Get the badge count from the summary data if a badgeKey exists
                    const hasSubItems =
                      item.subItems && item.subItems.length > 0; // Check if this item has any sub items
                    const isExpanded = expandedItem === item.label; // Check if this specific item's sub menu is currently expanded

                    return (
                      <div key={item.label}>
                        {" "}
                        {/* Container for one nav item, keyed by its label */}
                        {/* Nav item button */}
                        <button
                          onClick={() => {
                            // Handle click on this nav item
                            if (hasSubItems) {
                              // If it has sub items, toggle expand/collapse
                              setExpandedItem(isExpanded ? null : item.label); // Collapse if already expanded, otherwise expand this item
                            } else {
                              navigate(item.route); // Otherwise navigate directly to the item's route
                            }
                          }}
                          className={cn(
                            // Base classes
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150", // Full width button with icon and text spaced apart
                            "text-sm font-medium", // Text styling
                            // Active state — emerald
                            active
                              ? "bg-primary/15 text-primary border-l-2 border-primary" // Highlighted styling when this item is active
                              : "text-gray-400 hover:bg-white/5 hover:text-white", // Default gray styling, lighter on hover
                            // Center when collapsed
                            !sidebarOpen && "justify-center px-2", // Center the icon when the sidebar is collapsed
                          )}
                          title={!sidebarOpen ? item.label : ""} // Show a tooltip with the label when collapsed (since text isn't visible)
                        >
                          {/* Icon */}
                          <span className="shrink-0">
                            {item.icon} {/* Render this item's icon */}
                          </span>

                          {/* Label + badge — shown when expanded */}
                          {sidebarOpen && ( // Only render the label and badge if the sidebar is expanded
                            <>
                              <span className="flex-1 text-left truncate">
                                {item.label}{" "}
                                {/* Render this item's label text */}
                              </span>

                              {/* Badge count */}
                              {badgeCount > 0 && ( // Only show the badge if there is a count greater than zero
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-danger text-white rounded-full leading-none">
                                  {badgeCount > 99 ? "99+" : badgeCount}{" "}
                                  {/* Cap the displayed number at "99+" if it's very large */}
                                </span>
                              )}

                              {/* Sub items arrow */}
                              {hasSubItems && ( // Only show the arrow if this item has sub items
                                <AiOutlineRight
                                  className={cn(
                                    "w-3 h-3 text-gray-500 transition-transform duration-200", // Small arrow icon with rotation transition
                                    isExpanded && "rotate-90", // Rotate the arrow when expanded to point downward
                                  )}
                                />
                              )}
                            </>
                          )}

                          {/* Badge dot when collapsed */}
                          {!sidebarOpen &&
                            badgeCount > 0 && ( // When collapsed, show a small dot instead of the full badge number
                              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" /> // Small red dot positioned at the top-right corner of the button
                            )}
                        </button>
                        {/* Sub items — shown when expanded */}
                        {hasSubItems &&
                          isExpanded &&
                          sidebarOpen && ( // Only render sub items if this item has them, is expanded, and the sidebar itself is expanded
                            <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                              {" "}
                              {/* Indented list with a left border line */}
                              {item.subItems.map(
                                (
                                  sub, // Loop through each sub item
                                ) => (
                                  <Link
                                    key={sub.route} // Unique key for each sub item, using its route
                                    to={sub.route} // Navigate to this sub item's route when clicked
                                    className={cn(
                                      "px-3 py-2 text-xs rounded-lg transition-colors", // Base styling for the sub item link
                                      isActive(sub.route)
                                        ? "text-primary font-medium" // Highlighted styling if this sub item is the active page
                                        : "text-gray-500 hover:text-white", // Default gray styling, white on hover
                                    )}
                                  >
                                    {sub.label}{" "}
                                    {/* Render the sub item's label text */}
                                  </Link>
                                ),
                              )}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </nav>

        {/* ===== ADMIN PROFILE — Bottom ===== */}
        <div className="border-t border-white/10 p-3 shrink-0">
          {" "}
          {/* Footer section with top border and padding */}
          <div
            className={cn(
              "flex items-center gap-3", // Row layout with spacing for avatar and info
              !sidebarOpen && "justify-center", // Center everything when the sidebar is collapsed
            )}
          >
            {/* Avatar */}
            <Avatar
              src={user?.avatar} // Pass the user's avatar image URL
              name={user?.name} // Pass the user's name (likely used as a fallback for initials)
              size="sm" // Small avatar size
              className="shrink-0" // Prevent the avatar from shrinking in the flex layout
            />

            {/* User info — shown when expanded */}
            {sidebarOpen && ( // Only render the user's name and role if the sidebar is expanded
              <div className="flex-1 min-w-0">
                {" "}
                {/* Takes remaining space, allows text truncation */}
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "Admin"}{" "}
                  {/* Show the user's name, or "Admin" as a fallback */}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.role === "admin" ? "Super Admin" : user?.role}{" "}
                  {/* Show "Super Admin" if role is admin, otherwise show the raw role */}
                </p>
              </div>
            )}

            {/* Logout button — shown when expanded */}
            {sidebarOpen && ( // Only render the logout button if the sidebar is expanded
              <button
                onClick={handleLogout} // Trigger the logout process when clicked
                className="p-1.5 text-gray-400 hover:text-danger transition-colors rounded-lg hover:bg-white/5" // Styled icon button, turns red on hover
                aria-label="Logout" // Accessibility label
              >
                <AiOutlineLogout className="w-4 h-4" /> {/* Logout icon */}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* =============================================
          MOBILE OVERLAY SIDEBAR
          Opens via the hamburger menu on mobile
          ============================================= */}
      <div className="md:hidden">
        {" "}
        {/* This whole block is hidden on medium screens and up — mobile only */}
        {/* Backdrop */}
        {sidebarOpen && ( // Only show the dark backdrop if the sidebar is open
          <div
            className="fixed inset-0 bg-black/60 z-drawer" // Full screen semi-transparent dark overlay
            onClick={handleToggleSidebar} // Clicking the backdrop closes the sidebar
          />
        )}
        {/* Mobile drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 h-screen w-60 bg-[#0d1b2a] flex flex-col z-modal", // Fixed position drawer, full height, fixed width, dark background
            "transition-transform duration-300", // Smooth slide transition
            sidebarOpen ? "translate-x-0" : "-translate-x-full", // Slide into view when open, slide out of view when closed
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
            {" "}
            {/* Header row with padding, fixed height, bottom border */}
            <Link
              to={ROUTES.ADMIN_DASHBOARD}
              className="text-white font-bold text-lg"
            >
              Zyron ✦ {/* Logo text/brand name */}
            </Link>
            <button
              onClick={handleToggleSidebar} // Close the mobile drawer when clicked
              className="p-1.5 text-gray-400 hover:text-white rounded-lg" // Styled icon button
            >
              <AiOutlineLeft className="w-4 h-4" />{" "}
              {/* Left arrow icon, used as a close button here */}
            </button>
          </div>

          {/* Nav — same as desktop */}
          <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 scrollbar-hide">
            {" "}
            {/* Scrollable navigation area, takes remaining space */}
            {NAV_ITEMS.map(
              (
                group, // Loop through each navigation group
              ) => (
                <div key={group.group}>
                  {" "}
                  {/* Container for one group, keyed by group name */}
                  <p className="px-4 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.group} {/* Group heading text */}
                  </p>
                  <div className="flex flex-col gap-0.5 px-2">
                    {" "}
                    {/* Container for the items within this group */}
                    {group.items.map((item) => {
                      // Loop through each item within this group
                      const active =
                        isActive(item.route) || isSubActive(item.subItems); // Determine if this item (or one of its sub items) is currently active
                      const badgeCount = item.badgeKey
                        ? summary[item.badgeKey]
                        : null; // Get the badge count from the summary data if a badgeKey exists

                      return (
                        <Link
                          key={item.label} // Unique key for each item, using its label
                          to={item.route} // Navigate to this item's route when clicked
                          onClick={handleToggleSidebar} // Close the mobile drawer after navigating
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", // Base styling for the nav link
                            active
                              ? "bg-primary/15 text-primary border-l-2 border-primary" // Highlighted styling when this item is active
                              : "text-gray-400 hover:bg-white/5 hover:text-white", // Default gray styling, lighter on hover
                          )}
                        >
                          <span className="shrink-0">{item.icon}</span>{" "}
                          {/* Render this item's icon */}
                          <span className="flex-1 truncate">
                            {item.label}
                          </span>{" "}
                          {/* Render this item's label text */}
                          {badgeCount > 0 && ( // Only show the badge if there is a count greater than zero
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-danger text-white rounded-full">
                              {badgeCount}{" "}
                              {/* Show the raw badge count (no "99+" cap here, unlike the desktop version) */}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </nav>

          {/* Profile */}
          <div className="border-t border-white/10 p-3">
            {" "}
            {/* Footer section with top border and padding */}
            <div className="flex items-center gap-3">
              {" "}
              {/* Row layout with spacing for avatar and info */}
              <Avatar src={user?.avatar} name={user?.name} size="sm" />{" "}
              {/* User's avatar image */}
              <div className="flex-1 min-w-0">
                {" "}
                {/* Takes remaining space, allows text truncation */}
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>{" "}
                {/* Show the user's name */}
                <p className="text-xs text-gray-400">Super Admin</p>{" "}
                {/* Static role label (always shows "Super Admin" here, unlike the desktop version) */}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-danger transition-colors"
              >
                <AiOutlineLogout className="w-4 h-4" />{" "}
                {/* Logout icon button */}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default AdminSidebar; // Export this component so it can be used in the admin layout
