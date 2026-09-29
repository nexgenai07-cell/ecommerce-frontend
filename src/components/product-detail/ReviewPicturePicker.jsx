// ============================================================
// REVIEW PICTURE PICKER
// ============================================================
// The optional "profile picture" control of the write / edit review
// form. It shows a round preview, lets the customer choose an image
// file, and lets them discard a picture they have just chosen.
//
// The chosen file is checked against the accepted types and the size
// limit before it is handed to the parent, so an unacceptable file is
// reported immediately and nothing is uploaded.
//
// Props:
//   previewUrl - temporary URL of the newly chosen file, or null
//   currentUrl - the picture already saved on the review (edit mode),
//                shown while no new file has been chosen
//   onSelect   - (file) => void, called with a valid file
//   onInvalid  - (message) => void, called with the reason a file was
//                rejected
//   onRemove   - () => void, discards the newly chosen file
//   error      - message shown under the control
//   disabled   - disables every control while a request is running

import { useRef } from "react";
import { AiOutlineCamera } from "react-icons/ai";

import {
  REVIEW_PICTURE_ACCEPT_ATTRIBUTE,
  REVIEW_PICTURE_HINT,
  validateReviewPicture,
} from "../../utils/reviewPictureValidation";

const ReviewPicturePicker = ({
  previewUrl = null,
  currentUrl = null,
  onSelect,
  onInvalid,
  onRemove,
  error = "",
  disabled = false,
}) => {
  const fileInputRef = useRef(null);

  // The newly chosen file always wins over the picture already saved.
  const displayedUrl = previewUrl || currentUrl;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    // Clear the input so choosing the same file again still fires a
    // change event.
    event.target.value = "";

    if (!file) return;

    const validationMessage = validateReviewPicture(file);
    if (validationMessage) {
      onInvalid(validationMessage);
      return;
    }

    onSelect(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Profile Picture (optional)
      </p>

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {displayedUrl ? (
            <img
              src={displayedUrl}
              alt="Selected profile"
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <AiOutlineCamera className="w-6 h-6 text-gray-300" />
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {displayedUrl ? "Change picture" : "Add picture"}
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="text-xs font-medium text-gray-500 hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">{REVIEW_PICTURE_HINT}</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={REVIEW_PICTURE_ACCEPT_ATTRIBUTE}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose a profile picture"
      />

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};

export default ReviewPicturePicker;
