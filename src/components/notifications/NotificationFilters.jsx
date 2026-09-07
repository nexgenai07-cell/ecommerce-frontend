// Import useMutation for the "mark all as read" bulk API call, and useQueryClient to refresh cached notification data afterward
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Import a checkmark icon from the react-icons Ant Design icon set, used on the "Mark all as read" button
import { AiOutlineCheck } from "react-icons/ai";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the NEW dedicated bulk "mark all as read" API function
import { markAllNotificationsRead } from "../../api/notifications.api";
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

// Define the NotificationFilters functional component, receiving the
// currently active tab, a callback to change tabs, and the confirmed
// total unread count (a single real number from the backend, NOT a
// full notifications array — see the note below on why per-tab counts
// were removed).
const NotificationFilters = ({ activeTab, onTabChange, unreadCount }) => {
  // Get access to the React Query client instance so we can manually invalidate/refresh cached queries later
  const queryClient = useQueryClient();

  // =============================================
  // MARK ALL READ MUTATION
  // =============================================
  // Now calls the single, dedicated bulk endpoint instead of firing
  // one PUT request per unread notification. No longer needs to know
  // the full list of unread notifications — the backend handles all
  // of the logged-in user's unread notifications in one request.
  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    // Callback executed once the bulk mark-as-read call succeeds
    onSuccess: () => {
      // Show a success toast notification to the user
      showSuccess("All notifications marked as read");
      // Invalidate the cached notifications list so it refetches and reflects all notifications now being read
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
    // Callback executed if the bulk mark-as-read call fails
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

          // NOTE: per-tab counts for "Orders"/"Promotions"/"System"/"All"
          // used to be computed by counting the FULL notifications array
          // in the browser. Now that only one page is ever loaded at a
          // time, that full list no longer exists on the frontend, and
          // the backend's confirmed contract only provides a single
          // TOTAL unread_count — not a breakdown by type. So only the
          // "Unread" tab shows a count (using the real, confirmed
          // number passed in as a prop); the other tabs show no count
          // rather than a fake or stale one.
          const count = tab.id === "unread" ? unreadCount : null;

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
              {/* Only shown for the "Unread" tab, and only when there's
                  at least one unread notification */}
              {count > 0 && (
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
      {unreadCount > 0 && (
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
