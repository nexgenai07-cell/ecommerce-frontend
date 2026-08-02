// useState — local component state (filters, modal targets, loading flags)
// useMemo — recomputes filtered/sorted/paginated data only when its real
// dependencies change, instead of on every single render
import { useState, useMemo } from "react";

// TanStack Query hooks — data fetching, caching, and mutations
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Icon set — every icon used anywhere on this page, imported once at the top
import {
  AiOutlineHistory,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineDownload,
  AiOutlineSearch,
  AiOutlineEye,
  AiOutlineFilter,
  AiOutlineClose,
  AiOutlineSortAscending,
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

import { getReturns, updateReturnStatus } from "../../api/returns.api";
// getReturns         — API 51: GET /api/v1/returns/ — an admin calling this
//                       gets EVERY return request across the store (role-based
//                       filtering happens server-side, no separate admin
//                       endpoint needed).
// updateReturnStatus — API 53: PUT /api/v1/admin/returns/{id}/status/
//                       body: { status: "approved" | "rejected" }
//
// BACKEND BUG — CONFIRMED VIA NETWORK TAB (not a guess):
// This page used to send status/search as query params on the request above,
// hoping the backend supported undocumented filtering (a pattern that has
// worked for other endpoints in this project before). It does NOT work here.
// Screenshots of the Network tab show FOUR separate requests —
// returns/?status=pending, ?status=approved, ?status=rejected, and a plain
// ?page=1 — and every single one of them returned the EXACT same payload:
// { count: 4, results: [...same 4 rows, mostly status: "approved"...] }.
// The backend is silently ignoring the ?status= query param and always
// returning the full, unfiltered list. That is a backend issue, not a
// frontend one — flag this to the backend team so /api/v1/returns/ actually
// honors ?status=.
//
// THE FIX APPLIED HERE: since the backend can't be trusted to filter, this
// page now fetches the return list ONCE, in full, and does ALL filtering —
// status tabs, search, date range, sorting, and pagination — on the client,
// against that single real dataset. This guarantees the tabs/search actually
// work correctly for the admin today, and costs nothing once the backend is
// eventually fixed (the extra client-side pass will simply have nothing left
// to do).

import { sendNotification } from "../../api/notifications.api";
// sendNotification — API 74: POST /api/v1/notifications/send/
// This is the actual answer to "admin customer ko msg kaise bhejega" —
// used inside the detail modal's "Message Customer" section so an admin
// can send a real, custom in-app notification straight to the customer
// who filed this return. Field convention (user/title/message/type/
// sent_via) copied exactly from the existing, already-working
// NotificationTemplates.jsx admin page — same shape, same backend call.

import { sendWhatsAppMessage } from "../../api/whatsapp.api";
// sendWhatsAppMessage — API 105: POST /api/v1/whatsapp/send/
// Second channel in the same "Message Customer" section — sends a real
// WhatsApp message to the customer's phone number. Field convention
// (phone_number/message) copied exactly from the existing, already-working
// ManualEntryModal.jsx used on the WhatsApp admin pages.

import { getCustomerDetail } from "../../api/customers.api";
// getCustomerDetail — API 102: GET /api/v1/admin/customers/{id}/
// Used ONLY when the admin opens the detail modal for a specific return.
// The returns list itself (API 51) only gives back a bare customer id and a
// customer_name string — no email/phone/address. Rather than inventing those
// fields, this page fetches the real customer profile (which genuinely does
// have email/phone/address/total_orders/total_spent) the moment the modal
// opens, using the same endpoint the Customer Management page already relies
// on (see CustomerDetailDrawer.jsx for the identical field usage).

import { exportReport } from "../../api/analytics.api";
// exportReport — API 90 (Export Report). FLAG: the API doc only confirms
// "sales" as an example `type` value; "returns" is used here as a reasonable
// guess for this report — confirm the exact accepted type string with the
// backend team.

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
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import Avatar from "../../components/ui/Avatar";
import Spinner from "../../components/ui/Spinner";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Modal from "../../components/ui/Modal";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already used on
// every other admin screen (Orders, Products, Categories, Dashboard...).
// Added here so Returns finally matches the rest of the panel instead of
// using its own plain <h1>.

// --------------------------------------------------
// STATUS TABS — one pill per real RETURN_STATUS value, plus "All".
// "Refunded" is intentionally excluded — RETURN_STATUS only has 3 real
// values (pending/approved/rejected); there is no "refunded" state anywhere
// in the documented backend contract.
// --------------------------------------------------
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: RETURN_STATUS.REQUESTED, label: "Pending" },
  { key: RETURN_STATUS.APPROVED, label: "Approved" },
  { key: RETURN_STATUS.REJECTED, label: "Rejected" },
];

