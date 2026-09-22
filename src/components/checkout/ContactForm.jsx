// register — React Hook Form's register function, connects the phone input to the form state
// errors — validation errors object from React Hook Form, used to show error messages
// email — the customer's registered account email, shown as a read-only value. The
//         checkout request has no email field: the Order Confirmation OTP and every
//         order email always go to this registered address, so it can never be edited here.
// onPhoneEdited — optional callback fired when the customer types in the phone field, so the
//         parent knows the number was chosen by the customer and must not be overwritten
//         by an automatic prefill
const ContactForm = ({ register, errors, email = "", onPhoneEdited }) => {
  return (
    // White card with rounded corners and a subtle border — matches all checkout section cards
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
      {/* Section heading — tells the user what information this card is collecting */}
      <h2 className="text-lg font-bold text-gray-900">Contact Information</h2>

      {/* Two-column grid on sm+ screens, single column on mobile */}
      {/* Email and phone sit side by side on wider screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ─── Email Field (read-only) ─── */}
        <div className="flex flex-col gap-1.5">
          {/* htmlFor matches the input's id so clicking the label focuses the input */}
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address
          </label>

          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              // readOnly keeps the value visible, selectable and copyable
              // while making it impossible to change from this page
              readOnly
              aria-readonly="true"
              autoComplete="email"
              className="
                w-full pl-4 pr-4 py-2.5 text-sm rounded-xl border border-gray-200
                bg-gray-50 text-gray-500 cursor-not-allowed
                focus:outline-none
              "
            />
          </div>

          {/* Explains where the Order Confirmation OTP and order emails are sent */}
          <p className="text-xs text-gray-400">
            Your Order Confirmation OTP and order emails are sent to this
            registered email address.
          </p>
        </div>

        {/* ─── Phone Field ─── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone Number
          </label>

          <input
            id="phone"
            type="tel"
            // type="tel" brings up the numeric dialpad on mobile devices
            inputMode="tel"
            maxLength={13}
            placeholder="+92 300 1234567"
            // Placeholder shows the expected Pakistani phone number format
            autoComplete="tel"
            // autoComplete helps browsers autofill saved phone numbers
            {...register("phone")}
            onChange={(e) => {
              // Block anything that isn't a digit or a leading "+" --
              // letters, commas, spaces typed mid-number, etc. are
              // stripped out before they ever reach the field, so the
              // user physically cannot type an invalid character
              e.target.value = e.target.value
                .replace(/[^\d+]/g, "")
                .replace(/(?!^)\+/g, "");
              // Tells the parent the number now comes from the customer
              onPhoneEdited?.();
              register("phone").onChange(e);
            }}
            className={`
              w-full px-4 py-2.5 text-sm rounded-xl border bg-white
              placeholder:text-gray-300 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-all
              ${
                errors?.phone
                  ? "border-danger focus:ring-danger"
                  : // Red border and red ring when phone validation fails
                    "border-gray-200"
              }
            `}
          />

          {/* Validation error message — only shown when there's a phone field error */}
          {errors?.phone && (
            <p className="text-xs text-danger">{errors.phone.message}</p>
          )}

          {/* The order is shipped to a saved address exactly as it is stored,
              so a changed number is saved onto that address when the order
              is placed */}
          <p className="text-xs text-gray-400">
            If you change this number, it is also saved on the delivery address
            you select.
          </p>
        </div>
      </div>
    </div>
  );
};

// Export so the Checkout page can import this as a form section
export default ContactForm;
