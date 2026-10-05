import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineInfoCircle, AiOutlinePlus } from "react-icons/ai";
// Small icon shown inside the section's icon badge, next to the title —
// purely visual, helps the eye tell sections apart at a glance.

import { getCategories } from "../../api/categories.api";
// getCategories — API 21: GET /api/v1/categories/
// Returns a FLAT array of real categories — there is no parent/child
// hierarchy field anywhere in the categories table or API, so this
// dropdown is intentionally flat (the image's "Furniture > Office"
// nested look isn't backed by real data).

import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Toggle from "../ui/Toggle";
import CategoryFormPanel from "../admin-categories/CategoryFormPanel";
// Reused as-is from Category Management — activeCategory left
// undefined here puts it in create mode, and its onCreated callback
// below lets this dropdown pick up the new category immediately.

const BasicInfoSection = ({
  register,
  errors,
  watch,
  setValue,
  onNameBlur,
  // Optional — when passed (by ProductAdd/ProductEdit), it's called
  // right after react-hook-form's own onBlur on the Name field, and
  // triggers the "does a product with this name already exist?" check
  // (API 31.1). Left undefined here does nothing extra, so this
  // component works exactly as before if a caller doesn't pass it.
}) => {
  // --------------------------------------------------
  // CATEGORIES — real dropdown options
  // --------------------------------------------------
  const { data: categoriesResponse } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(undefined, signal),
    staleTime: 1000 * 60 * 10, // categories change rarely — 10 minute cache
  });

  const categories = extractListData(categoriesResponse);
  // Defensive normalizer — handles both the documented flat-array shape
  // and a possible {count, results} drift, same pattern used everywhere
  // else in this codebase for endpoints with this exact history.

  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));
  // Select component expects { value, label } pairs — value must be a
  // string since native <select> option values are always strings;
  // it gets converted back to a number when the form actually submits.

  // is_active is a plain boolean under the hood, but Toggle wraps a
  // native <input type="checkbox">, so its onChange fires with a real
  // DOM event — NOT a bare boolean. Reading e.target.checked here is
  // what actually gives us the true/false value to store.
  const isActive = watch("is_active");

  const nameField = register("name");
  // Captured separately (instead of spreading register("name") inline)
  // so its own onBlur can be chained with the optional duplicate-name
  // check below — react-hook-form does NOT support passing a custom
  // onBlur through register()'s options object, so this is the correct
  // way to add extra behavior on top of its built-in one.

  // --------------------------------------------------
  // ADD NEW CATEGORY — inline modal, opened from next to the dropdown
  // --------------------------------------------------
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Remounts CategoryFormPanel with fresh internal state every time it
  // opens, same key-bump pattern CategoryManagement uses for its own
  // add/edit modal, so a category typed and abandoned once doesn't
  // linger in the fields the next time this is opened.
  const [categoryModalSessionId, setCategoryModalSessionId] = useState(0);

  const openCategoryModal = () => {
    setCategoryModalSessionId((id) => id + 1);
    setIsCategoryModalOpen(true);
  };

  return (
    // Elevated card wrapper — white surface, soft rounded corners, a
    // resting shadow-md that grows to shadow-lg on hover, with a
    // smooth transition so the card visibly "lifts" instead of the
    // flat bordered box it used to be.
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 p-5 sm:p-6 flex flex-col gap-5">
      {/* Section header row: small colored icon badge + title */}
      <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
          <AiOutlineInfoCircle className="w-4.5 h-4.5" />
        </span>
        <h2 className="text-base font-semibold text-gray-900">
          Basic Information
        </h2>
      </div>

      <Input
        label="Product Name"
        placeholder="e.g. Premium Ergonomic Office Chair"
        required
        {...nameField}
        onBlur={(e) => {
          nameField.onBlur(e); // Keep react-hook-form's own per-field validation
          onNameBlur?.(e.target.value); // Then run the optional duplicate-name check
        }}
        error={errors.name?.message}
      />

      <Textarea
        label="Description"
        placeholder="Describe your product features, materials, and benefits..."
        rows={5}
        {...register("description")}
        error={errors.description?.message}
      />

      {/* Category + Visibility side by side on larger screens, stacked
          on mobile. grid-cols-1 falls back to a single column below the
          sm breakpoint so nothing gets cramped on small phones.
          items-start keeps both columns anchored to the top, so a
          validation message that grows the Category column never
          shifts the Visibility column. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-1.5">
          {/* The label is rendered here instead of inside Select so the
              dropdown and the Add New button can share one row that is
              independent of the error message below the dropdown. */}
          <label
            htmlFor="category_id"
            className="text-sm font-medium text-gray-700"
          >
            Category
            <span className="text-danger ml-1">*</span>
          </label>

          {/* items-start pins the button to the top of the row, level
              with the dropdown itself. The validation message is part
              of the Select block and extends below that level, so it
              can never pull the button out of alignment. */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <Select
                id="category_id"
                options={categoryOptions}
                placeholder="Select a category"
                {...register("category_id")}
                error={errors.category_id?.message}
              />
            </div>

            {/* h-10.5 matches the exact height of the Select control
                (py-2.5 + text-sm line height + 1px borders). */}
            <button
              type="button"
              onClick={openCategoryModal}
              title="Add New Category"
              className="group h-10.5 shrink-0 inline-flex items-center gap-2 pl-2.5 pr-4 rounded-lg border-[1.5px] border-primary bg-primary-50 text-primary-dark text-sm font-semibold shadow-sm hover:bg-primary hover:border-primary-dark hover:text-white hover:shadow-md hover:shadow-primary/25 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200"
            >
              <span className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center transition-colors duration-200 group-hover:bg-white group-hover:text-primary">
                <AiOutlinePlus className="w-3.5 h-3.5" />
              </span>
              Add New
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">
            Visibility Status
          </span>
          <div className="flex items-center h-10.5">
            {/* h-[42px] lines this toggle row up with the Select field
                beside it, which has its own label+input height */}
            <Toggle
              id="is_active"
              label={isActive ? "Published" : "Draft"}
              checked={!!isActive}
              onChange={(e) =>
                setValue("is_active", e.target.checked, { shouldDirty: true })
              }
            />
          </div>
        </div>
      </div>

      <CategoryFormPanel
        key={categoryModalSessionId}
        isOpen={isCategoryModalOpen}
        activeCategory={null}
        onClose={() => setIsCategoryModalOpen(false)}
        onCreated={(newCategory) => {
          // Selects the just-created category in this form the moment
          // it's saved, so the admin doesn't have to reopen the
          // dropdown and find it themselves.
          setValue("category_id", String(newCategory.id), {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
      />
    </div>
  );
};

export default BasicInfoSection;
