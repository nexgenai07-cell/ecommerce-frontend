// React hooks for side effects, memoised values and local state
import { useEffect, useMemo, useState } from "react";
// Router hooks: the :id route parameter and programmatic navigation
import { useNavigate, useParams } from "react-router-dom";
// Form state management with schema based validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// TanStack Query hooks for fetching, mutating and cache access
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Page header icon
import { AiOutlineEdit } from "react-icons/ai";

// Product API calls used on this page
// checkProductNameExists / checkProductSkuExists run the duplicate checks
// when the admin leaves the Name / SKU field
import {
  getProductById,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
  checkProductNameExists,
  checkProductSkuExists,
} from "../../api/products.api";
// Runs an availability check when a field loses focus
import useFieldAvailabilityCheck from "../../hooks/useFieldAvailabilityCheck";
// Sets the breadcrumb label to the product name
import useBreadcrumb from "../../hooks/useBreadcrumb";
// Category list for the category dropdown
import { getCategories } from "../../api/categories.api";
// Central registries of route paths and cache keys
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
// Normalises plain-array and paginated responses into one array
import extractListData from "../../utils/extractListData";
// Builds a SKU candidate from a product name and category. It is used only
// by the manual "Regenerate" button here. Editing an EXISTING product's
// name must not silently rewrite its already-assigned SKU, because that
// would be a surprising side effect for a field admins may reference
// elsewhere (labels, barcodes, spreadsheets). So there is no name-watching
// auto-fill effect on this page — only an explicit, admin-initiated
// regenerate action.
import generateSku from "../../utils/generateSku";
// Writes API response data into the cached product without refetching it
import { patchProductDetail } from "../../utils/productDetailCache";
// SKU helpers shared by every SKU field in the admin panel
import { sanitizeSkuValue, validateSku } from "../../utils/skuValidation";

// Toast helpers for success and error feedback
import { showSuccess, showError } from "../../components/ui/Toast";
// Pulls the backend's own error text out of a failed request
import getApiErrorMessage, {
  getApiFieldError,
} from "../../utils/getApiErrorMessage";
// Shared UI building blocks
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import ConfirmModal from "../../components/ui/ConfirmModal";
// Shared page title bar used on every admin screen
import PageHeader from "../../components/shared/PageHeader";
// Sections of the product form
import BasicInfoSection from "../../components/product-form/BasicInfoSection";
import PricingSection from "../../components/product-form/PricingSection";
import InventorySection from "../../components/product-form/InventorySection";
import AdjustStockModal from "../../components/product-form/AdjustStockModal";
import ProductImagesSection from "../../components/product-form/ProductImagesSection";
import LivePreviewCard from "../../components/product-form/LivePreviewCard";

