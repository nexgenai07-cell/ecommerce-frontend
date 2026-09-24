import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// useQuery — fetches a small, recent slice of the admin's own
// notifications to power the bell icon's badge and its dropdown preview
// useMutation — used for both "mark one as read" (on row click) and
// "mark all as read" (the header button), each invalidating the shared
// notifications cache on success
// useQueryClient — lets this component invalidate the cached
// notifications query so the badge count and dropdown list refresh
// themselves the moment something changes

import { useNavigate } from "react-router-dom";
// Navigates to the referenced order (deep link) or to the full
// Notifications page when "View all" is clicked

import { AnimatePresence, motion } from "framer-motion";
// Same pop-in/pop-out treatment already used for the cart/wishlist/
// notification badges in CustomerNavbar.jsx, kept consistent here

import { AiOutlineBell, AiOutlineCheck } from "react-icons/ai";
import { BsTruck, BsTag, BsShieldExclamation } from "react-icons/bs";
// Truck for order notifications, tag for promotions, shield for system
// notifications — the exact same icon set RecentNotifications.jsx
// already uses on the customer account dashboard, kept consistent here

import { QUERY_KEYS } from "../../constants/queryKeys";
import { ROUTES } from "../../constants/routes";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.api";
import resolveAdminNotificationLink from "../../utils/resolveAdminNotificationLink";
import formatRelativeTime from "../../utils/formatRelativeTime";
import extractListData from "../../utils/extractListData";
import Popover from "../ui/Popover";
import { Spinner } from "../ui/Spinner";
import { showError, showSuccess } from "../ui/Toast";
import cn from "../../utils/cn";

// How many of the admin's most recent notifications the dropdown
// preview shows. The full, paginated history lives on the dedicated
// Notifications page (ROUTES.ADMIN_NOTIFICATIONS) — this popover is
// deliberately just a quick-glance preview, not a second full list.
const PREVIEW_PAGE_SIZE = 6;

// Maps a notification's "type" value to the icon/color treatment shown
// in its round icon badge inside the dropdown. Mirrors
// RecentNotifications.jsx's getNotifIcon exactly, so the same
// notification always looks the same whether the admin sees it here or
// on the full page.
const getNotifIcon = (type) => {
  switch (type) {
    case "order":
      return <BsTruck className="w-4 h-4 text-primary" />;
    case "sale":
    case "promotion":
      return <BsTag className="w-4 h-4 text-warning" />;
    default:
      return <BsShieldExclamation className="w-4 h-4 text-gray-400" />;
  }
};

const AdminNotificationBell = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // =============================================
  // NOTIFICATIONS PREVIEW — GET /api/v1/notifications/
  // =============================================
  // Same endpoint (API 75) the customer side uses. It returns whatever
  // is visible to the CURRENTLY LOGGED-IN user, so when an admin is
  // logged in this naturally returns notifications addressed to that
  // admin account plus any broadcast notifications — no separate
  // "admin notifications" endpoint exists or is needed.
  //
  // staleTime/refetchInterval match NotificationHistory.jsx's own
  // cadence, so the bell badge feels just as "live" as the customer
  // notifications page.
  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, "admin-bell-preview"],
    queryFn: ({ signal }) =>
      getNotifications({ page: 1, page_size: PREVIEW_PAGE_SIZE }, signal),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  });

  const recentNotifications = extractListData(notificationsResponse);

  // unreadCount — the CONFIRMED total unread count across the admin's
  // entire notification history, provided directly by the backend
  // (API 75's top-level unread_count field). Not derived from the
  // preview page above, which would silently under-count the moment
  // there are more than PREVIEW_PAGE_SIZE unread notifications.
  const unreadCount = notificationsResponse?.data?.unread_count ?? 0;

  // =============================================
  // MARK ONE AS READ — PUT /api/v1/notifications/{id}/read/
  // =============================================
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      // Prefix-invalidates every cached query keyed under
      // QUERY_KEYS.NOTIFICATIONS — this preview query and the full
      // Notifications page's query both refresh from this one call.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
    onError: () => {
      showError("Couldn't mark this notification as read. Please try again.");
    },
  });

  // =============================================
  // MARK ALL AS READ — POST /api/v1/notifications/mark-all-read/
  // =============================================
  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      showSuccess("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
    onError: () => {
      showError("Couldn't mark all notifications as read. Please try again.");
    },
  });

  // Handles a click on one notification row inside the dropdown: marks
  // it read (if it isn't already), deep-links to the order/return/
  // complaint it refers to when one exists, then closes the popover.
  const handleItemClick = (notification, close) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }

    const link = resolveAdminNotificationLink(notification);
    if (link) {
      navigate(link);
    }

    close();
  };

  return (
    <Popover
      align="right"
      panelClassName="w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl border-0 shadow-2xl ring-1 ring-black/5 p-0 animate-dropdown-in"
      trigger={
        <button
          className="relative p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-surface-secondary transition-colors"
          aria-label="Notifications"
        >
          <AiOutlineBell className="w-5 h-5" />
          {/* Unread badge — same pop-in/pop-out treatment and sizing as
              the cart/wishlist/notification badges in CustomerNavbar.jsx,
              so the bell feels native to the rest of the app rather than
              a bolted-on new widget. */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      }
    >
      {({ close }) => (
        <>
          {/* ── Dropdown header ────────────────────────────────────────
              Title + unread count on the left, "Mark all as read" on
              the right — same layout as RecentNotifications.jsx's card
              header, adapted to fit inside a popover panel. */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary disabled:opacity-50 transition-colors shrink-0"
              >
                {markAllMutation.isPending ? (
                  <Spinner size="sm" className="text-primary-dark" />
                ) : (
                  <AiOutlineCheck className="w-3 h-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* ── Notification list ──────────────────────────────────── */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {isLoading && (
              // Compact skeleton rows while the first fetch is in flight
              <div className="flex flex-col">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 animate-pulse"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && recentNotifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            )}

            {!isLoading &&
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleItemClick(notification, close)}
                  className={cn(
                    "relative overflow-hidden flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                    !notification.is_read && "bg-primary-50/30",
                  )}
                >
                  {/* Left accent bar for unread items — same treatment as
                      NotificationItem.jsx and RecentNotifications.jsx */}
                  {!notification.is_read && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary to-primary-dark" />
                  )}

                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotifIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug line-clamp-1",
                        notification.is_read
                          ? "font-medium text-gray-800"
                          : "font-bold text-gray-900",
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] mt-1",
                        notification.is_read
                          ? "text-gray-400"
                          : "text-primary font-medium",
                      )}
                    >
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>

                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-linear-to-br from-primary to-primary-dark shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
          </div>

          {/* ── Footer — always visible, takes the admin to the full,
              paginated, filterable Notifications page ───────────────── */}
          <button
            onClick={() => {
              close();
              navigate(ROUTES.ADMIN_NOTIFICATIONS);
            }}
            className="block w-full text-center text-xs font-semibold text-primary-dark hover:text-primary py-2.5 border-t border-border transition-colors"
          >
            View all notifications
          </button>
        </>
      )}
    </Popover>
  );
};

export default AdminNotificationBell;
