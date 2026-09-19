import { useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createDiscount,
  updateDiscount,
  checkDiscountCodeExists,
} from "../../api/discounts.api";
// checkDiscountCodeExists — API 40.1
import useFieldAvailabilityCheck from "../../hooks/useFieldAvailabilityCheck";
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

// Local calendar date (YYYY-MM-DD) in the admin's own timezone. Used both
// as the native date picker's "min" bound and as the reference point for
// the past-date validation below. Deliberately built from getFullYear/
// getMonth/getDate rather than toISOString(), which converts to UTC first
// and can silently roll the date backward or forward for admins outside
// UTC.
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Builds a sortable "instant" string for the range check below, mirroring
// how the backend itself treats a bare date (API 40, Sep 2026 addendum):
// a start date with no time defaults to the very start of that day, and
// an end date with no time defaults to the very end of it. Once a real
// time is picked for a flash-sale coupon, that exact time is used
// instead. Every value stays in "YYYY-MM-DDTHH:MM" shape, so a plain
// string comparison sorts identically to a chronological one.
const toComparableInstant = (date, time, fallbackTime) =>
  `${date}T${time || fallbackTime}`;

// --------------------------------------------------
// Schema factory (API 40 / API 42, Sep 2026 addendum) — built inside the
// component rather than as a single module-level constant, because the
// "start date cannot be in the past" rule needs one exception: editing a
// coupon must not start rejecting it just because it already had an old
// start_date before this rule existed. originalStartDateRef holds the
// value the form was opened with, read live (not captured) so the same
// schema instance stays correct across every open/close of the modal.
// --------------------------------------------------
const buildDiscountSchema = (originalStartDateRef) =>
  z
    .object({
      code: z
        .string()
        .trim()
        .min(1, "Coupon code is required")
        .max(30, "Coupon code is too long")
        .regex(
          /^[A-Za-z0-9-]+$/,
          "Coupon code can only contain letters, numbers, and hyphens",
        )
        .transform((val) => val.toUpperCase()),
      // Uppercased automatically — coupon codes are conventionally
      // case-insensitive from the customer's perspective, so normalizing
      // here keeps the stored value consistent regardless of how the
      // admin typed it
      type: z.enum(["percent", "fixed"]),
      value: z
        .string()
        .min(1, "Value is required")
        .refine(
          (val) => !Number.isNaN(parseFloat(val)),
          "Value must be a valid number",
        )
        .refine((val) => parseFloat(val) > 0, "Value must be greater than 0"),
      min_order_amount: z
        .string()
        .optional()
        .refine(
          (val) => !val || !Number.isNaN(parseFloat(val)),
          "Minimum order amount must be a valid number",
        )
        .refine(
          (val) => !val || parseFloat(val) >= 0,
          "Minimum order amount cannot be negative",
        ),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      // Hours-only flash-sale support (API 40, Sep 2026 addendum, note 3).
      // use_specific_time is a form-only flag — it decides whether
      // start_time/end_time are combined into the submitted start_date/
      // end_date or left out entirely; it is never sent to the backend
      // by itself.
      use_specific_time: z.boolean(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      is_active: z.boolean(),
    })
    // --------------------------------------------------
    // A discount can no longer be created — or edited into — starting
    // before today. Both fields are plain "YYYY-MM-DD" strings from the
    // native date input, so a direct string comparison sorts identically
    // to a chronological one and avoids any Date/timezone parsing at all.
    // Today itself is always allowed — only strictly earlier dates are
    // rejected, which is what lets a same-day coupon through. This stays
    // a pure DATE check even when a specific time is set, matching the
    // backend's own "compared by DATE only" rule.
    //
    // Exception: if this modal is editing a coupon whose start_date was
    // already in the past before the admin opened the form, and the
    // admin hasn't touched that field, this is not treated as a new
    // violation — only editing other fields (e.g. flipping is_active)
    // would otherwise be blocked for coupons that predate this rule.
    // --------------------------------------------------
    .superRefine((data, ctx) => {
      if (!data.start_date) return;
      const isUnchangedFromOriginal =
        data.start_date === originalStartDateRef.current;
      if (data.start_date < getTodayDateString() && !isUnchangedFromOriginal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date cannot be in the past.",
          path: ["start_date"],
        });
      }
    })
    // --------------------------------------------------
    // Once "specific time" is switched on, both a start time and an end
    // time are required — a flash sale needs both bounds to mean
    // anything — and a date has to actually be picked for whichever
    // bound is getting a time attached to it.
    // --------------------------------------------------
    .superRefine((data, ctx) => {
      if (!data.use_specific_time) return;

      if (!data.start_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a start date to set a specific start time.",
          path: ["start_date"],
        });
      }
      if (!data.end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick an end date to set a specific end time.",
          path: ["end_date"],
        });
      }
      if (!data.start_time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start time is required.",
          path: ["start_time"],
        });
      }
      if (!data.end_time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time is required.",
          path: ["end_time"],
        });
      }
    })
    // --------------------------------------------------
    // CROSS-FIELD VALIDATION — the end date/time must not fall before
    // the start date/time. This can only be checked once BOTH fields
    // exist together, which is exactly what .superRefine() is for (a
    // plain .refine() on a single field can't see its sibling fields).
    // The error is attached to the "end_date" path by default so it
    // renders right under the End Date input — or to "end_time" when a
    // specific time is in play, since that's the value actually causing
    // the problem.
    //
    // A same-day, no-time coupon (start_date === end_date) is explicitly
    // allowed — the backend treats a date-only end_date as valid through
    // 11:59:59 PM of that day. A same-day coupon WITH times only fails
    // when the end time is genuinely earlier than the start time (e.g.
    // start 6:00 PM, end 10:00 AM on the same date).
    // --------------------------------------------------
    .superRefine((data, ctx) => {
      if (!data.start_date || !data.end_date) return;
      // Only meaningful once both dates are actually filled in — either
      // one being blank means there's nothing to compare yet

      const startInstant = toComparableInstant(
        data.start_date,
        data.use_specific_time ? data.start_time : null,
        "00:00",
      );
      const endInstant = toComparableInstant(
        data.end_date,
        data.use_specific_time ? data.end_time : null,
        "23:59",
      );

      if (endInstant < startInstant) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be earlier than the start date.",
          path: [data.use_specific_time ? "end_time" : "end_date"],
        });
      }
    })
    // A percentage-type discount can never be worth more than 100% — this
    // can only be checked once "type" and "value" exist together, so it
    // lives here rather than on the "value" field's own chain.
    .superRefine((data, ctx) => {
      if (data.type === "percent" && parseFloat(data.value) > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage discount cannot be greater than 100%.",
          path: ["value"],
        });
      }
    });

