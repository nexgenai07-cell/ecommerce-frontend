// Import React's useState hook for local component state (active tab, current page, page size)
import { useState } from "react";
// Import the useQuery hook from React Query for fetching and caching server data
import { useQuery } from "@tanstack/react-query";
// Import motion for animated elements, and AnimatePresence to animate items in/out as date groups change
import { motion, AnimatePresence } from "framer-motion";
// Import the bell icon used inside the shared admin PageHeader
import { AiOutlineBell } from "react-icons/ai";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches the list of notifications from the backend — the exact
// same endpoint (API 75) the customer Notification History page uses. It returns whatever is
// visible to the currently logged-in user, so a logged-in admin naturally gets back
// notifications addressed to that admin account plus any broadcast notifications.
import { getNotifications } from "../../api/notifications.api";
// Import the shared, role-agnostic filter tabs component (All/Unread/Orders/Promotions/System)
// plus the "mark all as read" button — the exact same component the customer page uses,
// unmodified.
import NotificationFilters from "../../components/notifications/NotificationFilters";
// Import the shared component that renders a single notification row, passing the
// admin-specific link resolver below so a click deep-links to the right admin page
import NotificationItem from "../../components/notifications/NotificationItem";
// Import the admin-side deep-link resolver — maps reference_type/reference_id to the
// admin order detail page or the relevant admin management list page, instead of the
// customer account pages resolveNotificationLink.js points to
import resolveAdminNotificationLink from "../../utils/resolveAdminNotificationLink";
// Import the shared gradient icon + title header used by every other admin screen
import PageHeader from "../../components/shared/PageHeader";
// Import the pagination UI component for navigating between pages of notifications
import Pagination from "../../components/ui/Pagination";
// Import a reusable empty-state component shown when there are no notifications to display
import EmptyState from "../../components/ui/EmptyState";
// Import a reusable error-state component (with retry button) shown when the API call fails
import ErrorState from "../../components/ui/ErrorState";

