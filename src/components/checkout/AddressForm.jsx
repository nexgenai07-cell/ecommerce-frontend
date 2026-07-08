// Delivery Address section of the Checkout form
// Collects full name, street address, city, province, and postal code
// Province field is a dropdown with all Pakistani provinces and territories
// Has a checkbox to save the address for future orders
// This is a controlled form section — all state lives in the parent's React Hook Form instance

// register — React Hook Form's register function, connects each input to the form state
// errors — validation errors object from React Hook Form, used to show field-level error messages
const AddressForm = ({ register, errors }) => {
  // All Pakistani provinces and territories shown in the province dropdown
  // Defined inside the component — small static list so no need to move it outside
  const PROVINCES = [
    "Punjab",
    "Sindh",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Azad Kashmir",
    "Gilgit-Baltistan",
    "Islamabad",
  ];

  return (
    // White card matching the style of all other checkout section cards
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
      {/* Section heading — tells the user this card is for their delivery address */}
      <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>

      {/* ─── Full Name ─── */}
      {/* Full-width field — takes the whole row on its own */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          // autoComplete="name" lets browsers autofill the user's saved full name
          {...register("fullName")}
          // Registers this field with React Hook Form for validation and value tracking
          className={`
            w-full px-4 py-2.5 text-sm rounded-xl border bg-white
            placeholder:text-gray-300 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            transition-all
            ${
              errors?.fullName
                ? "border-danger focus:ring-danger"
                : // Red border and red focus ring when validation fails
                  "border-gray-200"
              // Normal grey border when valid or untouched
            }
          `}
        />
        {/* Error message only appears when React Hook Form reports a fullName error */}
        {errors?.fullName && (
          <p className="text-xs text-danger">{errors.fullName.message}</p>
        )}
      </div>

      {/* ─── Street Address ─── */}
      {/* Full-width field for house number and street name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="street" className="text-sm font-medium text-gray-700">
          Street Address
        </label>
        <input
          id="street"
          type="text"
          placeholder="House #, Street name"
          autoComplete="street-address"
          // autoComplete="street-address" enables browser autofill for saved addresses
          {...register("street")}
          className={`
            w-full px-4 py-2.5 text-sm rounded-xl border bg-white
            placeholder:text-gray-300 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            transition-all
            ${errors?.street ? "border-danger focus:ring-danger" : "border-gray-200"}
          `}
        />
        {errors?.street && (
          <p className="text-xs text-danger">{errors.street.message}</p>
        )}
      </div>

      {/* ─── City + Province + Postal Code Row ─── */}
      {/* 3-column grid on sm+ screens, stacks to single column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* City input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium text-gray-700">
            City
          </label>
          <input
            id="city"
            type="text"
            placeholder="Lahore"
            // Placeholder shows a common Pakistani city as an example
            autoComplete="address-level2"
            // address-level2 is the standard autoComplete value for city fields
            {...register("city")}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors?.city ? "border-danger focus:ring-danger" : "border-gray-200"}
            `}
          />
          {errors?.city && (
            <p className="text-xs text-danger">{errors.city.message}</p>
          )}
        </div>

        {/* Province dropdown */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="province"
            className="text-sm font-medium text-gray-700"
          >
            Province
          </label>
          {/* Native select for simplicity — easier to use on mobile than a custom dropdown */}
          {/* appearance-none removes the browser's default dropdown arrow styling */}
          <select
            id="province"
            {...register("province")}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              text-gray-900 cursor-pointer appearance-none
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors?.province ? "border-danger focus:ring-danger" : "border-gray-200"}
            `}
          >
            {/* Default empty option prompts the user to make a selection */}
            <option value="">Select Province</option>
            {/* Render one option per province in the PROVINCES array */}
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errors?.province && (
            <p className="text-xs text-danger">{errors.province.message}</p>
          )}
        </div>

        {/* Postal Code input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="postalCode"
            className="text-sm font-medium text-gray-700"
          >
            Postal Code
          </label>
          <input
            id="postalCode"
            type="text"
            // type="text" instead of type="number" to allow leading zeros in postal codes
            placeholder="54000"
            // 54000 is Lahore's postal code — gives the user a familiar example
            autoComplete="postal-code"
            {...register("postalCode")}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${errors?.postalCode ? "border-danger focus:ring-danger" : "border-gray-200"}
            `}
          />
          {errors?.postalCode && (
            <p className="text-xs text-danger">{errors.postalCode.message}</p>
          )}
        </div>
      </div>

      {/* ─── Save Address Checkbox ─── */}
      {/* Wrapped in a label so clicking the text also toggles the checkbox */}
      {/* select-none prevents the label text from being accidentally highlighted on click */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          {...register("saveAddress")}
          // Registers the checkbox — its value will be true or false in the form data
          className="w-4 h-4 rounded accent-primary cursor-pointer"
          // accent-primary colors the checkbox with the brand color when checked
        />
        <span className="text-sm text-gray-600">
          Save address for future purchases
        </span>
      </label>
    </div>
  );
};

// Export so the Checkout page can import this as a form section
export default AddressForm;