// Validation rules for every field of the edit form
const productSchema = z
  .object({
    // Required, trimmed product name
    name: z
      .string()
      .trim()
      .min(1, "Product name is required")
      .max(200, "Product name is too long"),
    // Optional long description
    description: z
      .string()
      .trim()
      .max(2000, "Description is too long")
      .optional(),
    // A category must be chosen
    category_id: z.string().min(1, "Please select a category"),
    // Selling price: required, numeric and above zero
    price: z
      .string()
      .trim()
      .min(1, "Price is required")
      .refine(
        (val) => !Number.isNaN(parseFloat(val)),
        "Price must be a valid number",
      )
      .refine((val) => parseFloat(val) > 0, "Price must be greater than 0"),
    // Optional compare-at (strike-through) price
    original_price: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || !Number.isNaN(parseFloat(val)),
        "Original price must be a valid number",
      )
      .refine(
        (val) => !val || parseFloat(val) > 0,
        "Original price must be greater than 0",
      ),
    // Purchase Price is the store's cost price. It is required because
    // profit, markup and margin are calculated from it. Zero is allowed,
    // a negative value is not. The server enforces the same rules; they
    // are mirrored here so a problem is caught before the request is sent.
    purchase_price: z
      .string()
      .trim()
      .min(1, "Purchase price is required")
      .refine(
        (val) => !Number.isNaN(parseFloat(val)),
        "Enter a valid purchase price",
      )
      .refine(
        (val) => Number.isNaN(parseFloat(val)) || parseFloat(val) >= 0,
        "Purchase price cannot be negative",
      ),
    // Optional whole-number threshold for low stock alerts
    low_stock_threshold: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || /^\d+$/.test(val),
        "Low stock threshold must be a whole number",
      ),
    // The SKU field is read-only until the admin deliberately unlocks it
    // (see InventorySection.jsx). While it is locked the value submitted
    // here is always the product's original SKU, so it is passed through
    // without re-running the create-time rule set: an older product's SKU
    // should not fail to save just because the SKU rules were tightened
    // after it was created. A SKU that the admin has changed is validated
    // with the full rule set inside runSubmit before the request is sent.
    sku: z.string().trim().optional(),
    // Whether the product is published (true) or saved as a draft (false)
    is_active: z.boolean(),
  })
  // Cross-field check: if an "original price" (compare-at / strike-through
  // price) is given, it should be higher than the actual sale price —
  // otherwise the "discount" shown to customers on the storefront would
  // be negative or zero, which is almost always a data-entry mistake.
  .superRefine((data, ctx) => {
    if (
      data.original_price &&
      !Number.isNaN(parseFloat(data.original_price)) &&
      !Number.isNaN(parseFloat(data.price)) &&
      parseFloat(data.original_price) <= parseFloat(data.price)
    ) {
      // Attach the problem to the original price field
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Original price must be greater than the sale price",
        path: ["original_price"],
      });
    }
  });

// Reads the backend's validation error for one specific field out of a
// DRF-style error response — { "sku": ["already exists..."] } or, less
// commonly, a plain string under the same key. Returns null when the
// error was not about that field, so the caller can fall back to a
// generic error message instead. The Add Product page reads errors the
// same way, so both pages report field errors identically.

