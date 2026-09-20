import { useState, useEffect } from "react";

// TanStack Query hooks — data fetching, caching, and mutations
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Icon set — every icon used anywhere on this page, imported once at the top
import {
  AiOutlineHistory,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineEye,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineEnvironment,
  AiOutlineShoppingCart,
  AiOutlineSend,
  AiOutlineMessage,
  AiOutlineTag,
  AiOutlineFileText,
  AiOutlineCalendar,
} from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa";

import {
  getReturns,
  getReturnDetail,
  updateReturnStatus,
} from "../../api/returns.api";
// getReturns         — GET /api/v1/returns/. An admin calling this gets
//                       EVERY return request across the store (role-based
//                       filtering happens server-side, no separate admin
//                       endpoint is needed). `page`, `status`, `search`,
//                       `start_date`, `end_date` and `ordering` all filter
//                       and paginate on the server and combine in one
//                       request, so only ONE already-filtered page is
//                       fetched at a time. Each return carries
//                       can_update_status and allowed_statuses, which say
//                       whether the admin may decide it and how.
// getReturnDetail    — GET /api/v1/returns/{id}/. Reloads a single return.
// updateReturnStatus — PUT /api/v1/admin/returns/{id}/status/
//                       body: { status: "approved" | "rejected" }. Only a
//                       pending return can be decided, and the decision
//                       is final.
//
// The backend `search` matches order number and return reason text. It is
// not guaranteed to match the return's own reference number (e.g.
// "RET-6") or the customer's name.

import { sendNotification } from "../../api/notifications.api";
// sendNotification — POST /api/v1/notifications/send/
// Used inside the detail modal's "Message Customer" section so an admin
// can send a custom in-app notification straight to the customer who
// filed this return. The field convention (user/title/message/type/
// sent_via) is the same as the NotificationTemplates.jsx admin page.

import { sendWhatsAppMessage } from "../../api/whatsapp.api";
// sendWhatsAppMessage — POST /api/v1/whatsapp/send/
// Second channel in the "Message Customer" section — sends a WhatsApp
// message to the customer's phone number. The field convention
// (phone_number/message) is the same as ManualEntryModal.jsx on the
// WhatsApp admin pages.

import { getCustomerDetail } from "../../api/customers.api";
// getCustomerDetail — GET /api/v1/admin/customers/{id}/
// Used only when the admin opens the detail modal for a specific return.
// The returns list only gives back a bare customer id and a customer_name
// string — no email/phone/address — so the customer profile (email, phone,
// address, total_orders, total_spent) is fetched when the modal opens,
// using the same endpoint as the Customer Management page (see
// CustomerDetailDrawer.jsx for the identical field usage).

import { exportReport } from "../../api/analytics.api";
// exportReport — "returns" is an accepted `type` value

import { QUERY_KEYS } from "../../constants/queryKeys";
import { RETURN_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatDate from "../../utils/formatDate";
import formatPrice from "../../utils/formatPrice";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Avatar from "../../components/ui/Avatar";
import Spinner from "../../components/ui/Spinner";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Modal from "../../components/ui/Modal";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the shared gradient icon + title header used on every
// admin screen (Orders, Products, Categories, Dashboard...).
import ReturnFilters from "../../components/admin-returns/ReturnFilters";
// ReturnFilters — the toolbar above the table (status filter, search,
// Filters toggle, Export, Date Range/Sort chips). The sort option list
// lives inside that file.

// --------------------------------------------------
// STATUS TABS — one entry per real RETURN_STATUS value, plus "All".
// RETURN_STATUS has exactly three values (pending, approved, rejected),
// and these are the values sent to the backend as the `status` filter.
// --------------------------------------------------
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: RETURN_STATUS.REQUESTED, label: "Pending" },
  { key: RETURN_STATUS.APPROVED, label: "Approved" },
  { key: RETURN_STATUS.REJECTED, label: "Rejected" },
];

