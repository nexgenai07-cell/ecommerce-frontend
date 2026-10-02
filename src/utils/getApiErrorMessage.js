// ============================================================
// getApiErrorMessage - UTILITY FUNCTION
// ============================================================
// Pulls one human-readable message out of a failed axios request so the
// customer or admin sees the backend's own explanation instead of a
// generic "something went wrong" text.
//
// The backend reports failures in several shapes depending on the endpoint:
//   "message"                                  -> bare string body
//   ["message", ...]                           -> bare list body (validators)
//   { error: "message" }                       -> most action endpoints
//   { detail: "message" }                      -> authentication / permission / throttling
//   { message: "message" }                     -> a few legacy endpoints
//   { non_field_errors: ["message"] }          -> serializer-level validation
//   { field_name: ["message", ...] }           -> serializer field validation
//   { field_name: { nested: ["message"] } }    -> nested serializer validation
//
// The first readable message found, in that order, is returned. When the
// response carries no usable text the message depends on what went wrong:
// connection problems, timeouts, oversized uploads, throttling and server
// failures each get a clear explanation, and anything else gets the
// caller's fallback text.
//
// error    - the error thrown by axios.
// fallback - the text to show when nothing more specific could be found.

const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

// Keys that carry the message itself, checked before any field-specific key.
const PRIMARY_KEYS = ["error", "detail", "message", "non_field_errors", "errors"];

// Keys that describe the response rather than explain a failure.
const META_KEYS = new Set([
  "code",
  "status",
  "success",
  "coupon_removed",
  "retry_after_seconds",
  "session_key",
  "otp_required",
  "email_not_verified",
  "account_deactivated",
  "phone_verification_required",
]);

// Validation messages such as "This field is required." make no sense
// without the name of the field they refer to.
const FIELD_DEPENDENT_MESSAGE = /\bthis (field|value)\b|^a valid \w+ is required|^ensure /i;

// Longest backend text still treated as a readable message.
const MAX_MESSAGE_LENGTH = 400;
// Detects an HTML document, such as the error page a proxy returns.
const HTML_BODY = /^<(!doctype|html|head|body)/i;
// "phone_number" -> "Phone number"
const humanizeFieldName = (key) => {
  const words = String(key).replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
};

// Walks a response value and returns the first readable message in it.
// fieldName is the key the value was found under, when it is a field key.
const findMessage = (value, fieldName = "") => {
  if (typeof value === "string") {
    const text = value.trim();
    // Empty text, an HTML error page or a long dump is not a message to show.
    if (!text || text.length > MAX_MESSAGE_LENGTH || HTML_BODY.test(text)) {
      return "";
    }
    return fieldName && FIELD_DEPENDENT_MESSAGE.test(text)
      ? `${humanizeFieldName(fieldName)}: ${text}`
      : text;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = findMessage(item, fieldName);
      if (text) return text;
    }
    return "";
  }

  if (value && typeof value === "object") {
    const orderedKeys = [
      ...PRIMARY_KEYS.filter((key) => key in value),
      ...Object.keys(value).filter(
        (key) => !PRIMARY_KEYS.includes(key) && !META_KEYS.has(key),
      ),
    ];

    for (const key of orderedKeys) {
      const isPrimary = PRIMARY_KEYS.includes(key);
      const text = findMessage(value[key], isPrimary ? fieldName : key);
      if (text) return text;
    }
  }

  return "";
};

const getApiErrorMessage = (error, fallback = DEFAULT_FALLBACK) => {
  const response = error?.response;

  // The request never produced a response: the connection dropped, the
  // server is unreachable or the request was aborted.
  if (!response) {
    if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
      return "The request took too long. Please check your connection and try again.";
    }
    if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
      return "Unable to reach the server. Please check your internet connection and try again.";
    }
    return fallback;
  }

  const backendMessage = findMessage(response.data);
  if (backendMessage) return backendMessage;

  // No readable text in the body (an HTML error page from a proxy, an empty
  // body, a Blob): fall back to what the status code itself tells us.
  const status = response.status;
  if (status === 413) {
    return "The file you selected is too large to upload. Please choose a smaller file.";
  }
  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (status >= 500) {
    return "The server ran into a problem. Please try again in a moment.";
  }

  return fallback;
};

// Returns the first message the backend attached to one specific field
// (for example "sku" or "phone"), or null when the error was not about it.
export const getApiFieldError = (error, fieldName) => {
  const fieldValue = error?.response?.data?.[fieldName];
  if (fieldValue === undefined || fieldValue === null) return null;
  return findMessage(fieldValue, fieldName) || null;
};

export default getApiErrorMessage;
