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
import {
  HiOutlineTag,
  HiOutlineMapPin,
  HiOutlineBuildingOffice2,
  HiOutlinePhone,
  HiCheckCircle,
} from "react-icons/hi2";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Select from "../ui/Select";
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
];

// Options shape the shared Select component expects — built once from
// the plain province name list above so both stay in sync.
const PROVINCE_OPTIONS = PROVINCES.map((p) => ({ value: p, label: p }));

// Hard character ceilings enforced both on the input itself (via
// maxLength / onChange filtering below) and in the schema. Keeping a
// single source of truth here means the visible limit the customer
// hits while typing always matches the limit the schema will
// ultimately validate against.
const LABEL_MAX_LENGTH = 30;
const ADDRESS_MAX_LENGTH = 150;
// City names are limited to 30 characters and to letters and spaces, the
// same rule the backend applies on every address endpoint.
const CITY_MAX_LENGTH = 30;
// Postal codes follow the Pakistan Post format the backend accepts:
// between 4 and 6 digits.
const POSTAL_CODE_MIN_LENGTH = 4;
const POSTAL_CODE_MAX_LENGTH = 6;
const PHONE_MAX_LENGTH = 13;

// Validation schema — matches the exact fields the backend accepts on
// both POST /api/v1/addresses/ and PUT /api/v1/addresses/{id}/:
// label, shipping_address, city, postal_code (optional), phone
// (optional), is_default.
const addressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give this address a label (e.g. Home, Office)")
    .max(LABEL_MAX_LENGTH, "Label is too long"),
  shipping_address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .min(5, "Please enter a complete address")
    .max(ADDRESS_MAX_LENGTH, "Address is too long")
    .regex(
      /^[A-Za-z0-9\s,.#/'-]+$/,
      "Address can only contain letters, numbers, and , . # / ' -",
    )
    .refine((val) => /[A-Za-z]/.test(val), "Please enter a complete address")
    .refine((val) => !/(.)\1{3,}/.test(val), "Please enter a valid address"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(CITY_MAX_LENGTH, "City name is too long")
    .regex(/^[A-Za-z ]+$/, "City name can only contain letters and spaces")
    .refine((val) => !/(.)\1{3,}/.test(val), "Please enter a valid city name"),
  province: z.string().trim().optional(),
  // Optional on the backend — but if the customer does type something,
  // it should still look like a real Pakistani postal code: 4 to 6 digits.
  postal_code: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) =>
        !val ||
        new RegExp(
          `^\\d{${POSTAL_CODE_MIN_LENGTH},${POSTAL_CODE_MAX_LENGTH}}$`,
        ).test(val),
      `Postal code must be ${POSTAL_CODE_MIN_LENGTH} to ${POSTAL_CODE_MAX_LENGTH} digits`,
    ),
  // Optional on the backend — validated only when non-empty. Anchored
  // regex already rejects letters/symbols outright since the whole
  // string has to match the digits-only pattern.
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^(\+92|0)[0-9]{10}$/.test(val),
      "Invalid Pakistani phone number",
    )
    .refine(
      (val) => !val || !/(\d)\1{5,}/.test(val),
      "Please enter a valid phone number",
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
      // Validation failures now come back as { "error": "<message>" }
      // instead of DRF's default per-field shape — read that first so
      // the real reason (e.g. "Shipping address looks too short...")
      // reaches the customer instead of the generic fallback below.
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to save this address.",
      );
    },
  });

  const onSubmit = (data) => saveMutation.mutate(data);

  // Shared input classes — centralised here so every field in this
  // form (label, address, city, postal code, phone) renders with the
  // exact same rounded, focus-ring, error-state look. Passing an
  // "hasError" flag keeps the border/ring color in sync with
  // react-hook-form's live validation state.
  const inputClasses = (hasError) => `
    w-full px-4 py-2.5 text-sm rounded-xl border bg-white
    placeholder:text-gray-300 text-gray-900
    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
    transition-all duration-150
    ${hasError ? "border-danger focus:ring-danger" : "border-gray-200 hover:border-gray-300"}
  `;

  const labelClasses =
    "flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider";

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
          <label className={labelClasses}>
            <HiOutlineTag className="w-3.5 h-3.5 text-primary" />
            Label
          </label>
          <input
            type="text"
            placeholder="Home, Office, etc."
            maxLength={LABEL_MAX_LENGTH}
            {...register("label")}
            className={inputClasses(errors.label)}
          />
          {errors.label && (
            <p className="text-xs text-danger">{errors.label.message}</p>
          )}
        </div>

        {/* Street address */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClasses}>
            <HiOutlineMapPin className="w-3.5 h-3.5 text-primary" />
            Street Address
          </label>
          <input
            type="text"
            placeholder="House #, street name"
            autoComplete="street-address"
            maxLength={ADDRESS_MAX_LENGTH}
            {...register("shipping_address")}
            className={inputClasses(errors.shipping_address)}
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
            <label className={labelClasses}>
              <HiOutlineBuildingOffice2 className="w-3.5 h-3.5 text-primary" />
              City
            </label>
            <input
              type="text"
              placeholder="Lahore"
              autoComplete="address-level2"
              maxLength={CITY_MAX_LENGTH}
              {...register("city")}
              onChange={(e) => {
                // City names are letters and spaces only — strip digits,
                // symbols, and any other disallowed character the instant
                // it's typed or pasted, so the field itself enforces the
                // same rule the schema's regex checks on submit,
                // rather than only complaining after the fact.
                // maxLength above stops the character count once it
                // reaches CITY_MAX_LENGTH, so nothing beyond that
                // limit can be entered either.
                e.target.value = e.target.value.replace(/[^A-Za-z ]/g, "");
                register("city").onChange(e);
              }}
              className={inputClasses(errors.city)}
            />
            {errors.city && (
              <p className="text-xs text-danger">{errors.city.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Province
            </label>
            {/* Uses the shared Select component (same one already used on
                Checkout, Discounts, Orders, etc.) instead of a raw native
                <select> so the closed field — rounded corners, border
                color, focus ring, chevron icon — matches the rest of the
                app's theme instead of the browser's unstyled default.
                The "label" prop is left unset here on purpose: this form
                already renders its own small-caps gray label above, in
                the same style as City and Postal Code beside it, so
                Select is only used for the field itself. */}
            <Select
              placeholder="Select (optional)"
              options={PROVINCE_OPTIONS}
              {...register("province")}
              className="rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Postal Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={POSTAL_CODE_MAX_LENGTH}
              placeholder="54000 (optional)"
              autoComplete="postal-code"
              {...register("postal_code")}
              onChange={(e) => {
                // Postal codes are digits only — the same "block it at
                // the keystroke, don't just flag it afterwards"
                // approach used for phone below. maxLength caps the
                // count at POSTAL_CODE_MAX_LENGTH once the digits
                // themselves are already clean.
                e.target.value = e.target.value.replace(/\D/g, "");
                register("postal_code").onChange(e);
              }}
              className={inputClasses(errors.postal_code)}
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
          <label className={labelClasses}>
            <HiOutlinePhone className="w-3.5 h-3.5 text-primary" />
            Phone (optional)
          </label>
          <input
            type="tel"
            inputMode="tel"
            maxLength={PHONE_MAX_LENGTH}
            placeholder="03XXXXXXXXX"
            autoComplete="tel"
            {...register("phone")}
            onChange={(e) => {
              // Same digit-plus-leading-"+"-only filter used on the
              // Register page's phone field, kept identical here so a
              // customer sees the exact same typing behaviour in both
              // places.
              e.target.value = e.target.value
                .replace(/[^\d+]/g, "")
                .replace(/(?!^)\+/g, "");
              register("phone").onChange(e);
            }}
            className={inputClasses(errors.phone)}
          />
          {errors.phone && (
            <p className="text-xs text-danger">{errors.phone.message}</p>
          )}
        </div>

        {/* Set as default */}
        <label
          className="
            flex items-center gap-2.5 cursor-pointer select-none
            rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3
            hover:border-gray-300 transition-colors
          "
        >
          <input
            type="checkbox"
            {...register("is_default")}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <HiCheckCircle className="w-4 h-4 text-primary" />
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
