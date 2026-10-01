import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineQrcode, AiOutlineWarning } from "react-icons/ai";
import { HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";
import { HiOutlineDotsVertical } from "react-icons/hi";
import {
  getQrPayments,
  approveQrPayment,
  rejectQrPayment,
  bulkApproveQrPayments,
  bulkRejectQrPayments,
} from "../../api/payments.api";
import { exportReport } from "../../api/analytics.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { ROUTES } from "../../constants/routes";
import { PAYMENT_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import chunkArray from "../../utils/chunkArray";
import downloadExportCsv from "../../utils/downloadExportCsv";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import PageHeader from "../../components/shared/PageHeader";
import DataTable from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Modal from "../../components/ui/Modal";
import Textarea from "../../components/ui/Textarea";
import QrPaymentStatsCards from "../../components/admin-qr-payments/QrPaymentStatsCards";
import QrPaymentFilters from "../../components/admin-qr-payments/QrPaymentFilters";
import QrImageManagerModal from "../../components/admin-qr-payments/QrImageManagerModal";

// Row-level "⋮" actions menu for the QR Payments table.
//
// This does not reuse the shared <Popover/> component on purpose: Popover
// positions its panel with `absolute`, which does not work inside this
// table — every <td> in DataTable has `overflow-hidden` (to keep the
// compact fixed row height), and the scroll wrapper around the table has
// `overflow-x-auto`. Both of those clip anything absolutely-positioned
// inside a cell, so the Approve/Reject panel would be hidden.
//
// Instead the panel is rendered through a React portal straight onto
// document.body, positioned with `fixed` coordinates computed from the
// trigger button's own on-screen position. A portaled node sits outside
// the table in the actual DOM tree, so none of the table's
// overflow-hidden/overflow-x-auto ancestors can clip it, no matter how
// deep in the table it's triggered from.
const RowActionsMenu = ({ orderNumber, onApprove, onReject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Approximate panel footprint used to keep it on-screen — matches the
  // w-40 (160px) panel width and its two menu rows below.
  const MENU_WIDTH = 160;
  const MENU_HEIGHT = 84;

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Right-align the panel's right edge with the trigger's right edge,
    // then flip it above the trigger instead of below if there isn't
    // enough room beneath it in the viewport — keeps it visible even for
    // rows near the bottom of the screen.
    let top = rect.bottom + 4;
    let left = rect.right - MENU_WIDTH;

    if (top + MENU_HEIGHT > window.innerHeight) {
      top = rect.top - MENU_HEIGHT - 4;
    }
    if (left < 8) left = 8;

    setPosition({ top, left });
    setIsOpen(true);
  };

  // Close on outside click, Escape, or on scroll/resize — a scroll or
  // resize would leave a fixed-position panel floating away from the
  // dots it came from, so it's simplest to just dismiss it.
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const handleDismiss = () => setIsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for order ${orderNumber}`}
        onClick={(e) => {
          e.stopPropagation();
          isOpen ? setIsOpen(false) : openMenu();
        }}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <HiOutlineDotsVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed w-40 py-1 z-dropdown bg-surface border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => {
                onApprove();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs sm:text-sm font-medium text-primary hover:bg-primary-50 transition-colors"
            >
              <HiOutlineCheck className="w-3.5 h-3.5 shrink-0" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                onReject();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs sm:text-sm font-medium text-danger hover:bg-danger-light transition-colors"
            >
              <HiOutlineXMark className="w-3.5 h-3.5 shrink-0" />
              Reject
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

// Newest submission first, matching the backend's own default.
const DEFAULT_ORDERING = "-submitted_at";

// The backend caps an order's payment proof at this many rejections; the
// third one cancels the order permanently.
const MAX_REJECTIONS = 3;

// Only a payment that is waiting for review can be approved or rejected.
const isUnderReview = (payment) =>
  payment.status === PAYMENT_STATUS.UNDER_REVIEW;

const QrPaymentQueue = () => {
  const queryClient = useQueryClient();

  // =============================================
  // FILTER STATE — every value is sent to the backend; nothing is filtered
  // in the browser.
  // =============================================
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [duplicate, setDuplicate] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isExporting, setIsExporting] = useState(false);
  const [isQrImageModalOpen, setIsQrImageModalOpen] = useState(false);

  // Waits 400ms after the admin stops typing before a request is sent, so
  // typing does not fire a new request on every keystroke.
  const debouncedSearch = useDebounce(search, 400);
  const debouncedMinAmount = useDebounce(minAmount, 400);
  const debouncedMaxAmount = useDebounce(maxAmount, 400);

  const navigate = useNavigate();

  // Which order the Approve confirmation is currently open for.
  const [approveTarget, setApproveTarget] = useState(null);
  // Which order the Reject modal is currently open for, plus the
  // reason text being typed (mandatory — the backend 400s without it).
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  // Bulk selection — array of order_number values currently checked in
  // the table, driven by DataTable's built-in selection support. This
  // is independent of approveTarget/rejectTarget above, which drive the
  // single-row Approve/Reject flow.
  const [selectedOrderNumbers, setSelectedOrderNumbers] = useState([]);

  // Changing this key remounts the table, which clears DataTable's internal
  // checkbox selection.
  const [tableResetKey, setTableResetKey] = useState(0);

  // Bulk approve confirmation state.
  const [confirmBulkApproveOpen, setConfirmBulkApproveOpen] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Bulk reject state — a single shared reason is required and applied
  // to every selected order, since the bulk endpoint accepts one reason
  // for the whole batch.
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [bulkRejectReasonError, setBulkRejectReasonError] = useState("");
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);

  // Clears the checked rows. The selection always belongs to the rows
  // currently on screen, so it is cleared whenever the visible rows are
  // about to change (a filter, a page change) or after a bulk action.
  const resetSelection = () => {
    setSelectedOrderNumbers([]);
    setTableResetKey((key) => key + 1);
  };

  // Wraps a filter setter so that changing the filter also returns to page
  // 1 and clears the selection. Staying on, say, page 3 of a smaller result
  // set would otherwise show an empty page.
  const withPageReset = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
    resetSelection();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    resetSelection();
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    resetSelection();
  };

  const hasActiveFilters =
    !!status ||
    !!search ||
    !!startDate ||
    !!endDate ||
    !!minAmount ||
    !!maxAmount ||
    !!duplicate ||
    sortBy !== DEFAULT_ORDERING;

  const handleClearFilters = () => {
    setStatus("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setDuplicate("");
    setSortBy(DEFAULT_ORDERING);
    setCurrentPage(1);
    resetSelection();
  };

  // The parameters shared by the list request and the CSV export, so the
  // downloaded file always matches what is filtered on screen.
  const filterParams = {
    status: status || undefined,
    search: debouncedSearch || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    min_amount: debouncedMinAmount || undefined,
    max_amount: debouncedMaxAmount || undefined,
    duplicate: duplicate || undefined,
    ordering: sortBy,
  };

  // =============================================
  // GET QR PAYMENTS — GET /api/v1/admin/payments/qr/
  // =============================================
  const {
    data,
    isLoading,
    isError,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.QR_PAYMENTS,
      "list",
      { ...filterParams, page: currentPage, pageSize },
    ],
    queryFn: ({ signal }) =>
      getQrPayments(
        { ...filterParams, page: currentPage, page_size: pageSize },
        signal,
      ),
  });

  const payments = extractListData(data);
  const totalCount = data?.data?.count ?? payments.length;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  // When the backend rejects the filters (for example an invalid amount or
  // date range), its own explanation is shown instead of only the generic
  // table error.
  useEffect(() => {
    if (listError?.response?.status === 400) {
      showError(getApiErrorMessage(listError));
    }
  }, [listError]);

  // Bulk actions only apply to payments that are waiting for review, so a
  // checked row in any other status is left out of the batch.
  const reviewableOrderNumbers = new Set(
    payments.filter(isUnderReview).map((payment) => payment.order_number),
  );
  const selectedReviewable = selectedOrderNumbers.filter((orderNumber) =>
    reviewableOrderNumbers.has(orderNumber),
  );
  const skippedSelectionCount =
    selectedOrderNumbers.length - selectedReviewable.length;

  // Refreshes the list and the stat cards, which share one cache prefix.
  const refreshPayments = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.QR_PAYMENTS });

  // =============================================
  // EXPORT — GET /api/v1/analytics/export/?type=qr_payments
  // =============================================
  // downloadExportCsv() downloads the returned blob as a real .csv file and,
  // on a validation failure, reads the JSON error back out of the blob so
  // the real reason reaches the toast. Every filter applied to the table is
  // forwarded, so the file matches what the admin is looking at.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { success, message } = await downloadExportCsv(
        exportReport,
        { type: "qr_payments", ...filterParams },
        `qr-payments-export-${new Date().toISOString().slice(0, 10)}`,
      );

      if (success) {
        showSuccess("Export downloaded.");
      } else {
        showError(message || "Failed to export QR payments. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // =============================================
  // APPROVE — PUT /api/v1/admin/payments/qr/{order_number}/approve/
  // =============================================
  const approveMutation = useMutation({
    mutationFn: (orderNumber) => approveQrPayment(orderNumber),
    onSuccess: (_response, orderNumber) => {
      showSuccess(`${orderNumber} approved — order confirmed.`);
      refreshPayments();
      setApproveTarget(null);
      navigate(ROUTES.ADMIN_ORDER_DETAIL.replace(":id", orderNumber));
    },
    onError: (error) => {
      // The backend returns validation/state errors under an "error"
      // key (e.g. "Order status is <status>, not pending_payment or
      // on_hold."); the shared helper keeps that specific text visible
      // instead of the generic message.
      showError(getApiErrorMessage(error, "Failed to approve this payment."));
    },
  });

  // =============================================
  // REJECT — PUT /api/v1/admin/payments/qr/{order_number}/reject/
  // =============================================
  const rejectMutation = useMutation({
    mutationFn: ({ orderNumber, reason }) =>
      rejectQrPayment(orderNumber, reason),
    onSuccess: (response, { orderNumber }) => {
      // The first and second rejection leave the order in
      // "pending_payment" so the customer can upload a new proof; the
      // third rejection cancels the order permanently. The toast shows
      // whichever of those happened, using the response's own message
      // (which includes the attempts left) where available.
      const result = response?.data;
      if (result?.permanently_cancelled) {
        showSuccess(
          `${orderNumber} rejected — maximum attempts reached, the order has been cancelled.`,
        );
      } else {
        showSuccess(
          result?.message ||
            `${orderNumber} rejected. The customer has been notified` +
              (typeof result?.attempts_left === "number"
                ? ` and has ${result.attempts_left} attempt${result.attempts_left === 1 ? "" : "s"} left.`
                : "."),
        );
      }
      refreshPayments();
      setRejectTarget(null);
      setRejectReason("");
      navigate(ROUTES.ADMIN_ORDER_DETAIL.replace(":id", orderNumber));
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, "Failed to reject this payment."));
    },
  });

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectReasonError("A reason is required to reject this payment.");
      return;
    }
    rejectMutation.mutate({
      orderNumber: rejectTarget,
      reason: rejectReason.trim(),
    });
  };

  // =============================================
  // BULK APPROVE — all selected orders are sent in one request per batch of
  // up to 100 order numbers instead of one request per order. Each order is
  // still evaluated independently on the backend, so one that can no longer
  // be approved (for example another admin already handled it) is reported
  // in that batch's "failed" array without stopping the rest of the batch.
  // =============================================
  const handleConfirmBulkApprove = async () => {
    setIsBulkApproving(true);
    try {
      const batches = chunkArray(selectedReviewable, 100);
      let approvedCount = 0;
      const failures = [];

      for (const batch of batches) {
        const response = await bulkApproveQrPayments(batch);
        approvedCount += response.data.approved_ids?.length ?? 0;
        // missing_ids means the order no longer exists in this
        // selection — not a failure, so nothing is shown for it.
        if (response.data.failed?.length) {
          failures.push(...response.data.failed);
        }
      }

      if (approvedCount > 0) {
        showSuccess(
          `${approvedCount} payment${approvedCount === 1 ? "" : "s"} approved.`,
        );
      }
      if (failures.length > 0) {
        showError(
          failures[0].error ||
            `${failures.length} payment${failures.length === 1 ? "" : "s"} could not be approved.`,
        );
      }
      refreshPayments();
      resetSelection();
      setConfirmBulkApproveOpen(false);
    } catch (error) {
      showError(
        getApiErrorMessage(error, "Failed to approve the selected payments."),
      );
    } finally {
      setIsBulkApproving(false);
    }
  };

  // =============================================
  // BULK REJECT — one shared, required reason is applied to every selected
  // order, sent in one request per batch of up to 100 order numbers instead
  // of one request per order. Each order is still evaluated independently
  // on the backend, so one that can no longer be rejected is reported in
  // that batch's "failed" array without stopping the rest of the batch.
  // =============================================
  const handleConfirmBulkReject = async () => {
    if (!bulkRejectReason.trim()) {
      setBulkRejectReasonError(
        "A reason is required to reject these payments.",
      );
      return;
    }
    setIsBulkRejecting(true);
    try {
      const batches = chunkArray(selectedReviewable, 100);
      let rejectedCount = 0;
      let cancelledCount = 0;
      const failures = [];

      for (const batch of batches) {
        const response = await bulkRejectQrPayments(
          batch,
          bulkRejectReason.trim(),
        );
        rejectedCount += response.data.rejected_ids?.length ?? 0;
        // A 3rd rejection cancels that order permanently; every other
        // rejected order stays pending payment for a new proof.
        cancelledCount += (response.data.results ?? []).filter(
          (result) => result.permanently_cancelled,
        ).length;
        // missing_ids means the order no longer exists in this
        // selection — not a failure, so nothing is shown for it.
        if (response.data.failed?.length) {
          failures.push(...response.data.failed);
        }
      }

      if (rejectedCount > 0) {
        showSuccess(
          `${rejectedCount} payment${rejectedCount === 1 ? "" : "s"} rejected. Customers have been notified.` +
            (cancelledCount > 0
              ? ` ${cancelledCount} order${cancelledCount === 1 ? " was" : "s were"} cancelled after reaching the maximum attempts.`
              : ""),
        );
      }
      if (failures.length > 0) {
        showError(
          failures[0].error ||
            `${failures.length} payment${failures.length === 1 ? "" : "s"} could not be rejected.`,
        );
      }
      refreshPayments();
      resetSelection();
      setBulkRejectOpen(false);
      setBulkRejectReason("");
    } catch (error) {
      showError(
        getApiErrorMessage(error, "Failed to reject the selected payments."),
      );
    } finally {
      setIsBulkRejecting(false);
    }
  };

  const columns = [
    {
      key: "order_number",
      label: "Order",
      render: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-gray-900">
            {row.order_number}
          </span>
          {row.duplicate_warning && (
            <span
              title="This screenshot or transaction ID matches a different order — review carefully."
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-light text-danger text-xs font-semibold"
            >
              <AiOutlineWarning className="w-3.5 h-3.5" />
              Possible duplicate
            </span>
          )}
          {/* "Rejected n/3" badge on any row whose proof has been rejected
              at least once (rejection_count above zero) — tells the admin
              how close the order is to the 3-attempt cap. */}
          {row.rejection_count > 0 && (
            <span
              title="How many times this order's payment proof has been rejected."
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-light text-warning text-xs font-semibold"
            >
              Rejected {row.rejection_count}/{MAX_REJECTIONS}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="text-[10px] sm:text-[11px] font-medium text-gray-800 leading-tight">
            {row.customer?.name || "—"}
          </p>
          <p className="text-[9px] text-gray-400 leading-tight">
            {row.customer?.phone || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <span className="text-[10px] sm:text-[11px] font-semibold text-gray-900">
          {formatPrice(parseFloat(row.amount))}
        </span>
      ),
    },
    {
      key: "screenshot",
      label: "Proof",
      render: (row) =>
        row.screenshot_url ? (
          <a
            href={row.screenshot_url}
            target="_blank"
            rel="noreferrer"
            className="block w-8 h-8 rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
            // The 32px thumbnail fits within the DataTable's fixed row height. It
            // is a clickable link that opens the full screenshot in a new tab.
          >
            <img
              src={row.screenshot_url}
              alt={`Payment screenshot for ${row.order_number}`}
              className="w-full h-full object-cover"
            />
          </a>
        ) : (
          <span className="text-[10px] sm:text-[11px] text-gray-400">—</span>
        ),
    },
    {
      key: "transaction_id",
      label: "Transaction ID",
      render: (row) => (
        <span className="text-[9px] font-mono text-gray-500">
          {row.transaction_id || "—"}
        </span>
      ),
    },
    {
      key: "submitted_at",
      label: "Submitted",
      render: (row) => (
        <span className="text-xs text-gray-400">
          {formatDate(row.submitted_at)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        // The rejection reason sits beside the badge on a single line: the
        // table's rows have a fixed height with no room for a second line.
        <div className="flex items-center gap-1.5">
          <Badge label={row.status} status={row.status} size="sm" rounded />
          {row.status === PAYMENT_STATUS.REJECTED && row.reject_reason && (
            <span
              title={row.reject_reason}
              className="max-w-32 truncate text-[9px] text-gray-400"
            >
              {row.reject_reason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        // Approve and Reject only make sense while the proof is waiting for
        // review; every other status has nothing left to decide.
        isUnderReview(row) ? (
          // Three-dot menu holding the Approve and Reject actions behind a
          // single trigger, so the Actions column does not force the table
          // wider than the viewport on small screens.
          <RowActionsMenu
            orderNumber={row.order_number}
            onApprove={() => setApproveTarget(row.order_number)}
            onReject={() => {
              setRejectTarget(row.order_number);
              setRejectReason("");
              setRejectReasonError("");
            }}
          />
        ) : (
          <span className="text-[10px] sm:text-[11px] text-gray-400">—</span>
        ),
    },
  ];

  return (
    // Tight vertical spacing between the header, cards, toolbar and table,
    // matching the rhythm used on the other admin list pages.
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <PageHeader
        icon={<AiOutlineQrcode />}
        title="QR Payments"
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<AiOutlineQrcode className="w-4 h-4" />}
            onClick={() => setIsQrImageModalOpen(true)}
          >
            Payment QR
          </Button>
        }
      />

      {/* Stat cards follow the selected date range only; the status,
          search and amount filters never change them. */}
      <QrPaymentStatsCards startDate={startDate} endDate={endDate} />

      <QrPaymentFilters
        search={search}
        onSearchChange={withPageReset(setSearch)}
        status={status}
        onStatusChange={withPageReset(setStatus)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={withPageReset(setStartDate)}
        onEndDateChange={withPageReset(setEndDate)}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onMinAmountChange={withPageReset(setMinAmount)}
        onMaxAmountChange={withPageReset(setMaxAmount)}
        duplicate={duplicate}
        onDuplicateChange={withPageReset(setDuplicate)}
        sortBy={sortBy}
        onSortChange={withPageReset(setSortBy)}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Bulk action bar — appears only while at least one checked row is
          waiting for review. Approve asks for confirmation; Reject opens
          a modal for the one shared reason sent to every selected order
          (the bulk endpoint requires a reason and has no per-order
          variant). Checked rows in any other status are skipped. */}
      {selectedReviewable.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-medium text-gray-700">
            {selectedReviewable.length} payment
            {selectedReviewable.length === 1 ? "" : "s"} selected
            {skippedSelectionCount > 0 &&
              ` (${skippedSelectionCount} not pending review will be skipped)`}
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<HiOutlineCheck className="w-3 h-3" />}
              onClick={() => setConfirmBulkApproveOpen(true)}
              className="w-full sm:w-auto px-2.5 py-1 text-xs whitespace-nowrap"
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<HiOutlineXMark className="w-3 h-3" />}
              onClick={() => {
                setBulkRejectReason("");
                setBulkRejectReasonError("");
                setBulkRejectOpen(true);
              }}
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
          data={payments}
          keyField="order_number"
          selectable
          onSelectionChange={setSelectedOrderNumbers}
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Payment QR image — view, upload, replace and remove */}
      <QrImageManagerModal
        isOpen={isQrImageModalOpen}
        onClose={() => setIsQrImageModalOpen(false)}
      />

      {/* Approve confirmation */}
      <ConfirmModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => approveMutation.mutate(approveTarget)}
        title="Approve this payment?"
        message={`Order ${approveTarget} will be marked as paid and confirmed. This releases the reserved stock into a final sale.`}
        confirmLabel="Approve"
        variant="primary"
        isLoading={approveMutation.isPending}
      />

      {/* Reject — reason is mandatory */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Payment Proof"
        size="sm"
        closeOnBackdrop={!rejectMutation.isPending}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Order{" "}
            <span className="font-semibold text-gray-800">{rejectTarget}</span>{" "}
            {/* The first and second rejection keep the order pending payment
                so the customer can upload a corrected screenshot; the third
                rejection cancels the order permanently and releases its
                reserved stock. */}
            will stay pending payment so the customer can upload a new proof. If
            this is their 3rd rejection, the order will be cancelled permanently
            and its reserved stock released. This reason is sent to the customer
            directly.
          </p>
          <Textarea
            label="Reason for rejection"
            required
            placeholder="e.g. Screenshot doesn't match the order amount"
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (e.target.value.trim()) setRejectReasonError("");
            }}
            error={rejectReasonError}
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setRejectTarget(null)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              isLoading={rejectMutation.isPending}
            >
              Reject Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk approve confirmation — separate modal instance from the
          single-row one above, driven by the selection instead of
          approveTarget, so the two flows never interfere. */}
      <ConfirmModal
        isOpen={confirmBulkApproveOpen}
        onClose={() => setConfirmBulkApproveOpen(false)}
        onConfirm={handleConfirmBulkApprove}
        title="Approve these payments?"
        message={`${selectedReviewable.length} order${selectedReviewable.length === 1 ? "" : "s"} will be marked as paid and confirmed. This releases each order's reserved stock into a final sale.`}
        confirmLabel="Approve"
        variant="primary"
        isLoading={isBulkApproving}
      />

      {/* Bulk reject — one shared reason is required and sent to every
          selected order. */}
      <Modal
        isOpen={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        title="Reject Selected Payments"
        size="sm"
        closeOnBackdrop={!isBulkRejecting}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">
              {selectedReviewable.length} order
              {selectedReviewable.length === 1 ? "" : "s"}
            </span>{" "}
            will stay pending payment so each customer can upload a new proof.
            Any order on its 3rd rejection will be cancelled permanently and its
            reserved stock released. This same reason is sent to all of them.
          </p>
          <Textarea
            label="Reason for rejection"
            required
            placeholder="e.g. Screenshot doesn't match the order amount"
            value={bulkRejectReason}
            onChange={(e) => {
              setBulkRejectReason(e.target.value);
              if (e.target.value.trim()) setBulkRejectReasonError("");
            }}
            error={bulkRejectReasonError}
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setBulkRejectOpen(false)}
              disabled={isBulkRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmBulkReject}
              isLoading={isBulkRejecting}
            >
              Reject Payments
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QrPaymentQueue;
