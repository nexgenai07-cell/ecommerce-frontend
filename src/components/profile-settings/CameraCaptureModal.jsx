import { useEffect, useRef, useState } from "react";
import { HiOutlineCamera, HiOutlineArrowPath } from "react-icons/hi2";
import Modal from "../ui/Modal";

// ============================================================
// CameraCaptureModal
// ============================================================
// Opens the user's actual camera (front-facing webcam on desktop,
// the device camera on mobile) inside a live preview, and lets them
// snap a photo. This is used instead of a plain file input with the
// "capture" attribute, because that attribute only opens the native
// camera app on mobile browsers — on desktop it's silently ignored
// and the browser just opens the regular file picker, which is why
// "Take Photo" was opening the upload dialog instead of the camera.
//
// The captured frame is handed back to the caller as a real File
// object (onCapture), so it can be treated exactly the same way as
// a file the user picked from their gallery.

const CameraCaptureModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Holds the active MediaStream so its tracks can be stopped later

  const [facingMode, setFacingMode] = useState("environment"); // "environment" = back camera, "user" = front camera
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Stops every track on the current stream — releasing the camera
  // so the browser's "camera in use" indicator turns off and the
  // device is free for other apps/tabs to use it.
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Requests camera access and attaches the resulting stream to the
  // <video> element for a live preview.
  const startCamera = async (mode) => {
    stopCamera(); // Release any previous stream first — required when switching cameras
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        "Unable to access the camera. Please check your browser's camera permissions and try again.",
      );
    }
  };

  // Starts the camera the moment the modal opens, and always
  // releases it again when the modal closes or unmounts — a camera
  // left running in the background is both a privacy concern and a
  // drain on the device.
  useEffect(() => {
    if (isOpen) {
      // Requesting camera access is inherently asynchronous — the
      // permission prompt and the stream itself both resolve later —
      // so starting it here is a genuine "synchronize with an
      // external system" effect, not a same-render state update.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCamera(facingMode);

      // Checks whether the device actually has more than one camera
      // before showing the "flip camera" option — no point offering
      // it on a desktop with a single built-in webcam.
      navigator.mediaDevices
        ?.enumerateDevices?.()
        .then((devices) => {
          const videoInputs = devices.filter(
            (device) => device.kind === "videoinput",
          );
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {
          // If the browser can't list devices, simply keep the flip
          // option hidden rather than showing something that might not work.
        });
    } else {
      stopCamera();
    }

    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleFlipCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Draws the current video frame onto an off-screen canvas, then
  // converts that canvas into a real JPEG File — the same shape the
  // rest of the avatar-upload flow already expects from a gallery pick.
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92, // Quality — high enough to look sharp, small enough to upload quickly
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Take Photo" size="md">
      <div className="flex flex-col gap-4">
        {cameraError ? (
          // Camera permission denied, no camera found, or the device
          // doesn't support this API at all.
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-danger">{cameraError}</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Live camera preview */}
            <div className="relative w-full aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Off-screen canvas used only to grab a still frame — never shown to the user */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-center gap-3">
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  aria-label="Switch camera"
                  className="w-11 h-11 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <HiOutlineArrowPath className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleCapture}
                className="
                  flex items-center gap-2 px-6 py-3 bg-linear-to-r from-primary to-primary-dark
                  text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25
                  hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
                  active:scale-[0.98] active:translate-y-0 transition-all duration-200
                "
              >
                <HiOutlineCamera className="w-4 h-4" />
                Capture
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CameraCaptureModal;
