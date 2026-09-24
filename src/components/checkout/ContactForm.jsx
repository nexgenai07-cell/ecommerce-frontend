// register — React Hook Form's register function, still used to keep the phone
//         value in the form state (and included on submit) even though the
//         field itself is no longer typed into directly
// errors — validation errors object from React Hook Form, used to show error messages
// email — the customer's registered account email, shown as a read-only value. The
//         checkout request has no email field: the Order Confirmation OTP and every
//         order email always go to this registered address, so it can never be edited here.
//
// the phone field is read-only here too, same
// reasoning as the email field above — it always mirrors the account's
// registered/verified phone (see Checkout.jsx's PHONE PREFILL effect),
// the same number shown on the Profile page. It deliberately does NOT
// follow the selected delivery address's own saved phone: a delivery
// address may carry a different number on purpose (e.g. ordering as a
// gift for someone else), and that number is only ever used by the
// backend to resolve the actual delivery contact for the order — it must
// never override this account-level field. To change the number shown
// here, the customer updates their phone from the Profile page.
const ContactForm = ({ register, errors, email = "" }) => {
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

          <div className="relative">
            <input
              id="phone"
              type="tel"
              // type="tel" brings up the numeric dialpad on mobile devices
              inputMode="tel"
              maxLength={13}
              autoComplete="tel"
              // autoComplete helps browsers autofill saved phone numbers
              {...register("phone")}
              // readOnly keeps the value visible, selectable and copyable
              // while making it impossible to change from this page — see
              // the FIX note above the component for why
              readOnly
              aria-readonly="true"
              className="
                w-full pl-4 pr-4 py-2.5 text-sm rounded-xl border border-gray-200
                bg-gray-50 text-gray-500 cursor-not-allowed
                focus:outline-none
              "
            />
          </div>

          {/* Validation error message — only shown when there's a phone field error
              (e.g. the selected address has no phone at all yet) */}
          {errors?.phone && (
            <p className="text-xs text-danger">{errors.phone.message}</p>
          )}

          {/* This is the account's registered/verified phone number — the
              same one shown on the Profile page. It does not change with
              the selected delivery address. */}
          <p className="text-xs text-gray-400">
            This is your verified account phone number. To use a different
            number, update it from your Profile.
          </p>
        </div>
      </div>
    </div>
  );
};

// Export so the Checkout page can import this as a form section
export default ContactForm;