// --------------------------------------------------
// SORT OPTIONS — purely client-side re-ordering of the full return list,
// same pattern already used on the Orders admin page. There is no
// documented "ordering" query param on API 51, so this never triggers a new
// network request — it just re-sorts the rows already in memory.
// --------------------------------------------------
const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "customer_name", label: "Customer Name: A-Z" },
  { value: "-customer_name", label: "Customer Name: Z-A" },
];

// Maps each SORT_OPTIONS value to an actual comparator function used by
// Array.prototype.sort() further down.
const SORTERS = {
  "-created_at": (a, b) => new Date(b.created_at) - new Date(a.created_at),
  created_at: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  customer_name: (a, b) =>
    (a.customer_name || "").localeCompare(b.customer_name || ""),
  "-customer_name": (a, b) =>
    (b.customer_name || "").localeCompare(a.customer_name || ""),
};

// --------------------------------------------------
// normalizeForSearch — strips EVERYTHING except letters and digits, and
// lowercases the result. This is what fixes the Return ID search bug: the
// table displays each row as "#RET-6", but a raw string compare against
// "RET-6" fails the moment the admin types the "#" that's visibly right
// there on screen, or leaves out the dash, or types "ret 6" with a space.
// Stripping punctuation/spaces from BOTH the search query and the value
// being searched means "#RET-6", "RET-6", "ret6", and "RET 6" all
// normalize down to the same "ret6" and match correctly.
// --------------------------------------------------
const normalizeForSearch = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// How many rows to show per page — client-side pagination, since the
// backend does not reliably paginate this endpoint either (see flag above).
const PAGE_SIZE = 10;

