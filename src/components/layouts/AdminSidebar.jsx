import { useState, useRef, useEffect } from "react"; // Import React hooks: useState for local state, useRef to remember a pending timeout without re-rendering, useEffect to clean things up and react to outside changes
import { createPortal } from "react-dom"; // Import createPortal so the hover flyout can be rendered straight onto document.body, escaping the sidebar's scrollable/clipping container
import { Link, useLocation, useNavigate } from "react-router-dom"; // Import Link for navigation, useLocation to get current path, useNavigate to redirect
import {
  AiOutlineDashboard, // Dashboard icon
  AiOutlineShoppingCart, // Shopping cart icon (Orders)
  AiOutlineUser, // User icon (Customers)
  AiOutlineLogout, // Logout icon
  AiOutlineLeft, // Left arrow icon (collapse sidebar / close mobile drawer)
  AiOutlineRight, // Right arrow icon (expand sidebar / sub-menu chevron)
  AiOutlineUp, // Up arrow icon (profile dropdown chevron — menu opens upward since it sits at the bottom of the sidebar)
  AiOutlineTag, // Tag icon (Categories/Discounts)
  AiOutlineBarChart, // Bar chart icon (Analytics group)
  AiOutlineMessage, // Message icon (Complaints)
  AiOutlineFileText, // Document icon (Audit Logs)
  AiOutlineBell, // Bell icon (Send Notification)
  AiOutlineShareAlt, // Share icon (Social Media group)
  AiOutlineWhatsApp, // WhatsApp icon (WhatsApp group)
  AiOutlineUndo, // Undo/return-arrow icon (Returns)
  AiOutlineLineChart, // Line-chart icon (Sales Report)
  AiOutlineDollarCircle, // Dollar-circle icon (Revenue Report)
  AiOutlineTrophy, // Trophy icon (Products Performance)
  AiOutlineTeam, // Team icon (Customer Growth)
  AiOutlineWarning, // Warning icon (Inventory Alerts)
  AiOutlineExport, // Export icon (Export Data)
  AiOutlineAppstore, // Grid icon (Social Overview)
  AiOutlineFileImage, // Image icon (All Posts)
  AiOutlinePlusCircle, // Plus-circle icon (Create Post)
  AiOutlineCalendar, // Calendar icon (Content Calendar)
  AiOutlineLink, // Link icon (Connected Accounts)
  AiOutlineComment, // Comment icon (Bot Conversations)
  AiOutlinePhone, // Phone icon (WhatsApp Numbers)
} from "react-icons/ai";
import { BsBoxSeam } from "react-icons/bs"; // Box icon (Products)
import cn from "../../utils/cn"; // Import utility function to conditionally combine class names
import { ROUTES } from "../../constants/routes"; // Import all app route paths from one central file
import useAuth from "../../hooks/useAuth"; // Import custom hook to access authenticated user info
import useUI from "../../hooks/useUI"; // Import custom hook to access UI state like sidebar open/close
import useAdminLogout from "../../hooks/useAdminLogout"; // Import the shared admin logout hook — same logic used by TopHeader's profile menu, kept in one place instead of duplicated here
import Avatar from "../ui/Avatar"; // Import Avatar component to display the user's profile picture

