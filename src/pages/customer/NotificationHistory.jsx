// Import React's useState hook for local component state (active tab, current page)
import { useState } from "react";
// Import the useQuery hook from React Query for fetching and caching server data
import { useQuery } from "@tanstack/react-query";
// Import motion for animated elements, and AnimatePresence to animate items in/out as date groups change
import { motion, AnimatePresence } from "framer-motion";
// Import the bell icon used inside the page header's gradient icon box
import { AiFillBell } from "react-icons/ai";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches the list of notifications from the backend
import { getNotifications } from "../../api/notifications.api";
// Defensive normalizer — see file for why this exists (backend/docs contract drift on the notifications endpoint)
import extractListData from "../../utils/extractListData";
// Import the Container layout component used to constrain and center page content with consistent padding/max-width
import Container from "../../components/layouts/Container";
// Import the filter tabs component (All/Unread/Orders/Promotions/System) plus the "mark all as read" button
import NotificationFilters from "../../components/notifications/NotificationFilters";
// Import the component that renders a single notification row
import NotificationItem from "../../components/notifications/NotificationItem";
// Import the pagination UI component for navigating between pages of notifications
import Pagination from "../../components/ui/Pagination";
// Import a reusable empty-state component shown when there are no notifications to display
import EmptyState from "../../components/ui/EmptyState";
// Import a reusable error-state component (with retry button) shown when the API call fails — same pattern used in OrderDetail.jsx, ProductDetail.jsx, OrderTracking.jsx
import ErrorState from "../../components/ui/ErrorState";

// Define how many notifications should be shown per page
const PER_PAGE = 10;

// Date group label nikalna
// Helper function that determines which date group a notification belongs to ("TODAY", "YESTERDAY", or "OLDER") based on its timestamp
const getDateGroup = (timestamp) => {
  // If no timestamp is provided, default to grouping it under "OLDER"
  if (!timestamp) return "OLDER";
  // Get the current date/time for comparison
  const now = new Date();
  // Convert the provided timestamp string into a Date object
  const date = new Date(timestamp);
  // Calculate how many whole days have passed since the notification was created
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  // If it happened today (0 days difference), group it as "TODAY"
  if (diffDays === 0) return "TODAY";
  // If it happened exactly 1 day ago, group it as "YESTERDAY"
  if (diffDays === 1) return "YESTERDAY";
  // Otherwise (2+ days ago), group it as "OLDER"
  return "OLDER";
};

// Notifications ko date groups mein organize karo
// Helper function that takes a flat list of notifications and organizes them into labeled groups by date
const groupByDate = (notifications) => {
  // Object to accumulate notifications under each group label as keys
  const groups = {};
  // Fixed display order for the date groups, regardless of the order notifications were processed in
  const order = ["TODAY", "YESTERDAY", "OLDER"];

  // Loop through every notification to assign it to the correct group
  notifications.forEach((notif) => {
    // Determine which group this notification belongs to
    const group = getDateGroup(notif.created_at);
    // If this group doesn't exist yet in the groups object, initialize it as an empty array
    if (!groups[group]) groups[group] = [];
    // Add this notification to its corresponding group's array
    groups[group].push(notif);
  });

  // Order maintain karo
  // Filter the fixed order list down to only the groups that actually have at least one notification, then map each into a {label, items} object for rendering
  return order
    .filter((group) => groups[group]?.length > 0)
    .map((group) => ({ label: group, items: groups[group] }));
};

