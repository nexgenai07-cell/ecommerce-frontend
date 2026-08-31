import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AiOutlinePlus } from "react-icons/ai";

import {
  createProduct,
  uploadProductImage,
  checkProductNameExists,
  checkProductSkuExists,
} from "../../api/products.api";
// createProduct       — API 19: POST /api/v1/products/ (multipart)
// uploadProductImage  — API 22: POST /api/v1/products/{id}/images/
// checkProductNameExists / checkProductSkuExists — API 31.1 / API 31.2

import useFieldAvailabilityCheck from "../../hooks/useFieldAvailabilityCheck";

import { getCategories } from "../../api/categories.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import generateSku from "../../utils/generateSku";
// generateSku — builds a readable candidate SKU from name + category,
// used to auto-fill the SKU field until the admin edits it manually

import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/shared/PageHeader";
import BasicInfoSection from "../../components/product-form/BasicInfoSection";
import PricingSection from "../../components/product-form/PricingSection";
import InventorySection from "../../components/product-form/InventorySection";
import ProductImagesSection from "../../components/product-form/ProductImagesSection";
import LivePreviewCard from "../../components/product-form/LivePreviewCard";

const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Product name is required")
      .max(200, "Product name is too long"),
    description: z
      .string()
      .trim()
      .max(2000, "Description is too long")
      .optional(),
    category_id: z.string().min(1, "Please select a category"),
    price: z
      .string()
      .trim()
      .min(1, "Sale price is required")
      .refine(
        (val) => !Number.isNaN(parseFloat(val)),
        "Sale price must be a valid number",
      )
      .refine(
        (val) => parseFloat(val) > 0,
        "Sale price must be greater than 0",
      ),
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
    stock: z
      .string()
      .trim()
      .min(1, "Quantity is required")
      .refine((val) => /^\d+$/.test(val), "Quantity must be a whole number")
      .refine((val) => parseInt(val, 10) >= 0, "Quantity cannot be negative"),
    low_stock_threshold: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || /^\d+$/.test(val),
        "Low stock threshold must be a whole number",
      ),
    sku: z.string().trim().optional(),
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
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Original price must be greater than the sale price",
        path: ["original_price"],
      });
    }
  });

// Reads the backend's validation error for the sku field specifically,
// out of a DRF-style error response — { "sku": ["already exists..."] }
// or, less commonly, a plain string under the same key. Returns null
// when the error wasn't actually about the sku field, so the caller
// can fall back to a generic error message instead.
const extractSkuError = (error) => {
  const skuField = error?.response?.data?.sku;
  if (Array.isArray(skuField)) return skuField[0];
  if (typeof skuField === "string") return skuField;
  return null;
};

