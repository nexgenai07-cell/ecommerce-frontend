import { useMutation, useQueryClient } from "@tanstack/react-query"; // useMutation handles mark-as-read API calls; useQueryClient invalidates notification cache after each success
import { BsTruck, BsTag, BsShieldExclamation } from "react-icons/bs"; // Truck for order notifications, Tag for sales/promotions, Shield for system/security alerts
import { AiOutlineCheck } from "react-icons/ai"; // Checkmark icon shown inside the "Mark all as read" button
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized cache key constants — keeps query keys consistent across the app
import { markNotificationRead } from "../../api/notifications.api"; // API function that marks a single notification as read by its id
import { showError } from "../ui/Toast"; // Error toast helper — gives feedback if the mark-as-read call fails
import cn from "../../utils/cn"; // Utility that merges Tailwind class names conditionally without conflicts

// getNotifIcon — maps a notification type string to the appropriate icon element
// Falls back to a gray shield icon for any unknown or system notification type
const getNotifIcon = (type) => {
  switch (type) {
    case "order": // Order status updates e.g. "Your order has shipped"
      return <BsTruck className="w-4 h-4 text-primary" />;
    case "sale":
    case "promotion": // Discount alerts and promotional offers
      return <BsTag className="w-4 h-4 text-warning" />;
    default: // System alerts, account notices, or unrecognized types
      return <BsShieldExclamation className="w-4 h-4 text-gray-400" />;
  }
};

const RecentNotifications = ({ notifications, unreadCount }) => {
  // queryClient lets us manually invalidate the notifications cache after marking as read
  const queryClient = useQueryClient();

  // Slice only the first 3 notifications — dashboard preview shows a summary, not the full list
  const recentItems = notifications.slice(0, 3);

  // ── Mark single notification as read mutation ─────────────────────────────
  // mutationFn receives one notification id and calls the mark-read API
  // onSuccess invalidates the notifications cache so the unread count and dot update immediately
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS }); // refresh notification data across the app
    },
    onError: () => {
      showError("Couldn't mark this notification as read. Please try again."); // surfaces failures instead of the button silently resetting
    },
  });

  // handleMarkAllRead — filters for only unread notifications and fires the mutation for each one
  // Each call is independent so partial success is possible if one fails
  const handleMarkAllRead = () => {
    notifications
      .filter((n) => !n.is_read) // skip notifications already marked as read
      .forEach((n) => markReadMutation.mutate(n.id)); // fire one mutation per unread notification
  };

  return (
    // Card wrapper — white background, rounded corners, border, clips overflow cleanly
    // shadow-sm at rest + hover:shadow-xl + hover:-translate-y-1 gives the
    // whole card a genuine raised feel, consistent with the other dashboard cards
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* ── Card header ────────────────────────────────────────────────────────
          Left: section title + unread count badge
          Right: "Mark all as read" button
          border-b separates the header from the notifications list below       */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        {/* Left group: title + red unread count badge */}
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">
            Recent Notifications
          </h2>

          {/* Unread count badge — only rendered when there is at least one unread notification */}
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-danger text-white rounded-full">
              {unreadCount}{" "}
              {/* Number of notifications the customer hasn't read yet */}
            </span>
          )}
        </div>

        {/* Mark all as read — small pill button, only shown when there's something to mark
            Upgraded from a plain underlined text link to match the pill-button
            treatment used on the full Notifications page's filter bar          */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="
              flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full
              text-primary-dark border border-primary/30 bg-primary-50
              hover:bg-primary-100 hover:border-primary/50
              active:scale-[0.98] transition-all duration-200
            "
          >
            <AiOutlineCheck className="w-3 h-3" /> {/* Checkmark icon */}
            Mark all as read
          </button>
        )}
      </div>

      {/* ── Notifications list ──────────────────────────────────────────────────
          divide-y draws a thin separator line between each notification row     */}
      <div className="divide-y divide-gray-50">
        {/* Render notification rows when there is at least one item to show */}
        {recentItems.length > 0 ? (
          recentItems.map((notif) => (
            // Single notification row — clicking marks it as read if it hasn't been read yet
            // relative + overflow-hidden hosts the left accent bar for unread items
            // bg-primary-50/30 tints unread rows so they stand out from read ones
            <div
              key={notif.id} // stable unique key for React's reconciler
              onClick={() =>
                !notif.is_read && markReadMutation.mutate(notif.id)
              } // no-op if already read
              className={cn(
                "relative overflow-hidden flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors",
                !notif.is_read && "bg-primary-50/30", // light tint on the entire row for unread notifications
              )}
            >
              {/* Left accent bar — only rendered for unread notifications, matching
                  the same treatment used on the full Notifications page          */}
              {!notif.is_read && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary to-primary-dark" />
              )}

              {/* Type icon — rendered inside a small circular gray background
                  mt-0.5 nudges it down slightly to align with the first line of text */}
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                {getNotifIcon(notif.type)}{" "}
                {/* Icon color and shape varies by notification type */}
              </div>

              {/* Notification text content — flex-1 takes remaining space; min-w-0 enables line clamping */}
              <div className="flex-1 min-w-0">
                {/* Notification title — bold, truncated to one line to keep rows uniform height */}
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                  {notif.title}
                </p>

                {/* Notification message body — muted, clamped to 2 lines to prevent tall rows */}
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                  {notif.message}
                </p>
              </div>

              {/* Unread dot — small filled circle shown only on notifications not yet read
                  mt-1.5 aligns it vertically with the middle of the title line
                  shrink-0 prevents it from being squished on narrow screens              */}
              {!notif.is_read && (
                <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
              )}
            </div>
          ))
        ) : (
          // Empty state — shown when the customer has no notifications at all
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentNotifications; // Export so it can be composed into the Customer Account Dashboard page
