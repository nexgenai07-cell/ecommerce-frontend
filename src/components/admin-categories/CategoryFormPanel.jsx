import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineCloudUpload, AiOutlineClose } from "react-icons/ai";

import {
  createCategory,
  updateCategory,
  checkCategoryNameExists,
} from "../../api/categories.api";
// checkCategoryNameExists — API 24.1
import useFieldAvailabilityCheck from "../../hooks/useFieldAvailabilityCheck";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";

// Client-side guard rails for the image field — checked BEFORE upload
// so the admin gets instant feedback instead of waiting for a 400 from
// the backend. Kept local to this file since a category only ever has
// ONE image (unlike ProductImagesSection's multi-image gallery).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Validation schema — only the two real text fields go through
// react-hook-form/zod. The image is handled by its own local state
// below since a File object isn't a normal form input value.
const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
});

const CategoryFormPanel = ({ isOpen, activeCategory, onClose }) => {
  const queryClient = useQueryClient();

  const isEditMode = !!activeCategory;
  // Whether we're editing an existing category vs creating a new one —
  // drives the modal title, button labels, and which API function fires

  const fileInputRef = useRef(null);
  // Ref to the hidden native <input type="file"> — lets the visible
  // drop-zone/preview box open the OS file picker programmatically

  // --------------------------------------------------
  // IMAGE STATE
  // --------------------------------------------------
  // Kept separate from react-hook-form because it isn't a plain text
  // value — it needs a real File object, a URL to preview, AND an
  // explicit "removed" flag so the API layer can tell the difference
  // between "nothing changed" and "the admin cleared it on purpose".
  // All three read their starting value straight from activeCategory
  // since this component gets a fresh "key" (see file header) every
  // time it's opened, instead of syncing via useEffect.
  const [imageFile, setImageFile] = useState(null);
  // The newly-picked File object, or null if no new file was chosen

  const [previewUrl, setPreviewUrl] = useState(
    () => activeCategory?.image || null,
  );
  // Whatever should currently be shown in the preview box — starts as
  // the existing category's image URL (edit mode) or null (add mode)

  const [imageRemoved, setImageRemoved] = useState(false);
  // True only when editing AND the admin clicked "Remove" without
  // picking a replacement — tells the API layer to send image: null

  const [isDragging, setIsDragging] = useState(false);
  // Purely visual — highlights the drop-zone border while a file is
  // being dragged over it

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
    defaultValues: {
      name: activeCategory?.name || "",
      description: activeCategory?.description || "",
    },
  });

  // Real-time "already exists" check (API 24.1) — fires on blur of the
  // Category Name field. excludeId is only passed in edit mode, so
  // saving a category with its own unchanged name never flags it as a
  // duplicate of itself.
  const { checkOnBlur: checkNameOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkCategoryNameExists,
    fieldName: "name",
    message: "A category with this name already exists.",
    excludeId: isEditMode ? activeCategory.id : undefined,
    setError,
    clearErrors,
  });

  const nameField = register("name");
  // Captured separately so its own onBlur can be chained with the
  // duplicate-name check above.

  // --------------------------------------------------
  // SAVE MUTATION — handles both create and update
  // --------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: (formValues) => {
      // Translate the three image states into what categories.api.js
      // expects: a File (new upload), null (explicit removal), or
      // undefined (leave untouched)
      const imagePayload = imageFile
        ? imageFile
        : imageRemoved
          ? null
          : undefined;

      const payload = { ...formValues, image: imagePayload };

      return isEditMode
        ? updateCategory(activeCategory.id, payload)
        : createCategory(payload);
    },
    onSuccess: () => {
      // Refetches the categories list so the table/stats immediately
      // reflect the new or updated category — same invalidation key
      // CategoryManagement's delete flow already uses
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORIES });
      showSuccess(isEditMode ? "Category updated." : "Category created.");
      onClose();
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          error?.response?.data?.name?.[0] ||
          "Failed to save category.",
      );
    },
  });

  const onSubmit = (formValues) => saveMutation.mutate(formValues);

  // --------------------------------------------------
  // IMAGE HANDLERS
  // --------------------------------------------------
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

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageRemoved(false);
    // Picking a new file cancels any pending "remove" from earlier
    // in this same session
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.[0]) applySelectedFile(e.target.files[0]);
    e.target.value = "";
    // Clears the input's internal value so selecting the SAME file
    // again later still fires the onChange event
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) applySelectedFile(e.dataTransfer.files[0]);
  };

  const handleRemoveImage = () => {
    if (imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setImageRemoved(true);
    // Marks this for explicit clearing on submit — see saveMutation
  };

  return (
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
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Category ID badge — edit mode only, matches what the old
            inline panel used to show for quick reference */}
        {isEditMode && (
          <span className="text-xs text-gray-400 -mt-2">
            ID: #{activeCategory.id}
          </span>
        )}

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

        <Textarea
          id="category-description"
          label="Description"
          rows={4}
          placeholder="Short description shown to customers while browsing"
          {...register("description")}
          error={errors.description?.message}
        />

        {/* -------------------------------------------------- */}
        {/* CATEGORY IMAGE — single-image upload with preview   */}
        {/* -------------------------------------------------- */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Category Image
          </label>

          {previewUrl ? (
            // An image is either currently set or was just picked —
            // show it with a hover "remove" control instead of the
            // drop zone
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-100 group">
              <img
                src={previewUrl}
                alt="Category"
                className="w-full h-full object-cover"
              />
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
                e.preventDefault();
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
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <AiOutlineCloudUpload className="w-6 h-6 text-gray-400" />
              <p className="text-xs text-gray-600 text-center">
                Drag & drop, or{" "}
                <span className="text-primary font-medium">browse</span>
              </p>
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
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isEditMode ? "Discard Changes" : "Cancel"}
          </Button>
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
