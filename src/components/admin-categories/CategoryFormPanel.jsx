// React hooks: a ref for the hidden file input and state for the image and status
import { useRef, useState } from "react";
// Form state management with schema based validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// TanStack Query hooks for the save request and cache refresh
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Icons used by the image upload zone
import { AiOutlineCloudUpload, AiOutlineClose } from "react-icons/ai";

// Category API calls used by the form
// checkCategoryNameExists powers the live duplicate-name check
import {
  createCategory,
  updateCategory,
  checkCategoryNameExists,
} from "../../api/categories.api";
// Runs an availability check when a field loses focus
import useFieldAvailabilityCheck from "../../hooks/useFieldAvailabilityCheck";
// Central registry of TanStack Query cache keys
import { QUERY_KEYS } from "../../constants/queryKeys";
// Extracts the exact message the backend returned for a failed request,
// whichever field or key it was reported under
import getApiErrorMessage from "../../utils/getApiErrorMessage";
// Toast helpers for success and error feedback
import { showSuccess, showError } from "../ui/Toast";
// Shared UI building blocks
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Toggle from "../ui/Toggle";
import Button from "../ui/Button";

// Client-side guard rails for the image field — checked BEFORE upload
// so the admin gets instant feedback instead of waiting for a 400 from
// the backend. Kept local to this file since a category only ever has
// ONE image (unlike ProductImagesSection's multi-image gallery).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
// Image formats the backend accepts
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Validation schema — only the two real text fields go through
// react-hook-form/zod. The image is handled by its own local state
// below since a File object isn't a normal form input value.
const categorySchema = z.object({
  // Required, trimmed name with a sensible upper limit
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name is too long"),
  // Optional description with an upper limit
  description: z.string().trim().max(500, "Description is too long").optional(),
});

