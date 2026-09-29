// ============================================================
// Review profile picture validation
// ============================================================
// Shared rules for the optional profile picture that can be attached to
// a product review. The same rules are enforced by the server; checking
// them here as well lets the customer see a problem immediately, before
// anything is uploaded.
//
// Accepted: JPG, PNG or WEBP images, at most 2 MB.

export const REVIEW_PICTURE_MAX_BYTES = 2 * 1024 * 1024;

export const REVIEW_PICTURE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Value for the "accept" attribute of the file input.
export const REVIEW_PICTURE_ACCEPT_ATTRIBUTE =
  REVIEW_PICTURE_ACCEPTED_TYPES.join(",");

export const REVIEW_PICTURE_HINT = "JPG, PNG or WEBP, up to 2 MB.";

// Returns an error message for an unacceptable file, or null when the
// file can be uploaded.
export const validateReviewPicture = (file) => {
  if (!file) return null;

  if (!REVIEW_PICTURE_ACCEPTED_TYPES.includes(file.type)) {
    return "Profile picture must be a JPG, PNG or WEBP image.";
  }

  if (file.size > REVIEW_PICTURE_MAX_BYTES) {
    return "Profile picture must be 2 MB or smaller.";
  }

  return null;
};