// Define the NotificationHistory page component (no props required) — this is the main page assembling filter tabs, grouped notification lists, and pagination
const NotificationHistory = () => {
  // State holding the currently active filter tab, starting with "all"
  const [activeTab, setActiveTab] = useState("all");
  // State holding the current pagination page number, starting at page 1
  const [currentPage, setCurrentPage] = useState(1);

  // =============================================
  // NOTIFICATIONS API
  // API 59 — GET /api/v1/notifications/
  // =============================================
  // Fetch the full list of notifications using React Query, also extracting the loading state
  const {
    data: notificationsData,
    isLoading,
    isError, // true if the fetch threw an error (network drop, 500, expired session, etc.) — must be handled separately from "no data"
    refetch, // passed to ErrorState so the user can retry the failed request without a full page reload
  } = useQuery({
    // Unique cache key under which this query's data is stored/retrieved
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    // The actual async function that performs the API call to fetch notifications
    queryFn: getNotifications,
    // Keep this data "fresh" (won't auto-refetch on its own staleness) for only 1 minute, since notifications update frequently
    staleTime: 1000 * 60 * 1, // 1 minute — notifications frequently update
    // Automatically refetch this query every 2 minutes in the background, so new notifications appear without a manual refresh
    refetchInterval: 1000 * 60 * 2, // Har 2 minute pe auto refresh
  });

  // Safely extract the notifications array from the API response, defaulting to an empty array if data isn't available yet
  // API_Documentation_Final.pdf (API 59) documents a flat array, but the
  // real response is not a plain array — backend/docs contract drift.
  const allNotifications = extractListData(notificationsData);

  // Unread count — used in the header subtitle so the page opens with an
  // immediate, real-data answer to "do I have anything new?"
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  // Tab ke hisaab se filter karo
  // Filter the full notifications list based on the currently active tab: show all, only unread ones, or only ones matching a specific type
  const filteredNotifications =
    activeTab === "all"
      ? allNotifications
      : activeTab === "unread"
        ? allNotifications.filter((n) => !n.is_read)
        : allNotifications.filter((n) => n.type === activeTab);

  // Pagination
  // Calculate the total number of notifications matching the current filter (used for pagination math)
  const totalResults = filteredNotifications.length;
  // Calculate the total number of pages needed based on filtered results and how many fit per page (rounded up)
  const totalPages = Math.ceil(totalResults / PER_PAGE);
  // Slice the filtered notifications array down to just the items that belong on the current page
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  // Date groups
  // Organize the current page's notifications into date-based groups (TODAY/YESTERDAY/OLDER) for grouped rendering
  const groupedNotifications = groupByDate(paginatedNotifications);

  // Tab change pe page reset
  // Handler called whenever the active filter tab changes: switches the tab and resets pagination back to page 1, since the filtered result set has changed
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Begin the JSX returned by this page component
  return (
    // relative + overflow-hidden hosts the decorative ambient gradient glow
    // behind the header without it bleeding into the navbar/footer or causing
    // horizontal scrollbars on any screen size — same treatment as the Wishlist page
    <div className="relative overflow-hidden">
      {/* Ambient background glow — soft emerald blur behind the page header,
          purely decorative (pointer-events-none), gives the page the same
          premium "lit" feel as the rest of the account section
          -z-10 keeps it strictly behind all real content                    */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-xl h-144 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Container component constrains content width and adds vertical padding, larger on "sm" screens and up */}
      <Container className="py-6 sm:py-8">
        {/* Outer vertical flex layout stacking all page sections with consistent gap spacing between them */}
        <div className="flex flex-col gap-6">
          {/* ── Page header ────────────────────────────────────────────────────────
              Same icon-box pattern used across the app's other page headers:
              a rounded gradient icon square + bold dark heading + gray subtitle.
              Subtitle reflects the REAL unread count from the API — not static copy. */}
          <div className="flex items-center gap-4">
            {/* Icon box — rounded gradient square, brand emerald tones
                shadow-primary/30 gives it a soft colored glow instead of a flat gray shadow
                shrink-0 keeps it from being squeezed on narrow screens */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
              <AiFillBell className="w-6 h-6 sm:w-7 sm:h-7 text-white" />{" "}
              {/* Filled bell — represents notifications */}
            </div>

            {/* Title + subtitle stack */}
            <div>
              {/* Main page title, solid dark bold text */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Notifications
              </h1>
              {/* Subtitle — real, data-driven unread count, not a hardcoded string */}
              <p className="text-sm text-gray-400 mt-0.5">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}.`
                  : "You're all caught up! No unread notifications."}
              </p>
            </div>
          </div>

          {/* Filter tabs + Mark all read */}
          {/* Render the filter tabs component, passing the active tab, the tab-change handler, and the full unfiltered notifications list (needed for per-tab counts) */}
          <NotificationFilters
            activeTab={activeTab}
            onTabChange={handleTabChange}
            notifications={allNotifications}
          />

          {/* Loading skeleton */}
          {/* Only show the loading skeleton placeholders while data is still being fetched */}
          {isLoading && (
            // Vertical flex container stacking four skeleton rows with gap spacing
            <div className="flex flex-col gap-3">
              {/* Render four placeholder skeleton rows mimicking a real notification's layout (icon circle + text lines) */}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 animate-pulse"
                >
                  {/* Placeholder circle simulating the notification's type icon */}
                  <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
                  {/* Placeholder bars simulating the title, message, and timestamp text lines */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {/* Only show this if loading has finished AND the request actually failed — must be checked before the empty state, otherwise a failed request looks identical to "no notifications" */}
          {!isLoading && isError && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <ErrorState
                title="Couldn't load notifications"
                message="Something went wrong while fetching your notifications. Please try again."
                onRetry={refetch}
              />
            </div>
          )}

          {/* Empty state */}
          {/* Only show the empty state if loading has finished, there was no error, and there are no notifications matching the current filter
              Wrapped in an elevated white card (rounded-3xl + shadow-sm + border) so it
              looks properly "raised" off the page instead of floating bare, matching Wishlist */}
          {!isLoading && !isError && filteredNotifications.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <EmptyState
                variant="noNotifications"
                // Customize the title based on which tab is active: a celebratory message for "unread" (since it means nothing's pending), or a generic message otherwise
                title={
                  activeTab === "unread"
                    ? "You're all caught up!"
                    : "No notifications"
                }
                // Customize the description text similarly based on the active tab
                description={
                  activeTab === "unread"
                    ? "No unread notifications at the moment."
                    : "You'll see notifications here when they arrive."
                }
              />
            </div>
          )}

          {/* Notifications grouped by date */}
          {/* Only render the grouped notification lists if loading has finished, there was no error, and there's at least one group with items */}
          {!isLoading && !isError && groupedNotifications.length > 0 && (
            // AnimatePresence with "popLayout" mode allows items to animate smoothly as the list changes, removing items from layout flow immediately rather than waiting for their exit animation
            <AnimatePresence mode="popLayout">
              {/* Outer vertical flex container stacking each date group section with gap spacing */}
              <div className="flex flex-col gap-6">
                {/* Map over each date group (e.g., TODAY, YESTERDAY, OLDER) to render its label and notification items */}
                {groupedNotifications.map((group) => (
                  // Animated wrapper for this date group: fades in and slides up slightly from below on mount
                  <motion.div
                    key={group.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-3"
                  >
                    {/* Date group label */}
                    {/* The group's heading text (e.g., "TODAY"), styled small, bold, uppercase, light gray, with wide letter spacing */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {group.label}
                    </p>

                    {/* Notifications list */}
                    {/* Vertical flex container stacking each notification item within this group, with small gap spacing */}
                    <div className="flex flex-col gap-2">
                      {/* Map over this group's notification items to render one NotificationItem component per notification */}
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* Pagination */}
          {/* Only show pagination controls if data has finished loading, there was no error, and there is more than one page of results
              NOTE: totalResults is no longer passed here — <Pagination /> doesn't
              accept or render that prop (confirmed in Pagination.jsx), so passing
              it was dead code with zero effect on the UI.                      */}
          {!isLoading && !isError && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                // Update the current page state when the user navigates to a different page
                setCurrentPage(page);
                // Smoothly scroll back to the top of the page after changing pages
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </Container>
    </div>
  );
};

// Export this component as the default export so it can be used as the route's page component
export default NotificationHistory;
