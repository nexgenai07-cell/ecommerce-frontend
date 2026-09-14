import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineQrcode, AiOutlineWarning } from "react-icons/ai";
import { HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";
import { HiOutlineDotsVertical } from "react-icons/hi";
import {
  getQrPendingPayments,
  approveQrPayment,
  rejectQrPayment,
} from "../../api/payments.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import formatPrice from "../../utils/formatPrice";
import formatDate from "../../utils/formatDate";
import { showSuccess, showError } from "../../components/ui/Toast";
import PageHeader from "../../components/shared/PageHeader";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Modal from "../../components/ui/Modal";
import Textarea from "../../components/ui/Textarea";

// Row-level "⋮" actions menu for the QR Payments table.
//
// This does NOT reuse the shared <Popover/> component on purpose: Popover
// positions its panel with `absolute`, which is fine in a normal toolbar
// but breaks inside this table — every <td> in DataTable has
// `overflow-hidden` (to keep the compact fixed row height), and the
// scroll wrapper around the table has `overflow-x-auto`. Both of those
// silently clip anything absolutely-positioned inside a cell, so the
// Approve/Reject panel was rendering but invisible/clipped, which is why
// clicking the dots appeared to do nothing.
//
// The fix: render the panel through a React portal straight onto
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

    // Right-align the panel's right edge with the trigger's right edge
    // (matches the old align="right" Popover behaviour), then flip it
    // above the trigger instead of below if there isn't enough room
    // beneath it in the viewport — keeps it visible even for rows near
    // the bottom of the screen.
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

const QrPaymentQueue = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many pending QR payments the backend returns per
  // page, controlled by the "Rows per page" dropdown in the table
  // footer. Sent to the backend as `page_size` alongside `page`.

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Which order the Approve confirmation is currently open for.
  const [approveTarget, setApproveTarget] = useState(null);
  // Which order the Reject modal is currently open for, plus the
  // reason text being typed (mandatory — the backend 400s without it).
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  // Bulk selection — array of order_number values currently checked in
  // the table, driven by DataTable's built-in selection support. This
  // is independent of approveTarget/rejectTarget above, which still
  // drive the single-row Approve/Reject flow unchanged.
  const [selectedOrderNumbers, setSelectedOrderNumbers] = useState([]);

  // Bulk approve confirmation state.
  const [confirmBulkApproveOpen, setConfirmBulkApproveOpen] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Bulk reject state — a single shared reason is required and applied
  // to every selected order, since rejectQrPayment() has no way to
  // accept a different reason per order in one request.
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [bulkRejectReasonError, setBulkRejectReasonError] = useState("");
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);

  // =============================================
  // GET QR PENDING PAYMENTS — GET /api/v1/admin/payments/qr/pending/
  // =============================================
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.QR_PENDING_PAYMENTS, currentPage, pageSize],
    queryFn: ({ signal }) =>
      getQrPendingPayments({ page: currentPage, page_size: pageSize }, signal),
  });

  const payments = extractListData(data);
  const totalCount = data?.data?.count ?? payments.length;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  const invalidateQueue = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.QR_PENDING_PAYMENTS });

  // =============================================
  // APPROVE — PUT /api/v1/admin/payments/qr/{order_number}/approve/
  // =============================================
  const approveMutation = useMutation({
    mutationFn: (orderNumber) => approveQrPayment(orderNumber),
    onSuccess: () => {
      showSuccess(`${approveTarget} approved — order confirmed.`);
      invalidateQueue();
      setApproveTarget(null);
    },
    onError: (error) => {
      // The backend returns validation/state errors under an "error"
      // key (e.g. "Order status is <status>, not pending_payment or
      // on_hold.") — checking it before the older "message" key keeps
      // this specific text visible instead of always falling through
      // to the generic fallback.
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to approve this payment.",
      );
    },
  });

  // =============================================
  // REJECT — PUT /api/v1/admin/payments/qr/{order_number}/reject/
  // =============================================
  const rejectMutation = useMutation({
    mutationFn: ({ orderNumber, reason }) =>
      rejectQrPayment(orderNumber, reason),
    onSuccess: (response) => {
      // UPDATED (Sep 2026, API 74.4 backend fix): the order is now
      // actually cancelled by a rejection (not left "pending"), and
      // may be permanently cancelled once this was the 3rd rejection
      // — the toast now reflects whichever of those actually happened,
      // using the response's own message where available.
      showSuccess(
        response?.data?.message ||
          `${rejectTarget} rejected. The customer has been notified.`,
      );
      invalidateQueue();
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to reject this payment.",
      );
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
  // BULK APPROVE — same approve endpoint, called once per selected
  // order (there is no bulk endpoint on the backend).
  // =============================================
  const handleConfirmBulkApprove = async () => {
    setIsBulkApproving(true);
    try {
      await Promise.all(
        selectedOrderNumbers.map((orderNumber) =>
          approveQrPayment(orderNumber),
        ),
      );
      showSuccess(
        `${selectedOrderNumbers.length} payment${selectedOrderNumbers.length === 1 ? "" : "s"} approved.`,
      );
      invalidateQueue();
      setSelectedOrderNumbers([]);
      setConfirmBulkApproveOpen(false);
    } catch (error) {
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to approve the selected payments.",
      );
    } finally {
      setIsBulkApproving(false);
    }
  };

  // =============================================
  // BULK REJECT — same reject endpoint, called once per selected order
  // with the one shared reason typed below. The reason is mandatory —
  // the backend 400s without it, same as the single-row flow.
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
      await Promise.all(
        selectedOrderNumbers.map((orderNumber) =>
          rejectQrPayment(orderNumber, bulkRejectReason.trim()),
        ),
      );
      showSuccess(
        // UPDATED (Sep 2026, API 74.4 backend fix): rejecting now
        // cancels each order rather than leaving it "pending".
        `${selectedOrderNumbers.length} payment${selectedOrderNumbers.length === 1 ? "" : "s"} rejected — those orders have been cancelled. Customers have been notified and can re-upload proof unless they've hit the 3-attempt limit.`,
      );
      invalidateQueue();
      setSelectedOrderNumbers([]);
      setBulkRejectOpen(false);
      setBulkRejectReason("");
    } catch (error) {
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to reject the selected payments.",
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
              Duplicate
            </span>
          )}
          {/* NEW (Sep 2026, API 74.2 backend fix): a small "Retry x/3"
              badge on any row that's a retry review (order_status
              "on_hold"), using rejection_count — helps the admin
              prioritize/understand orders that have already failed
              review once or twice before this one. */}
          {row.order_status === "on_hold" && (
            <span
              title="This order's QR proof was rejected before — this is a retry review."
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-light text-warning text-xs font-semibold"
            >
              Retry {row.rejection_count ?? 0}/3
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
      render: (row) => (
        <a
          href={row.screenshot_url}
          target="_blank"
          rel="noreferrer"
          className="block w-8 h-8 rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
          // w-12 h-12 (48px) -> w-8 h-8 (32px): this thumbnail was well past the
          // DataTable's fixed 36px row height and was forcing every row in this
          // table to grow. It's still a clickable link that opens the full
          // screenshot in a new tab, so the smaller preview doesn't lose any
          // functionality — just the row no longer stretches to fit it.
        >
          <img
            src={row.screenshot_url}
            alt={`Payment screenshot for ${row.order_number}`}
            className="w-full h-full object-cover"
          />
        </a>
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
      key: "actions",
      label: "Actions",
      render: (row) => (
        // Three-dot menu replaces the old side-by-side Approve/Reject
        // buttons — same two actions, now tucked behind a single
        // trigger so the Actions column no longer forces the table
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
      ),
    },
  ];

  return (
    // Vertical spacing between the header, stats cards, toolbar, and table
    // reduced from gap-6 to gap-2 so the page matches the tighter rhythm
    // already used on Product Management, instead of leaving large empty
    // bands between each section.
    <div className="flex flex-col gap-2">
      <PageHeader icon={<AiOutlineQrcode />} title="QR Payment Verification" />

      {/* Bulk action bar — appears only while one or more rows are
          checked. Approve applies immediately per order; Reject opens
          a modal for the one shared reason sent to every selected
          order (the backend requires a reason and has no per-order
          bulk variant). */}
      {selectedOrderNumbers.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-medium text-gray-700">
            {selectedOrderNumbers.length} payment
            {selectedOrderNumbers.length === 1 ? "" : "s"} selected
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

      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
        <DataTable
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
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

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
            {/* UPDATED (Sep 2026, API 74.4 backend fix): a rejection
                now cancels the order and releases its reserved stock —
                it no longer just sits "pending". The customer can
                still re-upload a corrected screenshot to reopen it,
                unless this is their 3rd rejection, in which case the
                cancellation becomes permanent. */}
            will be cancelled and its reserved stock released — the customer can
            re-upload a corrected screenshot to reopen it (unless this is their
            3rd rejection). This reason is sent to them directly.
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
          single-row one above, driven by selectedOrderNumbers instead
          of approveTarget, so the two flows never interfere. */}
      <ConfirmModal
        isOpen={confirmBulkApproveOpen}
        onClose={() => setConfirmBulkApproveOpen(false)}
        onConfirm={handleConfirmBulkApprove}
        title="Approve these payments?"
        message={`${selectedOrderNumbers.length} order${selectedOrderNumbers.length === 1 ? "" : "s"} will be marked as paid and confirmed. This releases each order's reserved stock into a final sale.`}
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
              {selectedOrderNumbers.length} order
              {selectedOrderNumbers.length === 1 ? "" : "s"}
            </span>{" "}
            will be cancelled and their reserved stock released — each customer
            can re-upload a corrected screenshot to reopen theirs (unless it was
            their 3rd rejection). This same reason is sent to all of them.
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
