import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineArrowUpTray,
  HiOutlineTrash,
  HiOutlineQrCode,
} from "react-icons/hi2";
import {
  getAdminQrImage,
  uploadAdminQrImage,
  removeAdminQrImage,
} from "../../api/payments.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

// The backend rejects anything larger than 5 MB, so the same limit is
// checked here to give the admin an instant message before uploading.
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * QrImageManagerModal
 *
 * Lets an admin view, upload, replace and remove the store's payment QR
 * image — the image customers scan on the QR payment screen at checkout.
 * While no custom image is uploaded, customers are shown a default sample
 * image instead, which this modal flags with a "Default sample" badge.
 *
 * Props:
 * - isOpen:  Whether the modal is visible. The image is only fetched while
 *            it is open.
 * - onClose: () => void.
 */
const QrImageManagerModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // The file the admin has picked but not uploaded yet, plus its local
  // preview URL.
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  // Revokes the previous local preview URL whenever a new one is created
  // (or the modal unmounts), so the browser does not keep an ever-growing
  // list of unused object URLs in memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_QR_IMAGE,
    queryFn: ({ signal }) => getAdminQrImage(signal),
    enabled: isOpen,
  });

  const qrImage = response?.data;

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Writes the image the backend just returned straight into the cache, and
  // refreshes the copy customers see at checkout.
  const syncCaches = (updatedResponse) => {
    queryClient.setQueryData(QUERY_KEYS.ADMIN_QR_IMAGE, updatedResponse);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.QR_STORE_IMAGE });
  };

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadAdminQrImage(file),
    onSuccess: (updatedResponse) => {
      syncCaches(updatedResponse);
      clearSelection();
      showSuccess("Payment QR image saved.");
    },
    onError: (error) => {
      showError(
        getApiErrorMessage(
          error,
          "Failed to upload the QR image. Please try again.",
        ),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeAdminQrImage(),
    onSuccess: (updatedResponse) => {
      syncCaches(updatedResponse);
      setIsConfirmingRemove(false);
      showSuccess("Custom QR image removed. The default sample is shown.");
    },
    onError: (error) => {
      showError(
        getApiErrorMessage(
          error,
          "Failed to remove the QR image. Please try again.",
        ),
      );
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    // Resetting the input's value lets the admin pick the exact same file
    // again later and still have the change event fire.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showError("Image is too large — please choose a file under 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsConfirmingRemove(false);
  };

  const handleClose = () => {
    if (uploadMutation.isPending || removeMutation.isPending) return;
    clearSelection();
    setIsConfirmingRemove(false);
    onClose();
  };

  const isBusy = uploadMutation.isPending || removeMutation.isPending;
  const displayedSrc = previewUrl || qrImage?.qr_image_url;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Payment QR Image"
      size="sm"
      closeOnBackdrop={!isBusy}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Customers scan this QR code at checkout to pay, then upload a
          screenshot as proof. Uploading a new image replaces the current one.
        </p>

        {isLoading && (
          <div className="w-48 h-48 mx-auto rounded-xl bg-gray-100 animate-pulse" />
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-sm text-danger">
              Couldn't load the current QR image.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-48 rounded-xl border border-gray-200 p-3 bg-white flex items-center justify-center">
              {displayedSrc ? (
                <img
                  src={displayedSrc}
                  alt="Payment QR code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <HiOutlineQrCode className="w-12 h-12 text-gray-300" />
              )}
            </div>

            {selectedFile ? (
              <Badge
                label="Not saved yet"
                variant="warning"
                size="sm"
                rounded
              />
            ) : (
              qrImage?.is_default && (
                <Badge
                  label="Default sample"
                  variant="gray"
                  size="sm"
                  rounded
                />
              )
            )}

            {qrImage?.is_default && !selectedFile && (
              <p className="text-xs text-gray-500 text-center max-w-xs">
                No QR image has been uploaded yet. Customers are told the
                payment QR is unavailable until you upload one.
              </p>
            )}
            {selectedFile && (
              <p className="text-xs text-gray-500 text-center max-w-xs truncate">
                {selectedFile.name}
              </p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {isConfirmingRemove ? (
          <div className="flex flex-col gap-3 rounded-xl border border-danger/20 bg-danger-light/30 p-3">
            <p className="text-sm text-gray-700">
              Remove the custom QR image? Customers will no longer be able to
              pay by QR until you upload a new one.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmingRemove(false)}
                disabled={removeMutation.isPending}
              >
                Keep Image
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeMutation.mutate()}
                isLoading={removeMutation.isPending}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isLoading &&
              !isError &&
              !qrImage?.is_default &&
              !selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<HiOutlineTrash className="w-4 h-4" />}
                  onClick={() => setIsConfirmingRemove(true)}
                  disabled={isBusy}
                >
                  Remove
                </Button>
              )}

            {selectedFile ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<HiOutlineArrowUpTray className="w-4 h-4" />}
                  onClick={() => uploadMutation.mutate(selectedFile)}
                  isLoading={uploadMutation.isPending}
                >
                  Save QR Image
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<HiOutlineArrowUpTray className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isError || isBusy}
              >
                {qrImage?.is_default ? "Upload QR Image" : "Replace QR Image"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QrImageManagerModal;