// isOpen         — whether the modal is visible.
// activeCategory — the category being edited, or null in create mode.
// onClose        — called to hide the modal.
// onCreated      — optional; called with the newly created category (the
//   raw response body) right after a successful create, in create mode
//   only. It lets a caller such as the product form's category dropdown
//   select the category it just added. Callers that do not pass it get
//   no extra behaviour (for example CategoryManagement's add/edit flow).
const CategoryFormPanel = ({ isOpen, activeCategory, onClose, onCreated }) => {
  // Gives access to the shared query cache for refreshing lists
  const queryClient = useQueryClient();

  // Whether we're editing an existing category vs creating a new one —
  // drives the modal title, button labels, and which API function fires
  const isEditMode = !!activeCategory;

  // Ref to the hidden native <input type="file"> — lets the visible
  // drop-zone/preview box open the OS file picker programmatically
  const fileInputRef = useRef(null);

  // --------------------------------------------------
  // IMAGE STATE
  // --------------------------------------------------
  // Kept separate from react-hook-form because it isn't a plain text
  // value — it needs a real File object, a URL to preview, AND an
  // explicit "removed" flag so the API layer can tell the difference
  // between "nothing changed" and "the admin cleared it on purpose".
  // All three read their starting value straight from activeCategory
  // since this component gets a fresh "key" every time it's opened,
  // instead of syncing via useEffect.
  // The newly-picked File object, or null if no new file was chosen
  const [imageFile, setImageFile] = useState(null);

  // Whatever should currently be shown in the preview box — starts as
  // the existing category's image URL (edit mode) or null (add mode)
  const [previewUrl, setPreviewUrl] = useState(
    () => activeCategory?.image || null,
  );

  // True only when editing AND the admin clicked "Remove" without
  // picking a replacement — tells the API layer to send image: null
  const [imageRemoved, setImageRemoved] = useState(false);

  // Purely visual — highlights the drop-zone border while a file is
  // being dragged over it
  const [isDragging, setIsDragging] = useState(false);

  // Inline message shown under the image field when the admin tries to
  // save without an image. The image is compulsory, so the form is never
  // sent to the backend while it is missing.
  const [imageError, setImageError] = useState("");

  // --------------------------------------------------
  // ACTIVE / INACTIVE STATE (edit mode only)
  // --------------------------------------------------
  // The status the category had when the form opened. A category whose
  // status is missing is treated as active.
  const initialIsActive = activeCategory?.is_active !== false;
  // The status currently chosen with the switch
  const [isActive, setIsActive] = useState(initialIsActive);

  // react-hook-form instance for the two text fields
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    // Live validation (industry-standard pattern, same one Gmail/Amazon/
    // most production sites use): a field is left completely alone while
    // the user is still typing into it for the first time -- no error,
    // no matter how invalid the in-progress value looks. The first check
    // happens on "blur", i.e. the moment the user leaves that field
    // (Tab key or clicking elsewhere) -- mode: "onTouched" below. From
    // that point on, react-hook-form's default reValidateMode ("onChange")
    // takes over automatically: if the field was invalid, it re-checks on
    // every keystroke so the error clears the instant the value becomes
    // valid, without needing another blur.
    mode: "onTouched",
    // Pre-fills the fields with the existing values in edit mode
    defaultValues: {
      name: activeCategory?.name || "",
      description: activeCategory?.description || "",
    },
  });

  // Real-time "already exists" check — fires on blur of the Category Name
  // field. excludeId is only passed in edit mode, so saving a category with
  // its own unchanged name never flags it as a duplicate of itself.
  const { checkOnBlur: checkNameOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkCategoryNameExists,
    fieldName: "name",
    message: "A category with this name already exists.",
    excludeId: isEditMode ? activeCategory.id : undefined,
    setError,
    clearErrors,
  });

  // Captured separately so its own onBlur can be chained with the
  // duplicate-name check above.
  const nameField = register("name");

  // --------------------------------------------------
  // SAVE MUTATION — handles both create and update
  // --------------------------------------------------
  const saveMutation = useMutation({
    // Builds the request body and calls the matching API function
    mutationFn: (formValues) => {
      // Translate the three image states into what categories.api.js
      // expects: a File (new upload), null (explicit removal), or
      // undefined (leave untouched)
      const imagePayload = imageFile
        ? imageFile
        : imageRemoved
          ? null
          : undefined;

      // Text fields plus the image state
      const payload = { ...formValues, image: imagePayload };

      // The status is sent only when the admin actually changed it. When
      // it is left out, the backend keeps the category's current status,
      // so saving the form can never overwrite a status that was changed
      // somewhere else in the meantime.
      if (isEditMode && isActive !== initialIsActive) {
        payload.is_active = isActive;
      }

      // Update an existing category or create a new one
      return isEditMode
        ? updateCategory(activeCategory.id, payload)
        : createCategory(payload);
    },
    // Runs after the backend accepted the request
    onSuccess: (response) => {
      // Refetches the categories list so the table/stats immediately
      // reflect the new or updated category — same invalidation key
      // CategoryManagement's delete flow already uses
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
      // Confirm the save to the admin
      showSuccess(isEditMode ? "Category updated." : "Category created.");
      // Hand a newly created category to the optional caller callback
      if (!isEditMode) onCreated?.(response.data);
      // Close the modal
      onClose();
    },
    // Runs when the backend rejected the request
    onError: (error) => {
      // Show the backend's own message exactly as it was returned, whether
      // it is reported under a general key or under a specific field such
      // as name, image or is_active. The generic text is only a last
      // resort for failures that carry no readable message (for example a
      // network error).
      showError(getApiErrorMessage(error, "Failed to save category."));
    },
  });

  // True while the category has no image at all: nothing was picked and
  // the existing image (edit mode) was removed or never existed. The
  // preview URL is set exactly when an image is present.
  const isImageMissing = !previewUrl;

  // Starts the save with the validated text fields. The image is
  // compulsory, so a missing image blocks the save and shows an inline error.
  const onSubmit = (formValues) => {
    // Refuse to save without an image
    if (isImageMissing) {
      setImageError("Category image is required.");
      return;
    }
    // Everything is valid, so send the request
    saveMutation.mutate(formValues);
  };

  // Runs when the text fields fail validation. The image error is still
  // shown at the same time, so the admin sees every missing field at once.
  const onInvalid = () => {
    // Flag the image field when it is empty
    if (isImageMissing) setImageError("Category image is required.");
  };

  // --------------------------------------------------
  // IMAGE HANDLERS
  // --------------------------------------------------
  // Validates a chosen file and, when acceptable, shows it as the preview
  const applySelectedFile = (file) => {
    // Reject unsupported file types before ever touching the network
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    // Reject oversized files client-side too — instant feedback
    // instead of waiting on a slow upload that fails at the end
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError("Image must be under 5MB.");
      return;
    }

    // Release the previous local preview's blob URL before replacing
    // it, so switching files twice doesn't leak the first blob
    if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);

    // A valid image is now present, so the missing-image error no longer applies
    setImageError("");
    // Keep the real file for the upload
    setImageFile(file);
    // Show a local preview of the file
    setPreviewUrl(URL.createObjectURL(file));
    // Picking a new file cancels any pending "remove" from earlier
    // in this same session
    setImageRemoved(false);
  };

  // Handles a file chosen through the native file picker
  const handleFileInputChange = (e) => {
    // Use the first selected file, when there is one
    if (e.target.files?.[0]) applySelectedFile(e.target.files[0]);
    // Clears the input's internal value so selecting the SAME file
    // again later still fires the onChange event
    e.target.value = "";
  };

  // Handles a file dropped onto the upload zone
  const handleDrop = (e) => {
    // Stop the browser from opening the dropped file
    e.preventDefault();
    // The drag is over, so remove the highlight
    setIsDragging(false);
    // Use the first dropped file, when there is one
    if (e.dataTransfer.files?.[0]) applySelectedFile(e.dataTransfer.files[0]);
  };

  // Clears the current image so it is removed on save
  const handleRemoveImage = () => {
    // Release the local preview's blob URL
    if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    // Forget any newly picked file
    setImageFile(null);
    // Hide the preview
    setPreviewUrl(null);
    // Marks this for explicit clearing on submit — see saveMutation
    setImageRemoved(true);
  };

  return (
    // Modal shell; the title shows the category name in edit mode
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditMode
          ? `Edit Category: ${activeCategory.name}`
          : "Add New Category"
      }
      size="md"
    >
      {/* The form; handleSubmit runs validation before onSubmit */}
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-4"
      >
        {/* Category ID badge — edit mode only, for quick reference */}
        {isEditMode && (
          <span className="text-xs text-gray-400 -mt-2">
            ID: #{activeCategory.id}
          </span>
        )}

        {/* Category name with duplicate-name check on blur */}
        <Input
          id="category-name"
          label="Category Name"
          required
          placeholder="e.g. Electronics"
          {...nameField}
          onBlur={(e) => {
            nameField.onBlur(e); // Keep react-hook-form's own per-field validation
            checkNameOnBlur(e.target.value); // Then run the duplicate-name check
          }}
          error={errors.name?.message}
        />

        {/* Optional description shown to customers */}
        <Textarea
          id="category-description"
          label="Description"
          rows={4}
          placeholder="Short description shown to customers while browsing"
          {...register("description")}
          error={errors.description?.message}
        />

        {/* Active / Inactive switch — edit mode only. A new category is
            created with the backend's default status. */}
        {isEditMode && (
          <Toggle
            id="category-is-active"
            label="Active"
            hint="Inactive categories are hidden from customers but stay visible here."
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        )}

        {/* -------------------------------------------------- */}
        {/* CATEGORY IMAGE — single-image upload with preview   */}
        {/* -------------------------------------------------- */}
        <div className="flex flex-col gap-1.5">
          {/* Field label with the red asterisk that marks the image as compulsory */}
          <label className="text-sm font-medium text-gray-700">
            Category Image
            <span className="text-danger ml-1">*</span>
          </label>

          {previewUrl ? (
            // An image is either currently set or was just picked —
            // show it with a hover "remove" control instead of the
            // drop zone
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-100 group">
              {/* The preview image */}
              <img
                src={previewUrl}
                alt="Category"
                className="w-full h-full object-cover"
              />
              {/* Remove button revealed on hover */}
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-danger"
                aria-label="Remove image"
                title="Remove image"
              >
                <AiOutlineClose className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            // No image set yet — show the drag-and-drop / click-to-browse zone
            <div
              onDragOver={(e) => {
                // Allow dropping by cancelling the default handling
                e.preventDefault();
                // Highlight the zone while a file hovers over it
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl py-6 px-4 cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary-50"
                  : imageError
                    ? "border-danger bg-gray-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              {/* Upload icon */}
              <AiOutlineCloudUpload className="w-6 h-6 text-gray-400" />
              {/* Instruction text */}
              <p className="text-xs text-gray-600 text-center">
                Drag & drop, or{" "}
                <span className="text-primary font-medium">browse</span>
              </p>
              {/* Accepted formats and size limit */}
              <p className="text-[11px] text-gray-400">
                JPG, PNG, or WEBP — max 5MB
              </p>
            </div>
          )}

          {/* Hidden native file input — triggered programmatically via
              fileInputRef so we can fully control the visible UI above */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Inline error shown when the admin tries to save without an image */}
          {imageError && <p className="text-xs text-danger">{imageError}</p>}
        </div>

        {/* Cancel and save buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {/* Closes the modal without saving */}
          <Button type="button" variant="secondary" onClick={onClose}>
            {isEditMode ? "Discard Changes" : "Cancel"}
          </Button>
          {/* Validates the form and saves the category */}
          <Button
            type="submit"
            variant="primary"
            isLoading={saveMutation.isPending}
          >
            {isEditMode ? "Save Category" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormPanel;