// =============================================
// NAV ITEMS CONFIG
// Every real, built admin page (26+ pages) gets a home here, grouped
// into clear sections. No numeric count badges are shown next to any
// item — the sidebar only shows the icon, the page name, and (for
// group items) its list of sub-pages.
// =============================================
const NAV_ITEMS = [
  {
    group: "Main", // Group heading shown above this section's items
    items: [
      {
        label: "Dashboard", // Text shown for this nav item
        icon: <AiOutlineDashboard className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_DASHBOARD, // Route this item navigates to
      },
    ],
  },
  {
    group: "Catalog", // Group heading shown above this section's items
    items: [
      {
        label: "Products", // Text shown for this nav item
        icon: <BsBoxSeam className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_PRODUCTS, // Route this item navigates to
      },
      {
        label: "Categories", // Text shown for this nav item
        icon: <AiOutlineAppstore className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_CATEGORIES, // Route this item navigates to
      },
      {
        label: "Discounts", // Text shown for this nav item
        icon: <AiOutlineTag className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_DISCOUNTS, // Route this item navigates to
      },
    ],
  },
  {
    group: "Sales", // Group heading shown above this section's items
    items: [
      {
        label: "Orders", // Text shown for this nav item
        icon: <AiOutlineShoppingCart className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_ORDERS, // Route this item navigates to
      },
      {
        label: "Returns", // Text shown for this nav item
        icon: <AiOutlineUndo className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_RETURNS, // Route this item navigates to
      },
      {
        label: "Complaints", // Text shown for this nav item
        icon: <AiOutlineMessage className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_COMPLAINTS, // Route this item navigates to
      },
      {
        label: "Customers", // Text shown for this nav item
        icon: <AiOutlineUser className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_CUSTOMERS, // Route this item navigates to
      },
    ],
  },
  {
    group: "Insights", // Group heading shown above this section's items
    items: [
      {
        label: "Analytics", // Text shown for this nav item — an expandable group covering all 6 real analytics pages
        icon: <AiOutlineBarChart className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_ANALYTICS_SALES, // Clicking the parent itself lands on Sales Report, the first sub item
        subItems: [
          {
            label: "Sales Report",
            icon: <AiOutlineLineChart className="w-4 h-4" />,
            route: ROUTES.ADMIN_ANALYTICS_SALES,
          },
          {
            label: "Revenue Report",
            icon: <AiOutlineDollarCircle className="w-4 h-4" />,
            route: ROUTES.ADMIN_ANALYTICS_REVENUE,
          },
          {
            label: "Product Performance",
            icon: <AiOutlineTrophy className="w-4 h-4" />,
            route: ROUTES.ADMIN_ANALYTICS_PRODUCTS,
          },
          {
            label: "Customer Growth",
            icon: <AiOutlineTeam className="w-4 h-4" />,
            route: ROUTES.ADMIN_ANALYTICS_CUSTOMERS,
          },
          {
            label: "Inventory Alerts",
            icon: <AiOutlineWarning className="w-4 h-4" />,
            route: ROUTES.ADMIN_ANALYTICS_INVENTORY,
          },
          {
            label: "Export Data",
            icon: <AiOutlineExport className="w-4 h-4" />,
            route: ROUTES.ADMIN_ANALYTICS_EXPORT,
          },
        ],
      },
    ],
  },
  {
    group: "Marketing", // Group heading shown above this section's items
    items: [
      {
        label: "Social Media", // Text shown for this nav item — an expandable group covering all 5 real social pages
        icon: <AiOutlineShareAlt className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_SOCIAL_DASHBOARD, // Clicking the parent itself lands on the Social Dashboard
        subItems: [
          {
            label: "Overview",
            icon: <AiOutlineAppstore className="w-4 h-4" />,
            route: ROUTES.ADMIN_SOCIAL_DASHBOARD,
          },
          {
            label: "All Posts",
            icon: <AiOutlineFileImage className="w-4 h-4" />,
            route: ROUTES.ADMIN_SOCIAL_POSTS,
          },
          {
            label: "Create Post",
            icon: <AiOutlinePlusCircle className="w-4 h-4" />,
            route: ROUTES.ADMIN_SOCIAL_CREATE_POST,
          },
          {
            label: "Content Calendar",
            icon: <AiOutlineCalendar className="w-4 h-4" />,
            route: ROUTES.ADMIN_SOCIAL_CALENDAR,
          },
          {
            label: "Connected Accounts",
            icon: <AiOutlineLink className="w-4 h-4" />,
            route: ROUTES.ADMIN_SOCIAL_ACCOUNTS,
          },
        ],
      },
      {
        label: "WhatsApp", // Text shown for this nav item — an expandable group covering both real WhatsApp pages
        icon: <AiOutlineWhatsApp className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_WHATSAPP_LOGS, // Clicking the parent itself lands on Bot Conversations
        subItems: [
          {
            label: "Bot Conversations",
            icon: <AiOutlineComment className="w-4 h-4" />,
            route: ROUTES.ADMIN_WHATSAPP_LOGS,
          },
          {
            label: "Numbers",
            icon: <AiOutlinePhone className="w-4 h-4" />,
            route: ROUTES.ADMIN_WHATSAPP_NUMBERS,
          },
        ],
      },
    ],
  },
  {
    group: "System", // Group heading shown above this section's items
    items: [
      {
        label: "Audit Logs", // Text shown for this nav item
        icon: <AiOutlineFileText className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_AUDIT_LOGS, // Route this item navigates to
      },
      {
        label: "Send Notification", // Text shown for this nav item — matches the page's real, honest capability (see NotificationTemplates.jsx notes)
        icon: <AiOutlineBell className="w-4.5 h-4.5" />, // Icon for this nav item
        route: ROUTES.ADMIN_NOTIFICATION_TEMPLATES, // Route this item navigates to
      },
    ],
  },
];

