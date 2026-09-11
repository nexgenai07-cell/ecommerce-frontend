// Every QR (Easypaisa/JazzCash) order currently at payment.status:
// "under_review" — the customer has uploaded a screenshot and is
// waiting on a manual decision. This is a pure manual-verification
// step: no live gateway integration exists, so an admin is the only
// thing that moves these orders forward.
//
// Approve -> payment.status: "paid", order.status: "confirmed", stock
//            reservation is finalized (see api/payments.api.js).
// Reject  -> payment.status: "rejected" (mandatory reason), order
//            stays "pending_payment" so the customer can re-upload.
//
// duplicate_warning is surfaced as a badge only — the backend never
// auto-rejects a match, it's purely a heads-up for the admin to look
// closer before deciding.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineQrcode, AiOutlineWarning } from "react-icons/ai";
import { HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";
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
      showError(
        error?.response?.data?.message || "Failed to approve this payment.",
      );
    },
  });

  // =============================================
  // REJECT — PUT /api/v1/admin/payments/qr/{order_number}/reject/
  // =============================================
  const rejectMutation = useMutation({
    mutationFn: ({ orderNumber, reason }) =>
      rejectQrPayment(orderNumber, reason),
    onSuccess: () => {
      showSuccess(`${rejectTarget} rejected. The customer has been notified.`);
      invalidateQueue();
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message || "Failed to reject this payment.",
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
        `${selectedOrderNumbers.length} payment${selectedOrderNumbers.length === 1 ? "" : "s"} rejected. Customers have been notified.`,
      );
      invalidateQueue();
      setSelectedOrderNumbers([]);
      setBulkRejectOpen(false);
      setBulkRejectReason("");
    } catch (error) {
      showError(
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
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-gray-900">
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
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-800">
            {row.customer?.name || "—"}
          </p>
          <p className="text-xs text-gray-400">{row.customer?.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900">
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
          className="block w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
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
        <span className="text-xs font-mono text-gray-500">
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<HiOutlineCheck className="w-3.5 h-3.5" />}
            onClick={() => setApproveTarget(row.order_number)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            leftIcon={<HiOutlineXMark className="w-3.5 h-3.5" />}
            onClick={() => {
              setRejectTarget(row.order_number);
              setRejectReason("");
              setRejectReasonError("");
            }}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineQrcode />} title="QR Payment Verification" />

      {/* Bulk action bar — appears only while one or more rows are
          checked. Approve applies immediately per order; Reject opens
          a modal for the one shared reason sent to every selected
          order (the backend requires a reason and has no per-order
          bulk variant). */}
      {selectedOrderNumbers.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedOrderNumbers.length} payment
            {selectedOrderNumbers.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<HiOutlineCheck className="w-3.5 h-3.5" />}
              onClick={() => setConfirmBulkApproveOpen(true)}
              className="w-full sm:w-auto"
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<HiOutlineXMark className="w-3.5 h-3.5" />}
              onClick={() => {
                setBulkRejectReason("");
                setBulkRejectReasonError("");
                setBulkRejectOpen(true);
              }}
              className="w-full sm:w-auto"
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
            will stay pending — the customer can re-upload a corrected
            screenshot. This reason is sent to them directly.
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
            will stay pending — each customer can re-upload a corrected
            screenshot. This same reason is sent to all of them.
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
