// ADMIN QR PAYMENT VERIFICATION QUEUE
// ============================================================
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

const PAGE_SIZE = 10;

const QrPaymentQueue = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // Which order the Approve confirmation is currently open for.
  const [approveTarget, setApproveTarget] = useState(null);
  // Which order the Reject modal is currently open for, plus the
  // reason text being typed (mandatory — the backend 400s without it).
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  // =============================================
  // GET QR PENDING PAYMENTS — GET /api/v1/admin/payments/qr/pending/
  // =============================================
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.QR_PENDING_PAYMENTS, currentPage],
    queryFn: ({ signal }) =>
      getQrPendingPayments({ page: currentPage, page_size: PAGE_SIZE }, signal),
  });

  const payments = extractListData(data);
  const totalCount = data?.data?.count ?? payments.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

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

      <div className="rounded-xl shadow-[0_2px_10px_-3px_rgba(16,24,40,0.06)]">
        <DataTable
          columns={columns}
          data={payments}
          keyField="order_number"
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={totalCount}
          onPageChange={setCurrentPage}
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
    </div>
  );
};

export default QrPaymentQueue;