// Selectable "rows per page" values shown in the pagination dropdown, matching the
// backend's page_size cap of 100 — same pattern already used on AuditLogs.jsx.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// Determines which date group a notification belongs to ("TODAY", "YESTERDAY", or "OLDER")
// based on its timestamp. Deliberately kept local to this page (rather than imported from
// NotificationHistory.jsx, which does not export it) so this admin page has no dependency on
// customer-facing page internals — the comparison logic itself is identical to the customer
// page's own getDateGroup, comparing calendar dates directly (by zeroing out the time-of-day
// on both sides) so the group always matches the actual day the notification was created on,
// in the browser's local timezone, independent of what time it currently is.
const getDateGroup = (timestamp) => {
  if (!timestamp) return "OLDER";

  const now = new Date();
  const date = new Date(timestamp);

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfNotifDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const diffDays = Math.round(
    (startOfToday - startOfNotifDay) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return "OLDER";
};

// Takes a flat list of notifications and organizes them into labeled groups by date, in a
// fixed TODAY -> YESTERDAY -> OLDER display order, skipping any group with no items.
const groupByDate = (notifications) => {
  const groups = {};
  const order = ["TODAY", "YESTERDAY", "OLDER"];

  notifications.forEach((notif) => {
    const group = getDateGroup(notif.created_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(notif);
  });

  return order
    .filter((group) => groups[group]?.length > 0)
    .map((group) => ({ label: group, items: groups[group] }));
};

// AdminNotifications — the admin's own full, paginated, filterable notification history.
// Structurally this mirrors pages/customer/NotificationHistory.jsx (same tabs, same date
// grouping, same pagination), but is styled to match the rest of the admin panel (PageHeader,
// compact rounded-xl cards) instead of the customer account section's premium rounded-3xl
// styling, and deep-links notifications to admin pages via resolveAdminNotificationLink
// instead of the customer account routes.
const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Called when the admin picks a different "rows per page" value. Resets back to page 1 as
  // well, since staying on a deep page number could land past the end of the newly-sized
  // result set.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // =============================================
  // NOTIFICATIONS API — GET /api/v1/notifications/
  // =============================================
  const {
    data: notificationsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.NOTIFICATIONS,
      "admin",
      activeTab,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getNotifications(
        {
          // "all" and "unread" aren't real `type` values — only order/promotion/system are,
          // so only forward activeTab as `type` when it's actually one of those three
          type:
            activeTab === "all" || activeTab === "unread"
              ? undefined
              : activeTab,
          is_read: activeTab === "unread" ? false : undefined,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    staleTime: 1000 * 60 * 1, // 1 minute — notifications frequently update
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  });

  // The current page's notifications — always exactly pageSize (or fewer, on the last page)
  // real, already-filtered rows straight from the backend.
  const notifications = notificationsResponse?.data?.results || [];

  // unreadCount — the confirmed total unread count across the admin's entire notification
  // history, provided directly by the backend, used for both the header subtitle and the
  // "Unread" tab's badge.
  const unreadCount = notificationsResponse?.data?.unread_count ?? 0;

  // unreadByType — a real per-type unread breakdown provided directly by the backend
  // (e.g. { order: 2, promotion: 0, system: 1 }), passed straight down to NotificationFilters
  // so the Orders/Promotions/System tabs can each show their own accurate unread badge.
  const unreadByType = notificationsResponse?.data?.unread_by_type;

  // totalCount / totalPages — real numbers straight from the backend's `count` field,
  // matching exactly what's been server-filtered by the current tab (type/is_read).
  const totalCount = notificationsResponse?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Organize the current page's notifications into date-based groups (TODAY/YESTERDAY/OLDER)
  const groupedNotifications = groupByDate(notifications);

  // Switches the active filter tab and resets pagination back to page 1, since the filtered
  // result set has changed.
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <PageHeader
        icon={<AiOutlineBell />}
        title={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
      />

      {/* Filter tabs + Mark all read — identical shared component to the customer page */}
      <NotificationFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
        unreadByType={unreadByType}
      />

      {/* Loading skeleton — mirrors a real NotificationItem's layout (icon circle + text
          lines + timestamp + unread dot), styled with the admin panel's rounded-xl cards
          rather than the customer account section's rounded-2xl/3xl treatment. */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 pl-5 bg-white rounded-xl border border-gray-100 animate-pulse"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="flex flex-col gap-1 mt-0.5">
                  <div className="h-3.5 bg-gray-100 rounded w-full" />
                  <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-20 mt-1" />
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0 mt-1.5" />
            </div>
          ))}
        </div>
      )}

      {/* Error state — only shown once loading has finished and the request actually failed */}
      {!isLoading && isError && (
        <div className="bg-white rounded-xl border border-gray-100">
          <ErrorState
            title="Couldn't load notifications"
            message="Something went wrong while fetching notifications. Please try again."
            onRetry={refetch}
          />
        </div>
      )}

      {/* Empty state — only shown once loading has finished, there was no error, and there
          are no notifications matching the current filter */}
      {!isLoading && !isError && totalCount === 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            variant="noNotifications"
            title={
              activeTab === "unread"
                ? "You're all caught up!"
                : "No notifications"
            }
            description={
              activeTab === "unread"
                ? "No unread notifications at the moment."
                : "You'll see notifications here as customers place orders, request returns, or file complaints."
            }
          />
        </div>
      )}

      {/* Notifications grouped by date, plus pagination — merged into one card, matching the
          admin panel's rounded-xl card language used throughout the rest of the panel. */}
      {!isLoading && !isError && totalCount > 0 && (
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white flex-1 flex flex-col min-h-0">
          {groupedNotifications.length > 0 && (
            <AnimatePresence mode="popLayout">
              <div className="flex flex-col gap-5 p-4 flex-1 min-h-0 overflow-y-auto">
                {groupedNotifications.map((group) => (
                  <motion.div
                    key={group.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2.5"
                  >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {group.label}
                    </p>

                    <div className="flex flex-col gap-2">
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          resolveLink={resolveAdminNotificationLink}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            variant="compact"
            className="border-t border-gray-100"
          />
        </div>
      )}
    </div>
  );
};

// Export this component as the default export so it can be used as the route's page component
export default AdminNotifications;
