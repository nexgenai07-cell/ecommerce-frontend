// ============================================================
// getComplaintTypeLabel - UTILITY FUNCTION
// ============================================================
// Converts a raw complaint "type" value (as stored in the DB and
// returned by the API — e.g. "order", "payment", "product",
// "delivery", "other") into a short, human-readable label.
//
// WHY THIS FILE EXISTS:
// This exact label set previously lived only as a local array inside
// ComplaintForm.jsx (used to populate the "Select Type" dropdown).
// Any OTHER component that needed to display a complaint's type as
// text (e.g. the dashboard's Active Complaints & Returns table) had
// no shared source to pull the label from, which would have meant
// either duplicating the array again or showing the raw backend
// value ("other") directly to the customer. Centralizing it here
// means every component — the form dropdown, the dashboard table,
// any future complaint list/detail view — renders the exact same
// wording for the exact same type, and a future new complaint type
// only needs to be added in one place.

import { COMPLAINT_TYPE } from "../constants/statusTypes";
// Centralized raw value constants — comparing against these instead
// of hardcoded strings avoids typos and keeps this file in sync with
// whatever the backend contract actually uses.

// Map of raw backend value -> short display label.
// Kept short (1-2 words) since this is used inside a compact table
// cell, not a full sentence like the dropdown option text.
const COMPLAINT_TYPE_LABELS = {
  [COMPLAINT_TYPE.ORDER]: "Order",
  [COMPLAINT_TYPE.PAYMENT]: "Payment",
  [COMPLAINT_TYPE.PRODUCT]: "Product",
  [COMPLAINT_TYPE.DELIVERY]: "Delivery",
  [COMPLAINT_TYPE.OTHER]: "Other",
};

// getComplaintTypeLabel — takes the raw "type" string off a complaint
// object and returns its display label. Falls back to the raw value
// itself (rather than a blank string) if a new type is ever added on
// the backend before the frontend map is updated — same defensive
// pattern used by getStatusColor's default case.
const getComplaintTypeLabel = (type) => COMPLAINT_TYPE_LABELS[type] || type;

export default getComplaintTypeLabel;
