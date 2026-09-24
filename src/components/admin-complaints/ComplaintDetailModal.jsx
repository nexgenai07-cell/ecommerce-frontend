import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineEnvironment,
  AiOutlineTag,
  AiOutlineCalendar,
  AiOutlinePaperClip,
} from "react-icons/ai";

import { updateComplaintStatus } from "../../api/complaints.api";
import { getCustomerDetail } from "../../api/customers.api";
// getCustomerDetail — GET /api/v1/admin/customers/{id}/
// Used only when the admin opens this modal for a specific complaint.
// The complaint object itself only gives back a bare customer id and a
// customer_name string — no email/phone/address. The customer profile
// (email, phone, address, total_orders, total_spent) is therefore
// fetched when the modal opens, using the same endpoint as the Returns
// detail modal and the Customer Management page.

import { QUERY_KEYS } from "../../constants/queryKeys";
import { COMPLAINT_STATUS } from "../../constants/statusTypes";
import {
  getAllowedComplaintStatuses,
  canTransitionComplaintStatus,
} from "../../utils/complaintStatusWorkflow";
import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
import formatDate from "../../utils/formatDate";
import formatPrice from "../../utils/formatPrice";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";
import ComplaintThread from "../complaint/ComplaintThread";

// Display labels for every complaint status listed in the status dropdown.
const STATUS_LABELS = {
  [COMPLAINT_STATUS.OPEN]: "Open",
  [COMPLAINT_STATUS.IN_PROGRESS]: "In Review",
  [COMPLAINT_STATUS.RESOLVED]: "Resolved",
  [COMPLAINT_STATUS.CLOSED]: "Closed",
};

