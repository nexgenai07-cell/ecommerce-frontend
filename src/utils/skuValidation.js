// Shared SKU validation used by every SKU field across the admin panel
// (Add Product, Edit Product) so both forms enforce exactly the same
// rules and the exact same error messages.
//
// A valid SKU:
//   1. Is required — cannot be empty
//   2. Has no leading/trailing/inner spaces
//   3. Is stored in uppercase
//   4. Is between 3 and 25 characters long
//   5. Only contains letters, numbers, hyphens (-), and underscores (_)
//   6. Starts and ends with a letter or number — never a hyphen/underscore
//   7. Never has two hyphens/underscores next to each other (e.g. "--", "__")
//   8. Contains at least one letter or number (not just hyphens/underscores)
//   9. Is not a reserved word ("NULL", "TEST", "ADMIN")
//
// Uniqueness (rule 9 on the product spec — no two products share a SKU)
// and immutability (a SKU can't be changed once the product is created)
// are enforced separately: uniqueness by the backend and the existing
// checkProductSkuExists() duplicate check on blur, immutability by
// disabling the SKU field in the Edit Product form.

export const SKU_MIN_LENGTH = 3;
export const SKU_MAX_LENGTH = 25;

// Matches a string that starts and ends with a letter/number, with
// letters, numbers, hyphens, and underscores allowed in between.
export const SKU_REGEX = /^[A-Z0-9](?:[A-Z0-9_-]{1,23}[A-Z0-9])?$/;

// Two hyphens/underscores (in any combination) appearing back to back
const CONSECUTIVE_SPECIAL_CHARS_REGEX = /[-_]{2,}/;

// Words a SKU is never allowed to be, regardless of formatting
const RESERVED_SKU_WORDS = ["NULL", "TEST", "ADMIN"];

// One line, always-visible instruction shown under the SKU field so
// the admin knows the required format before they even type anything —
// the same way a "Password must be 8+ characters..." hint works.
export const SKU_FORMAT_HINT =
  "3–25 characters. Letters, numbers, hyphens, and underscores only — must start and end with a letter or number.";

// sanitizeSkuValue — applied on every keystroke so the input always
// shows the final, stored format as the admin types, instead of
// correcting it only after they submit.
// - Removes every space (leading, trailing, and in the middle)
// - Converts to uppercase
export const sanitizeSkuValue = (rawValue) =>
  (rawValue ?? "").toUpperCase().replace(/\s+/g, "");

// validateSku — runs the full rule set against an already-sanitized
// value and returns the first broken rule's message, or null if the
// SKU is fully valid. Checked in the order a person would naturally
// read them: existence, length, then format.
export const validateSku = (value) => {
  const sku = sanitizeSkuValue(value);

  if (!sku) {
    return "SKU is required.";
  }

  if (sku.length < SKU_MIN_LENGTH) {
    return `SKU must be at least ${SKU_MIN_LENGTH} characters.`;
  }

  if (sku.length > SKU_MAX_LENGTH) {
    return `SKU cannot be longer than ${SKU_MAX_LENGTH} characters.`;
  }

  if (CONSECUTIVE_SPECIAL_CHARS_REGEX.test(sku)) {
    return "SKU cannot contain consecutive hyphens or underscores.";
  }

  if (!/[A-Z0-9]/.test(sku)) {
    return "SKU must contain at least one letter or number.";
  }

  if (!SKU_REGEX.test(sku)) {
    return "SKU can only contain letters, numbers, hyphens, and underscores, and must start and end with a letter or number.";
  }

  if (RESERVED_SKU_WORDS.includes(sku)) {
    return `"${sku}" is a reserved word and cannot be used as a SKU.`;
  }

  return null;
};
