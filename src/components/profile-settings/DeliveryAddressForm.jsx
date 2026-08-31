// Import "useEffect" hook from React to run side effects (used to parse and pre-fill the address)
import { useEffect } from "react";
// Import "useForm" hook from react-hook-form to manage form state, validation, and submission
import { useForm } from "react-hook-form";
// Import the zod resolver adapter that connects react-hook-form's validation to a zod schema
import { zodResolver } from "@hookform/resolvers/zod";
// Import "z" from zod, used to build the validation schema for this form
import { z } from "zod";
// Import "useMutation" and "useQueryClient" hooks from react-query — useMutation
// handles the address update API call, useQueryClient lets us invalidate the
// cached profile data once the update succeeds
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Shared React Query cache key constants, e.g. QUERY_KEYS.MY_PROFILE
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that sends the profile update request (used here to update the address field)
import { updateMyProfile } from "../../api/auth.api";
// Import toast notification helper functions for showing success and error messages
import { showSuccess, showError } from "../ui/Toast";

// Validation schema
// Define a zod object schema describing the validation rules for each address field
const addressSchema = z.object({
  // "address_line1" must be a non-empty string — shows this message if left blank.
  // .trim() first so a field containing only spaces is correctly rejected
  // instead of slipping through as a "non-empty" 1+ character string.
  address_line1: z
    .string()
    .trim()
    .min(1, "Address is required")
    .min(5, "Please enter a complete address")
    .max(150, "Address is too long"),
  // "city" must be a non-empty string — shows this message if left blank
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(60, "City name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "City name can only contain letters"),
  // "province" must be a non-empty string — shows this message if left blank
  province: z.string().trim().min(1, "Province is required"),
  // "postal_code" must be a non-empty string — shows this message if left blank.
  // Pakistani postal codes are 5 numeric digits.
  postal_code: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .regex(/^\d{5}$/, "Postal code must be exactly 5 digits"),
});

// Pakistan provinces
// Hardcoded array of Pakistani province/region names used to populate the province dropdown
const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Azad Kashmir",
  "Gilgit-Baltistan",
  "Islamabad",
];

