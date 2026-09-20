// ============================================================
// COMPLAINT STATUS WORKFLOW
// ============================================================
// Describes which status changes an admin may apply to a complaint.
// This mirrors the rules enforced by the backend endpoint
// PUT /api/v1/admin/complaints/{id}/status/:
//
//   open        -> in_progress
//   in_progress -> open | resolved
//   resolved    -> closed
//   closed      -> (final, no further changes allowed)
//
// The backend remains the single source of truth and rejects every
// other transition with a 400 response. The map below exists so the
// UI only offers actions that can succeed, instead of letting an admin
// pick an option that is guaranteed to fail.

import { COMPLAINT_STATUS } from "../constants/statusTypes";

// Maps each status to the list of statuses it may move to next.
export const COMPLAINT_STATUS_TRANSITIONS = {
  [COMPLAINT_STATUS.OPEN]: [COMPLAINT_STATUS.IN_PROGRESS],
  [COMPLAINT_STATUS.IN_PROGRESS]: [
    COMPLAINT_STATUS.OPEN,
    COMPLAINT_STATUS.RESOLVED,
  ],
  [COMPLAINT_STATUS.RESOLVED]: [COMPLAINT_STATUS.CLOSED],
  [COMPLAINT_STATUS.CLOSED]: [],
};

// Returns the statuses a complaint can move to from its current status.
// An empty array means no further change is possible (closed) or the
// status is unknown.
export const getAllowedComplaintStatuses = (currentStatus) =>
  COMPLAINT_STATUS_TRANSITIONS[currentStatus] ?? [];

// Returns true when moving a complaint from `fromStatus` to `toStatus`
// is a valid workflow step.
export const canTransitionComplaintStatus = (fromStatus, toStatus) =>
  getAllowedComplaintStatuses(fromStatus).includes(toStatus);
