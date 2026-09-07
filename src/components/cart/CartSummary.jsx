import { useState } from "react";
// useState is a React hook used here to hold the text the user types into the
// coupon code input box, so the input is a "controlled" input.

import { useNavigate } from "react-router-dom";
// useNavigate gives us a function to programmatically change the page/route,
// used here to send the user to the Checkout page when they click the button.

import { useMutation, useQueryClient } from "@tanstack/react-query";
// useMutation is used to perform the "apply coupon" and "remove coupon" API
// calls (POST/DELETE requests) and track their loading/success/error state.
// useQueryClient gives us access to the shared cache so we can tell React
// Query "the cart data is now stale, please refetch it" after a coupon change.

import { motion, AnimatePresence } from "framer-motion";
// motion.div / motion.button let us animate elements (fade in/out, scale on
// tap). AnimatePresence lets an element play an "exit" animation right before
// it's removed from the DOM (e.g. when the applied coupon badge disappears).

import {
  AiOutlineArrowRight, // Right-pointing arrow icon used inside the checkout button
  AiOutlineClose, // "X" icon used on the applied-coupon badge to remove the coupon
  AiOutlineTag, // Small price-tag icon shown next to the applied coupon code
} from "react-icons/ai";

import {
  BsShieldCheck, // Shield-with-checkmark icon for the "Secure Checkout" trust badge
  BsTruck, // Delivery truck icon for the "Free Delivery" trust badge
  BsArrowCounterclockwise, // Circular arrow icon for the "30-Day Returns" trust badge
} from "react-icons/bs";

import { ROUTES } from "../../constants/routes";
// ROUTES is a shared object holding every route path as a constant (e.g.
// ROUTES.CHECKOUT = "/checkout") so we never hardcode URL strings in the code.

import { QUERY_KEYS } from "../../constants/queryKeys";
// QUERY_KEYS is a shared object holding the cache key names React Query uses,
// e.g. QUERY_KEYS.CART, so every file that touches the cart cache stays in sync.

import { applyCoupon, removeCoupon } from "../../api/cart.api";
// applyCoupon() sends a POST request to /api/v1/cart/apply-coupon/ with the code.
// removeCoupon() sends a DELETE request to /api/v1/cart/remove-coupon/.

import { showSuccess, showError } from "../ui/Toast";
// Small helper functions that pop up a green (success) or red (error) toast
// notification in the corner of the screen to give the user quick feedback.

import formatPrice from "../../utils/formatPrice";
// Utility function that turns a raw number like 1200 into a nicely formatted
// currency string like "Rs. 1,200" for display purposes.

// ----------------------------------------------------------------------------
// Static list of trust badges shown near the bottom of the card.
// Declared OUTSIDE the component function so React doesn't rebuild this array
// from scratch on every single re-render — it's created only once.
// ----------------------------------------------------------------------------
const TRUST_BADGES = [
  {
    icon: <BsShieldCheck className="w-3.5 h-3.5" />, // Shield icon element
    label: "Secure 256-bit SSL Checkout", // Text shown next to the shield icon
  },
  {
    icon: <BsTruck className="w-3.5 h-3.5" />, // Truck icon element
    label: "Free Express Delivery", // Text shown next to the truck icon
  },
  {
    icon: <BsArrowCounterclockwise className="w-3.5 h-3.5" />, // Return-arrow icon
    label: "30-Day Easy Returns", // Text shown next to the return-arrow icon
  },
];