// ============================================================
// ReturnDetailModal — sub-component rendered at the bottom of this file.
// Shows the FULL detail of one return request. Layout order, top to
// bottom: Customer (who this is about, shown first per Rimsha's request),
// Return Overview (status + order + dates), Reason, Message Customer, then
// the Status Actions footer. Each section is its own soft-bordered card so
// the modal reads as a clean, scannable dashboard rather than a plain list
// of text. Kept inside this same file (instead of a separate component
// file) so Rimsha only has to copy-paste one file for this whole feature.
// ============================================================
const ReturnDetailModal = ({
  returnItem, // The row object clicked on (null when the modal is closed)
  onClose, // Closes the modal — clears the parent's selected row state
  onDecide, // Opens the confirm modal — used both for the first Approve/
  // Reject decision on a Pending return, and for switching an
  // already-decided return between Approved and Rejected.
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
    queryFn: () => getCustomerDetail(returnItem.customer),
    enabled: !!returnItem?.customer,
    // enabled — TanStack Query never fires this request until a return with
    // a real customer id has actually been selected.
  });

  const customer = customerResponse?.data;

  // --------------------------------------------------
  // MESSAGE CUSTOMER — the actual answer to "admin customer ko msg kaise
  // bhejega". Two real, doc-backed channels, both already used elsewhere
  // in this exact project (see the import comments above):
  //   - "notification" → API 74, an in-app notification (bell icon)
  //   - "whatsapp"      → API 105, a real WhatsApp text message
  // NOTE — Approving or rejecting this return (the buttons further down)
  // ALREADY sends the customer an automatic "order" notification by
  // itself, per API 63's documented behavior. This section is for
  // anything EXTRA the admin wants to say beyond that automatic message —
  // e.g. asking for more photos, explaining a rejection, confirming a
  // pickup time.
  // --------------------------------------------------
  const [messageChannel, setMessageChannel] = useState("notification");
  const [messageTitle, setMessageTitle] = useState(
    returnItem ? `Update on your return #RET-${returnItem.id}` : "",
  );
  const [messageBody, setMessageBody] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: () => {
      if (messageChannel === "whatsapp") {
        // API 105 — only needs the customer's phone number and the text.
        return sendWhatsAppMessage({
          phone_number: customer.phone,
          message: messageBody,
        });
      }
      // API 74 — "user" must be the underlying account id (customer.user),
      // NOT the customer profile id (customer.id) — same distinction the
      // existing NotificationTemplates.jsx admin page already relies on.
      // type: "order" — matches the same type the backend itself uses for
      // every automatic return/order notification, so this message lands
      // in the customer's "Orders" notification tab alongside them.
      return sendNotification({
        user: customer.user,
        title: messageTitle,
        message: messageBody,
        type: "order",
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
  // pulled into a constant so all sections stay visually identical instead
  // of each one drifting slightly out of sync.
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
              1. CUSTOMER — shown FIRST, per Rimsha's request, since "who is
              this return about" is the thing an admin actually needs to see
              first. A soft emerald-tinted banner card, matching the brand
              gradient already used in PageHeader, makes this section read
              as the visual anchor of the whole modal.
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

                {/* Contact info — pill-shaped chips instead of a plain
                    list, so this reads as scannable tags rather than a
                    form. Email always present; phone/address only shown
                    when the backend actually returned them. */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
                <AiOutlineShoppingCart className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">Order</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {returnItem.order_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
                <AiOutlineCalendar className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">Requested</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(returnItem.created_at)}
                  </p>
                </div>
              </div>
              {/* resolved_at only exists once an admin has actually made a
                  decision — hidden entirely for still-pending returns
                  instead of showing a blank/misleading date. */}
              {returnItem.resolved_at && (
                <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5 sm:col-span-2">
                  <AiOutlineCheckCircle className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">Resolved</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(returnItem.resolved_at)}
                    </p>
                  </div>
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
                  // Disabled instead of hidden — makes it obvious to the
                  // admin WHY WhatsApp isn't available (no phone on file)
                  // rather than the option silently vanishing.
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
              5. STATUS ACTIONS — API 63 (PUT /api/v1/admin/returns/{id}/
              status/) only ever accepts status: "approved" | "rejected" in
              its request body — "pending" is NOT a value this endpoint
              accepts, so a decided return can never be reverted back to
              Pending through this API. What it CAN do, since both real
              values are always valid, is switch a return from Approved to
              Rejected (or back) at any time — useful for correcting an
              admin's mis-click. Both cases are handled below; the two
              render branches are mutually exclusive on returnItem.status.
              Wrapped in a tinted footer card so it reads as the modal's
              final "decision" step rather than blending into the rest.
              ================================================================ */}
          {returnItem.status === RETURN_STATUS.REQUESTED ? (
            // ---- Case 1: still Pending — the normal first decision ----
            <div className="rounded-2xl bg-gray-50 p-4 flex flex-col items-end gap-2">
              <p className="text-xs text-gray-400">
                Approving or rejecting automatically notifies the customer.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="danger"
                  onClick={() => onDecide(returnItem, RETURN_STATUS.REJECTED)}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={() => onDecide(returnItem, RETURN_STATUS.APPROVED)}
                >
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            // ---- Case 2: already decided — offer to switch the decision,
            // never a "back to Pending" option since API 63 doesn't accept
            // that value at all. ----
            <div className="rounded-2xl bg-gray-50 p-4 flex flex-col items-end gap-2">
              <p className="text-xs text-gray-400">
                This return has already been{" "}
                {returnItem.status === RETURN_STATUS.APPROVED
                  ? "approved"
                  : "rejected"}
                . It can be switched to{" "}
                {returnItem.status === RETURN_STATUS.APPROVED
                  ? "Rejected"
                  : "Approved"}{" "}
                if that was a mistake — reverting to Pending isn't supported by
                the API.
              </p>
              <Button
                variant={
                  returnItem.status === RETURN_STATUS.APPROVED
                    ? "danger"
                    : "primary"
                }
                onClick={() =>
                  onDecide(
                    returnItem,
                    returnItem.status === RETURN_STATUS.APPROVED
                      ? RETURN_STATUS.REJECTED
                      : RETURN_STATUS.APPROVED,
                  )
                }
              >
                {returnItem.status === RETURN_STATUS.APPROVED
                  ? "Change to Rejected"
                  : "Change to Approved"}
              </Button>
            </div>
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
  // search — raw text typed into the search box before debouncing. Matches
  // against Return ID, Order ID, and Customer Name (see filteredReturns).

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // showAdvancedFilters — toggles the Date Range + Sort By row open/closed
  // so the filter card stays compact until the admin actually needs it.

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // startDate / endDate — client-side date-range filter against created_at
  // (no documented date-range query param on API 51, so this never fires a
  // new network request — see the backend-bug flag near the imports).

  const [sortBy, setSortBy] = useState("-created_at");
  // sortBy — client-side sort, defaults to "Newest First" so the page's
  // default ordering never changes for the admin.

  const [currentPage, setCurrentPage] = useState(1);

  const [decisionTarget, setDecisionTarget] = useState(null);
  // { returnItem, action: "approved" | "rejected" } — drives the confirm
  // modal, whether it was opened from the table row or from inside the
  // detail modal.

  const [detailTarget, setDetailTarget] = useState(null);
  // The return row currently open in the read-only detail modal (the "eye"
  // icon action). null when the modal is closed.

  const [isExporting, setIsExporting] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  // Small delay so filtering doesn't recompute on every single keystroke.

  const hasAnyFilterActive =
    !!activeStatus || !!debouncedSearch || !!startDate || !!endDate;
  // Drives the "Clear all" button's visibility in the filter card header.

  const activeFilterCount = [
    activeStatus,
    debouncedSearch,
    startDate,
    endDate,
  ].filter(Boolean).length;
  // Feeds the little numbered badge next to the "Filters" heading.

  // --------------------------------------------------
  // MAIN LIST — API 51, fetched ONCE with no query params (see the
  // backend-bug flag above for why every filter now happens client-side).
  // --------------------------------------------------
  const {
    data: returnsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.RETURNS,
    queryFn: () => getReturns(),
  });

  const allReturns = extractListData(returnsResponse);
  // The complete, unfiltered list — also the single source of truth the
  // stat cards below are computed from, instead of three extra (and, per
  // the Network tab, equally broken) filtered requests.

  // --------------------------------------------------
  // STAT CARD COUNTS — real counts, computed directly from allReturns.
  // Approval rate is only shown once at least one return has actually been
  // decided, to avoid a misleading "0% approval rate" on a fresh store.
  // --------------------------------------------------
  const pendingCount = allReturns.filter(
    (r) => r.status === RETURN_STATUS.REQUESTED,
  ).length;
  const approvedCount = allReturns.filter(
    (r) => r.status === RETURN_STATUS.APPROVED,
  ).length;
  const rejectedCount = allReturns.filter(
    (r) => r.status === RETURN_STATUS.REJECTED,
  ).length;
  const decidedCount = approvedCount + rejectedCount;
  const approvalRate =
    decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : null;

  // --------------------------------------------------
  // FILTERED + SORTED LIST — every real filter (status, search, date
  // range) plus the client-side sort, all applied together on top of the
  // one real dataset fetched above. useMemo skips redoing this work unless
  // one of its actual inputs changed.
  // --------------------------------------------------
  const filteredReturns = useMemo(() => {
    // Step 1 — status tab.
    let result = activeStatus
      ? allReturns.filter((r) => r.status === activeStatus)
      : allReturns;

    // Step 2 — search, matched against Return ID, Order ID, and Customer
    // Name all at once. Both the query and every field are run through
    // normalizeForSearch first (strips "#", "-", spaces, and lowercases),
    // so typing "#RET-6", "RET-6", "ret 6", or just "6" all correctly find
    // return #RET-6 — this is the actual fix for the Return ID search bug.
    if (debouncedSearch.trim()) {
      const query = normalizeForSearch(debouncedSearch);
      result = result.filter((r) => {
        const returnId = normalizeForSearch("RET" + r.id);
        const orderId = normalizeForSearch(r.order_number);
        const customerName = normalizeForSearch(r.customer_name);
        return (
          returnId.includes(query) ||
          orderId.includes(query) ||
          customerName.includes(query)
        );
      });
    }

    // Step 3 — date range, inclusive on both ends, compared against the
    // return's created_at (request date).
    if (startDate) {
      const from = new Date(startDate);
      result = result.filter((r) => new Date(r.created_at) >= from);
    }
    if (endDate) {
      // End-of-day so the selected end date itself is included, not
      // excluded by the time-of-day component of created_at.
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.created_at) <= to);
    }

    // Step 4 — sort, applied last on top of whatever survived filtering.
    const sorter = SORTERS[sortBy];
    if (!sorter) return result;
    return [...result].sort(sorter);
    // Spreads into a new array first — never mutates the array React Query
    // owns, which could otherwise cause subtle re-render bugs.
  }, [allReturns, activeStatus, debouncedSearch, startDate, endDate, sortBy]);

  const totalCount = filteredReturns.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // visibleReturns — just the current page's slice of the filtered list.
  const visibleReturns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReturns.slice(start, start + PAGE_SIZE);
  }, [filteredReturns, currentPage]);

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
  // APPROVE / REJECT — API 53. Shared by both the table row buttons and
  // the buttons inside the detail modal — both paths funnel through the
  // same decisionTarget state and the same confirm modal.
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
      setDetailTarget(null);
      // Also closes the detail modal, if the decision was made from there —
      // the return's status has changed, so the modal it was open on is now
      // stale.
    },
    onError: (error) =>
      showError(error?.response?.data?.message || "Failed to update return."),
  });

  const handleConfirmDecision = async () => {
    setIsDeciding(true);
    try {
      await decisionMutation.mutateAsync();
    } finally {
      setIsDeciding(false);
    }
  };

  // Opens the confirm modal — called both from the table's row actions and
  // from the buttons inside ReturnDetailModal.
  const handleRequestDecision = (returnItem, action) => {
    setDecisionTarget({ returnItem, action });
  };

  // --------------------------------------------------
  // EXPORT — API 90, downloads the returned blob as a real .csv file
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

  // columns — DataTable column config. "Reason" was removed (its full text
  // now only lives in the detail modal, where there's room to show it
  // properly) and replaced with a searchable "Customer" column.
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
        <span className="text-sm text-gray-700">{row.order_number}</span>
      ),
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.customer_name} size="sm" />
          <span className="text-sm text-gray-900">
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
        <span className="text-sm text-gray-500">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Eye icon — always present on every row, opens the read-only
              detail modal regardless of status. Replaces the old plain
              "Decided" text that used to sit here for already-decided
              rows. */}
          <button
            onClick={() => setDetailTarget(row)}
            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors"
            aria-label={`View return #RET-${row.id}`}
          >
            <AiOutlineEye className="w-4 h-4" />
          </button>

          {/* Approve/Reject — only for returns still awaiting a decision.
              Already-decided rows show just the eye icon above; switching
              between Approved/Rejected after the fact is handled inside the
              detail modal (see STATUS ACTIONS there). */}
          {row.status === RETURN_STATUS.REQUESTED && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  handleRequestDecision(row, RETURN_STATUS.APPROVED)
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  handleRequestDecision(row, RETURN_STATUS.REJECTED)
                }
              >
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          PAGE HEADER — shared gradient-badge header, same component used
          on every other admin page, rendered first as requested.
          ================================================================ */}
      <PageHeader
        icon={<AiOutlineHistory />}
        title="Returns Management"
        actions={
          <Button
            variant="secondary"
            leftIcon={<AiOutlineDownload className="w-4 h-4" />}
            onClick={handleExport}
            isLoading={isExporting}
          >
            Export CSV
          </Button>
        }
      />

      {/* ================================================================
          STAT CARDS — all four are now real counts computed straight from
          the one real dataset fetched above (see the flag near the imports
          for why the old per-status queries were removed). Fully
          responsive: 1 column on mobile, 2 on small screens, 4 on large.
          ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Returns"
          value={allReturns.length}
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
          FILTERS CARD — richer filter surface: status pills, a combined
          Return ID / Order ID / Customer Name search, and a collapsible
          Date Range + Sort row. Same visual language as the Orders admin
          page's filter card for consistency across the panel.
          ================================================================ */}
      <div className="bg-white rounded-2xl border border-white shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)] overflow-hidden">
        {/* Header strip — icon badge + "Filters" label + live active count
            on the left, "Clear all" on the right (only when something is
            actually active). */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
              <AiOutlineFilter className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-gray-800">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </div>

          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-danger transition-colors"
            >
              <AiOutlineClose className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>

        {/* Body — status pills on their own scrollable row, then the
            search box + advanced toggle, then the collapsible date/sort
            row. */}
        <div className="p-5 flex flex-col gap-4">
          {/* Status pills — horizontally scrollable on narrow screens,
              scrollbar hidden (defined project-wide in index.css) while
              scrolling itself still fully works. */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key || "all"}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-150 shrink-0 ${
                  activeStatus === tab.key
                    ? "bg-linear-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Primary search + advanced-filters toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search Return ID, Order ID, or Customer Name..."
                leftIcon={<AiOutlineSearch className="w-4 h-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "primary" : "secondary"}
              size="sm"
              leftIcon={<AiOutlineSortAscending className="w-4 h-4" />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="shrink-0"
            >
              Date &amp; Sort
            </Button>
          </div>

          {/* Advanced row — date range (client-side, see flag above) and a
              client-side sort dropdown. Toggled by the button above so the
              filter card stays compact by default. */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Select
                label="Sort By"
                options={SORT_OPTIONS}
                placeholder="Sort returns"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          RETURNS TABLE — wrapped in its own soft-shadow card so it reads
          as an elevated surface, matching the rest of the redesigned page.
          ================================================================ */}
      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
        <DataTable
          columns={columns}
          data={visibleReturns}
          keyField="id"
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ================================================================
          DETAIL MODAL — opened by the eye icon on any row. Shows the full
          reason text plus the real customer profile (fetched live via
          API 102). Also exposes Approve/Reject for still-pending returns,
          and status switching for already-decided ones.
          ================================================================ */}
      <ReturnDetailModal
        key={detailTarget?.id}
        returnItem={detailTarget}
        onClose={() => setDetailTarget(null)}
        onDecide={handleRequestDecision}
      />

      {/* ================================================================
          CONFIRM MODAL — the actual status-change confirmation step,
          shared by both the table row buttons and the detail modal's
          buttons.
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
        isLoading={isDeciding}
      />
    </div>
  );
};

export default ReturnsManagement;