const AdminSidebar = () => {
  // Define the AdminSidebar component
  const location = useLocation(); // Get the current URL location object (used to check which route is active)
  const navigate = useNavigate(); // Get function to programmatically navigate to other pages (used for sub-item clicks below)
  const { user } = useAuth(); // Get the current logged-in user's info from the auth hook (name, role, avatar)
  const { sidebarOpen, handleToggleSidebar } = useUI(); // Get sidebar open/closed state and toggle function from the UI hook
  const handleLogout = useAdminLogout(); // Shared logout handler — calls the logout API, clears Redux auth state, shows a toast, and redirects to /admin/login

  // Tracking which sub menu is expanded — pre-computed so whichever
  // group CONTAINS the current page starts already open, instead of
  // the admin landing on a page with its own parent menu collapsed
  const findExpandedGroupForCurrentPath = () => {
    for (const group of NAV_ITEMS) {
      for (const item of group.items) {
        if (item.subItems?.some((sub) => sub.route === location.pathname)) {
          return item.label;
        }
      }
    }
    return null;
  };
  const [expandedItem, setExpandedItem] = useState(
    findExpandedGroupForCurrentPath,
  );

  // =============================================
  // HOVER FLYOUT STATE (collapsed sidebar only)
  // When the desktop sidebar is collapsed down to icon-only width,
  // there is no room to show page names or sub-page lists inline.
  // Instead, hovering an icon opens a small floating panel next to
  // it — this state remembers WHICH item is being hovered, its
  // sub-pages (if any), and its exact screen position so the panel
  // can be drawn in exactly the right spot.
  // =============================================
  const [flyoutData, setFlyoutData] = useState(null); // Holds { label, icon, subItems, route, top, left } for the currently hovered collapsed icon, or null when nothing is hovered
  const flyoutCloseTimer = useRef(null); // Remembers the pending "close the flyout" timer so it can be cancelled if the pointer comes back before it fires

  // Immediately hide any open flyout whenever the sidebar is expanded
  // again, or whenever the admin navigates to a different page —
  // otherwise a stale flyout could keep floating on screen pointing
  // at an icon that no longer matches its old collapsed position
  useEffect(() => {
    setFlyoutData(null);
  }, [sidebarOpen, location.pathname]);

  // Clear any pending close-timer if this component unmounts while a
  // close is still scheduled, so we never try to update state on a
  // component that no longer exists
  useEffect(() => {
    return () => clearTimeout(flyoutCloseTimer.current);
  }, []);

  // Opens the floating tooltip/menu for a collapsed sidebar icon.
  // Reads the icon's exact on-screen position with
  // getBoundingClientRect so the flyout — which is rendered through
  // a portal straight onto document.body — can still be lined up
  // perfectly next to the icon that triggered it, even though it
  // physically lives outside the sidebar's scrollable container.
  const openFlyout = (item, iconElement) => {
    clearTimeout(flyoutCloseTimer.current); // Cancel any close that was scheduled a moment ago
    const rect = iconElement.getBoundingClientRect(); // Read the icon's live position and size on screen
    setFlyoutData({
      label: item.label, // The page or group name — this is what answers "hover kareen to naam aaye"
      icon: item.icon, // Icon shown in the flyout's header row
      subItems: item.subItems || null, // Sub-pages to list, only present for group items like Analytics
      route: item.route, // Direct route to use when there are no sub-pages
      top: rect.top, // Line the flyout up vertically with the hovered icon
      left: rect.right + 10, // Sit just to the right of the collapsed sidebar, with a small gap
    });
  };

  // Schedules the flyout to close after a brief delay instead of
  // closing it the instant the pointer leaves the icon — this small
  // grace period is what lets the pointer travel diagonally from the
  // icon into the flyout panel itself without the panel vanishing
  // out from under the cursor
  const scheduleCloseFlyout = () => {
    flyoutCloseTimer.current = setTimeout(() => setFlyoutData(null), 150);
  };

  // Cancels a scheduled close — called when the pointer enters the
  // flyout panel itself, so hovering the menu keeps it open
  const cancelCloseFlyout = () => {
    clearTimeout(flyoutCloseTimer.current);
  };

  // =============================================
  // BOTTOM PROFILE DROPDOWN STATE
  // Clicking the avatar/name row at the bottom of the sidebar no
  // longer logs the admin out directly — it opens a small dropdown
  // ABOVE the row (since the row sits at the very bottom), and only
  // the "Logout" button inside that dropdown actually signs out.
  // =============================================
  const [profileMenuOpen, setProfileMenuOpen] = useState(false); // Whether the account dropdown is currently open
  const desktopProfileRef = useRef(null); // Wraps the DESKTOP profile section, for outside-click detection
  const mobileProfileRef = useRef(null); // Wraps the MOBILE drawer's profile section, for outside-click detection (both sidebars exist in the DOM at once — one is just CSS-hidden depending on screen size)

  // Close the account dropdown whenever the admin clicks anywhere
  // outside of it, the same way most account menus behave
  useEffect(() => {
    if (!profileMenuOpen) return undefined; // No listener needed while the menu is already closed
    const handleClickOutside = (event) => {
      const clickedInsideDesktop =
        desktopProfileRef.current &&
        desktopProfileRef.current.contains(event.target);
      const clickedInsideMobile =
        mobileProfileRef.current &&
        mobileProfileRef.current.contains(event.target);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  // Also close the dropdown automatically when the sidebar is
  // collapsed/expanded or the admin navigates away, so it never gets
  // left open pointing at a row that has since moved or changed shape
  useEffect(() => {
    setProfileMenuOpen(false);
  }, [sidebarOpen, location.pathname]);

  // Check if a route is the currently active page
  const isActive = (route) => location.pathname === route; // Returns true if the current URL path matches this route

  // Check if any of the sub items is currently active
  const isSubActive = (subItems) =>
    subItems?.some((sub) => location.pathname === sub.route); // Returns true if any sub item's route matches the current URL path

  // =============================================
  // SHARED NAV RENDERER
  // Both the desktop sidebar and the mobile drawer render the exact
  // same nav tree — extracted into one function so both stay
  // perfectly in sync instead of drifting apart over time.
  // isMobile controls small behavioral differences: mobile always
  // shows full labels (no collapsed icon-only state) and closes the
  // drawer after navigating.
  // =============================================
  const renderNavGroups = ({ isMobile }) => (
    <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-5 scrollbar-hide">
      {NAV_ITEMS.map((group) => (
        <div key={group.group}>
          {/* Group label — hidden entirely when the desktop sidebar is
              collapsed to icon-only width, always shown on mobile */}
          {(sidebarOpen || isMobile) && (
            <div className="flex items-center gap-2 px-4 mb-2">
              {/* Small emerald dot bullet — a tiny decorative touch that
                  ties every section label back to the brand color */}
              <span className="w-1 h-1 rounded-full bg-primary" />
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                {group.group}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-0.5 px-2">
            {group.items.map((item) => {
              const active = isActive(item.route) || isSubActive(item.subItems); // Determine if this item (or one of its sub items) is currently active
              const hasSubItems = item.subItems && item.subItems.length > 0; // Check if this item has any sub items
              const isExpanded = expandedItem === item.label; // Check if this specific item's sub menu is currently expanded
              const collapsed = !sidebarOpen && !isMobile; // Desktop-only collapsed (icon-only) state

              return (
                <div
                  key={item.label}
                  // Only wire up hover tracking on the desktop collapsed
                  // (icon-only) sidebar — the expanded sidebar and the
                  // mobile drawer already show everything inline, so
                  // they don't need a hover flyout
                  onMouseEnter={
                    collapsed
                      ? (event) => openFlyout(item, event.currentTarget)
                      : undefined
                  }
                  onMouseLeave={collapsed ? scheduleCloseFlyout : undefined}
                >
                  {/* Nav item button/link */}
                  {hasSubItems ? (
                    // Items WITH sub-menus are buttons that toggle
                    // expand/collapse rather than navigating directly
                    <button
                      onClick={() =>
                        setExpandedItem(isExpanded ? null : item.label)
                      }
                      className={cn(
                        "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                        "text-sm font-medium",
                        active
                          ? "text-white"
                          : "text-gray-400 hover:text-white hover:bg-white/6",
                        collapsed && "justify-center px-2",
                      )}
                      // No native "title" tooltip here anymore — the
                      // custom hover flyout (rendered via portal below)
                      // already shows the page name, and having both at
                      // once used to cause two overlapping tooltips
                      aria-label={collapsed ? item.label : undefined}
                    >
                      {/* Active background — a soft gradient wash rather
                          than a flat fill, giving the highlighted item
                          more visual depth */}
                      {active && (
                        <span className="absolute inset-0 rounded-xl bg-linear-to-r from-primary/20 via-primary/10 to-transparent" />
                      )}
                      {/* Active accent bar — a rounded pill on the far
                          left edge, replacing the old flat 2px border */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
                      )}

                      {/* Icon in its own small rounded box — filled
                          solid emerald when active, subtly tinted on
                          hover otherwise, matching the icon-in-a-box
                          language used across StatsCard elsewhere */}
                      <span
                        className={cn(
                          "relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200",
                          active
                            ? "bg-primary text-white shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
                            : "bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white",
                        )}
                      >
                        {item.icon}
                      </span>

                      {(sidebarOpen || isMobile) && (
                        <>
                          <span className="relative z-10 flex-1 text-left truncate">
                            {item.label}
                          </span>

                          <AiOutlineRight
                            className={cn(
                              "relative z-10 w-3.5 h-3.5 text-gray-500 transition-transform duration-200 shrink-0",
                              isExpanded && "rotate-90 text-primary",
                            )}
                          />
                        </>
                      )}
                    </button>
                  ) : (
                    // Items WITHOUT sub-menus are real <Link> elements
                    // that navigate directly
                    <Link
                      to={item.route}
                      onClick={isMobile ? handleToggleSidebar : undefined}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                        "text-sm font-medium",
                        active
                          ? "text-white"
                          : "text-gray-400 hover:text-white hover:bg-white/6",
                        collapsed && "justify-center px-2",
                      )}
                      // Same reasoning as above — the custom flyout
                      // tooltip replaces the native browser title
                      aria-label={collapsed ? item.label : undefined}
                    >
                      {active && (
                        <span className="absolute inset-0 rounded-xl bg-linear-to-r from-primary/20 via-primary/10 to-transparent" />
                      )}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
                      )}

                      <span
                        className={cn(
                          "relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200",
                          active
                            ? "bg-primary text-white shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
                            : "bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white",
                        )}
                      >
                        {item.icon}
                      </span>

                      {(sidebarOpen || isMobile) && (
                        <span className="relative z-10 flex-1 truncate">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )}

                  {/* Sub items — shown when expanded, with a connecting
                      vertical line tying them visually to their parent */}
                  {hasSubItems && isExpanded && (sidebarOpen || isMobile) && (
                    <div className="ml-6.75 mt-1 mb-1 flex flex-col gap-0.5 border-l border-white/10 pl-3 animate-[fadeIn_0.15s_ease-out]">
                      {item.subItems.map((sub) => {
                        const subActive = isActive(sub.route);
                        return (
                          <Link
                            key={sub.route}
                            to={sub.route}
                            onClick={isMobile ? handleToggleSidebar : undefined}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors duration-150",
                              subActive
                                ? "text-primary bg-primary/10 font-semibold"
                                : "text-gray-500 hover:text-white hover:bg-white/5",
                            )}
                          >
                            <span
                              className={
                                subActive ? "text-primary" : "text-gray-500"
                              }
                            >
                              {sub.icon}
                            </span>
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* =============================================
          SIDEBAR
          Fixed on the left side on desktop
          Becomes an overlay on mobile
          ============================================= */}
      <aside
        className={cn(
          // Base classes — a very subtle top-to-bottom gradient
          // instead of a completely flat dark fill, giving the panel
          // a touch more depth
          "fixed left-0 top-0 h-screen bg-linear-to-b from-[#0f2133] to-[#0a1622] flex flex-col z-drawer border-r border-white/4",
          "transition-all duration-300 ease-in-out", // Smooth transition for width changes
          // Width — expanded or collapsed
          sidebarOpen ? "w-64" : "w-18", // Slightly wider expanded state than before, for extra breathing room
          // Hidden on mobile by default
          "hidden md:flex", // Hidden on small screens, shown as flex on medium screens and up
        )}
      >
        {/* ===== LOGO + COLLAPSE TOGGLE ===== */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/6 shrink-0">
          {sidebarOpen ? (
            <Link
              to={ROUTES.ADMIN_DASHBOARD}
              className="flex items-center gap-2.5 min-w-0"
            >
              {/* Gradient logo mark with a soft glow ring — replaces
                  the old plain lightning-bolt-in-a-box treatment */}
              <span className="relative w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shrink-0 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]">
                <span className="text-white font-bold text-base">Z</span>
              </span>
              <div className="min-w-0">
                <p className="text-white font-bold text-[15px] leading-tight tracking-tight truncate">
                  Zyron
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-tight">
                  Admin Panel
                </p>
              </div>
            </Link>
          ) : (
            <Link to={ROUTES.ADMIN_DASHBOARD} className="mx-auto">
              <span className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-[0_0_0_4px_rgba(16,185,129,0.12)]">
                <span className="text-white font-bold text-base">Z</span>
              </span>
            </Link>
          )}

          {/* Collapse toggle button — only rendered alongside the full
              logo when expanded, since the collapsed state already
              centers the logo mark itself above */}
          {sidebarOpen && (
            <button
              onClick={handleToggleSidebar} // Toggle the sidebar open/closed state when clicked
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <AiOutlineLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed-state expand button — sits just below the logo
            instead of squeezed into the header row, since there's no
            room for both the icon and a toggle side by side there */}
        {!sidebarOpen && (
          <button
            onClick={handleToggleSidebar}
            className="mx-auto mt-2 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Expand sidebar"
          >
            <AiOutlineRight className="w-4 h-4" />
          </button>
        )}

        {renderNavGroups({ isMobile: false })}

        {/* ===== ADMIN PROFILE — Bottom ===== */}
        <div
          ref={desktopProfileRef} // Lets the outside-click handler know where "inside the desktop menu" ends
          className="relative border-t border-white/6 p-3 shrink-0"
        >
          {/* Account dropdown — opens UPWARD (bottom-full) since this
              whole section sits at the very bottom of the sidebar and
              there is no room to open downward */}
          {profileMenuOpen && (
            <div
              className={cn(
                "absolute bottom-full mb-2 rounded-xl border border-white/10 bg-linear-to-b from-[#0f2133] to-[#0a1622] shadow-2xl shadow-black/50 py-1.5 overflow-hidden z-20",
                sidebarOpen
                  ? "left-3 right-3"
                  : "left-25 -translate-x-1/2 w-44",
              )}
            >
              {/* Identity header so the admin can confirm which
                  account they're about to sign out of */}
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-medium text-white truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {user?.role === "admin" ? "Super Admin" : user?.role}
                </p>
              </div>

              {/* The ONLY control that actually logs the admin out now
                  — the row below just opens this menu */}
              <button
                onClick={() => {
                  setProfileMenuOpen(false); // Close the dropdown first
                  handleLogout(); // Then run the shared logout flow
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-danger/10 transition-colors"
              >
                <AiOutlineLogout className="w-3.5 h-3.5 text-danger" />
                Logout
              </button>
            </div>
          )}

          {/* Clickable profile row — toggles the dropdown above it
              instead of signing out immediately */}
          <button
            onClick={() => setProfileMenuOpen((open) => !open)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl p-2 transition-colors",
              sidebarOpen && "bg-white/4 hover:bg-white/[0.07]",
              !sidebarOpen && "justify-center hover:bg-white/[0.07]",
            )}
            aria-label="Open account menu"
            aria-expanded={profileMenuOpen}
          >
            {/* Avatar with a small "online" status ring — genuinely
                honest here since the admin viewing this IS actively
                using the panel right now, not a fabricated presence
                indicator */}
            <div className="relative shrink-0">
              <Avatar src={user?.avatar} name={user?.name} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-[#0a1622]" />
            </div>

            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.name || "Admin"}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {user?.role === "admin" ? "Super Admin" : user?.role}
                  </p>
                </div>

                {/* Chevron flips to point down when the menu is
                    closed and up when it's open, reinforcing that it
                    expands upward */}
                <AiOutlineUp
                  className={cn(
                    "w-3.5 h-3.5 text-gray-500 transition-transform duration-200 shrink-0",
                    !profileMenuOpen && "rotate-180",
                  )}
                />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* =============================================
          MOBILE OVERLAY SIDEBAR
          Opens via the hamburger menu on mobile
          ============================================= */}
      <div className="md:hidden">
        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-drawer" // Full screen semi-transparent dark overlay with a soft blur for extra polish
            onClick={handleToggleSidebar} // Clicking the backdrop closes the sidebar
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 h-screen w-72 bg-linear-to-b from-[#0f2133] to-[#0a1622] flex flex-col z-modal", // Fixed position drawer, full height, fixed width, matching gradient
            "transition-transform duration-300", // Smooth slide transition
            sidebarOpen ? "translate-x-0" : "-translate-x-full", // Slide into view when open, slide out of view when closed
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/6">
            <Link
              to={ROUTES.ADMIN_DASHBOARD}
              className="flex items-center gap-2.5"
            >
              <span className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-[0_0_0_4px_rgba(16,185,129,0.12)]">
                <span className="text-white font-bold text-base">Z</span>
              </span>
              <div>
                <p className="text-white font-bold text-[15px] leading-tight">
                  Zyron
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-tight">
                  Admin Panel
                </p>
              </div>
            </Link>
            <button
              onClick={handleToggleSidebar} // Close the mobile drawer when clicked
              className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <AiOutlineLeft className="w-4 h-4" />
            </button>
          </div>

          {renderNavGroups({ isMobile: true })}

          {/* Profile — mobile drawer always shows the expanded
              (avatar + name) layout, since there's no icon-only
              collapsed state on mobile */}
          <div
            ref={mobileProfileRef} // Lets the outside-click handler know where "inside the mobile menu" ends
            className="relative border-t border-white/6 p-3"
          >
            {/* Account dropdown — opens UPWARD, same as the desktop
                version, since this section also sits at the bottom */}
            {profileMenuOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-white/10 bg-linear-to-b from-[#0f2133] to-[#0a1622] shadow-2xl shadow-black/50 py-1.5 overflow-hidden z-20">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-medium text-white truncate">
                    {user?.name || "Admin"}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {user?.role === "admin" ? "Super Admin" : user?.role}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false); // Close the dropdown first
                    handleLogout(); // Then run the shared logout flow
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-danger/10 transition-colors"
                >
                  <AiOutlineLogout className="w-3.5 h-3.5 text-danger" />
                  Logout
                </button>
              </div>
            )}

            <button
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="w-full flex items-center gap-3 rounded-xl p-2 bg-white/4 hover:bg-white/[0.07] transition-colors"
              aria-label="Open account menu"
              aria-expanded={profileMenuOpen}
            >
              <div className="relative shrink-0">
                <Avatar src={user?.avatar} name={user?.name} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-[#0a1622]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {user?.role === "admin" ? "Super Admin" : user?.role}
                </p>
              </div>
              <AiOutlineUp
                className={cn(
                  "w-3.5 h-3.5 text-gray-500 transition-transform duration-200 shrink-0",
                  !profileMenuOpen && "rotate-180",
                )}
              />
            </button>
          </div>
        </aside>
      </div>

      {/* =============================================
          FLOATING HOVER FLYOUT (Portal)
          Rendered straight onto document.body via a portal so it
          escapes the sidebar's scrollable/clipping container and is
          never cut off or hidden behind other page content. Only
          ever appears when the desktop sidebar is collapsed to
          icon-only width and the pointer is hovering a nav icon.
          This is what makes Analytics / Social Media / WhatsApp
          sub-pages reachable even while the sidebar is fully
          collapsed, and doubles as the "hover shows the page name"
          tooltip for every icon.
          ============================================= */}
      {flyoutData &&
        createPortal(
          <div
            className="fixed z-999 min-w-47.5 max-w-60 rounded-xl border border-white/10 bg-linear-to-b from-[#0f2133] to-[#0a1622] shadow-2xl shadow-black/50 py-2"
            style={{ top: flyoutData.top, left: flyoutData.left }} // Positioned in real screen pixels, computed from the hovered icon's exact bounding box
            onMouseEnter={cancelCloseFlyout} // Keep the flyout open while the pointer is over it
            onMouseLeave={scheduleCloseFlyout} // Start the close countdown again once the pointer leaves it
          >
            {/* Small triangular pointer connecting the flyout visually
                back to its trigger icon, colored to match the panel */}
            <span className="absolute top-4 -left-1.5 w-3 h-3 bg-[#0f2133] border-l border-b border-white/10 rotate-45" />

            {/* Header row acts as the hover tooltip — always shows the
                item's real name for every collapsed icon, whether it
                has sub-pages or not */}
            <div className="relative px-3 pb-2 mb-1 border-b border-white/10 flex items-center gap-2">
              <span className="text-primary">{flyoutData.icon}</span>
              <span className="text-xs font-semibold text-white tracking-wide truncate">
                {flyoutData.label}
              </span>
            </div>

            {/* Sub-pages list — reachable and clickable even while the
                sidebar is fully collapsed, fixing the original issue
                where sub-pages simply vanished when collapsed */}
            {flyoutData.subItems ? (
              <div className="relative flex flex-col gap-0.5 px-1.5">
                {flyoutData.subItems.map((sub) => {
                  const subActive = isActive(sub.route); // Highlight the sub-page matching the current URL
                  return (
                    <Link
                      key={sub.route}
                      to={sub.route}
                      onClick={() => setFlyoutData(null)} // Close the flyout as soon as a sub-page is chosen
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg transition-colors duration-150",
                        subActive
                          ? "text-primary bg-primary/10 font-semibold"
                          : "text-gray-400 hover:text-white hover:bg-white/5",
                      )}
                    >
                      <span
                        className={subActive ? "text-primary" : "text-gray-500"}
                      >
                        {sub.icon}
                      </span>
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            ) : (
              // Items with no sub-pages just need the header above as
              // their tooltip — this direct link also lets the admin
              // click straight through from the flyout itself
              <div className="relative px-3">
                <Link
                  to={flyoutData.route}
                  onClick={() => setFlyoutData(null)}
                  className="text-[11px] text-gray-500 hover:text-primary transition-colors"
                >
                  Open {flyoutData.label} →
                </Link>
              </div>
            )}
          </div>,
          document.body, // Mount target — escapes every parent's overflow/clipping so the flyout always renders on top, fully visible
        )}
    </>
  );
};

export default AdminSidebar; // Export this component so it can be used in the admin layout
