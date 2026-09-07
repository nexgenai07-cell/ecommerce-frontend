// Shared email validation used by every email field across the app
// (Login, Register, Checkout, Forgot Password, Reactivate Account, etc.)
// so all forms enforce exactly the same rules and error message.
//
// On top of the basic "has an @ and a domain" shape, this regex enforces:
//
// 1. No consecutive special characters in the local part (before the @)
//    — things like "john..doe@x.com", "john--doe@x.com", "john++doe@x.com"
//    are rejected. A special char (. _ + -) must always be surrounded by
//    at least one letter/digit on both sides.
//
// 2. The local part can't START or END with a special character
//    — ".john@x.com", "john.@x.com", "-john@x.com", "john_@x.com" are
//    all rejected; it must start and end with a letter or digit.
//
// 3. The domain must be a properly formatted set of dot-separated labels,
//    each made of letters/digits (hyphens allowed only between them, not
//    consecutive and not leading/trailing), ending in a TLD of at least
//    2 letters — so "john@x..com", "john@-x.com", "john@x.c" are rejected.
export const EMAIL_REGEX =
  /^[A-Za-z0-9]+(?:[._+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.)+[A-Za-z]{2,}$/;

export const EMAIL_INVALID_MESSAGE = "Please enter a valid email address";

// Plain helper for places that need a quick boolean check outside of a
// zod schema (e.g. inline onBlur checks, non-form validation).
export const isValidEmail = (value) => EMAIL_REGEX.test(value ?? "");