// cart — the full cart object coming from the parent Cart page component.
// It contains subtotal, discount_amount, total, and the currently applied coupon.
const CartSummary = ({ cart }) => {
  // Grabs the navigate function so we can redirect to the checkout page later.
  const navigate = useNavigate();

  // Grabs the shared React Query client so we can invalidate the cart cache.
  const queryClient = useQueryClient();

  // Local state that stores whatever the user is currently typing into the
  // coupon code text box. Starts as an empty string.
  const [couponCode, setCouponCode] = useState("");

  // Convert the subtotal string/number coming from the API into a real float.
  // Falls back to 0 if cart hasn't loaded yet, so the UI never shows "NaN".
  const subtotal = parseFloat(cart?.subtotal || 0);

  // Convert the discount amount into a float the same way as subtotal above.
  const discountAmount = parseFloat(cart?.discount_amount || 0);

  // Convert the grand total into a float the same way as subtotal above.
  const total = parseFloat(cart?.total || 0);

  // Pulls out the coupon object currently applied to this cart (if any).
  // This will be undefined/null when no coupon has been applied yet.
  const appliedCoupon = cart?.coupon;

  // Flat shipping rate everywhere in the app — no free-shipping threshold.
  // This mirrors the Standard Delivery rate selected on the Checkout page
  // (Checkout.jsx's SHIPPING_COSTS.standard), so the estimate shown here
  // on the Cart page always matches what the customer will actually see
  // and pay at Checkout. The cart being completely empty is still shown
  // as Rs. 0 shipping, since there's nothing to ship.
  const shippingCost = subtotal === 0 ? 0 : 299;

  // --------------------------------------------------------------------------
  // MUTATION: Apply Coupon
  // Sends the typed coupon code to the backend to validate and apply it.
  //
  // The backend's response already contains the fully recalculated cart
  // (items, subtotal, discount_amount, total, coupon) — the same shape as
  // GET /api/v1/cart/. So instead of just marking the cart query stale and
  // waiting for a separate refetch to land, we write that response straight
  // into the React Query cache in onSuccess. That's what makes the price
  // breakdown and the "applied coupon" badge update at the exact moment the
  // success toast appears, instead of a beat later. onSettled still
  // invalidates in the background afterwards, purely to reconcile with the
  // server in case anything else changed the cart concurrently.
  // --------------------------------------------------------------------------
  const applyCouponMutation = useMutation({
    // mutationFn is the actual function that performs the API call.
    // .trim() strips accidental leading/trailing spaces before sending.
    mutationFn: () => applyCoupon({ code: couponCode.trim() }),

    // Runs only if the API call succeeds.
    onSuccess: (response) => {
      // Show a green toast telling the user exactly how much they saved.
      showSuccess(
        `Coupon applied! You saved ${formatPrice(response.data.discount_amount)}`,
      );
      // The code that was actually submitted — used as a fallback below.
      const submittedCode = couponCode.trim();
      // Clear the input box now that the coupon has been successfully applied.
      setCouponCode("");
      // Write the updated cart straight into the cache so every component
      // reading QUERY_KEYS.CART (including this one) re-renders immediately
      // with the new discount/coupon, without waiting on a fresh GET request.
      //
      // Some backend responses only send back `discount_amount` and don't
      // include the nested `coupon` object itself — if we relied on
      // response.data alone in that case, `appliedCoupon` would stay
      // null/undefined and the green "applied" badge wouldn't show up
      // until the onSettled refetch below finally lands a moment later.
      // Synthesizing a coupon object here (from what we already know:
      // the code just submitted + the discount the server confirmed)
      // guarantees the badge appears in the very same instant as the toast,
      // regardless of whether the backend included the full object or not.
      queryClient.setQueryData(QUERY_KEYS.CART, (old) =>
        old?.data
          ? {
              ...old,
              data: {
                ...old.data,
                ...response.data,
                coupon: response.data.coupon ?? {
                  code: submittedCode,
                  discount_amount: response.data.discount_amount,
                },
              },
            }
          : old,
      );
    },

    // Runs only if the API call fails (invalid code, expired code, etc.).
    onError: (error) => {
      // Try to read a specific error message from the server's response;
      // if none exists, fall back to a generic message.
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Invalid or expired coupon code.";
      // Show a red toast with whichever message we ended up with.
      showError(message);
    },

    // Runs after either onSuccess or onError. Refetches the cart in the
    // background to true up with the server — this never blocks or delays
    // anything the user sees, since the cache was already updated above.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
  });

  // --------------------------------------------------------------------------
  // MUTATION: Remove Coupon
  // Removes whatever coupon is currently applied to this cart.
  //
  // This one updates the cache optimistically in onMutate: the coupon badge
  // disappears and the total recalculates the instant the "X" is clicked,
  // before the DELETE request even resolves. onError rolls the cache back
  // to the snapshot taken here if the request actually fails.
  // --------------------------------------------------------------------------
  const removeCouponMutation = useMutation({
    // mutationFn directly references the removeCoupon API function.
    mutationFn: () => removeCoupon(),

    // Fires immediately, before the network request is even sent.
    onMutate: async () => {
      // Stop any in-flight cart refetch from overwriting the optimistic
      // value we're about to write.
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CART });

      // Snapshot the current cache so we can restore it if the request fails.
      const previousCart = queryClient.getQueryData(QUERY_KEYS.CART);

      queryClient.setQueryData(QUERY_KEYS.CART, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            coupon: null,
            discount_amount: 0,
            // Without a discount, the total (pre-shipping) is just the subtotal.
            total: old.data.subtotal,
          },
        };
      });

      return { previousCart };
    },

    // Runs only if the removal succeeds.
    onSuccess: () => {
      // Show a green toast confirming the coupon was removed.
      showSuccess("Coupon removed");
    },

    // Runs only if the removal fails — puts the cache back the way it was
    // before the optimistic update in onMutate.
    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.CART, context.previousCart);
      }
      // Show a red toast telling the user the removal failed.
      showError("Failed to remove coupon. Please try again.");
    },

    // Refetches in the background afterwards so the cache matches the
    // server exactly, regardless of whether the request succeeded or failed.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },
  });

  // Handles the coupon <form> being submitted (Enter key or Apply button click).
  const handleApplyCoupon = (e) => {
    // Prevents the browser's default full-page reload on form submission.
    e.preventDefault();
    // Guard clause — do nothing if the input is empty or only whitespace.
    if (!couponCode.trim()) return;
    // Fires the apply-coupon mutation defined above.
    applyCouponMutation.mutate();
  };

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------
  return (
    // Outer card wrapper:
    // - bg-white + rounded-2xl + border + shadow-sm  → clean elevated card look
    // - p-5 sm:p-6                                    → comfortable inner padding, slightly more on larger screens
    // - flex flex-col gap-5                           → stacks all sections vertically with even spacing
    // - sticky top-24                                 → keeps this card visible while the user scrolls the item list
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 flex flex-col gap-5 sticky top-24">
      {/* ─── Card Heading ─── */}
      {/* Simple bold heading at the top of the card */}
      <h2 className="text-base font-bold text-gray-900">Order Summary</h2>

      {/* ─── Price Breakdown Block ─── */}
      {/* flex-col + gap-3 stacks each price row with consistent spacing */}
      <div className="flex flex-col gap-3">
        {/* Subtotal row — always shown */}
        <div className="flex items-center justify-between">
          {/* Label on the left, muted gray color since it's secondary info */}
          <p className="text-sm text-gray-500">Subtotal</p>
          {/* Value on the right, formatted as currency */}
          <p className="text-sm font-medium text-gray-800">
            {formatPrice(subtotal)}
          </p>
        </div>

        {/* Discount row — only rendered when a discount actually exists */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between">
            {/* Label on the left */}
            <p className="text-sm text-gray-500">Discount</p>
            {/* Value shown in green with a leading minus sign to signal savings */}
            <p className="text-sm font-medium text-success">
              -{formatPrice(discountAmount)}
            </p>
          </div>
        )}

        {/* Shipping row — always shown */}
        <div className="flex items-center justify-between">
          {/* Label on the left */}
          <p className="text-sm text-gray-500">Shipping</p>
          {/* Value color changes based on whether shipping is free (empty cart) or not */}
          <p
            className={`text-sm font-medium ${shippingCost === 0 ? "text-success" : "text-gray-800"}`}
          >
            {/* Shows the word "Free" in green, or the actual fee in gray */}
            {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
          </p>
        </div>

        {/* Thin 1px horizontal divider line separating the breakdown from the total */}
        <div className="h-px bg-gray-100" />

        {/* Grand Total row — the largest, boldest row in the card */}
        <div className="flex items-center justify-between">
          {/* "Total" label, bold and dark */}
          <p className="text-base font-bold text-gray-900">Total</p>
          {/* Final total value: base total + shipping cost */}
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(total + shippingCost)}
          </p>
        </div>
      </div>

      {/* ─── Coupon Section ─── */}
      {/* Wrapper for either the "applied coupon" badge OR the input form */}
      <div className="flex flex-col gap-2">
        {/* AnimatePresence lets the badge below play an exit animation
            (fade + collapse) right before it's removed from the page */}
        <AnimatePresence>
          {/* Only render the applied-coupon badge if a coupon is currently active */}
          {appliedCoupon && (
            <motion.div
              // Starting animation state: invisible and zero height
              initial={{ opacity: 0, height: 0 }}
              // Animates to: fully visible and full natural height
              animate={{ opacity: 1, height: "auto" }}
              // When removed from the DOM, animates back to invisible/zero height
              exit={{ opacity: 0, height: 0 }}
              // Light green background badge with a subtle green border
              className="flex items-center justify-between bg-success-light border border-success/20 rounded-lg px-3 py-2"
            >
              {/* Left side of the badge: tag icon + coupon code text */}
              <div className="flex items-center gap-2">
                {/* Small tag icon, colored green to match the success theme */}
                <AiOutlineTag className="w-3.5 h-3.5 text-success" />
                {/* Shows the actual applied coupon code, e.g. "SAVE20 applied" */}
                <p className="text-xs font-semibold text-success">
                  {appliedCoupon.code} applied
                </p>
              </div>

              {/* Right side of the badge: an "X" button to remove the coupon */}
              <button
                // Fires the remove-coupon mutation when clicked
                onClick={() => removeCouponMutation.mutate()}
                // Disabled while the remove request is still in flight
                disabled={removeCouponMutation.isPending}
                className="text-success hover:text-green-700 transition-colors"
                aria-label="Remove coupon"
              >
                {/* The "X" icon itself */}
                <AiOutlineClose className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon input form — only shown when there is NO active coupon */}
        {!appliedCoupon && (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            {/* Text input where the user types their coupon code */}
            <input
              type="text"
              // Controlled input: value always reflects the couponCode state
              value={couponCode}
              // Updates state on every keystroke; forces uppercase since
              // coupon codes are conventionally written in capital letters
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="
                flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                placeholder:text-gray-400 text-gray-900 transition-all
              "
            />

            {/* Submit button that triggers the apply-coupon mutation via the form's onSubmit */}
            <button
              type="submit"
              // Disabled while a request is pending, or if the input is empty/whitespace
              disabled={applyCouponMutation.isPending || !couponCode.trim()}
              className="
                px-4 py-2.5 border border-gray-200 rounded-xl
                text-sm font-semibold text-gray-700
                hover:border-gray-300 hover:bg-gray-50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shrink-0
              "
            >
              {/* Shows a spinning loader while pending, otherwise shows "Apply" text */}
              {applyCouponMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
              ) : (
                "Apply"
              )}
            </button>
          </form>
        )}
      </div>

      {/* ─── Proceed to Checkout Button ─── */}
      <motion.button
        // Navigates to the Checkout route when clicked
        onClick={() => navigate(ROUTES.CHECKOUT)}
        // Gives a subtle "press down" scale effect while the button is being tapped/clicked
        whileTap={{ scale: 0.98 }}
        className="
          w-full flex items-center justify-center gap-2
          py-3.5 px-6 rounded-xl
          bg-linear-to-r from-primary to-primary-dark text-white text-sm font-bold
          shadow-md shadow-primary/20
          hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98]
          transition-all duration-200
        "
      >
        {/* Button label text */}
        Proceed to Checkout
        {/* Right arrow icon at the end of the button */}
        <AiOutlineArrowRight className="w-4 h-4" />
      </motion.button>

      {/* ─── Payment Method Icons ─── */}
      {/* Static row of small pill badges showing which payment methods this
          store accepts. Purely informational — not clickable. */}
      <div className="flex items-center justify-center gap-3">
        {/* VISA pill */}
        <div className="px-2 py-1 border border-gray-200 rounded-md">
          <p className="text-xs font-bold text-blue-600 italic">VISA</p>
        </div>
        {/* MasterCard pill */}
        <div className="px-2 py-1 border border-gray-200 rounded-md">
          <p className="text-xs font-bold text-red-500">MC</p>
        </div>
        {/* Stripe pill (all card payments are processed through Stripe Test Mode) */}
        <div className="px-2 py-1 border border-gray-200 rounded-md">
          <p className="text-xs font-bold text-[#635bff] italic">Stripe</p>
        </div>
      </div>

      {/* ─── Trust Badges ─── */}
      {/* Small icon + text rows reassuring the buyer before checkout.
          Separated from the payment icons above by a thin top border. */}
      <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
        {/* Loops over the static TRUST_BADGES array defined at the top of the file */}
        {TRUST_BADGES.map((badge) => (
          // key uses the badge's label since each label is unique in this list
          <div key={badge.label} className="flex items-center gap-2">
            {/* The badge's icon, colored green (success) for a positive/safe feel */}
            <span className="text-success shrink-0">{badge.icon}</span>
            {/* The badge's descriptive text, in muted gray */}
            <p className="text-xs text-gray-400">{badge.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Exported as default so the Cart page can import it as: import CartSummary from "..."
export default CartSummary;
