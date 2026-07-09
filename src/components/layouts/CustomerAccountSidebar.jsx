import { Link, useLocation, useNavigate } from "react-router-dom"; // Import Link for navigation, useLocation to get current path, useNavigate to redirect
import { useQuery } from "@tanstack/react-query"; // Import hook to fetch and cache data from APIs
import {
  AiOutlineDashboard, // Dashboard icon
  AiOutlineShoppingCart, // Shopping cart icon (Orders)
  AiOutlineBell, // Bell icon (Notifications)
  AiOutlineHeart, // Heart icon (Wishlist)
  AiOutlineUser, // User icon (Profile)
  AiOutlineLogout, // Logout icon
  AiOutlineMessage, // Message icon (imported but possibly unused here)
  AiOutlineHome, // Home icon (used in mobile tab bar)
} from "react-icons/ai";
import { BsRobot, BsTicketDetailed } from "react-icons/bs"; // Robot icon (AI Support) and ticket icon (Support Tickets)
import { MdOutlineAssignmentReturn } from "react-icons/md"; // Return/assignment icon (Returns)
import cn from "../../utils/cn"; // Import utility function to conditionally combine class names
import { ROUTES } from "../../constants/routes"; // Import all app route paths from one central file
import { QUERY_KEYS } from "../../constants/queryKeys"; // Import query key constants used for caching with react-query
import useAuth from "../../hooks/useAuth"; // Import custom hook to access authenticated user and logout function
import { showSuccess } from "../ui/Toast"; // Import toast function to show success messages
import { logoutUser as logoutApi } from "../../api/auth.api"; // Import the API function that logs the user out on the backend, renamed to avoid naming conflict
import { getMyOrders } from "../../api/orders.api"; // Import the API function that fetches the current user's orders
import { getNotifications } from "../../api/notifications.api"; // Import the API function that fetches notifications
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on notifications endpoint)
import { getMyProfile } from "../../api/auth.api"; // Import the API function that fetches the current user's profile
import Avatar from "../ui/Avatar"; // Import Avatar component to display the user's profile picture

// =============================================
// SIDEBAR NAV ITEMS
// =============================================
const NAV_ITEMS = [
  // Array of navigation items shown in the account sidebar
  {
    label: "Dashboard", // Text shown for this nav item
    icon: <AiOutlineDashboard className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_DASHBOARD, // Route this item navigates to
    badgeKey: null, // No badge count for this item
  },
  {
    label: "My Orders", // Text shown for this nav item
    icon: <AiOutlineShoppingCart className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_ORDERS, // Route this item navigates to
    badgeKey: "orders", // Pending orders count
  },
  {
    label: "Notifications", // Text shown for this nav item
    icon: <AiOutlineBell className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_NOTIFICATIONS, // Route this item navigates to
    badgeKey: "notifications", // Unread notifications count
  },
  {
    label: "Wishlist", // Text shown for this nav item
    icon: <AiOutlineHeart className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_WISHLIST, // Route this item navigates to
    badgeKey: null, // No badge count for this item
  },
  {
    label: "Support Tickets", // Text shown for this nav item
    icon: <BsTicketDetailed className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_COMPLAINTS, // Route this item navigates to
    badgeKey: null, // No badge count for this item
  },
  {
    label: "Returns", // Text shown for this nav item
    icon: <MdOutlineAssignmentReturn className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_RETURNS, // Route this item navigates to
    badgeKey: null, // No badge count for this item
  },
  {
    label: "Profile", // Text shown for this nav item
    icon: <AiOutlineUser className="w-5 h-5" />, // Icon for this nav item
    route: ROUTES.ACCOUNT_PROFILE, // Route this item navigates to
    badgeKey: null, // No badge count for this item
  },
];

// Mobile bottom tab items — only the main 4
const MOBILE_TAB_ITEMS = [
  // Array of items shown in the mobile bottom tab bar
  {
    label: "Home", // Text shown for this tab
    icon: <AiOutlineHome className="w-5 h-5" />, // Icon for this tab
    route: ROUTES.HOME, // Route this tab navigates to
  },
  {
    label: "Orders", // Text shown for this tab
    icon: <AiOutlineShoppingCart className="w-5 h-5" />, // Icon for this tab
    route: ROUTES.ACCOUNT_ORDERS, // Route this tab navigates to
  },
  {
    label: "Wish", // Text shown for this tab (short for Wishlist)
    icon: <AiOutlineHeart className="w-5 h-5" />, // Icon for this tab
    route: ROUTES.ACCOUNT_WISHLIST, // Route this tab navigates to
  },
  {
    label: "Account", // Text shown for this tab
    icon: <AiOutlineUser className="w-5 h-5" />, // Icon for this tab
    route: ROUTES.ACCOUNT_DASHBOARD, // Route this tab navigates to
  },
];

