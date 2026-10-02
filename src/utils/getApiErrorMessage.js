// ============================================================
// getApiErrorMessage - UTILITY FUNCTION
// ============================================================
// Pulls one human-readable message out of a failed axios request.
//
// The backend reports failures in a few different shapes depending on
// the endpoint:
//   { error: "message" }                      -> most action endpoints
//   { detail: "message" }                     -> authentication/permission
//   { message: "message" }                    -> a few legacy endpoints
//   { field_name: "message" }                 -> single-message validation
//   { field_name: ["message", ...] }          -> serializer validation
//
// The first readable message found, in that order, is returned. When the
// response carries no usable text (a network failure, an HTML error
// page from a proxy, an empty body) the fallback is returned instead.
//
// error    - the error thrown by axios.
// fallback - the text to show when nothing readable could be found.
const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") {
    // A proxy / web server can reject an oversized upload with a plain
    // HTML 413 page that carries no readable message from the backend.
    if (error?.response?.status === 413) {
      return "The file you selected is too large to upload. Please choose a smaller file.";
    }
    return fallback;
  }

  const candidates = [
    data.error,
    data.detail,
    data.message,
    ...Object.values(data),
  ];

  for (const candidate of candidates) {
    const text = Array.isArray(candidate)
      ? candidate.find((item) => typeof item === "string")
      : candidate;

    if (typeof text === "string" && text.trim()) return text;
  }

  return fallback;
};

export default getApiErrorMessage;
