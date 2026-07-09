import { useMutation, useQueryClient } from "@tanstack/react-query";
// Import truck, tag, shield-warning, box, and check-circle icons from the react-icons Bootstrap icon set, used for different notification types
import {
  BsTruck,
  BsTag,
  BsShieldExclamation,
  BsBoxSeam,
  BsCheckCircle,
} from "react-icons/bs";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that marks a specific notification as read on the backend
import { markNotificationRead } from "../../api/notifications.api";
// Import the error toast helper — gives the user feedback if the mark-as-read call fails, instead of failing silently
import { showError } from "../ui/Toast";
// Import a utility function "cn" used to conditionally join/merge Tailwind class names
import cn from "../../utils/cn";

// Notification type se icon + color
// Helper function that returns the appropriate icon and color styling configuration based on the notification's "type" value
const getNotifConfig = (type) => {
  // Switch on the notification type to determine which icon/colors to use
  switch (type) {
    // For "order" type notifications: truck icon with blue theme colors
    // (kept as info-blue here since this is a semantic "info" status color
    // from tokens.css, not an arbitrary color choice like the old dot was)
    case "order":
      return {
        icon: <BsTruck className="w-4 h-4" />,
        iconBg: "bg-info-light",
        iconColor: "text-info",
      };
    // For "sale" or "promotion" type notifications (grouped together): tag icon with amber/warning theme colors
    case "sale":
    case "promotion":
      return {
        icon: <BsTag className="w-4 h-4" />,
        iconBg: "bg-warning-light",
        iconColor: "text-warning",
      };
    // For "security" type notifications: shield-warning icon with red/danger theme colors
    case "security":
      return {
        icon: <BsShieldExclamation className="w-4 h-4" />,
        iconBg: "bg-danger-light",
        iconColor: "text-danger",
      };
    // For "delivery" type notifications: box icon with primary theme colors
    case "delivery":
      return {
        icon: <BsBoxSeam className="w-4 h-4" />,
        iconBg: "bg-primary-50",
        iconColor: "text-primary",
      };
    // Fallback for any unrecognized or generic notification type: check-circle icon with neutral gray colors
    default:
      return {
        icon: <BsCheckCircle className="w-4 h-4" />,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-400",
      };
  }
};

// Time formatting — relative time
// Helper function that converts a raw timestamp into a human-friendly relative time string (e.g., "5 minutes ago", "Yesterday, 3:00 PM")
const getRelativeTime = (timestamp) => {
  // If no timestamp was provided, return an empty string instead of attempting to format invalid data
  if (!timestamp) return "";
  // Get the current date/time for comparison
  const now = new Date();
  // Convert the provided timestamp string into a Date object
  const date = new Date(timestamp);
  // Calculate the difference in milliseconds between now and the notification's timestamp
  const diffMs = now - date;
  // Convert the millisecond difference into whole minutes
  const diffMins = Math.floor(diffMs / 60000);
  // Convert the minute difference into whole hours
  const diffHours = Math.floor(diffMins / 60);
  // Convert the hour difference into whole days
  const diffDays = Math.floor(diffHours / 24);

  // If less than 60 minutes have passed, show "{N} minutes ago"
  if (diffMins < 60) return `${diffMins} minutes ago`;
  // If less than 24 hours have passed, show "{N} hours ago"
  if (diffHours < 24) return `${diffHours} hours ago`;
  // If exactly 1 day has passed, show "Yesterday, {formatted time}"
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  // Otherwise (2+ days old), show a full formatted date and time, e.g. "Jun 15, 3:45 PM"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Define the NotificationItem functional component, receiving a single "notification" object as a prop
const NotificationItem = ({ notification }) => {
  // Get access to the React Query client instance so we can manually invalidate/refresh cached queries later
  const queryClient = useQueryClient();
  // Compute the icon/color configuration for this notification based on its type
  const config = getNotifConfig(notification.type);

  // =============================================
  // MARK AS READ MUTATION
  // API 61 — PUT /api/v1/notifications/{id}/read/
  // =============================================
  // Set up a mutation for marking this specific notification as read via the API
  const markReadMutation = useMutation({
    // The function that performs the actual API call, passing this notification's ID
    mutationFn: () => markNotificationRead(notification.id),
    // Callback executed when the mutation succeeds: invalidate the cached notifications list so it refetches and reflects the updated read status
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
    // Callback executed if the API call fails (network drop, expired session, server error) — without this, the click would silently do nothing and the user wouldn't know it failed
    onError: () => {
      showError("Couldn't mark this notification as read. Please try again.");
    },
  });

  // Function called when the notification card is clicked
  const handleClick = () => {
    // Only trigger the mark-as-read mutation if this notification is currently unread (avoids unnecessary API calls for already-read notifications)
    if (!notification.is_read) {
      markReadMutation.mutate();
    }
  };

  // Begin the JSX returned by this component
  return (
    // Outer clickable card container, triggering handleClick when clicked
    // relative + overflow-hidden hosts the left accent bar for unread items
    // without letting it spill outside the rounded corners
    // hover:shadow-md + hover:-translate-y-0.5 gives every row a subtle "lift"
    // on hover, consistent with the elevated feel used across the rest of the app
    <div
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden flex items-start gap-4 p-4 pl-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        notification.is_read
          ? "bg-white border-gray-100"
          : "bg-primary-50/40 border-primary/10",
      )}
    >
      {/* Left accent bar — only rendered for unread notifications, gives a
          much clearer "this is new" signal than a tinted background alone,
          matching the brand gradient instead of a generic flat color       */}
      {!notification.is_read && (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary to-primary-dark" />
      )}

      {/* Type icon */}
      {/* Circular icon badge container: fixed size, centered content, prevented from shrinking, with a background color determined by the notification type's config */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          config.iconBg,
        )}
      >
        {/* The type-specific icon itself, colored according to the notification type's config */}
        <span className={config.iconColor}>{config.icon}</span>
      </div>

      {/* Content */}
      {/* Text content container: takes up remaining horizontal space (flex-1), allows text truncation via min-w-0 */}
      <div className="flex-1 min-w-0">
        {/* Notification title text: bold and darker if unread (to draw attention), medium weight and slightly lighter if already read */}
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read
              ? "font-medium text-gray-800"
              : "font-bold text-gray-900",
          )}
        >
          {notification.title}
        </p>
        {/* Notification message/description text, in a smaller, lighter gray font with relaxed line spacing and a small top margin */}
        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
          {notification.message}
        </p>
        {/* Timestamp text showing the relative time since the notification was created; colored gray if read, primary-colored and bold if unread (to stand out) */}
        <p
          className={cn(
            "text-xs mt-1.5",
            notification.is_read ? "text-gray-400" : "text-primary font-medium",
          )}
        >
          {getRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Unread dot — brand emerald gradient (was previously an off-brand
          bg-blue-500, which didn't exist anywhere in the design system)
          Only rendered for unread notifications, signaling "new" status     */}
      {!notification.is_read && (
        <div className="w-2.5 h-2.5 rounded-full bg-linear-to-br from-primary to-primary-dark shrink-0 mt-1.5" />
      )}
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default NotificationItem;
