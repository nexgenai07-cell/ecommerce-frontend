// Import useMutation for the "mark all as read" bulk API calls, and useQueryClient to refresh cached notification data afterward
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Import a checkmark icon from the react-icons Ant Design icon set, used on the "Mark all as read" button
import { AiOutlineCheck } from "react-icons/ai";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that marks a single notification as read on the backend
import { markNotificationRead } from "../../api/notifications.api";
// Import the success and error toast notification helper functions for user feedback
import { showSuccess, showError } from "../ui/Toast";
// Import the shared Spinner component — shown inside the "Mark all as read" button while the bulk mutation is running
import { Spinner } from "../ui/Spinner";
// Import a utility function "cn" used to conditionally join/merge Tailwind class names
import cn from "../../utils/cn";

// Filter tabs config
// Export a static array defining each filter tab's internal ID and display label, reusable by parent components if needed
export const NOTIFICATION_TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "order", label: "Orders" },
  { id: "promotion", label: "Promotions" },
  { id: "system", label: "System" },
];

// Define the NotificationFilters functional component, receiving the currently active tab, a callback to change tabs, and the full notifications list (used for counting)
const NotificationFilters = ({
  activeTab,
  onTabChange,
  notifications, // All notifications — count ke liye
}) => {
  // Get access to the React Query client instance so we can manually invalidate/refresh cached queries later
  const queryClient = useQueryClient();

  // Unread notifications
  // Filter the full notifications list down to only the ones that are not yet marked as read
  const unreadNotifications = notifications.filter((n) => !n.is_read);

  // =============================================
  // MARK ALL READ MUTATION
  // API 61 — sab unread notifications mark karo
  // =============================================
  // Set up a mutation that marks every currently unread notification as read in one action
  const markAllMutation = useMutation({
    // The async function that performs the bulk operation
    mutationFn: async () => {
      // Sab unread pe ek ek call karo
      // Fire off a "mark as read" API call for every unread notification simultaneously, waiting for all of them to complete
      await Promise.all(
        unreadNotifications.map((n) => markNotificationRead(n.id)),
      );
    },
    // Callback executed once all the mark-as-read calls have succeeded
    onSuccess: () => {
      // Show a success toast notification to the user
      showSuccess("All notifications marked as read");
      // Invalidate the cached notifications list so it refetches and reflects all notifications now being read
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
    // Callback executed if one or more of the bulk mark-as-read calls fail — Promise.all rejects on the first failure, so the user needs to know the bulk action didn't fully complete
    onError: () => {
      showError("Couldn't mark all notifications as read. Please try again.");
    },
  });

  // Begin the JSX returned by this component
  return (
    // Outer card wrapper — wrapping the filter row in its own white elevated
    // surface (instead of floating directly on the page background) makes it
    // read as a distinct, "raised" toolbar section, consistent with how
    // Pagination is already styled as its own elevated card in this app
    <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
      {/* Filter pills */}
      {/* Container for all the filter tab pill buttons, arranged horizontally with wrapping and gap spacing */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Map over the NOTIFICATION_TABS array to render one pill button per tab */}
        {NOTIFICATION_TABS.map((tab) => {
          // Determine whether this specific tab is the currently active one
          const isActive = activeTab === tab.id;
          // Tab count
          // Calculate the count badge number for this tab: unread notifications count for "unread", total notifications count for "all", or a count of notifications matching this tab's type for all other tabs
          const count =
            tab.id === "unread"
              ? unreadNotifications.length
              : tab.id === "all"
                ? notifications.length
                : notifications.filter((n) => n.type === tab.id).length;

          // Return the JSX for this individual tab pill button
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              // Conditionally combine classes: base pill shape/padding/text styling,
              // plus a brand gradient fill + soft glow shadow when active (instead of
              // a flat solid color), or a plain white/gray look when inactive
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                isActive
                  ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary hover:bg-primary-50",
              )}
            >
              {/* The tab's display label text (e.g., "All", "Unread", "Orders") */}
              {tab.label}
              {/* Only show the count badge if there's a non-zero count and this isn't the "all" tab (since showing a count next to "All" would be redundant with the total) */}
              {count > 0 && tab.id !== "all" && (
                // Count badge text, in parentheses, colored semi-transparent white when active or light gray when inactive
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    isActive ? "text-white/70" : "text-gray-400",
                  )}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mark all as read */}
      {/* Only show the "Mark all as read" button if there is at least one unread notification
          Upgraded from a plain underlined text link to a proper outlined pill button —
          reads as a real secondary action rather than an easy-to-miss inline link       */}
      {unreadNotifications.length > 0 && (
        // Button that triggers the bulk mark-all-as-read mutation when clicked
        <button
          onClick={() => markAllMutation.mutate()}
          // Disable the button while the mutation is currently in progress, to prevent duplicate bulk requests
          disabled={markAllMutation.isPending}
          className="
            flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full shrink-0
            text-primary-dark border border-primary/30 bg-primary-50
            hover:bg-primary-100 hover:border-primary/50
            active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-primary-50
            transition-all duration-200
          "
        >
          {markAllMutation.isPending ? (
            <Spinner size="sm" className="text-primary-dark" /> // shared spinner while the bulk mutation runs
          ) : (
            <AiOutlineCheck className="w-3.5 h-3.5" /> // Checkmark icon shown inside the button
          )}
          {/* Conditionally show "Marking..." while the mutation is in progress, otherwise show the normal "Mark all as read" label */}
          {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
        </button>
      )}
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default NotificationFilters;
