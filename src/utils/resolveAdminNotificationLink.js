import { ROUTES } from "../constants/routes";

// Admin-side counterpart to utils/resolveNotificationLink.js. Every
// notification the backend returns (List My Notifications — API 75,
// Get Notification Detail — API 76, and the manual Send Notification —
// API 78) carries the same reference_type ("order" | "return" |
// "complaint" | null) and reference_id fields regardless of whether the
// logged-in user is a customer or an admin. The two roles simply need
// to land on different pages when a notification is clicked, so this
// resolver mirrors resolveNotificationLink.js's shape but points at the
// admin management routes instead of the customer account routes.
//
// Order notifications deep-link straight to that order's own admin
// detail page (ROUTES.ADMIN_ORDER_DETAIL supports an :id param, exactly
// like the customer side). Returns and complaints do not have a
// dedicated admin detail route with an :id param today — both
// ReturnsManagement.jsx and ComplaintsManagement.jsx are single list
// pages with no per-record deep-linking support — so those two types
// resolve to their management list page instead, which still gets the
// admin to the right screen in one click.
//
// Returns null when there is nothing to deep-link to (reference_type is
// null, e.g. a general/broadcast notification), so the caller can just
// mark the notification read without navigating anywhere.
const resolveAdminNotificationLink = (notification) => {
  const referenceType = notification?.reference_type;
  const referenceId = notification?.reference_id;
  if (!referenceType) return null;

  switch (referenceType) {
    case "order":
      // An order notification without its reference_id would produce a
      // broken "/admin/orders/undefined" link, so this case still
      // requires referenceId — unlike return/complaint below, which
      // resolve to a fixed list page regardless of the id.
      return referenceId
        ? ROUTES.ADMIN_ORDER_DETAIL.replace(":id", referenceId)
        : ROUTES.ADMIN_ORDERS;
    case "return":
      return ROUTES.ADMIN_RETURNS;
    case "complaint":
      return ROUTES.ADMIN_COMPLAINTS;
    default:
      return null;
  }
};

export default resolveAdminNotificationLink;