const ComplaintDetailModal = ({ isOpen, onClose, complaint }) => {
  const queryClient = useQueryClient();

  // status — the value currently chosen in the dropdown.
  const [status, setStatus] = useState("");

  // updatedStatus — the status confirmed by the server after a
  // successful update made from this modal. The complaint object
  // passed in as a prop is a snapshot taken when the modal was opened,
  // so this value takes precedence over it until a different
  // complaint is opened.
  const [updatedStatus, setUpdatedStatus] = useState(null);

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setUpdatedStatus(null);
    }
  }, [complaint]);

  // currentStatus — the complaint's real status right now.
  const currentStatus = updatedStatus ?? complaint?.status;

  // allowedStatuses — the only statuses the workflow permits from the
  // current one. Empty when the complaint is closed (final state).
  const allowedStatuses = getAllowedComplaintStatuses(currentStatus);

  // Dropdown options: every status is always listed. Only the current
  // status (so the select always has a valid selected value) and the
  // statuses reachable from it can be picked; every other option is shown
  // disabled, so the admin can see it exists but cannot select it.
  const statusOptions = Object.values(COMPLAINT_STATUS).map((value) => ({
    value,
    label: STATUS_LABELS[value] ?? value,
    disabled: value !== currentStatus && !allowedStatuses.includes(value),
  }));

  // Fetches the real customer profile the moment a complaint is
  // opened — only runs when the modal is actually open and the
  // complaint has a real customer id attached to it.
  const {
    data: customerResponse,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
  } = useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_DETAIL(complaint?.customer),
    queryFn: ({ signal }) => getCustomerDetail(complaint.customer, signal),
    enabled: isOpen && !!complaint?.customer,
    // enabled — TanStack Query never fires this request until the
    // modal is open on a complaint that actually has a customer id.
  });

  const customer = customerResponse?.data;

  // --------------------------------------------------
  // UPDATE STATUS — PUT /api/v1/admin/complaints/{id}/status/
  // --------------------------------------------------
  // Kept separate from the message thread below (see
  // ComplaintThread.jsx): the status only changes when the admin
  // explicitly clicks "Update" here, never as a side effect of posting
  // a message.
  //
  // The backend enforces the status workflow (open -> in_progress ->
  // resolved -> closed, with in_progress also allowed back to open) and
  // answers an invalid transition with a 400 and an `error` message,
  // which is surfaced to the admin as-is.
  const statusMutation = useMutation({
    mutationFn: (nextStatus) =>
      updateComplaintStatus(complaint.id, { status: nextStatus }),
    onSuccess: (_response, nextStatus) => {
      // Adopt the new status locally so the badge, the dropdown options
      // and the Update button all reflect the change immediately.
      setUpdatedStatus(nextStatus);
      setStatus(nextStatus);
      showSuccess("Status updated.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
    },
    onError: (error) =>
      showError(error?.response?.data?.error || "Failed to update status."),
  });

  if (!complaint) return null;

  // cardClass — the one shared "section card" look every block below
  // uses, matching the exact elevated style used on the Returns
  // detail modal (soft drop shadow instead of a flat border) so both
  // modals read as the same visual family. Padding kept compact so
  // the modal doesn't need excessive scrolling to see the thread.
  // min-w-0 lets the card shrink inside the flex column instead of being
  // stretched by long unbroken content.
  const cardClass =
    "min-w-0 rounded-2xl bg-white shadow-lg shadow-gray-200/70 p-3 sm:p-4";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complaint #CMP-${complaint.id}`}
      size="lg"
    >
      <div className="flex flex-col gap-3">
        {/* ================================================================
            1. CUSTOMER — shown first, matching the Returns detail
            modal's layout order, since "who filed this" is the thing
            an admin needs to see before anything else.
            ================================================================ */}
        <div
          className={`${cardClass} bg-linear-to-br from-primary-50/70 via-white to-white`}
        >
          {/* Loading state — spinner while the customer profile
              request is in flight */}
          {isCustomerLoading && (
            <div className="py-8 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          )}

          {/* Error state — the customer profile call failed; the
              complaint itself is still fully visible below, only this
              section is affected */}
          {isCustomerError && !isCustomerLoading && (
            <p className="text-sm text-gray-400 text-center py-4">
              Couldn't load this customer's profile right now.
            </p>
          )}

          {/* No customer attached at all (edge case) */}
          {!isCustomerLoading && !isCustomerError && !complaint.customer && (
            <p className="text-sm text-gray-400 text-center py-4">
              No customer is linked to this complaint.
            </p>
          )}

          {/* Loaded state — real fields only, nothing invented */}
          {!isCustomerLoading && !isCustomerError && customer && (
            <div className="flex flex-col gap-3">
              {/* Identity row — avatar + name + "customer since" */}
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} size="md" />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Customer since {formatDate(customer.created_at)}
                  </p>
                </div>
              </div>

              {/* Contact info — pill-shaped chips, same style as the
                  Returns modal, so this reads as scannable tags rather
                  than a form. Email always present; phone/address
                  only shown when the backend actually returned them. */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100 [overflow-wrap:anywhere]">
                  <AiOutlineMail className="w-3.5 h-3.5 shrink-0 text-primary" />
                  {customer.email}
                </span>
                <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100 [overflow-wrap:anywhere]">
                  <AiOutlinePhone className="w-3.5 h-3.5 shrink-0 text-primary" />
                  {customer.phone || "—"}
                </span>
                {customer.address && (
                  <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100 [overflow-wrap:anywhere]">
                    <AiOutlineEnvironment className="w-3.5 h-3.5 shrink-0 text-primary" />
                    {customer.address}
                  </span>
                )}
              </div>

              {/* Quick order-history metrics — same real fields the
                  Customer Management page and the Returns modal
                  already show, so an admin reviewing a complaint can
                  immediately see whether this is a first-time buyer
                  or a repeat customer. */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                <div className="min-w-0 bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                    Total Orders
                  </p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    {customer.total_orders}
                  </p>
                </div>
                <div className="min-w-0 bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                    Lifetime Value
                  </p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5 [overflow-wrap:anywhere]">
                    {formatPrice(customer.total_spent)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================
            2. COMPLAINT OVERVIEW — type, priority, and date, grouped
            into one glanceable card right under the customer.
            ================================================================ */}
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="min-w-0 text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AiOutlineTag className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="truncate">Complaint #CMP-{complaint.id}</span>
            </h3>
            <Badge
              label={currentStatus}
              status={currentStatus}
              size="md"
              rounded
              className="shrink-0"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge
              label={getComplaintTypeLabel(complaint.type)}
              variant="gray"
              size="sm"
              rounded
            />
            <Badge
              label={complaint.priority}
              variant={complaint.priority === "urgent" ? "danger" : "gray"}
              size="sm"
              rounded
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
              <AiOutlineCalendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400">Filed</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(complaint.created_at)}
                </p>
              </div>
            </div>
            {/* order_number is only present on complaints raised
                against a specific order (type: "order") — omitted
                entirely rather than shown blank for other types. */}
            {complaint.order_number && (
              <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
                <AiOutlineTag className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">Order</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {complaint.order_number}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================
            3. ORIGINAL MESSAGE — the customer's original complaint
            text, plus the attachment link when one was submitted.
            ================================================================ */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Customer's Original Message
          </h3>
          {/* whitespace-pre-wrap keeps the customer's own line breaks, and
              [overflow-wrap:anywhere] breaks a very long unbroken word
              (or URL) onto the next line instead of pushing the modal
              sideways, so no horizontal scrolling is ever needed. */}
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] bg-gray-50 rounded-lg p-3">
            {complaint.message}
          </p>
          {complaint.attachment && (
            <a
              href={complaint.attachment}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3"
            >
              <AiOutlinePaperClip className="w-4 h-4" />
              View Attachment
            </a>
          )}
        </div>

        {/* ================================================================
            4. STATUS — its own explicit control, separate from the
            message thread below. Changing the status here is the only
            way a complaint's status changes; sending a message in the
            thread never affects it. Options the workflow does not
            allow are shown disabled.
            ================================================================ */}
        <div className={cardClass}>
          {/* Stacked on phones (select above, full-width button below),
              side by side from the sm breakpoint upward. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              {/* The select is disabled once the complaint is closed,
                  since a closed complaint can no longer be updated. */}
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={allowedStatuses.length === 0}
                hint={
                  allowedStatuses.length === 0
                    ? "This complaint is closed and can no longer be updated."
                    : ""
                }
              />
            </div>
            {/* Enabled only when the chosen status is a valid next step
                from the complaint's current status. */}
            <Button
              variant="secondary"
              onClick={() => statusMutation.mutate(status)}
              isLoading={statusMutation.isPending}
              disabled={!canTransitionComplaintStatus(currentStatus, status)}
              className="w-full sm:w-auto"
            >
              Update
            </Button>
          </div>
        </div>

        {/* ================================================================
            5. MESSAGE THREAD — the real conversation with the
            customer. Either side can keep replying; each new message
            notifies the other party automatically on the backend.
            ================================================================ */}
        <div className="rounded-2xl bg-gray-50 p-3.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Conversation
          </p>
          {/* otherPartyName — passes the real customer name (once the
              customer profile query above has resolved) so the thread
              labels the customer's bubbles with their actual name
              instead of a generic placeholder. */}
          <ComplaintThread
            complaintId={complaint.id}
            currentRole="admin"
            otherPartyName={customer?.name}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ComplaintDetailModal;