// Main functional component for the delivery address form; receives the "user" object as a prop
const DeliveryAddressForm = ({ user }) => {
  // Access to the shared React Query cache, used below to invalidate the
  // cached profile data once the address update succeeds
  const queryClient = useQueryClient();

  // Destructure the values and methods returned by useForm
  const {
    // Function used to register input/select fields with react-hook-form
    register,
    // Function that wraps the submit handler with validation logic
    handleSubmit,
    // Function to reset/re-populate the form's field values
    reset,
    // Destructure "errors" (validation error messages) and "isDirty" (whether form has been changed) from formState
    formState: { errors, isDirty },
  } = useForm({
    // Connect zod schema validation to this form via the zodResolver
    resolver: zodResolver(addressSchema),
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
    // Set the initial default values for all address fields to empty strings
    defaultValues: {
      address_line1: "",
      city: "",
      province: "",
      postal_code: "",
    },
  });

  // User address parse karo agar hai toh
  // Side effect that parses the user's stored address string and pre-fills the form fields whenever "user" changes
  useEffect(() => {
    // Only attempt to parse if the user has an address string set
    if (user?.address) {
      // Address string se parts parse karo
      // Split the comma-separated address string into individual parts, trimming whitespace from each part
      const parts = user.address.split(",").map((p) => p.trim());
      // Reset the form with the parsed parts, falling back to empty strings for any missing part
      reset({
        address_line1: parts[0] || "",
        city: parts[1] || "",
        province: parts[2] || "",
        postal_code: parts[3] || "",
      });
    }
  }, [user, reset]); // Re-run this effect whenever "user" or "reset" changes

  // =============================================
  // UPDATE ADDRESS MUTATION
  // API 8 — PUT /api/v1/auth/me/update/
  // Address string format mein save hoti hai
  // =============================================
  // Set up a react-query mutation for submitting the address update request
  const updateMutation = useMutation({
    // The function that performs the actual API call, combining all address fields back into a single comma-separated string before sending
    mutationFn: (data) =>
      updateMyProfile({
        address: `${data.address_line1}, ${data.city}, ${data.province}, ${data.postal_code}`,
      }),

    // Callback executed when the mutation succeeds
    onSuccess: () => {
      // QUERY_KEYS.MY_PROFILE is the cache that supplies the "user" prop
      // this form receives, and is also read by other places (e.g. the
      // Checkout page's address section). Without this invalidation, the
      // new address would not appear anywhere until the page is manually
      // refreshed.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
      // Show a success toast notification to the user
      showSuccess("Address updated successfully!");
    },

    // Callback executed when the mutation fails
    onError: (error) => {
      // Show an error toast, using the server's error message if available, otherwise a generic fallback message
      showError(error?.response?.data?.message || "Failed to update address.");
    },
  });

  // Form submit handler called by react-hook-form once validation passes
  const onSubmit = (data) => {
    // Trigger the mutation with the validated form data
    updateMutation.mutate(data);
  };

  // Begin returning the JSX markup for this component
  return (
    // Outer white card container with rounded corners, light border, padding, and vertical flex layout with gap
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
      {/* Header */}
      {/* Section heading text for this card */}
      <h2 className="text-base font-bold text-gray-900">Delivery Address</h2>

      {/* The actual form element, wired to call onSubmit after validation passes */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        // Disable the browser's native HTML validation so zod/react-hook-form handles all validation instead
        noValidate
        className="flex flex-col gap-4"
      >
        {/* Address Line 1 */}
        {/* Column container holding the "Address Line 1" label, input field, and any validation error message */}
        <div className="flex flex-col gap-1.5">
          {/* Uppercase small label for the address line input field */}
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Address Line 1
          </label>
          {/* Text input for the street address, registered with react-hook-form under the "address_line1" field key */}
          <input
            type="text"
            placeholder="Street name and number"
            autoComplete="street-address"
            {...register("address_line1")}
            // Dynamically apply a red/danger border if there's a validation error on this field, otherwise use the default gray border
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors.address_line1 ? "border-danger" : "border-gray-200"}
            `}
          />
          {/* Only render the error message paragraph if there's a validation error on the "address_line1" field */}
          {errors.address_line1 && (
            <p className="text-xs text-danger">
              {errors.address_line1.message}
            </p>
          )}
        </div>

        {/* City + Province + Postal Code row */}
        {/* Grid container holding the city, province, and postal code fields; single column on mobile, three columns on small+ screens */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* City */}
          {/* Column container holding the "City" label, input field, and any validation error message */}
          <div className="flex flex-col gap-1.5">
            {/* Uppercase small label for the city input field */}
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              City
            </label>
            {/* Text input for the city name, registered with react-hook-form under the "city" field key */}
            <input
              type="text"
              placeholder="Lahore"
              autoComplete="address-level2"
              {...register("city")}
              // Dynamically apply a red/danger border if there's a validation error on this field, otherwise use the default gray border
              className={`
                w-full px-4 py-2.5 text-sm rounded-xl border bg-white
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
                ${errors.city ? "border-danger" : "border-gray-200"}
              `}
            />
            {/* Only render the error message paragraph if there's a validation error on the "city" field */}
            {errors.city && (
              <p className="text-xs text-danger">{errors.city.message}</p>
            )}
          </div>

          {/* Province */}
          {/* Column container holding the "Province" label, dropdown select, and any validation error message */}
          <div className="flex flex-col gap-1.5">
            {/* Uppercase small label for the province select field */}
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Province
            </label>
            {/* Dropdown select for choosing a province, registered with react-hook-form under the "province" field key */}
            <select
              {...register("province")}
              // Dynamically apply a red/danger border if there's a validation error on this field, otherwise use the default gray border; appearance-none removes native dropdown arrow styling
              className={`
                w-full px-4 py-2.5 text-sm rounded-xl border bg-white
                text-gray-900 cursor-pointer appearance-none
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
                ${errors.province ? "border-danger" : "border-gray-200"}
              `}
            >
              {/* Default empty/placeholder option prompting the user to select a province */}
              <option value="">Select</option>
              {/* Loop through the PROVINCES array and render an <option> for each province name */}
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {/* Only render the error message paragraph if there's a validation error on the "province" field */}
            {errors.province && (
              <p className="text-xs text-danger">{errors.province.message}</p>
            )}
          </div>

          {/* Postal Code */}
          {/* Column container holding the "Postal Code" label, input field, and any validation error message */}
          <div className="flex flex-col gap-1.5">
            {/* Uppercase small label for the postal code input field */}
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Postal Code
            </label>
            {/* Text input for the postal/zip code, registered with react-hook-form under the "postal_code" field key */}
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="54000"
              autoComplete="postal-code"
              {...register("postal_code")}
              // Dynamically apply a red/danger border if there's a validation error on this field, otherwise use the default gray border
              className={`
                w-full px-4 py-2.5 text-sm rounded-xl border bg-white
                placeholder:text-gray-300 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
                ${errors.postal_code ? "border-danger" : "border-gray-200"}
              `}
            />
            {/* Only render the error message paragraph if there's a validation error on the "postal_code" field */}
            {errors.postal_code && (
              <p className="text-xs text-danger">
                {errors.postal_code.message}
              </p>
            )}
          </div>
        </div>

        {/* Update Address button */}
        {/* Row container that right-aligns the submit button */}
        <div className="flex justify-end">
          {/* Submit button that triggers form validation and the update mutation when clicked */}
          <button
            type="submit"
            // Disable the button while the mutation is in progress, or if the form hasn't been changed (no need to save unchanged data)
            disabled={updateMutation.isPending || !isDirty}
            className="
              px-5 py-2.5 border border-gray-200 rounded-xl
              text-sm font-semibold text-gray-700
              hover:border-gray-300 hover:bg-gray-50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
          >
            {/* Conditionally show "Updating..." text while the mutation is pending, otherwise show the normal "Update Address" label */}
            {updateMutation.isPending ? "Updating..." : "Update Address"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default DeliveryAddressForm;
