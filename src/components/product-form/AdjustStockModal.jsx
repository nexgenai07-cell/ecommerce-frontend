import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adjustProductStock } from "../../api/products.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

const REASON_OPTIONS = [
  { value: "restock", label: "Restock" },
  { value: "damaged", label: "Damaged" },
  { value: "correction", label: "Correction" },
  { value: "return", label: "Return" },
  { value: "other", label: "Other" },
];

const AdjustStockModal = ({ isOpen, onClose, productId, currentStock }) => {
  // "add" mode keeps the number the admin types positive and sends it
  // as-is; "remove" mode keeps it positive on screen but sends it as a
  // negative delta — avoids admins having to type a minus sign.
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("restock");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState("");

  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: (payload) => adjustProductStock(productId, payload),
    onSuccess: (response) => {
      const newStock = response?.data?.stock;
      showSuccess(`Stock updated. New quantity: ${newStock}.`);

      // Refresh every place that displays stock, so the admin sees the
      // real, authoritative number everywhere immediately.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(productId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LOW_STOCK_PRODUCTS,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVENTORY_ALERTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });

      resetAndClose();
    },
    onError: (error) => {
      // Show the backend's own message (e.g. "Cannot reduce stock below
      // 0. Current stock: 12, requested change: -20") — don't replace
      // it with a generic one, and don't close the modal so the admin
      // can correct the number.
      const backendMessage =
        error?.response?.data?.error || error?.response?.data?.message;
      showError(backendMessage || "Failed to adjust stock. Please try again.");
    },
  });

  const resetAndClose = () => {
    setMode("add");
    setAmount("");
    setReason("restock");
    setNote("");
    setFieldError("");
    onClose();
  };

  const handleApply = () => {
    const parsedAmount = parseInt(amount, 10);

    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFieldError("Please enter a quantity greater than 0.");
      return;
    }
    setFieldError("");

    const delta = mode === "add" ? parsedAmount : -parsedAmount;

    adjustMutation.mutate({ delta, reason, note: note || undefined });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Adjust Stock"
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Current stock:{" "}
          <span className="font-semibold text-gray-900">{currentStock}</span>
        </div>

        {/* Add / Remove toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "add" ? "primary" : "secondary"}
            size="sm"
            fullWidth
            onClick={() => setMode("add")}
          >
            + Add Stock
          </Button>
          <Button
            type="button"
            variant={mode === "remove" ? "danger" : "secondary"}
            size="sm"
            fullWidth
            onClick={() => setMode("remove")}
          >
            − Remove Stock
          </Button>
        </div>

        <Input
          label="Quantity"
          type="number"
          min="1"
          placeholder="e.g. 20"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={fieldError}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Reason</label>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Note (optional)"
          placeholder="Any extra detail..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            isLoading={adjustMutation.isPending}
            disabled={adjustMutation.isPending}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AdjustStockModal;
