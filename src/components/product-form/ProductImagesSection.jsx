import { useRef, useState } from "react";
import {
  AiOutlineCloudUpload,
  AiOutlineClose,
  AiOutlineStar,
  AiOutlinePicture,
} from "react-icons/ai";

import Badge from "../ui/Badge";
import { showError } from "../ui/Toast";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — see FLAG note above
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 10;

const ProductImagesSection = ({
  images = [], // Array of { key, url, isPrimary } — normalized shape regardless of create/edit mode
  onAddFiles, // Called with a FileList when files are dropped/browsed
  onRemoveImage, // Called with an image's `key` when its delete button is clicked
  onSetPrimary, // Called with an image's `key` when "Set as Primary" is clicked
  isBusy = false, // True while an upload/delete/set-primary request is in flight (edit mode)
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndForward = (fileList) => {
    const files = Array.from(fileList);

    if (images.length + files.length > MAX_IMAGES) {
      showError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE_BYTES,
    );

    if (invalidFile) {
      showError(
        `${invalidFile.name} isn't a valid image. Only JPG, PNG, or WEBP under 5MB are allowed.`,
      );
      return;
    }

    onAddFiles(files);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) {
      validateAndForward(e.target.files);
    }
    e.target.value = ""; // reset so selecting the exact same file twice still fires onChange
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      validateAndForward(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <AiOutlinePicture className="w-4.5 h-4.5" />
          </span>
          <h2 className="text-base font-semibold text-gray-900">
            Product Images
          </h2>
        </div>
        <span className="text-xs text-gray-400">
          {images.length}/{MAX_IMAGES} uploaded
        </span>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      >
        <AiOutlineCloudUpload className="w-8 h-8 text-gray-400" />
        <p className="text-sm text-gray-600 text-center">
          Drag and drop images here, or{" "}
          <span className="text-primary font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-400">
          Supports JPG, PNG, WEBP (Max 5MB each)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Thumbnail grid — 2 columns on very small phones, 3 on small
          screens, and 4 columns from the sm breakpoint upward, so
          thumbnails never get squeezed too small on narrow devices */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((image) => (
            <div
              key={image.key}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group"
            >
              <img
                src={image.url}
                alt="Product"
                className="w-full h-full object-cover"
              />

              {/* Primary badge — top-left, only on the primary image */}
              {image.isPrimary && (
                <div className="absolute top-1.5 left-1.5">
                  <Badge label="Primary" variant="success" size="sm" rounded />
                </div>
              )}

              {/* Hover overlay actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSetPrimary(image.key)}
                    className="w-7 h-7 rounded-full bg-white text-gray-700 flex items-center justify-center hover:text-primary disabled:opacity-50"
                    aria-label="Set as primary image"
                    title="Set as primary"
                  >
                    <AiOutlineStar className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemoveImage(image.key)}
                  className="w-7 h-7 rounded-full bg-white text-gray-700 flex items-center justify-center hover:text-danger disabled:opacity-50"
                  aria-label="Remove image"
                  title="Remove"
                >
                  <AiOutlineClose className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImagesSection;
