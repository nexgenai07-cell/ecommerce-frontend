import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDiscount, updateDiscount } from "../../api/discounts.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Toggle from "../ui/Toggle";
import Button from "../ui/Button";

// Only 2 real values — matches API 27's documented "type": "percent │ fixed"
const TYPE_OPTIONS = [
  { value: "percent", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
];

const discountSchema = z
  .object({
    code: z
      .string()
      .min(1, "Coupon code is required")
      .max(30)
      .transform((val) => val.toUpperCase()),
    // Uppercased automatically — coupon codes are conventionally
    // case-insensitive from the customer's perspective, so normalizing
    // here keeps the stored value consistent regardless of how the
    // admin typed it
    type: z.enum(["percent", "fixed"]),
    value: z
      .string()
      .min(1, "Value is required")
      .refine((val) => parseFloat(val) > 0, "Value must be greater than 0"),
    min_order_amount: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_active: z.boolean(),
  })
  // --------------------------------------------------
  // CROSS-FIELD VALIDATION — the end date must not fall before the
  // start date. This can only be checked once BOTH fields exist
  // together, which is exactly what .superRefine() is for (a plain
  // .refine() on a single field can't see its sibling fields).
  // The error is attached to the "end_date" path specifically, so
  // react-hook-form surfaces it as errors.end_date.message and it
  // renders right under the End Date input, not as some generic
  // top-of-form message the admin might miss.
  // --------------------------------------------------
  .superRefine((data, ctx) => {
    if (!data.start_date || !data.end_date) return;
    // Only meaningful once both dates are actually filled in — either
    // one being blank means there's nothing to compare yet

    if (new Date(data.end_date) < new Date(data.start_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date cannot be earlier than the start date.",
        path: ["end_date"],
      });
    }
  });

const DiscountFormModal = ({ isOpen, onClose, activeDiscount }) => {
  const queryClient = useQueryClient();
  const isEditMode = !!activeDiscount;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: "",
      type: "percent",
      value: "",
      min_order_amount: "",
      start_date: "",
      end_date: "",
      is_active: true,
    },
  });

  // Re-fill the form whenever a different discount is opened for
  // editing, or reset to blank defaults when opening in create mode
  useEffect(() => {
    if (isOpen) {
      reset({
        code: activeDiscount?.code || "",
        type: activeDiscount?.type || "percent",
        value: activeDiscount ? String(activeDiscount.value) : "",
        // min_order_amount/start_date are defensively read — they
        // aren't confirmed present on every response shape (see the
        // flag notes in DiscountManagement.jsx), so this simply falls
        // back to blank rather than crashing if they're missing
        min_order_amount: activeDiscount?.min_order_amount
          ? String(activeDiscount.min_order_amount)
          : "",
        start_date: activeDiscount?.start_date
          ? activeDiscount.start_date.slice(0, 10)
          : "",
        end_date: activeDiscount?.end_date
          ? activeDiscount.end_date.slice(0, 10)
          : "",
        is_active: activeDiscount ? !!activeDiscount.is_active : true,
      });
    }
  }, [isOpen, activeDiscount, reset]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        code: data.code,
        type: data.type,
        value: data.value,
        min_order_amount: data.min_order_amount || "0",
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        is_active: data.is_active,
      };
      return isEditMode
        ? updateDiscount(activeDiscount.id, payload)
        : createDiscount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOUNTS });
      showSuccess(isEditMode ? "Discount updated." : "Discount created.");
      onClose();
    },
    onError: (error) =>
      showError(error?.response?.data?.message || "Failed to save discount."),
  });

  const onSubmit = (data) => saveMutation.mutate(data);
  const isActive = watch("is_active");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditMode ? `Edit Discount: ${activeDiscount.code}` : "Create Discount"
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Coupon Code"
          placeholder="SUMMER25"
          required
          {...register("code")}
          error={errors.code?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            {...register("type")}
            error={errors.type?.message}
          />
          <Input
            label={watch("type") === "percent" ? "Value (%)" : "Value (Rs.)"}
            type="number"
            step="0.01"
            min="0"
            required
            {...register("value")}
            error={errors.value?.message}
          />
        </div>

        <Input
          label="Minimum Order Amount"
          type="number"
          step="0.01"
          min="0"
          hint="Optional — leave blank for no minimum"
          leftIcon={<span className="text-gray-400">Rs.</span>}
          {...register("min_order_amount")}
          error={errors.min_order_amount?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            hint="Optional"
            {...register("start_date")}
            error={errors.start_date?.message}
          />
          <Input
            label="End Date"
            type="date"
            hint="Optional — leave blank for no expiry"
            {...register("end_date")}
            // This is where the new "End date cannot be earlier than
            // the start date" message actually appears on screen —
            // react-hook-form/zod attach it here because the
            // superRefine check above targets path: ["end_date"]
            error={errors.end_date?.message}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {isActive ? "Active" : "Inactive"}
          </span>
          <Toggle
            id="discount_is_active"
            checked={!!isActive}
            onChange={(e) => setValue("is_active", e.target.checked)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={saveMutation.isPending}
          >
            {isEditMode ? "Save Changes" : "Create Discount"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DiscountFormModal;
