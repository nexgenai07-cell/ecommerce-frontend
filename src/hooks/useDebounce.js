// ============================================================
// useDebounce — CUSTOM HOOK
// ============================================================
// Delays updating a value until the person has stopped changing it
// for a given amount of time. Used for search inputs that hit a real
// server-side API (like Product/Order/Customer search) — without
// this, every single keystroke would fire a new network request.
//
// REUSABILITY: this is deliberately generic (works with any value
// type, not just strings) so every future admin list page's search
// box can import this same hook instead of re-writing this logic.

import { useState, useEffect } from "react";

const useDebounce = (value, delayMs = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Schedule the update, but only after the value has stayed the
    // same for `delayMs` — every new keystroke resets this timer via
    // the cleanup function below, so only the FINAL value (after the
    // person pauses typing) actually gets committed.
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
    // Cleanup — cancels the pending timer whenever `value` changes
    // again before it fires, or when the component using this unmounts
  }, [value, delayMs]);

  return debouncedValue;
};

export default useDebounce;
