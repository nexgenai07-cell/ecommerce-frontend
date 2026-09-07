import { ROUTES } from "../constants/routes";

// Resolves a notification's reference_type/reference_id (added to every
// notification — list, detail, and manual "send" — for order status
// changes, return status changes, and complaint replies) to the actual
// account page it should open. Returns null when there's nothing to
// deep-link to (reference_type is null, e.g. a general/promotional
// notification), so the caller can just mark it read without navigating.
const resolveNotificationLink = (notification) => {
  const referenceType = notification?.reference_type;
  const referenceId = notification?.reference_id;
  if (!referenceType || !referenceId) return null;

  switch (referenceType) {
    case "order":
      return ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", referenceId);
    case "return":
      return ROUTES.ACCOUNT_RETURN_DETAIL.replace(":id", referenceId);
    case "complaint":
      return ROUTES.ACCOUNT_COMPLAINT_DETAIL.replace(":id", referenceId);
    default:
      return null;
  }
};

export default resolveNotificationLink;
