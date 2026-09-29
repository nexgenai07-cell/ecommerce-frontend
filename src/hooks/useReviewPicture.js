// ============================================================
// useReviewPicture - CUSTOM HOOK
// ============================================================
// Holds the profile picture a customer has chosen for a review, together
// with a temporary browser URL used to preview it before upload.
//
// The preview URL is created when a picture is selected and released as
// soon as it is replaced, cleared, or the component using this hook is
// removed, so no preview memory is left behind.
//
// Returns:
//   picture       - null, or { file, previewUrl }
//   selectPicture - (file) => void, stores a new picture
//   clearPicture  - () => void, discards the current picture

import { useCallback, useEffect, useRef, useState } from "react";

const useReviewPicture = () => {
  const [picture, setPicture] = useState(null);
  const previewUrlRef = useRef(null);

  const releasePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const selectPicture = useCallback(
    (file) => {
      releasePreviewUrl();
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      setPicture({ file, previewUrl });
    },
    [releasePreviewUrl],
  );

  const clearPicture = useCallback(() => {
    releasePreviewUrl();
    setPicture(null);
  }, [releasePreviewUrl]);

  // Release the preview URL when the component using this hook goes away.
  useEffect(() => releasePreviewUrl, [releasePreviewUrl]);

  return { picture, selectPicture, clearPicture };
};

export default useReviewPicture;