const CustomerAccountSidebar = () => {
  // Define the CustomerAccountSidebar component
  const location = useLocation(); // Get the current URL location object (used to check which route is active)
  const navigate = useNavigate(); // Get function to programmatically navigate to other pages
  const { user, logoutUser } = useAuth(); // Get the current logged-in user and a function to log out from the auth hook

  // =============================================
  // MY ORDERS API — for the pending orders count
  // =============================================
  const { data: ordersData } = useQuery({
    queryKey: QUERY_KEYS.MY_ORDERS, // Unique key used by react-query to cache this data
    queryFn: getMyOrders, // Function that fetches the user's orders from the API
    staleTime: 1000 * 60 * 2, // Data is considered fresh for 2 minutes before refetching
  });

  // =============================================
  // NOTIFICATIONS API — for the unread count
  // =============================================
  const { data: notificationsData } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS, // Unique key used by react-query to cache this data
    queryFn: getNotifications, // Function that fetches notifications from the API
    staleTime: 1000 * 60 * 2, // Data is considered fresh for 2 minutes before refetching
  });

  // =============================================
  // MY PROFILE API — for profile completion
  // =============================================
  const { data: profileData } = useQuery({
    queryKey: QUERY_KEYS.MY_PROFILE, // Unique key used by react-query to cache this data
    queryFn: getMyProfile, // Function that fetches the user's profile from the API
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes before refetching
  });

  const profile = profileData?.data || {}; // Extract the profile data, or use an empty object if not yet loaded

  // Badge counts — calculated from real API data
  const pendingOrders =
    ordersData?.data?.results?.filter(
      (order) => order.status === "pending", // Keep only orders with status "pending"
    ).length || 0; // Count how many pending orders there are, default to 0 if data isn't loaded

  const unreadNotifications =
    // API_Documentation_Final.pdf (API 59) documents this endpoint as a
    // flat array, but the console error confirmed the real response is
    // NOT a plain array (`.filter is not a function`) — a backend/docs
    // contract mismatch, same pattern as categories. extractListData()
    // safely handles either shape.
    extractListData(notificationsData).filter(
      (notif) => !notif.is_read, // Keep only notifications that haven't been read
    ).length || 0; // Count how many unread notifications there are, default to 0 if data isn't loaded

  // Mapping of badge counts by key
  const badgeCounts = {
    orders: pendingOrders, // Maps to the "orders" badgeKey
    notifications: unreadNotifications, // Maps to the "notifications" badgeKey
  };

  // =============================================
  // PROFILE COMPLETION PERCENTAGE
  // Calculates what percentage of fields are filled in
  // name, email, phone — if all three are filled, it's 100%
  // =============================================
  const calculateProfileCompletion = () => {
    // Function to calculate how complete the user's profile is
    const fields = [profile.name, profile.email, profile.phone]; // The three fields being checked
    const filledFields = fields.filter(Boolean).length; // Count how many of those fields have a truthy value (are filled in)
    return Math.round((filledFields / fields.length) * 100); // Calculate the percentage filled, rounded to the nearest whole number
  };

  const profileCompletion = calculateProfileCompletion(); // Run the calculation and store the result

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
      navigate(ROUTES.HOME); // Redirect to the home page
    }
  };

  // Check if a route is the currently active page
  const isActive = (route) => location.pathname === route; // Returns true if the current URL path matches this route

  return (
    <>
      {/* =============================================
          DESKTOP SIDEBAR
          Hidden on mobile
          h-screen + sticky top-0 + self-start: pins the sidebar to the
          viewport instead of stretching to match the (often much taller)
          right-side page content — so only the page content scrolls,
          the sidebar visually stays put.
          overflow-y-auto + scrollbar-hide: if the sidebar's own content
          (profile card + nav + support card + logout) is ever taller than
          a short viewport, it scrolls internally instead of breaking the
          layout — but no scrollbar line is visible (existing project-wide
          utility from src/index.css), scrolling still works fine.
          ============================================= */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 self-start overflow-y-auto scrollbar-hide bg-[#0d1b2a] shrink-0">
        {" "}
        {/* Hidden on mobile, shown as a column on medium screens and up, fixed width, sticky full-viewport height, dark background */}
        {/* ===== USER PROFILE TOP ===== */}
        <div className="p-5 border-b border-white/10">
          {" "}
          {/* Padded section with a bottom border */}
          {/* Avatar + user info */}
          <div className="flex items-center gap-3 mb-4">
            {" "}
            {/* Row layout for avatar and text, with bottom margin */}
            <Avatar
              src={user?.avatar} // Pass the user's avatar image URL
              name={user?.name} // Pass the user's name (likely used as a fallback for initials)
              size="lg" // Large avatar size
              className="shrink-0" // Prevent the avatar from shrinking in the flex layout
            />
            <div className="min-w-0 flex-1">
              {" "}
              {/* Takes remaining space, allows text truncation */}
              <p className="font-semibold text-white truncate text-sm">
                {user?.name} {/* Display the user's name */}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email} {/* Display the user's email */}
              </p>
            </div>
          </div>
          {/* Profile completion bar — only shown if not 100% complete */}
          {profileCompletion < 100 && ( // Only render this block if the profile isn't fully complete
            <div className="flex flex-col gap-1.5">
              {" "}
              {/* Container for the completion label and progress bar */}
              <div className="flex items-center justify-between">
                {" "}
                {/* Row holding the percentage text and the "Complete" link */}
                <span className="text-xs text-gray-400">
                  Profile {profileCompletion}%
                </span>{" "}
                {/* Show the current completion percentage */}
                <Link
                  to={ROUTES.ACCOUNT_PROFILE} // Navigate to the profile page to complete it
                  className="text-xs text-primary hover:underline" // Small primary colored link with underline on hover
                >
                  Complete {/* Link text */}
                </Link>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                {" "}
                {/* Background track of the progress bar */}
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500" // Filled portion of the bar
                  style={{ width: `${profileCompletion}%` }} // Set the width dynamically based on the completion percentage
                />
              </div>
            </div>
          )}
          {/* Profile complete message */}
          {profileCompletion === 100 && ( // Only render this message if the profile is fully complete
            <p className="text-xs text-gray-400 italic leading-relaxed">
              "Your profile is fully verified. Enjoy premium dashboard
              features."{" "}
              {/* Congratulatory message shown when profile is complete */}
            </p>
          )}
        </div>
        {/* ===== NAV ITEMS ===== */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
          {" "}
          {/* Takes remaining vertical space, vertical list of nav items with spacing */}
          {NAV_ITEMS.map((item) => {
            // Loop through each nav item
            const active = isActive(item.route); // Check if this item's route matches the current page
            const badgeCount = item.badgeKey
              ? badgeCounts[item.badgeKey]
              : null; // Get the badge count for this item if it has a badgeKey

            return (
              <Link
                key={item.label} // Unique key for each item, using its label
                to={item.route} // Navigate to this item's route when clicked
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150", // Base styling for the nav link
                  active
                    ? "bg-primary/15 text-primary border-l-2 border-primary" // Highlighted styling when this item is active
                    : "text-gray-400 hover:bg-white/5 hover:text-white", // Default gray styling, lighter on hover
                )}
              >
                {/* Icon */}
                <span className="shrink-0">{item.icon}</span>{" "}
                {/* Render this item's icon */}
                {/* Label */}
                <span className="flex-1 truncate">{item.label}</span>{" "}
                {/* Render this item's label text */}
                {/* Badge count */}
                {badgeCount > 0 && ( // Only show the badge if there is a count greater than zero
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-xs font-medium rounded-full leading-none", // Base badge styling
                      item.badgeKey === "notifications"
                        ? "bg-danger text-white" // Red badge for notifications
                        : "bg-primary text-white", // Emerald badge for orders
                    )}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}{" "}
                    {/* Cap the displayed number at "99+" if it's very large */}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {/* ===== AI SUPPORT BUTTON ===== */}
        <div className="px-4 pb-3">
          {" "}
          {/* Padded section above the logout button */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            {" "}
            {/* Card with semi-transparent background and border */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Need Help? {/* Heading text for the support card */}
            </p>
            <button
              onClick={() => navigate(ROUTES.HOME)} // Will open the AI chat widget (currently just navigates to home)
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary/20 text-primary text-sm font-medium rounded-lg hover:bg-primary/30 transition-colors" // Styled as a full-width button with a translucent primary background
            >
              <BsRobot className="w-4 h-4" />{" "}
              {/* Robot icon representing AI support */}
              AI Support {/* Button text */}
            </button>
          </div>
        </div>
        {/* ===== LOGOUT ===== */}
        <div className="px-4 pb-5 border-t border-white/10 pt-3">
          {" "}
          {/* Footer section with top border and padding */}
          <button
            onClick={handleLogout} // Trigger the logout process when clicked
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-light/10 transition-colors" // Full-width red-colored button, lighter red background on hover
          >
            <AiOutlineLogout className="w-5 h-5" /> {/* Logout icon */}
            Logout {/* Button text */}
          </button>
        </div>
      </aside>
      {/* =============================================
          MOBILE BOTTOM TAB BAR
          Hidden on desktop
          Fixed navigation at the bottom on mobile
          ============================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d1b2a] border-t border-white/10 z-sticky">
        {" "}
        {/* Hidden on medium screens and up, fixed to the bottom of the screen on mobile */}
        <div className="flex items-center justify-around py-2 px-4">
          {" "}
          {/* Row with tabs evenly spaced */}
          {MOBILE_TAB_ITEMS.map((tab) => {
            // Loop through each mobile tab item
            const active = isActive(tab.route); // Check if this tab's route matches the current page
            return (
              <Link
                key={tab.label} // Unique key for each tab, using its label
                to={tab.route} // Navigate to this tab's route when clicked
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors", // Vertical layout for icon and label, centered
                  active
                    ? "text-primary" // Emerald color when this tab is active
                    : "text-gray-500 hover:text-gray-300", // Gray color otherwise, lighter on hover
                )}
              >
                {tab.icon} {/* Render this tab's icon */}
                <span className="text-xs font-medium">{tab.label}</span>{" "}
                {/* Render this tab's label text */}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Spacer to compensate for the mobile bottom tab bar's height */}
      <div className="md:hidden h-16" />{" "}
      {/* Empty div with fixed height, only shown on mobile, to prevent content from being hidden behind the fixed tab bar */}
    </>
  );
};

export default CustomerAccountSidebar; // Export this component so it can be used in the account layout
