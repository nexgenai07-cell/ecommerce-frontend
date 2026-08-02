import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AiOutlineEdit } from "react-icons/ai";

import {
  getProductById,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
} from "../../api/products.api";
import { getCategories } from "../../api/categories.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import generateSku from "../../utils/generateSku";
// generateSku — used only by the manual "Regenerate" button here.
// Unlike ProductAdd, editing an EXISTING product's name should not
// silently rewrite its already-assigned SKU — that would be a
// surprising side effect for a field admins may reference elsewhere
// (labels, barcodes, spreadsheets). So there is no name-watching
// auto-fill effect on this page — only an explicit, admin-initiated
// regenerate action.

import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import PageHeader from "../../components/shared/PageHeader";
import BasicInfoSection from "../../components/product-form/BasicInfoSection";
import PricingSection from "../../components/product-form/PricingSection";
import InventorySection from "../../components/product-form/InventorySection";
import AdjustStockModal from "../../components/product-form/AdjustStockModal";
import ProductImagesSection from "../../components/product-form/ProductImagesSection";
import LivePreviewCard from "../../components/product-form/LivePreviewCard";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().optional(),
  category_id: z.string().min(1, "Please select a category"),
  price: z
    .string()
    .min(1, "Sale price is required")
    .refine((val) => parseFloat(val) > 0, "Sale price must be greater than 0"),
  original_price: z.string().optional(),
  low_stock_threshold: z.string().optional(),
  sku: z.string().optional(),
  is_active: z.boolean(),
});

// Same DRF-style sku error reader used on ProductAdd — kept identical
// so both pages report a duplicate SKU the exact same way.
const extractSkuError = (error) => {
  const skuField = error?.response?.data?.sku;
  if (Array.isArray(skuField)) return skuField[0];
  if (typeof skuField === "string") return skuField;
  return null;
};

const ProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageActionKey, setImageActionKey] = useState(null);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      price: "",
      original_price: "",
      low_stock_threshold: "5",
      sku: "",
      is_active: true,
    },
  });

  const { data: productResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
    queryFn: () => getProductById(id),
  });

  const product = productResponse?.data;

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        description: product.description || "",
        category_id: String(product.category?.id || ""),
        price: String(product.price ?? ""),
        original_price: String(product.original_price ?? ""),
        low_stock_threshold: String(product.low_stock_threshold ?? "5"),
        sku: product.sku || "",
        is_active: !!product.is_active,
      });
    }
  }, [product, reset]);

  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
  const categories = extractListData(categoriesResponse);

  const watchedValues = watch();
  const selectedCategoryLabel = categories.find(
    (category) => String(category.id) === watchedValues.category_id,
  )?.name;

  // Manual "Regenerate" button only — see note above on why this page
  // doesn't auto-rewrite the SKU as the admin edits the name.
  const handleRegenerateSku = () => {
    const candidate = generateSku(watchedValues.name, selectedCategoryLabel);
    setValue("sku", candidate, { shouldDirty: true, shouldValidate: false });
  };

  const updateMutation = useMutation({
    mutationFn: (data) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("is_primary", (product?.images?.length || 0) === 0);
      return uploadProductImage(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
      });
    },
    onError: () => showError("Failed to upload image."),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => deleteProductImage(id, imageId),
    onMutate: (imageId) => setImageActionKey(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
      });
    },
    onError: () => showError("Failed to remove image."),
    onSettled: () => setImageActionKey(null),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId) => setPrimaryImage(id, imageId),
    onMutate: (imageId) => setImageActionKey(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PRODUCT_DETAIL(id),
      });
    },
    onError: () => showError("Failed to update primary image."),
    onSettled: () => setImageActionKey(null),
  });

  const handleAddFiles = (files) => {
    files.reduce(
      (chain, file) => chain.then(() => uploadImageMutation.mutateAsync(file)),
      Promise.resolve(),
    );
  };

  const buildPayload = (data) => ({
    name: data.name,
    description: data.description || "",
    category: Number(data.category_id),
    price: data.price,
    original_price: data.original_price || data.price,
    low_stock_threshold: Number(data.low_stock_threshold || 5),
    sku: data.sku || "",
    is_active: data.is_active,
  });

  const runSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(buildPayload(data));
      showSuccess(
        data.is_active
          ? "Product updated successfully."
          : "Product saved as draft.",
      );
      navigate(ROUTES.ADMIN_PRODUCTS);
    } catch (error) {
      const skuError = extractSkuError(error);
      if (skuError) {
        setError("sku", { type: "manual", message: skuError });
        showError(skuError);
      } else {
        showError(
          error?.response?.data?.message ||
            "Something went wrong while updating the product.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(runSubmit);

  const normalizedImages = (product?.images || []).map((image) => ({
    key: image.id,
    url: image.image_url,
    isPrimary: image.is_primary,
  }));

  const primaryImage = normalizedImages.find((image) => image.isPrimary);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <BasicInfoSection
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
          <PricingSection register={register} errors={errors} watch={watch} />
          <ProductImagesSection
            images={normalizedImages}
            onAddFiles={handleAddFiles}
            onRemoveImage={(key) => deleteImageMutation.mutate(key)}
            onSetPrimary={(key) => setPrimaryMutation.mutate(key)}
            isBusy={!!imageActionKey || uploadImageMutation.isPending}
          />
        </div>

        <div className="flex flex-col gap-6">
          <InventorySection
            register={register}
            errors={errors}
            currentStock={product?.stock}
            onAdjustStockClick={() => setIsAdjustStockOpen(true)}
            onRegenerateSku={handleRegenerateSku}
          />
          <LivePreviewCard
            name={watchedValues.name}
            price={watchedValues.price}
            originalPrice={watchedValues.original_price}
            categoryLabel={selectedCategoryLabel}
            imageUrl={primaryImage?.url}
          />
        </div>
      </div>

      <AdjustStockModal
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        productId={id}
        currentStock={product?.stock ?? 0}
      />
    </div>
  );
};

export default ProductEdit;
