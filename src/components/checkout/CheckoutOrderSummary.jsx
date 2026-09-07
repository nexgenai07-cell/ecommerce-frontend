// React hook for managing local component state
import { useState } from "react";
// React Query hooks — useMutation for performing API mutations (POST/PUT/DELETE), useQueryClient to access the query cache for invalidation
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Icons from react-icons (Ai = Ant Design set) — close/cross icon and tag icon (used for coupon display)
import { AiOutlineClose, AiOutlineTag } from "react-icons/ai";
// Shield check icon from react-icons (Bs = Bootstrap set) — used for buyer protection & trust badges
import { BsShieldCheck } from "react-icons/bs";
// Centralized query key constants used by React Query to identify/cache/invalidate specific queries (here, the cart query)
import { QUERY_KEYS } from "../../constants/queryKeys";
// API functions to apply or remove a coupon code, imported from the cart API module
import { applyCoupon, removeCoupon } from "../../api/cart.api";
// Custom toast notification helpers to show success or error messages to the user
import { showSuccess, showError } from "../ui/Toast";
// Utility function to format raw numeric price values into a readable currency string
import formatPrice from "../../utils/formatPrice";

// Main functional component for the Checkout Order Summary sidebar
// Props:
// cart -> cart object containing items, subtotal, discount, coupon info etc.
// total -> final total price to be paid
// shippingCost -> calculated shipping cost passed from parent
// onPlaceOrder -> callback function triggered when "Place Order" button is clicked
// isPlacingOrder -> boolean flag indicating if order placement request is currently in progress (used to show loading state)
// showPlaceOrderButton -> hides this button once checkout has moved to the Stripe
//                         payment step (that step has its own "Pay Now" button)
// placeOrderLabel -> lets the parent change the button text ("Place Order" vs
//                    "Continue to Payment") depending on which step we're on
const CheckoutOrderSummary = ({
  cart,
  total,
  shippingCost,
  onPlaceOrder,
  isPlacingOrder,
  showPlaceOrderButton = true,
  placeOrderLabel = "Place Order",
}) => {
  // Getting access to the React Query client instance so we can manually invalidate/refetch queries after mutations
  const queryClient = useQueryClient();

  // Local state to store the coupon code text typed by the user in the input field
  const [couponCode, setCouponCode] = useState("");

  // Extracting the list of cart items safely; falls back to an empty array if cart or items is undefined
  const cartItems = cart?.items || [];
  // Converting subtotal string/value from cart object into a proper float number; defaults to 0 if missing
  const subtotal = parseFloat(cart?.subtotal || 0);
  // Converting discount amount from cart object into a float number; defaults to 0 if missing
  const discountAmount = parseFloat(cart?.discount_amount || 0);
  // Extracting the currently applied coupon object (if any) from the cart data
  const appliedCoupon = cart?.coupon;

  // =============================================
  // APPLY COUPON
  // API 37 — POST /api/v1/cart/apply-coupon/
  // =============================================
  // The response already carries the fully recalculated cart (items,
  // subtotal, discount_amount, total, coupon) — same shape as GET
  // /api/v1/cart/. Writing it directly into the QUERY_KEYS.CART cache in
  // onSuccess means the parent Checkout page's cart query updates (and this
  // sidebar re-renders with the new discount) at the same moment the success
  // toast shows, instead of waiting on a separate refetch to land afterwards.
  const applyCouponMutation = useMutation({
    // The actual API call function — sends the trimmed coupon code to the backend
    mutationFn: () => applyCoupon({ code: couponCode.trim() }),
    // Runs when the coupon is successfully applied
    onSuccess: (response) => {
      showSuccess("Coupon applied!"); // Show a success toast notification to the user
      setCouponCode(""); // Clear the input field after successful application
      queryClient.setQueryData(QUERY_KEYS.CART, (old) =>
        old?.data ? { ...old, data: { ...old.data, ...response.data } } : old,
      );
    },
    // Runs if the coupon application API call fails
    onError: (error) => {
      showError(
        error?.response?.data?.message || "Invalid coupon code.",
        // Show the specific error message from the server if available, otherwise show a generic fallback message
      );
    },
    // Refetches in the background afterwards purely to reconcile with the
    // server; the cache is already correct by the time this runs.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
  });

  // =============================================
  // REMOVE COUPON
  // API 38
  // =============================================
  // Updates the cache optimistically in onMutate, so the coupon badge and
  // the total recalculate the instant the "X" is clicked, before the DELETE
  // request resolves. onError restores the snapshot taken here if the
  // request actually fails.
  const removeCouponMutation = useMutation({
    mutationFn: () => removeCoupon(), // Directly using the removeCoupon API function as the mutation function

    // Fires immediately, before the network request is even sent.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });

      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            coupon: null,
            discount_amount: 0,
            total: old.data.subtotal,
          },
        };
      });

      return { previousCart };
    },

    // Runs when coupon removal succeeds
    onSuccess: () => {
      showSuccess("Coupon removed"); // Notify user that coupon was successfully removed
    },

    // Runs if coupon removal fails — restores the pre-removal cache snapshot
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      showError("Failed to remove coupon.");
    },

    // Refetches in the background afterwards so the cache matches the
    // server exactly, regardless of whether the request succeeded or failed.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
  });

  return (
    // Outer sidebar container — white background, rounded corners, light border, padding, vertical spacing
    // "sticky top-6" makes this sidebar stick to the top while scrolling on larger screens (desktop)
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-5 sticky top-6">
      {/* Cart items list */}
      {/* Vertical list container holding each cart item row */}
      <div className="flex flex-col gap-3 max-h-60 overflow-y-auto scrollbar-hide pr-1">
        {/* Looping through each item in the cart to render its image and details */}
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            {/* Product image */}
            {/* Small square thumbnail container with rounded corners, border, and hidden overflow to clip the image neatly */}
            <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
              <img
                src={item.product.primary_image || "/placeholder-product.svg"}
                // Uses the product's primary image if available, otherwise falls back to a local placeholder image
                alt={item.product.name} // Accessibility text describing the image using the product's name
                className="w-full h-full object-cover"
                // Image fills the container completely while maintaining aspect ratio (cropping if necessary)
              />
            </div>

            {/* Product details */}
            {/* Text details next to the image — takes remaining horizontal space */}
            <div className="flex-1 min-w-0">
              {/* Product name, truncated to a single line if too long */}
              <p className="text-sm font-medium text-gray-800 line-clamp-1">
                {item.product.name}
              </p>
              {/* Category name and quantity ordered, shown as secondary info in light gray */}
              <p className="text-xs text-gray-400">
                {item.product.category?.name} • Qty {item.quantity}
              </p>
              {/* Price of this product, formatted into proper currency display */}
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {formatPrice(parseFloat(item.product.price))}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      {/* Thin horizontal line used to visually separate the cart items list from the next section */}
      <div className="h-px bg-gray-100" />

      {/* Coupon code */}
      {/* BUGFIX: the apply/remove coupon controls used to render unconditionally,
          which meant a customer could still add or remove a coupon on the
          Stripe "payment" step — AFTER the order (and its PaymentIntent
          amount) had already been created server-side. Doing so silently
          changed the on-screen total without touching what Stripe would
          actually charge. Coupons should only be editable while we're still
          on the "details" step, before the order exists — same gating the
          "Place Order" button already uses (showPlaceOrderButton). Once the
          order is placed, we just show the coupon that was used (read-only,
          no remove button) so the customer can still see it was applied. */}
      {showPlaceOrderButton ? (
        appliedCoupon ? (
          <div className="flex items-center justify-between bg-success-light border border-success/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              {/* Tag icon representing a coupon/discount code */}
              <AiOutlineTag className="w-3.5 h-3.5 text-success" />
              {/* Displaying the actual applied coupon code text */}
              <p className="text-xs font-semibold text-success">
                {appliedCoupon.code}
              </p>
            </div>
            {/* Button to remove the currently applied coupon */}
            <button
              onClick={() => removeCouponMutation.mutate()}
              // Triggers the removeCouponMutation when clicked, which calls the remove coupon API
              className="text-success hover:text-green-700"
            >
              {/* Close/X icon indicating this button removes the coupon */}
              <AiOutlineClose className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          // If no coupon is applied yet, show a form with an input field and "Apply" button
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyCouponMutation.mutate();
            }}
            // Prevents default form submission (page reload) and instead triggers the apply coupon mutation
            className="flex gap-2"
          >
            <input
              type="text"
              value={couponCode} // Controlled input — value tied to local couponCode state
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              // Updates state on every keystroke, automatically converting input to uppercase (common for coupon codes)
              placeholder="Coupon Code" // Placeholder text shown when input is empty
              className="
                flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                placeholder:text-gray-300 transition-all
              "
              // Input takes remaining space in the flex row, styled with border, padding, and emerald focus ring
            />
            <button
              type="submit" // Submitting this form triggers the onSubmit handler above
              disabled={!couponCode.trim() || applyCouponMutation.isPending}
              // Button is disabled if input is empty/whitespace-only, OR if a coupon application request is already in progress
              className="
                px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700
                hover:border-gray-300 hover:bg-gray-50
                disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0
              "
            >
              Apply
            </button>
          </form>
        )
      ) : (
        appliedCoupon && (
          // Payment step, order already created — show the coupon as an
          // inert badge (no remove button) purely for the customer's info.
          <div className="flex items-center gap-2 bg-success-light border border-success/20 rounded-lg px-3 py-2">
            <AiOutlineTag className="w-3.5 h-3.5 text-success" />
            <p className="text-xs font-semibold text-success">
              {appliedCoupon.code} applied
            </p>
          </div>
        )
      )}

      {/* Price breakdown */}
      {/* Container listing all individual cost components that make up the final total */}
      <div className="flex flex-col gap-2.5">
        {/* Subtotal row — label on left, formatted amount on right */}
        <div className="flex justify-between text-sm">
          <p className="text-gray-500">Subtotal</p>
          <p className="font-medium text-gray-800">{formatPrice(subtotal)}</p>
        </div>

        {/* Only show the discount row if there's an actual discount amount greater than 0 */}
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <p className="text-gray-500">Discount</p>
            {/* Discount shown in green with a minus sign to indicate it reduces the total */}
            <p className="font-medium text-success">
              -{formatPrice(discountAmount)}
            </p>
          </div>
        )}

        {/* Shipping cost row */}
        <div className="flex justify-between text-sm">
          <p className="text-gray-500">Shipping</p>
          <p
            className={`font-medium ${shippingCost === 0 ? "text-success" : "text-gray-800"}`}
          >
            {/* If shipping cost is exactly 0, show green "Free" text, otherwise show the formatted shipping price in normal gray */}
            {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
          </p>
        </div>

        {/* Tax row — currently hardcoded to display 0, likely a placeholder until real tax calculation is implemented */}
        <div className="flex justify-between text-sm">
          <p className="text-gray-500">Tax (Estimated)</p>
          <p className="font-medium text-gray-800">{formatPrice(0)}</p>
        </div>

        {/* Divider */}
        {/* Thin horizontal line separating the cost breakdown from the final total row */}
        <div className="h-px bg-gray-100 my-1" />

        {/* Total */}
        {/* Final total row — larger, bolder text to emphasize the final amount the user needs to pay */}
        <div className="flex justify-between">
          <p className="text-base font-bold text-gray-900">Total</p>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(total)}
          </p>
        </div>
      </div>

      {/* Buyer Protection card */}
      {/* Informational box reassuring the buyer about refund protection, styled with a light green/success background */}
      <div className="bg-success-light border border-success/20 rounded-xl p-4 flex items-start gap-3">
        {/* Shield checkmark icon representing protection/security */}
        <BsShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div>
          {/* Bold heading for the buyer protection message */}
          <p className="text-sm font-semibold text-success">Buyer Protection</p>
          {/* Description explaining what buyer protection covers */}
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Full refund if the item is not as described or is not delivered.
          </p>
        </div>
      </div>

      {/* Place Order button */}
      {/* Only shown while we're still on the address/shipping step — once the
          order is created and we've moved to the Stripe payment step, the
          PaymentMethod component renders its own "Pay Now" button instead */}
      {showPlaceOrderButton && (
        <button
          onClick={onPlaceOrder} // Calls the parent-provided function to actually place the order when clicked
          disabled={isPlacingOrder}
          // Disables the button while the order placement request is in progress, preventing duplicate submissions
          className="
            w-full flex items-center justify-center gap-2
            py-3.5 px-6 rounded-xl
            bg-primary text-white text-sm font-bold
            hover:bg-primary-dark active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-all duration-200
          "
        >
          {/* Conditional content inside the button: show a spinning loader while placing order, otherwise show the button text with total price */}
          {isPlacingOrder ? (
            // Animated spinning circle (loading indicator) shown while the order is being placed
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            // Button label — "Place Order" or "Continue to Payment" depending on parent, with the formatted total price
            `${placeOrderLabel} — ${formatPrice(total)}`
          )}
        </button>
      )}

      {/* Trust icons row */}
      {/* Row of small trust badges (Secure, Protected, Encrypted) shown at the bottom to build user confidence */}
      <div className="flex items-center justify-center gap-4">
        {/* First trust badge: Secure */}
        <div className="flex flex-col items-center gap-1 text-gray-300">
          <BsShieldCheck className="w-5 h-5" />
          <p className="text-xs">Secure</p>
        </div>
        {/* Second trust badge: Protected */}
        <div className="flex flex-col items-center gap-1 text-gray-300">
          <BsShieldCheck className="w-5 h-5" />
          <p className="text-xs">Protected</p>
        </div>
        {/* Third trust badge: Encrypted */}
        <div className="flex flex-col items-center gap-1 text-gray-300">
          <BsShieldCheck className="w-5 h-5" />
          <p className="text-xs">Encrypted</p>
        </div>
      </div>
    </div>
  );
};

// Exporting this component so it can be imported and used in the checkout page
export default CheckoutOrderSummary;