// A stored end_date time of "23:59" (or, for legacy rows saved before
// this rule existed, "00:00") reads as "no specific time was ever
// chosen" — i.e. an all-day coupon — rather than a genuine flash-sale
// bound, so pre-filling the edit form doesn't switch the toggle on for
// every ordinary coupon that happens to have a time component at all.
const ALL_DAY_END_TIMES = ["23:59", "00:00"];

const DiscountFormModal = ({ isOpen, onClose, activeDiscount }) => {
  const queryClient = useQueryClient();
  const isEditMode = !!activeDiscount;

  // Holds the start_date the form was opened with (edit mode) or null
  // (create mode). Read live inside the schema's superRefine above, so
  // updating .current here never requires rebuilding the schema itself.
  const originalStartDateRef = useRef(null);

  // Built once per mounted instance of this modal — the ref's identity
  // never changes, only its .current value, so the validator inside
  // always reads the latest original start date without needing a new
  // schema object every time a different discount is opened for editing.
  const discountSchema = useMemo(
    () => buildDiscountSchema(originalStartDateRef),
    [],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(discountSchema),
    // Live validation (industry-standard pattern, same one Gmail/Amazon/
    // most production sites use): a field is left completely alone while
    // the user is still typing into it for the first time -- no error,
    // no matter how invalid the in-progress value looks. The first check
    // happens on "blur", i.e. the moment the user leaves that field
    // (Tab key or clicking elsewhere) -- mode: "onTouched" below. From
    // that point on, react-hook-form's default reValidateMode ("onChange")
    // takes over automatically: if the field was invalid, it re-checks on
    // every keystroke so the error clears the instant the value becomes
    // valid, without needing another blur.
    mode: "onTouched",
    defaultValues: {
      code: "",
      type: "percent",
      value: "",
      min_order_amount: "",
      start_date: "",
      end_date: "",
      use_specific_time: false,
      start_time: "",
      end_time: "",
      is_active: true,
    },
  });

  // Real-time "already exists" check (API 40.1) — fires on blur of the
  // Coupon Code field. excludeId is only passed in edit mode, so saving
  // a discount with its own unchanged code never flags it as a
  // duplicate of itself.
  const { checkOnBlur: checkCodeOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkDiscountCodeExists,
    fieldName: "code",
    message: "This coupon code already exists.",
    excludeId: isEditMode ? activeDiscount.id : undefined,
    setError,
    clearErrors,
  });

  const codeField = register("code");
  // Captured separately so its own onBlur can be chained with the
  // duplicate-code check above.

  // Re-fill the form whenever a different discount is opened for
  // editing, or reset to blank defaults when opening in create mode
  useEffect(() => {
    if (isOpen) {
      const startDateValue = activeDiscount?.start_date
        ? activeDiscount.start_date.slice(0, 10)
        : "";
      const endDateValue = activeDiscount?.end_date
        ? activeDiscount.end_date.slice(0, 10)
        : "";

      // A stored value carries a real time component only when it's a
      // full "YYYY-MM-DDTHH:MM..." string (length > 10). Anything
      // shorter is a bare date, which never implies a flash-sale time.
      const storedStartTime =
        activeDiscount?.start_date?.length > 10
          ? activeDiscount.start_date.slice(11, 16)
          : "";
      const storedEndTime =
        activeDiscount?.end_date?.length > 10
          ? activeDiscount.end_date.slice(11, 16)
          : "";

      const hasSpecificStartTime =
        !!storedStartTime && storedStartTime !== "00:00";
      const hasSpecificEndTime =
        !!storedEndTime && !ALL_DAY_END_TIMES.includes(storedEndTime);
      const useSpecificTime = hasSpecificStartTime || hasSpecificEndTime;

      // Recorded so the past-date validator above can tell "an old
      // start_date this coupon already had" apart from "a new past date
      // the admin just typed in".
      originalStartDateRef.current = isEditMode ? startDateValue : null;

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
        start_date: startDateValue,
        end_date: endDateValue,
        use_specific_time: useSpecificTime,
        start_time: useSpecificTime ? storedStartTime || "" : "",
        end_time: useSpecificTime ? storedEndTime || "" : "",
        is_active: activeDiscount ? !!activeDiscount.is_active : true,
      });
    }
  }, [isOpen, activeDiscount, isEditMode, reset]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // When "specific time" is off, a bare date is sent exactly as
      // before — the backend fills in the start/end of that day itself.
      // When it's on, the chosen time is stitched onto the date so the
      // exact instant the admin picked is respected rather than
      // overwritten (API 40, Sep 2026 addendum, note 3).
      const start_date =
        data.use_specific_time && data.start_date && data.start_time
          ? `${data.start_date}T${data.start_time}:00`
          : data.start_date || undefined;
      const end_date =
        data.use_specific_time && data.end_date && data.end_time
          ? `${data.end_date}T${data.end_time}:00`
          : data.end_date || undefined;

      const payload = {
        code: data.code,
        type: data.type,
        value: data.value,
        min_order_amount: data.min_order_amount || "0",
        start_date,
        end_date,
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
    // The backend now returns two dedicated validation error shapes
    // (API 40 / API 42, Sep 2026 addendum) on top of its generic
    // "message" shape:
    //   { "start_date": ["Start date cannot be in the past."] }
    //   { "non_field_errors": ["End date must be after start date."] }
    // Both are surfaced inline, right under the relevant field, the same
    // way the "code already exists" check above already does — a toast
    // alone would be easy to miss on a form this long.
    onError: (error) => {
      const responseData = error?.response?.data;
      const startDateError = responseData?.start_date?.[0];
      const rangeError = responseData?.non_field_errors?.[0];

      if (startDateError) {
        setError("start_date", { type: "manual", message: startDateError });
        showError(startDateError);
        return;
      }

      if (rangeError) {
        setError("end_date", { type: "manual", message: rangeError });
        showError(rangeError);
        return;
      }

      showError(responseData?.message || "Failed to save discount.");
    },
  });

  const onSubmit = (data) => saveMutation.mutate(data);
  const isActive = watch("is_active");
  const startDateValue = watch("start_date");
  const useSpecificTime = watch("use_specific_time");

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
          {...codeField}
          onBlur={(e) => {
            codeField.onBlur(e); // Keep react-hook-form's own per-field validation
            checkCodeOnBlur(e.target.value); // Then run the duplicate-code check
            // (backend compares case-insensitively against the stored
            // uppercase value regardless of the casing sent here, per
            // API 40.1's matching rule)
          }}
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
            placeholder={watch("type") === "percent" ? "e.g. 25" : "e.g. 500"}
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
          placeholder="0.00"
          hint="Optional — leave blank for no minimum"
          leftIcon={<span className="text-gray-400">Rs.</span>}
          {...register("min_order_amount")}
          error={errors.min_order_amount?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            // Blocks every past date directly in the calendar popup —
            // the admin can't even open to a disallowed day, on top of
            // the inline error the schema shows if one is typed instead.
            min={getTodayDateString()}
            hint="Optional — cannot be earlier than today"
            {...register("start_date")}
            error={errors.start_date?.message}
          />
          <Input
            label="End Date"
            type="date"
            // Mirrors the start date: the calendar can't go earlier than
            // whichever is later, today or the chosen start date, so a
            // same-day coupon is still fully selectable.
            min={startDateValue || getTodayDateString()}
            hint="Optional — valid through 11:59 PM of this date"
            {...register("end_date")}
            // This is where the "End date cannot be earlier than the
            // start date" message actually appears on screen —
            // react-hook-form/zod attach it here because the
            // superRefine check above targets path: ["end_date"]
            error={errors.end_date?.message}
          />
        </div>

        {/* Hours-only flash-sale toggle (API 40, Sep 2026 addendum, note
            3). Off by default so the vast majority of coupons — all-day
            or open-ended — behave exactly as before; switching it on
            reveals a start/end time for a short same-day sale. */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Set a specific start &amp; end time
            <span className="block text-xs font-normal text-gray-400">
              For a short, hours-only flash sale
            </span>
          </span>
          <Toggle
            id="discount_use_specific_time"
            checked={!!useSpecificTime}
            onChange={(e) => {
              setValue("use_specific_time", e.target.checked);
              if (!e.target.checked) {
                // Clearing the times when the toggle is switched back
                // off avoids silently resubmitting a stale time the
                // admin no longer intends to use.
                setValue("start_time", "");
                setValue("end_time", "");
              }
            }}
          />
        </div>

        {useSpecificTime && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              required
              hint="24-hour clock, e.g. 10:00"
              {...register("start_time")}
              error={errors.start_time?.message}
            />
            <Input
              label="End Time"
              type="time"
              required
              hint="Same day as End Date above"
              {...register("end_time")}
              error={errors.end_time?.message}
            />
          </div>
        )}

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
