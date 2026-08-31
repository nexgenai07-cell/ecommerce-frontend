import { useCallback, useRef, useState } from "react";
// useCallback: keeps the returned checkOnBlur function stable across
// re-renders, so it's safe to use inside other components' dependency
// arrays without causing extra effect re-runs.
// useRef: used below purely as a mutable counter, NOT for anything
// visual — see the race-condition guard comment further down.
// useState: tracks whether a check request is currently in flight, so
// callers can optionally show a small "checking..." spinner.

// useFieldAvailabilityCheck
// ---------------------------------------------------------------
// Generic helper for the four "already exists" blur-checks used across
// the admin panel (Product Name, Product SKU, Category Name, Discount
// Code). All four follow the exact same shape: call a GET endpoint with
// the current field value (+ excludeId when editing an existing
// record), and the response is always { exists: boolean } — see API
// 31.1, 31.2, 24.1, and 40.1 in the backend spec.
//
// Params:
//   checkFn   — the API function to call: one of checkProductNameExists /
//               checkProductSkuExists / checkCategoryNameExists /
//               checkDiscountCodeExists. Signature: (value, excludeId) => Promise
//   fieldName — the react-hook-form field name this result belongs to
//               (e.g. "name", "sku", "code") — used to target setError/clearErrors
//   message   — the exact inline error text to show when exists === true
//   excludeId — the current record's own id in edit mode, or undefined
//               when creating a brand-new record (so a record being
//               edited never gets flagged as a duplicate of itself)
//   setError, clearErrors — passed straight through from the calling
//               form's useForm() so this hook can set/clear the error
//               on the exact field it's checking
//
// Returns { checkOnBlur, isChecking } — checkOnBlur is meant to be
// called from a field's onBlur handler (after react-hook-form's own
// onBlur has already run and passed its own format validation).
export default function useFieldAvailabilityCheck({
  checkFn,
  fieldName,
  message,
  excludeId,
  setError,
  clearErrors,
}) {
  const [isChecking, setIsChecking] = useState(false);

  // requestIdRef guards against a slow-then-fast blur race: if the admin
  // blurs the field, then blurs it again with a different value before
  // the first request resolves, an out-of-order response could otherwise
  // overwrite the correct, more recent result. Bumping this counter on
  // every call and only applying a response if it's still the latest
  // request fixes that — a plain ref (not state) because it's never
  // rendered, just compared.
  const requestIdRef = useRef(0);

  const checkOnBlur = useCallback(
    async (rawValue) => {
      const value = (rawValue ?? "").toString().trim();

      // Empty field — the field's own "required" rule (Zod) already
      // covers this case, so there's nothing useful to check yet.
      if (!value) return;

      const thisRequestId = ++requestIdRef.current;
      setIsChecking(true);

      try {
        const response = await checkFn(value, excludeId);

        // A newer request has started since this one was fired — its
        // result is stale, so don't let it clobber the newer check.
        if (thisRequestId !== requestIdRef.current) return;

        if (response?.data?.exists) {
          setError(fieldName, { type: "manual", message });
        } else {
          // Only clear an error THIS check is responsible for. This is
          // safe even alongside Zod's own validation, because this check
          // only ever runs after the field has already passed its own
          // format rules — so by the time we get here, any lingering
          // error on this field can only be this exact "already exists"
          // one from a previous blur.
          clearErrors(fieldName);
        }
      } catch {
        // Network/server error while checking — fail silently. This
        // check is purely a UX nicety; the backend's own submit-time
        // duplicate check (API 31, 24, 40, etc.) is still the real
        // safety net, so a temporarily-unreachable check-availability
        // endpoint shouldn't block typing or show a scary error for
        // something that isn't the admin's fault.
      } finally {
        if (thisRequestId === requestIdRef.current) setIsChecking(false);
      }
    },
    [checkFn, excludeId, setError, clearErrors, fieldName, message],
  );

  return { checkOnBlur, isChecking };
}