const ProductAdd = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pendingImages, setPendingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { errors, dirtyFields },
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
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      price: "",
      original_price: "",
      stock: "",
      low_stock_threshold: "5",
      sku: "",
      is_active: true,
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
  const categories = extractListData(categoriesResponse);

  // Real-time "already exists" checks (API 31.1 / API 31.2) — fire on
  // blur of the Name / SKU fields (wired via BasicInfoSection's
  // onNameBlur and InventorySection's onSkuBlur below). No excludeId
  // here: this is the CREATE form, so there's no existing record of
  // its own to exclude from the match.
  const { checkOnBlur: checkNameOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkProductNameExists,
    fieldName: "name",
    message: "A product with this name already exists.",
    setError,
    clearErrors,
  });
  const { checkOnBlur: checkSkuOnBlur } = useFieldAvailabilityCheck({
    checkFn: checkProductSkuExists,
    fieldName: "sku",
    message: "This SKU already exists.",
    setError,
    clearErrors,
  });

  const watchedValues = watch();
  const selectedCategoryLabel = categories.find(
    (category) => String(category.id) === watchedValues.category_id,
  )?.name;

  // --------------------------------------------------
  // AUTO-GENERATE SKU as the admin types the name or picks a category
  // --------------------------------------------------
  // Only runs while the admin has NOT manually typed into the SKU
  // field themselves (dirtyFields.sku stays false as long as every
  // update to it came from this effect's own setValue call below,
  // since that call passes shouldDirty: false). The moment the admin
  // types directly into the SKU input, react-hook-form's own onChange
  // marks it dirty, and this effect stops overwriting it — exactly
  // the "auto-filled, but still fully editable" behavior requested.
  useEffect(() => {
    if (dirtyFields.sku) return;

    const candidate = generateSku(watchedValues.name, selectedCategoryLabel);
    setValue("sku", candidate, { shouldDirty: false, shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.name, selectedCategoryLabel]);

  // Manual "Regenerate" button (refresh icon inside the SKU field) —
  // always available, even after the admin has edited the field by
  // hand. shouldDirty: false resets tracking so the name-based
  // auto-fill effect above can resume watching for changes again.
  const handleRegenerateSku = () => {
    const candidate = generateSku(watchedValues.name, selectedCategoryLabel);
    setValue("sku", candidate, { shouldDirty: false, shouldValidate: false });
  };

  // --------------------------------------------------
  // IMAGE STAGING HANDLERS (create mode — nothing uploads yet)
  // --------------------------------------------------
  const handleAddFiles = (files) => {
    const newEntries = files.map((file, index) => ({
      key: `pending-${Date.now()}-${index}`,
      file,
      url: URL.createObjectURL(file),
      isPrimary: pendingImages.length === 0 && index === 0,
    }));
    setPendingImages((prev) => [...prev, ...newEntries]);
  };

  const handleRemovePendingImage = (key) => {
    setPendingImages((prev) => {
      const filtered = prev.filter((image) => image.key !== key);
      if (filtered.length > 0 && !filtered.some((image) => image.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleSetPendingPrimary = (key) => {
    setPendingImages((prev) =>
      prev.map((image) => ({ ...image, isPrimary: image.key === key })),
    );
  };

  // --------------------------------------------------
  // CREATE PRODUCT MUTATION — API 19
  // --------------------------------------------------
  const createMutation = useMutation({
    mutationFn: (formData) => createProduct(formData),
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ productId, file, isPrimary }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("is_primary", isPrimary);
      return uploadProductImage(productId, formData);
    },
  });

  // --------------------------------------------------
  // FULL SUBMIT FLOW
  // --------------------------------------------------
  const runSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("category_id", data.category_id);
      formData.append("price", data.price);
      formData.append("original_price", data.original_price || data.price);
      formData.append("stock", data.stock);
      formData.append("low_stock_threshold", data.low_stock_threshold || "5");
      if (data.sku) formData.append("sku", data.sku);
      formData.append("is_active", data.is_active);

      const response = await createMutation.mutateAsync(formData);
      const newProductId = response.data.id;

      for (const image of pendingImages) {
        await uploadImageMutation.mutateAsync({
          productId: newProductId,
          file: image.file,
          isPrimary: image.isPrimary,
        });
      }

      // QUERY_KEYS.PRODUCTS ("products") is the storefront's cache key,
      // used by the customer-facing product listings. The Admin Products
      // list (ProductList.jsx) reads from a separate cache key
      // ("adminProducts"), so it must be invalidated here as well —
      // otherwise the new product would not appear in the admin list
      // until the page is manually refreshed.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      showSuccess(
        data.is_active
          ? "Product published successfully."
          : "Product saved as draft.",
      );
      navigate(ROUTES.ADMIN_PRODUCTS);
    } catch (error) {
      // Duplicate SKU gets special handling: show it right under the
      // SKU field (not just a toast) and DON'T navigate away, so the
      // admin can immediately fix it and resubmit.
      const skuError = extractSkuError(error);
      if (skuError) {
        setError("sku", { type: "manual", message: skuError });
        showError(skuError);
      } else {
        showError(
          error?.response?.data?.message ||
            "Something went wrong while saving the product.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(runSubmit);

  const primaryPendingImage = pendingImages.find((image) => image.isPrimary);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<AiOutlinePlus />}
        title="Add New Product"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <BasicInfoSection
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            onNameBlur={checkNameOnBlur}
          />
          <PricingSection
            register={register}
            errors={errors}
            watch={watch}
            trigger={trigger}
          />
          <ProductImagesSection
            images={pendingImages}
            onAddFiles={handleAddFiles}
            onRemoveImage={handleRemovePendingImage}
            onSetPrimary={handleSetPendingPrimary}
            isBusy={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-6">
          <InventorySection
            register={register}
            errors={errors}
            isNewProduct={true}
            onRegenerateSku={handleRegenerateSku}
            onSkuBlur={checkSkuOnBlur}
          />
          <LivePreviewCard
            name={watchedValues.name}
            price={watchedValues.price}
            originalPrice={watchedValues.original_price}
            categoryLabel={selectedCategoryLabel}
            imageUrl={primaryPendingImage?.url}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductAdd;