// The sort option list (Newest/Oldest/Customer Name) lives inside
// ReturnFilters.jsx, next to the Sort dropdown chip that renders it.

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// ============================================================
// ReturnDetailModal — sub-component used by the page below.
// Shows the full detail of one return request. Layout order, top to
// bottom: Customer (who the return is about), Return Overview (status +
// order + dates), Reason, Message Customer, then the Status Actions
// footer. Each section is its own soft-bordered card so the modal reads
// as a clean, scannable dashboard rather than a plain list of text.
// ============================================================
const ReturnDetailModal = ({
  returnItem, // The row object clicked on (null when the modal is closed)
  onClose, // Closes the modal — clears the parent's selected row state
  onDecide, // Opens the confirm modal for an Approve or Reject decision on a
  // return the admin is allowed to decide (see can_update_status).
}) => {
  // Fetches the real customer profile (name, email, phone, address, order
  // history) the moment a return is selected — only runs when there IS a
  // return selected and it actually has a customer id attached to it.
  const {
    data: customerResponse,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
  } = useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_DETAIL(returnItem?.customer),
    queryFn: ({ signal }) => getCustomerDetail(returnItem.customer, signal),
    enabled: !!returnItem?.customer,
    // enabled — TanStack Query never fires this request until a return with
    // a real customer id has actually been selected.
  });

  const customer = customerResponse?.data;

  // --------------------------------------------------
  // MESSAGE CUSTOMER — lets the admin contact the customer through two
  // channels (see the import comments above):
  //   - "notification" → an in-app notification (bell icon)
  //   - "whatsapp"      → a WhatsApp text message
  // Approving or rejecting this return (the buttons further down)
  // already sends the customer an automatic notification by itself. This
  // section is for anything extra the admin wants to say beyond that
  // automatic message — e.g. asking for more photos, explaining a
  // rejection, confirming a pickup time.
  // --------------------------------------------------
  const [messageChannel, setMessageChannel] = useState("notification");
  const [messageTitle, setMessageTitle] = useState(
    returnItem ? `Update on your return #RET-${returnItem.id}` : "",
  );
  const [messageBody, setMessageBody] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: () => {
      if (messageChannel === "whatsapp") {
        // WhatsApp only needs the customer's phone number and the text.
        return sendWhatsAppMessage({
          phone_number: customer.phone,
          message: messageBody,
        });
      }
      // "user" must be the underlying account id (customer.user), NOT the
      // customer profile id (customer.id) — the same distinction the
      // NotificationTemplates.jsx admin page relies on.
      // type: "order" — the same type the backend uses for every automatic
      // return/order notification, so this message lands in the customer's
      // "Orders" notification tab alongside them.
      // reference_type / reference_id — both are required by the endpoint.
      // This modal always operates on a single return, so its id is sent.
      return sendNotification({
        user: customer.user,
        title: messageTitle,
        message: messageBody,
        type: "order",
        reference_type: "return",
        reference_id: returnItem.id,
        sent_via: "in_app",
      });
    },
    onSuccess: () => {
      showSuccess(
        messageChannel === "whatsapp"
          ? "WhatsApp message sent."
          : "Notification sent to the customer.",
      );
      setMessageBody("");
    },
    onError: (error) =>
      showError(error?.response?.data?.message || "Failed to send message."),
  });

  // canSendMessage — guards against sending an empty message, and against
  // a channel the customer's real profile can't actually support (no
  // phone on file for WhatsApp, or somehow no linked account for an
  // in-app notification).
  const canSendMessage =
    messageBody.trim() &&
    (messageChannel === "whatsapp"
      ? !!customer?.phone
      : !!customer?.user && messageTitle.trim());

  // cardClass — the one shared "section card" look every block below uses,
  // kept in a constant so all sections stay visually identical.
  const cardClass = "rounded-2xl border border-gray-100 p-5";

  return (
    <Modal
      isOpen={!!returnItem}
      onClose={onClose}
      title={returnItem ? `Return #RET-${returnItem.id}` : ""}
      size="lg"
    >
      {/* Guard — Modal already returns null when closed, but this keeps
          the body safe from reading properties off a null returnItem
          during the closing animation. */}
      {returnItem && (
        <div className="flex flex-col gap-4">
          {/* ================================================================
              1. CUSTOMER — shown first, since "who is this return about" is
              what an admin needs to see first. A soft emerald-tinted banner
              card, matching the brand gradient used in PageHeader, makes
              this section the visual anchor of the modal.
              ================================================================ */}
          <div
            className={`${cardClass} bg-linear-to-br from-primary-50/70 via-white to-white`}
          >
            {/* Loading state — spinner while the customer profile request
                is in flight */}
            {isCustomerLoading && (
              <div className="py-8 flex items-center justify-center">
                <Spinner size="md" />
              </div>
            )}

            {/* Error state — the customer profile call failed */}
            {isCustomerError && !isCustomerLoading && (
              <p className="text-sm text-gray-400 text-center py-4">
                Couldn't load this customer's profile right now.
              </p>
            )}

            {/* No customer attached at all (edge case) */}
            {!isCustomerLoading && !isCustomerError && !returnItem.customer && (
              <p className="text-sm text-gray-400 text-center py-4">
                No customer is linked to this return.
              </p>
            )}

            {/* Loaded state — real fields only, nothing invented */}
            {!isCustomerLoading && !isCustomerError && customer && (
              <div className="flex flex-col gap-4">
                {/* Identity row — big avatar + name + "customer since" */}
                <div className="flex items-center gap-4">
                  <Avatar name={customer.name} size="lg" />
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Customer since {formatDate(customer.created_at)}
                    </p>
                  </div>
                </div>

                {/* Contact info — pill-shaped chips, so it reads as scannable
                    tags rather than a form. Email is always present;
                    phone/address are only shown when the backend returned
                    them. */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                    <AiOutlineMail className="w-3.5 h-3.5 text-primary" />
                    {customer.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                    <AiOutlinePhone className="w-3.5 h-3.5 text-primary" />
                    {customer.phone || "—"}
                  </span>
                  {customer.address && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                      <AiOutlineEnvironment className="w-3.5 h-3.5 text-primary" />
                      {customer.address}
                    </span>
                  )}
                </div>

                {/* Quick order-history metrics — same real fields the
                    Customer Management page already shows, so an admin
                    reviewing a return can immediately see whether this is
                    a first-time buyer or a repeat customer. */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                      Total Orders
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      {customer.total_orders}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                      Lifetime Value
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      {formatPrice(customer.total_spent)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              2. RETURN OVERVIEW — status badge + order reference + dates,
              grouped into one glanceable card right under the customer.
              ================================================================ */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <AiOutlineTag className="w-4 h-4 text-gray-400" />
                Return #RET-{returnItem.id}
              </h3>
              <Badge
                label={returnItem.status}
                status={returnItem.status}
                size="md"
                rounded
              />
            </div>
            {/* Compact stacked list — each row is full width and its label
                and value sit on the same line, so the order number always
                has enough room and never wraps onto a second line. */}
            <div className="flex flex-col rounded-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                <AiOutlineShoppingCart className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400 shrink-0">Order</span>
                <span className="ml-auto text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {returnItem.order_number}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                <AiOutlineCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400 shrink-0">
                  Requested
                </span>
                <span className="ml-auto text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatDate(returnItem.created_at)}
                </span>
              </div>
              {/* resolved_at only exists once an admin has made a decision —
                  it is hidden for still-pending returns. */}
              {returnItem.resolved_at && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                  <AiOutlineCheckCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400 shrink-0">
                    Resolved
                  </span>
                  <span className="ml-auto text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {formatDate(returnItem.resolved_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================
              3. REASON — the full text, never truncated here (unlike the
              table column, which clips long reasons for layout reasons).
              ================================================================ */}
          <div className={cardClass}>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <AiOutlineFileText className="w-4 h-4 text-gray-400" />
              Reason for Return
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {returnItem.reason || "No reason provided."}
            </p>
          </div>

          {/* ================================================================
              4. MESSAGE CUSTOMER — two real, working channels. Only
              rendered once the customer profile has actually loaded, since
              both channels need real fields off it (customer.user for the
              notification, customer.phone for WhatsApp).
              ================================================================ */}
          {!isCustomerLoading && !isCustomerError && customer && (
            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <AiOutlineMessage className="w-4 h-4 text-gray-400" />
                Message Customer
              </h3>

              {/* Channel switch — two pills, same active/inactive visual
                  language as the status filter pills on the main page for
                  consistency. */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMessageChannel("notification")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    messageChannel === "notification"
                      ? "bg-primary text-white"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <AiOutlineMail className="w-3.5 h-3.5" />
                  In-App Notification
                </button>
                <button
                  type="button"
                  onClick={() => setMessageChannel("whatsapp")}
                  disabled={!customer.phone}
                  // Disabled rather than hidden, so it is clear to the admin
                  // why WhatsApp isn't available (no phone on file).
                  title={
                    !customer.phone
                      ? "No phone number on file for this customer"
                      : ""
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    messageChannel === "whatsapp"
                      ? "bg-primary text-white"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  } ${!customer.phone ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <FaWhatsapp className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Notification-only field — WhatsApp messages don't have
                    a separate title, so this is hidden on that channel. */}
                {messageChannel === "notification" && (
                  <Input
                    label="Title"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                  />
                )}

                {/* WhatsApp destination preview — read-only, always the
                    customer's own number on file, so the admin can
                    confirm they're texting the right person before
                    sending. */}
                {messageChannel === "whatsapp" && customer.phone && (
                  <p className="text-xs text-gray-400">
                    Sending to {customer.phone}
                  </p>
                )}

                <Textarea
                  label="Message"
                  rows={3}
                  placeholder={
                    messageChannel === "whatsapp"
                      ? "Type your WhatsApp message..."
                      : "Type the notification content..."
                  }
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<AiOutlineSend className="w-3.5 h-3.5" />}
                  onClick={() => sendMessageMutation.mutate()}
                  isLoading={sendMessageMutation.isPending}
                  disabled={!canSendMessage}
                  className="self-end"
                >
                  {messageChannel === "whatsapp"
                    ? "Send WhatsApp Message"
                    : "Send Notification"}
                </Button>
              </div>
            </div>
          )}

          {/* ================================================================
              5. STATUS ACTIONS — the Approve / Reject decision. The buttons
              are offered only when the backend says the admin may decide
              this return (can_update_status), and only for the statuses it
              lists in allowed_statuses. A decision is final: once a return
              is approved or rejected it can never be changed again, so it
              is shown as read-only text instead. Wrapped in a tinted footer
              card so it reads as the modal's final "decision" step.
              ================================================================ */}
          {returnItem.can_update_status === true ? (
            <div className="rounded-2xl bg-gray-50 p-4 flex flex-col items-end gap-2">
              <p className="text-xs text-gray-400">
                Approving or rejecting automatically notifies the customer.
              </p>
              <div className="flex items-center gap-3">
                {(returnItem.allowed_statuses || []).includes(
                  RETURN_STATUS.REJECTED,
                ) && (
                  <Button
                    variant="danger"
                    onClick={() => onDecide(returnItem, RETURN_STATUS.REJECTED)}
                  >
                    Reject
                  </Button>
                )}
                {(returnItem.allowed_statuses || []).includes(
                  RETURN_STATUS.APPROVED,
                ) && (
                  <Button
                    variant="primary"
                    onClick={() => onDecide(returnItem, RETURN_STATUS.APPROVED)}
                  >
                    Approve
                  </Button>
                )}
              </div>
            </div>
          ) : (
            (returnItem.status === RETURN_STATUS.APPROVED ||
              returnItem.status === RETURN_STATUS.REJECTED) && (
              <div className="rounded-2xl bg-gray-50 p-4 flex items-center justify-end gap-2">
                <p className="text-xs text-gray-400 text-right">
                  This return has already been{" "}
                  <span className="font-medium text-gray-600">
                    {returnItem.status === RETURN_STATUS.APPROVED
                      ? "approved"
                      : "rejected"}
                  </span>
                  . This decision is final and can't be changed to a different
                  status.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
};

const ReturnsManagement = () => {
  const queryClient = useQueryClient();

  // ---- filter/UI state ----
  const [activeStatus, setActiveStatus] = useState("");
  // activeStatus — which status pill is currently selected ("" = All).

  const [search, setSearch] = useState("");
  // search — raw text typed into the search box before debouncing, sent
  // to the backend as `search` (matches order number and return reason
  // text — see the note near the getReturns import above).

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // startDate / endDate — date-range filter on the return's creation
  // date, sent to the backend as `start_date` / `end_date`. The end date
  // can never be earlier than the start date.

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — server-side ordering, defaults to "Newest First".

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many returns the backend returns per page, controlled
  // by the "Rows per page" dropdown in the table footer. Sent to the
  // backend as `page_size` alongside `page` on every request.

  const [decisionTarget, setDecisionTarget] = useState(null);
  // { returnItem, action: "approved" | "rejected" } — drives the confirm
  // modal, whether it was opened from the table row or from inside the
  // detail modal.

  const [detailTarget, setDetailTarget] = useState(null);
  // The return row currently open in the detail modal (the "eye" icon
  // action, or a click on the row). null when the modal is closed.

  const [isExporting, setIsExporting] = useState(false);

  // Bulk selection — array of return ids currently checked in the
  // table, driven by DataTable's built-in selection support. This is
  // independent of decisionTarget above, which drives the single-row
  // Approve/Reject flow.
  const [selectedReturnIds, setSelectedReturnIds] = useState([]);
  // Changing this key remounts the table, which clears DataTable's
  // internal checkbox selection once a bulk decision has finished.
  const [tableResetKey, setTableResetKey] = useState(0);
  // "approved" | "rejected" — which bulk action the confirm modal below
  // is currently open for.
  const [bulkAction, setBulkAction] = useState(null);
  const [isBulkDeciding, setIsBulkDeciding] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  // Small delay so filtering doesn't recompute on every single keystroke.

  const hasAnyFilterActive =
    !!activeStatus || !!debouncedSearch || !!startDate || !!endDate;
  // Drives the "Clear all" link's visibility in the toolbar.

  // --------------------------------------------------
  // MAIN LIST — server-side status/search/date filtering, sorting, and
  // pagination. Only ONE already-filtered page of returns is ever
  // fetched, no matter how many return requests exist in total.
  // --------------------------------------------------
  const {
    data: returnsResponse,
    isLoading,
    isError,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.RETURNS,
      "list",
      activeStatus,
      debouncedSearch,
      startDate,
      endDate,
      sortBy,
      currentPage,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getReturns(
        {
          status: activeStatus || undefined,
          search: debouncedSearch || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          ordering: sortBy,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
    keepPreviousData: true,
  });

  const visibleReturns = extractListData(returnsResponse);
  const totalCount = returnsResponse?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // `visibleReturns` is always exactly one already-filtered, already-sorted
  // page straight from the backend — no client-side re-filtering,
  // re-sorting, or re-slicing on top of it.

  // If the backend rejects the request (for example an invalid date
  // range), show the reason it gives instead of only the generic table
  // error.
  useEffect(() => {
    const message = listError?.response?.data?.error;
    if (message) showError(message);
  }, [listError]);

  // --------------------------------------------------
  // STAT CARD COUNTS — each its own lightweight request that reads
  // only the real backend `count` field for that specific status; the
  // actual result rows aren't needed, just the totals. Accurate across
  // the ENTIRE return history, not just whatever page happens to be
  // loaded.
  // --------------------------------------------------
  const { data: pendingCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.RETURNS, "count", RETURN_STATUS.REQUESTED],
    queryFn: ({ signal }) =>
      getReturns(
        { status: RETURN_STATUS.REQUESTED, page: 1, page_size: 1 },
        signal,
      ),
  });
  const pendingCount = pendingCountResponse?.data?.count ?? 0;

  const { data: approvedCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.RETURNS, "count", RETURN_STATUS.APPROVED],
    queryFn: ({ signal }) =>
      getReturns(
        { status: RETURN_STATUS.APPROVED, page: 1, page_size: 1 },
        signal,
      ),
  });
  const approvedCount = approvedCountResponse?.data?.count ?? 0;

  const { data: rejectedCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.RETURNS, "count", RETURN_STATUS.REJECTED],
    queryFn: ({ signal }) =>
      getReturns(
        { status: RETURN_STATUS.REJECTED, page: 1, page_size: 1 },
        signal,
      ),
  });
  const rejectedCount = rejectedCountResponse?.data?.count ?? 0;

  const { data: totalCountResponse } = useQuery({
    queryKey: [...QUERY_KEYS.RETURNS, "count", "total"],
    queryFn: ({ signal }) => getReturns({ page: 1, page_size: 1 }, signal),
  });
  const grandTotalCount = totalCountResponse?.data?.count ?? 0;

  const decidedCount = approvedCount + rejectedCount;
  const approvalRate =
    decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : null;

  // Whenever any filter, sort, or rows-per-page selection changes,
  // jump back to page 1 — staying on, say, page 3 of a now-much-
  // smaller/differently-sized result set would otherwise show an
  // empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, debouncedSearch, startDate, endDate, sortBy, pageSize]);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
    setCurrentPage(1);
    // Any time the status filter changes, jump back to page 1 — staying on
    // e.g. page 2 of a now-much-smaller filtered result set would otherwise
    // show an empty page.
  };

  const handleClearFilters = () => {
    setActiveStatus("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setSortBy("-created_at");
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // APPROVE / REJECT — both the buttons inside the detail modal and the
  // confirm modal funnel through the same decisionTarget state.
  // --------------------------------------------------
  const decisionMutation = useMutation({
    mutationFn: () =>
      updateReturnStatus(decisionTarget.returnItem.id, {
        status: decisionTarget.action,
      }),
    onSuccess: () => {
      showSuccess(
        decisionTarget.action === RETURN_STATUS.APPROVED
          ? "Return approved."
          : "Return rejected.",
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RETURNS });
      setDecisionTarget(null);
      // Also closes the detail modal, if the decision was made from there —
      // the decision is final, so the Approve/Reject controls must not stay
      // on screen.
      setDetailTarget(null);
    },
    onError: async (error) => {
      // The backend answers an invalid decision with an "error" message —
      // for example when another admin already decided this return.
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to update return.",
      );

      const failedReturnId = decisionTarget?.returnItem?.id;
      setDecisionTarget(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RETURNS });

      // Reload the return so the detail modal shows its real, current
      // state (for example "already approved") instead of stale buttons.
      if (failedReturnId) {
        try {
          const refreshed = await getReturnDetail(failedReturnId);
          setDetailTarget((current) =>
            current && current.id === failedReturnId ? refreshed.data : current,
          );
        } catch {
          // The list refetch above keeps the table current; the modal keeps
          // showing the last state it had.
        }
      }
    },
  });

  const handleConfirmDecision = () => decisionMutation.mutate();

  // Opens the confirm modal — called from the Approve/Reject buttons inside
  // ReturnDetailModal.
  const handleRequestDecision = (returnItem, action) => {
    setDecisionTarget({ returnItem, action });
  };

  // --------------------------------------------------
  // BULK APPROVE / REJECT — called once per selected return (there is no
  // bulk endpoint on the backend). Only returns the backend allows the
  // admin to decide (can_update_status) are eligible: already-decided
  // returns in the selection are left untouched and reported as skipped,
  // because a decision is final. Every request is attempted and reported
  // on its own, so one failure does not hide the returns that succeeded.
  // --------------------------------------------------
  const selectedPendingReturns = visibleReturns.filter(
    (r) => selectedReturnIds.includes(r.id) && r.can_update_status === true,
  );
  const skippedSelectedCount =
    selectedReturnIds.length - selectedPendingReturns.length;

  const handleRequestBulkDecision = (action) => {
    setBulkAction(action);
  };

  const handleConfirmBulkDecision = async () => {
    setIsBulkDeciding(true);
    try {
      const results = await Promise.allSettled(
        selectedPendingReturns.map((r) =>
          updateReturnStatus(r.id, { status: bulkAction }),
        ),
      );
      const updatedCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedResults = results.filter(
        (result) => result.status === "rejected",
      );

      if (updatedCount > 0) {
        showSuccess(
          `${updatedCount} return${updatedCount === 1 ? "" : "s"} ${bulkAction}.`,
        );
      }
      if (failedResults.length > 0) {
        showError(
          failedResults[0].reason?.response?.data?.error ||
            failedResults[0].reason?.response?.data?.message ||
            `${failedResults.length} return${failedResults.length === 1 ? "" : "s"} could not be updated.`,
        );
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RETURNS });
      setSelectedReturnIds([]);
      setTableResetKey((key) => key + 1);
      setBulkAction(null);
    } finally {
      setIsBulkDeciding(false);
    }
  };

  // --------------------------------------------------
  // EXPORT — downloads the returned blob as a .csv file
  // --------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportReport({
        type: "returns",
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `returns-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showSuccess("Export downloaded.");
    } catch {
      showError("Failed to export returns. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // columns — DataTable column config. The reason text is not a column: its
  // full text lives in the detail modal, where there is room to show it.
  const columns = [
    {
      key: "id",
      label: "Return ID",
      render: (row) => (
        <span className="font-medium text-primary">#RET-{row.id}</span>
      ),
    },
    {
      key: "order_number",
      label: "Order ID",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-700">
          {row.order_number}
        </span>
      ),
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.customer_name} size="sm" />
          <span className="text-[10px] sm:text-[11px] text-gray-900">
            {row.customer_name || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} status={row.status} size="sm" rounded />
      ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] text-gray-500">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Eye icon — present on every row, opens the detail modal
              regardless of status. Approve/Reject are deliberately not
              shown in the table: the decision is made inside the detail
              modal (see the decision footer in ReturnDetailModal), which
              opens from this icon or by clicking anywhere on the row. */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Stops this click from also bubbling up to the row's own
              // onClick, which opens the same modal — avoids a redundant
              // double open when the icon itself is clicked
              setDetailTarget(row);
            }}
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
            aria-label={`View return #RET-${row.id}`}
          >
            <AiOutlineEye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    // Tight vertical spacing between the header, stats cards, toolbar, and
    // table, matching the rhythm used on the other admin list pages.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, the same component
          used on every other admin page.
          ================================================================ */}
      <PageHeader icon={<AiOutlineHistory />} title="Returns Management" />

      {/* ================================================================
          STAT CARDS — all four counts are read directly from the
          backend's `count` field, one lightweight request per stat, so
          the figures reflect the entire return history rather than just
          the currently loaded page.

          Layout: a flex-wrap row, matching the KPI row on the main
          Dashboard. StatsCard sizes itself to its own content (title +
          value), so a wrapping flex row lets every card keep its natural
          width, sit close to its neighbour, and drop to the next line on
          narrower viewports without any manual breakpoint tuning.
          ================================================================ */}
      <div className="flex flex-wrap gap-2">
        <StatsCard
          title="Total Returns"
          value={grandTotalCount}
          icon={<AiOutlineHistory />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
        />
        <StatsCard
          title="Pending Review"
          value={pendingCount}
          icon={<AiOutlineClockCircle />}
          iconBg="bg-warning-light"
          iconColor="text-warning"
          trend={pendingCount > 0 ? "Needs attention" : ""}
        />
        <StatsCard
          title="Approved"
          value={approvedCount}
          icon={<AiOutlineCheckCircle />}
          iconBg="bg-success-light"
          iconColor="text-success"
          trend={approvalRate !== null ? `${approvalRate}% approval rate` : ""}
        />
        <StatsCard
          title="Rejected"
          value={rejectedCount}
          icon={<AiOutlineCloseCircle />}
          iconBg="bg-danger-light"
          iconColor="text-danger"
        />
      </div>

      {/* ================================================================
          TOOLBAR — status filter, search, Filters, Export, and (once
          opened) the Date Range / Sort dropdown chips. Same toolbar
          pattern used on every other admin list page.
          ================================================================ */}
      <ReturnFilters
        statusTabs={STATUS_TABS}
        activeStatus={activeStatus}
        onStatusChange={handleTabChange}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(value) => {
          setStartDate(value);
          setCurrentPage(1);
        }}
        onEndDateChange={(value) => {
          setEndDate(value);
          setCurrentPage(1);
        }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasAnyFilterActive}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* ================================================================
          BULK ACTION BAR — appears only while one or more rows are
          checked. Approve/Reject apply only to the returns that can still
          be decided within the selection; the count of any already-decided
          ones that will be skipped is shown for clarity.
          ================================================================ */}
      {selectedReturnIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-medium text-gray-700">
            {selectedReturnIds.length} return
            {selectedReturnIds.length === 1 ? "" : "s"} selected
            {skippedSelectedCount > 0 && (
              <span className="text-gray-400">
                {" "}
                ({skippedSelectedCount} already decided, will be skipped)
              </span>
            )}
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              disabled={selectedPendingReturns.length === 0}
              onClick={() => handleRequestBulkDecision(RETURN_STATUS.APPROVED)}
              className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={selectedPendingReturns.length === 0}
              onClick={() => handleRequestBulkDecision(RETURN_STATUS.REJECTED)}
              className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)] flex flex-col flex-1 min-h-0">
        <DataTable
          key={tableResetKey}
          columns={columns}
          data={visibleReturns}
          keyField="id"
          onRowClick={(row) => setDetailTarget(row)}
          // Opens the same detail modal as the eye icon when any part of
          // the row is clicked
          selectable
          onSelectionChange={setSelectedReturnIds}
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ================================================================
          DETAIL MODAL — opened by the eye icon or a click on any row. Shows
          the full reason text plus the customer profile (fetched live), and
          exposes Approve/Reject for returns that can still be decided.
          ================================================================ */}
      <ReturnDetailModal
        key={detailTarget?.id}
        returnItem={detailTarget}
        onClose={() => setDetailTarget(null)}
        onDecide={handleRequestDecision}
      />

      {/* ================================================================
          CONFIRM MODAL — the status-change confirmation step for the
          detail modal's Approve/Reject buttons.
          ================================================================ */}
      <ConfirmModal
        isOpen={!!decisionTarget}
        onClose={() => setDecisionTarget(null)}
        onConfirm={handleConfirmDecision}
        title={
          decisionTarget?.action === RETURN_STATUS.APPROVED
            ? "Approve Return?"
            : "Reject Return?"
        }
        message={`This will mark return #RET-${decisionTarget?.returnItem?.id} as ${decisionTarget?.action}. This action cannot be undone.`}
        confirmLabel={
          decisionTarget?.action === RETURN_STATUS.APPROVED
            ? "Approve"
            : "Reject"
        }
        variant={
          decisionTarget?.action === RETURN_STATUS.APPROVED
            ? "primary"
            : "danger"
        }
        isLoading={decisionMutation.isPending}
      />

      {/* ================================================================
          BULK APPROVE/REJECT CONFIRMATION — separate modal instance from
          the single-row one above, driven by bulkAction/selectedReturnIds
          instead of decisionTarget, so the two flows never interfere.
          ================================================================ */}
      <ConfirmModal
        isOpen={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={handleConfirmBulkDecision}
        title={
          bulkAction === RETURN_STATUS.APPROVED
            ? "Approve Returns?"
            : "Reject Returns?"
        }
        message={`This will mark ${selectedPendingReturns.length} pending return${selectedPendingReturns.length === 1 ? "" : "s"} as ${bulkAction}. This action cannot be undone.`}
        confirmLabel={
          bulkAction === RETURN_STATUS.APPROVED ? "Approve" : "Reject"
        }
        variant={bulkAction === RETURN_STATUS.APPROVED ? "primary" : "danger"}
        isLoading={isBulkDeciding}
      />
    </div>
  );
};

export default ReturnsManagement;