const ProductEdit = () => {
  // The product id taken from the route
  const { id } = useParams();
  // Used to leave the page after a successful save
  const navigate = useNavigate();
  // Gives access to the shared query cache for invalidation
  const queryClient = useQueryClient();
  // True while the save request is running
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Id of the image that currently has a delete or primary request running
  const [imageActionKey, setImageActionKey] = useState(null);
  // Whether the Adjust Stock modal is open
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  // True after the admin deliberately unlocked the SKU to correct it
  const [isSkuUnlocked, setIsSkuUnlocked] = useState(false);
  // Whether the "Change SKU" confirmation dialog is open
  const [isSkuUnlockConfirmOpen, setIsSkuUnlockConfirmOpen] = useState(false);

  // Loads the product. Image changes and stock adjustments write their API
  // response straight into this cached product instead of refetching it.
  const { data: productResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
    queryFn: ({ signal }) => getProductById(id, signal),
  });

  // The product object from the response body
  const product = productResponse?.data;

  // The values the form is filled with, derived from the saved product.
  // It stays undefined until the product has loaded.
  const savedFormValues = useMemo(() => {
    // Nothing to fill the form with yet
    if (!product) return undefined;

    return {
      name: product.name || "",
      description: product.description || "",
      category_id: String(product.category?.id || ""),
      price: String(product.price ?? ""),
      original_price: String(product.original_price ?? ""),
      // The cost price arrives as null for a product that never had one,
      // so it pre-fills to an empty string (a blank field, which the
      // admin must fill in before saving) rather than the text "null".
      purchase_price:
        product.purchase_price != null ? String(product.purchase_price) : "",
      low_stock_threshold: String(product.low_stock_threshold ?? "5"),
      sku: product.sku || "",
      is_active: !!product.is_active,
    };
  }, [product]);

  // react-hook-form instance for the whole edit form
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
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
    // Starting values used before the product has loaded
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      price: "",
      original_price: "",
      purchase_price: "",
      low_stock_threshold: "5",
      sku: "",
      is_active: true,
    },
    // The form is filled from the saved product through `values`, so it
    // follows the saved data without ever being reset wholesale. Whenever
    // the saved product changes (a stock adjustment, a window refocus or a
    // live update), only the fields the admin has NOT edited are refreshed;
    // every field the admin has changed keeps its unsaved value.
    values: savedFormValues,
    resetOptions: { keepDirtyValues: true },
  });

  // Sets the breadcrumb label to the product name
  const { handleSetLabel } = useBreadcrumb();
  useEffect(() => {
    // Only update the label once the name is known
    if (product?.name) handleSetLabel(product.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.name]);

  // Real-time "already exists" checks — fire on blur of the Name / SKU
  // fields. excludeId is this product's OWN id (from the route param), so
  // re-submitting the product's unchanged name/SKU never incorrectly flags
  // it as a duplicate of itself.
  const { checkOnBlur: checkNameOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkProductNameExists,
    fieldName: "name",
    message: "A product with this name already exists.",
    excludeId: id,
    setError,
    clearErrors,
  });
  // Same duplicate check for the SKU field
  const { checkOnBlur: checkSkuOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkProductSkuExists,
    fieldName: "sku",
    message: "This SKU already exists.",
    excludeId: id,
    setError,
    clearErrors,
  });

  // Loads the categories for the dropdown and the live preview
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(undefined, signal),
    staleTime: 1000 * 60 * 10,
  });
  // The category list as a plain array
  const categories = extractListData(categoriesResponse);

  // Every current form value, re-read on each change for the live preview
  const watchedValues = watch();
  // Display name of the category that is currently selected
  const selectedCategoryLabel = categories.find(
    (category) => String(category.id) === watchedValues.category_id,
  )?.name;

  // Manual "Regenerate" button only — see the note at the generateSku
  // import on why this page doesn't auto-rewrite the SKU as the admin
  // edits the name. The button is only visible while the SKU is unlocked.
  const handleRegenerateSku = () => {
    // Build a candidate from the current name and category
    const candidate = generateSku(watchedValues.name, selectedCategoryLabel);
    // Write it into the field and mark the field as edited
    setValue("sku", candidate, { shouldDirty: true, shouldValidate: false });
  };

  // True when the SKU field was unlocked and now holds a different SKU
  // than the one saved on the product
  const isSkuChanged = (nextSku) =>
    isSkuUnlocked &&
    sanitizeSkuValue(nextSku) !== sanitizeSkuValue(product?.sku);

  // Opens the confirmation dialog that explains the risk of changing a SKU
  const handleSkuUnlockRequest = () => setIsSkuUnlockConfirmOpen(true);

  // Unlocks the SKU field after the admin confirmed the warning
  const handleSkuUnlockConfirm = () => {
    // Make the SKU field editable
    setIsSkuUnlocked(true);
    // Close the confirmation dialog
    setIsSkuUnlockConfirmOpen(false);
  };

  // Abandons a SKU correction: restores the saved SKU and locks the field
  const handleSkuChangeCancel = () => {
    // Put the saved SKU back without marking the field as edited
    setValue("sku", product?.sku || "", {
      shouldDirty: false,
      shouldValidate: false,
    });
    // Remove any SKU error that belonged to the discarded value
    clearErrors("sku");
    // Lock the field again
    setIsSkuUnlocked(false);
  };

  // Saves the product details
  const updateMutation = useMutation({
    mutationFn: (data) => updateProduct(id, data),
    onSuccess: () => {
      // QUERY_KEYS.PRODUCTS ("products") is the storefront's cache key.
      // The Admin Products list (ProductList.jsx) reads from a separate
      // cache key ("adminProducts"), so it must be invalidated here too —
      // otherwise the updated details would not appear in the admin list
      // until the page is manually refreshed.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
      });
    },
  });

  // Uploads one image. It never touches the other form fields, so only
  // the image list on screen is refreshed afterwards.
  const uploadImageMutation = useMutation({
    mutationFn: (file) => {
      // Multipart body carrying the file
      const formData = new FormData();
      formData.append("image", file);
      // The first image of a product becomes its primary image
      formData.append("is_primary", (product?.images?.length || 0) === 0);
      return uploadProductImage(id, formData);
    },
    onSuccess: (response) => {
      const uploadedImage = response?.data;

      // The uploaded image is added to the gallery from the response. The
      // product is refetched only when the response does not describe the
      // image.
      if (uploadedImage?.id === undefined || uploadedImage?.id === null) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
        });
        return;
      }

      patchProductDetail(queryClient, id, (current) => {
        const images = current.images || [];
        // A new primary image replaces the previous primary flag
        const base = uploadedImage.is_primary
          ? images.map((image) => ({ ...image, is_primary: false }))
          : images;

        return { images: [...base, uploadedImage] };
      });
    },
    onError: (error) =>
      showError(getApiErrorMessage(error, "Failed to upload image.")),
  });

  // Deletes one image
  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => deleteProductImage(id, imageId),
    // Mark the image as busy while the request runs
    onMutate: (imageId) => setImageActionKey(imageId),
    onSuccess: (_response, imageId) => {
      const images = product?.images || [];
      const removedImage = images.find((image) => image.id === imageId);
      const wasPrimaryWithOthersLeft =
        removedImage?.is_primary && images.length > 1;

      // The image is removed from the gallery directly.
      patchProductDetail(queryClient, id, (current) => ({
        images: (current.images || []).filter((image) => image.id !== imageId),
      }));

      // When the primary image was removed, only the server knows which
      // image took its place, so the product is refetched in that case.
      if (wasPrimaryWithOthersLeft) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
        });
      }
    },
    onError: (error) =>
      showError(getApiErrorMessage(error, "Failed to remove image.")),
    // Clear the busy marker whether the request worked or not
    onSettled: () => setImageActionKey(null),
  });

  // Marks one image as the primary image
  const setPrimaryMutation = useMutation({
    mutationFn: (imageId) => setPrimaryImage(id, imageId),
    // Mark the image as busy while the request runs
    onMutate: (imageId) => setImageActionKey(imageId),
    onSuccess: (_response, imageId) => {
      // Only the primary flag changes, so it is moved to the chosen image.
      patchProductDetail(queryClient, id, (current) => ({
        images: (current.images || []).map((image) => ({
          ...image,
          is_primary: image.id === imageId,
        })),
      }));
    },
    onError: (error) =>
      showError(getApiErrorMessage(error, "Failed to update primary image.")),
    // Clear the busy marker whether the request worked or not
    onSettled: () => setImageActionKey(null),
  });

  // Uploads the chosen files one after another
  const handleAddFiles = (files) => {
    files.reduce(
      (chain, file) => chain.then(() => uploadImageMutation.mutateAsync(file)),
      Promise.resolve(),
    );
  };

  // Builds the request body from the validated form values
  const buildPayload = (data) => {
    // Every field of the full product update
    const payload = {
      name: data.name,
      description: data.description || "",
      category: Number(data.category_id),
      price: data.price,
      original_price: data.original_price || data.price,
      // The purchase price is required on every save, so it is always sent.
      purchase_price: data.purchase_price,
      low_stock_threshold: Number(data.low_stock_threshold || 5),
      sku: data.sku || "",
      is_active: data.is_active,
    };

    // The override flag is sent only when the admin deliberately unlocked
    // the SKU and entered a different one. A normal save never sends it.
    if (isSkuChanged(data.sku)) {
      payload.admin_override_sku = true;
    }

    return payload;
  };

  // Validates the SKU change, saves the product and handles the outcome
  const runSubmit = async (data) => {
    // A SKU the admin changed must pass the full SKU rules before sending
    if (isSkuChanged(data.sku)) {
      // The first broken rule, or null when the SKU is valid
      const skuValidationError = validateSku(data.sku);
      if (skuValidationError) {
        // Show the problem under the SKU field and stay on the page
        setError("sku", { type: "manual", message: skuValidationError });
        showError(skuValidationError);
        return;
      }
    }

    // Lock the save button while the request runs
    setIsSubmitting(true);
    try {
      // Send the full product update
      await updateMutation.mutateAsync(buildPayload(data));
      // Confirm the outcome to the admin
      showSuccess(
        data.is_active
          ? "Product updated successfully."
          : "Product saved as draft.",
      );
      // Return to the product list
      navigate(ROUTES.ADMIN_PRODUCTS);
    } catch (error) {
      // A rejected SKU or purchase price is shown right under its own
      // field (not just in a toast) and the admin stays on the page.
      const skuError = getApiFieldError(error, "sku");
      const purchasePriceError = getApiFieldError(error, "purchase_price");
      if (skuError) {
        setError("sku", { type: "manual", message: skuError });
        showError(skuError);
      } else if (purchasePriceError) {
        setError("purchase_price", {
          type: "manual",
          message: purchasePriceError,
        });
        showError(purchasePriceError);
      } else {
        // Any other failure: the backend's own message
        showError(
          getApiErrorMessage(
            error,
            "Something went wrong while updating the product.",
          ),
        );
      }
    } finally {
      // Unlock the save button again
      setIsSubmitting(false);
    }
  };

  // Submit handler that validates the form before calling runSubmit
  const onSubmit = handleSubmit(runSubmit);

  // Images in the shape the gallery component expects
  const normalizedImages = (product?.images || []).map((image) => ({
    key: image.id,
    url: image.image_url,
    isPrimary: image.is_primary,
  }));

  // The primary image, used by the live preview card
  const primaryImage = normalizedImages.find((image) => image.isPrimary);

  // Show a spinner until the product has loaded for the first time
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    // Page container
    <div className="flex flex-col gap-6">
      {/* Page title with the publish / save-as-draft action */}
      <PageHeader
        icon={<AiOutlineEdit />}
        title="Edit Product"
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={onSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {watchedValues.is_active ? "Publish Product" : "Save as Draft"}
          </Button>
        }
      />

      {/* Two-column layout: form sections on the left, inventory and preview on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Name, description, category and publish switch */}
          <BasicInfoSection
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            onNameBlur={checkNameOnBlur}
          />
          {/* Selling price, original price and purchase price */}
          <PricingSection
            control={control}
            errors={errors}
            watch={watch}
            trigger={trigger}
          />
          {/* Image gallery with upload, remove and set-primary actions */}
          <ProductImagesSection
            images={normalizedImages}
            onAddFiles={handleAddFiles}
            onRemoveImage={(key) => deleteImageMutation.mutate(key)}
            onSetPrimary={(key) => setPrimaryMutation.mutate(key)}
            isBusy={!!imageActionKey || uploadImageMutation.isPending}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* SKU, stock figures and low stock threshold */}
          <InventorySection
            register={register}
            control={control}
            errors={errors}
            totalStock={product?.total_stock}
            reservedStock={product?.reserved_stock}
            availableStock={product?.available_stock}
            onAdjustStockClick={() => setIsAdjustStockOpen(true)}
            onRegenerateSku={handleRegenerateSku}
            skuValue={watchedValues.sku}
            onSkuBlur={checkSkuOnBlur}
            isSkuUnlocked={isSkuUnlocked}
            onUnlockSku={handleSkuUnlockRequest}
            onCancelSkuChange={handleSkuChangeCancel}
          />
          {/* Live preview of how the product card will look */}
          <LivePreviewCard
            name={watchedValues.name}
            price={watchedValues.price}
            originalPrice={watchedValues.original_price}
            categoryLabel={selectedCategoryLabel}
            imageUrl={primaryImage?.url}
          />
        </div>
      </div>

      {/* Modal used to add or remove stock */}
      <AdjustStockModal
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        productId={id}
        currentStock={product?.total_stock ?? 0}
      />

      {/* Warning shown before the SKU field is unlocked */}
      <ConfirmModal
        isOpen={isSkuUnlockConfirmOpen}
        onClose={() => setIsSkuUnlockConfirmOpen(false)}
        onConfirm={handleSkuUnlockConfirm}
        title="Change SKU?"
        message="A SKU normally never changes after a product is created, because labels, barcodes and spreadsheets may already refer to it. Unlock the field only to correct a wrong SKU. The new SKU is applied when you save the product."
        confirmLabel="Unlock SKU"
        variant="primary"
      />
    </div>
  );
};

export default ProductEdit;
