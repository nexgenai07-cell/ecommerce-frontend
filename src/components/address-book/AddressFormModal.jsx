// ============================================================
// ADDRESS FORM MODAL
// ============================================================
// Shared "Add Address" / "Edit Address" modal used by the Address
// Book page and reused from Checkout's "add new address" flow.
// Handles both create and edit in one component — when
// "addressToEdit" is passed in, the form is pre-filled and submitting
// calls updateAddress() instead of createAddress().

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { createAddress, updateAddress } from "../../api/addresses.api";
import { showSuccess, showError } from "../ui/Toast";

// Same Pakistani provinces list used elsewhere in the app (Checkout,
// old DeliveryAddressForm) — kept here too since the Address Book's
// "shipping_address" field is a single free-text line and city stays
// its own separate field, matching the backend's exact contract.
const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Azad Kashmir",
  "Gilgit-Baltistan",
  "Islamabad",
];

// Validation schema — matches the exact fields the backend accepts on
// both POST /api/v1/addresses/ and PUT /api/v1/addresses/{id}/:
// label, shipping_address, city, postal_code (optional), phone
// (optional), is_default.
const addressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give this address a label (e.g. Home, Office)")
    .max(30, "Label is too long"),
  shipping_address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .min(5, "Please enter a complete address")
    .max(150, "Address is too long"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(60, "City name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "City name can only contain letters"),
  province: z.string().trim().optional(),
  // Optional on the backend — but if the customer does type something,
  // it should still look like a real Pakistani postal code.
  postal_code: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^\d{5}$/.test(val),
      "Postal code must be exactly 5 digits",
    ),
  // Optional on the backend — validated only when non-empty.
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^(\+92|0)[0-9]{10}$/.test(val),
      "Invalid Pakistani phone number",
    ),
  is_default: z.boolean().optional(),
});

// onSaved(address) — optional callback fired with the saved address
// object right after a successful create/update, in addition to the
// automatic query cache invalidation. Lets a caller like Checkout's
// address picker immediately select a brand-new address instead of
// leaving the customer to find and click it themselves.
const AddressFormModal = ({
  isOpen,
  onClose,
  addressToEdit = null,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!addressToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    mode: "onTouched",
    defaultValues: {
      label: "",
      shipping_address: "",
      city: "",
      province: "",
      postal_code: "",
      phone: "",
      is_default: false,
    },
  });

  // Pre-fill the form when opening in edit mode, and reset it back to
  // blank whenever the modal is opened fresh for a new address. This
  // runs on every open (not just once) so switching from editing one
  // address straight to editing another never leaves stale values
  // behind.
  useEffect(() => {
    if (!isOpen) return;

    if (addressToEdit) {
      reset({
        label: addressToEdit.label || "",
        shipping_address: addressToEdit.shipping_address || "",
        city: addressToEdit.city || "",
        province: addressToEdit.province || "",
        postal_code: addressToEdit.postal_code || "",
        phone: addressToEdit.phone || "",
        is_default: !!addressToEdit.is_default,
      });
    } else {
      reset({
        label: "",
        shipping_address: "",
        city: "",
        province: "",
        postal_code: "",
        phone: "",
        is_default: false,
      });
    }
  }, [isOpen, addressToEdit, reset]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        label: data.label,
        shipping_address: data.shipping_address,
        city: data.city,
        postal_code: data.postal_code || undefined,
        phone: data.phone || undefined,
        is_default: !!data.is_default,
      };
      return isEditMode
        ? updateAddress(addressToEdit.id, payload)
        : createAddress(payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES });
      showSuccess(
        isEditMode ? "Address updated successfully!" : "Address saved!",
      );
      onSaved?.(response.data);
      onClose();
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message || "Failed to save this address.",
      );
    },
  });

  const onSubmit = (data) => saveMutation.mutate(data);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Address" : "Add New Address"}
      size="md"
      closeOnBackdrop={!saveMutation.isPending}
    >
      <div className="flex flex-col gap-4">
        {/* Label */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Label
          </label>
          <input
            type="text"
            placeholder="Home, Office, etc."
            {...register("label")}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors.label ? "border-danger" : "border-gray-200"}
            `}
          />
          {errors.label && (
            <p className="text-xs text-danger">{errors.label.message}</p>
          )}
        </div>

        {/* Street address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Street Address
          </label>
          <input
            type="text"
            placeholder="House #, street name"
            autoComplete="street-address"
            {...register("shipping_address")}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors.shipping_address ? "border-danger" : "border-gray-200"}
            `}
          />
          {errors.shipping_address && (
            <p className="text-xs text-danger">
              {errors.shipping_address.message}
            </p>
          )}
        </div>

        {/* City + Province + Postal Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              City
            </label>
            <input
              type="text"
              placeholder="Lahore"
              autoComplete="address-level2"
              {...register("city")}
              className={`
                w-full px-4 py-2.5 text-sm rounded-xl border bg-white
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
                ${errors.city ? "border-danger" : "border-gray-200"}
              `}
            />
            {errors.city && (
              <p className="text-xs text-danger">{errors.city.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Province
            </label>
            <select
              {...register("province")}
              className="
                w-full px-4 py-2.5 text-sm rounded-xl border bg-white
                text-gray-900 cursor-pointer appearance-none border-gray-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
              "
            >
              <option value="">Select (optional)</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Postal Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="54000 (optional)"
              autoComplete="postal-code"
              {...register("postal_code")}
              className={`
                w-full px-4 py-2.5 text-sm rounded-xl border bg-white
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
                ${errors.postal_code ? "border-danger" : "border-gray-200"}
              `}
            />
            {errors.postal_code && (
              <p className="text-xs text-danger">
                {errors.postal_code.message}
              </p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Phone (optional)
          </label>
          <input
            type="tel"
            placeholder="03XXXXXXXXX"
            autoComplete="tel"
            {...register("phone")}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors.phone ? "border-danger" : "border-gray-200"}
            `}
          />
          {errors.phone && (
            <p className="text-xs text-danger">{errors.phone.message}</p>
          )}
        </div>

        {/* Set as default */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register("is_default")}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            Set as my default address
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            isLoading={saveMutation.isPending}
          >
            {isEditMode ? "Save Changes" : "Save Address"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddressFormModal;
