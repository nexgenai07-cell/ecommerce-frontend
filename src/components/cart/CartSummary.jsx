// Order summary card shown on the right side of the Cart page
// Displays the price breakdown — subtotal, discount, shipping, and final total
// Has a coupon code input that calls the real API to apply or remove discount codes
// "Proceed to Checkout" button navigates the user to the checkout flow
// Trust badges and payment method icons at the bottom build buyer confidence

import { useState } from "react";
// useState manages the coupon input field text

import { useNavigate } from "react-router-dom";
// useNavigate redirects the user to the checkout page when they click the button

import { useMutation, useQueryClient } from "@tanstack/react-query";
// useMutation handles the apply coupon and remove coupon API calls
// useQueryClient lets us refresh the cart cache after a coupon is applied or removed

import { motion, AnimatePresence } from "framer-motion";
// AnimatePresence animates the applied coupon badge appearing and disappearing
// motion.button adds a subtle press-down effect to the checkout button

import {
  AiOutlineArrowRight, // Right arrow shown inside the "Proceed to Checkout" button
  AiOutlineClose, // X icon on the applied coupon badge to remove it
  AiOutlineTag, // Tag icon shown next to the applied coupon code
} from "react-icons/ai";

import {
  BsShieldCheck, // Shield icon for the "Secure Checkout" trust badge
  BsTruck, // Truck icon for the "Free Delivery" trust badge
  BsArrowCounterclockwise, // Return icon for the "30-Day Returns" trust badge
} from "react-icons/bs";

import { ROUTES } from "../../constants/routes";
// Centralized route constants — used to navigate to the checkout page

import { QUERY_KEYS } from "../../constants/queryKeys";
// Centralized query key constants — used to invalidate the cart cache after coupon changes

import { applyCoupon, removeCoupon } from "../../api/cart.api";
// applyCoupon — calls POST /api/v1/cart/apply-coupon/ with the coupon code
// removeCoupon — calls DELETE /api/v1/cart/remove-coupon/ to clear the active coupon

import { showSuccess, showError } from "../ui/Toast";
// Toast helpers for user feedback after coupon API calls succeed or fail

import formatPrice from "../../utils/formatPrice";
// Formats a raw number into a readable price string e.g. 1200 → "Rs. 1,200"

// Trust badges shown at the bottom of the summary card
// Defined outside the component so this array isn't recreated on every render
const TRUST_BADGES = [
  {
    icon: <BsShieldCheck className="w-3.5 h-3.5" />,
    label: "Secure 256-bit SSL Checkout",
  },
  { icon: <BsTruck className="w-3.5 h-3.5" />, label: "Free Express Delivery" },
  {
    icon: <BsArrowCounterclockwise className="w-3.5 h-3.5" />,
    label: "30-Day Easy Returns",
  },
];

// cart — the full cart object from the API, contains subtotal, total, discount, and coupon info
const CartSummary = ({ cart }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Controlled input for the coupon code the user types in
  const [couponCode, setCouponCode] = useState("");

  // Parse all price values from strings to floats for calculation
  // Default to 0 if the cart hasn't loaded yet to avoid NaN rendering
  const subtotal = parseFloat(cart?.subtotal || 0);
  const discountAmount = parseFloat(cart?.discount_amount || 0);
  const total = parseFloat(cart?.total || 0);

  // The currently applied coupon object — null if no coupon is active
  const appliedCoupon = cart?.coupon;

  // Shipping is free when subtotal is Rs. 5000 or more, or when the cart is empty
  const shippingFree = subtotal >= 5000 || subtotal === 0;
  const shippingCost = shippingFree ? 0 : 299;
  // Flat Rs. 299 shipping fee applied when order is under the free shipping threshold

  // ─────────────────────────────────────────────
  // APPLY COUPON MUTATION
  // Sends the coupon code to POST /api/v1/cart/apply-coupon/
  // On success: shows how much was saved, clears the input, refreshes cart data
  // On error: shows the server error message or a generic fallback
  // ─────────────────────────────────────────────
  const applyCouponMutation = useMutation({
    mutationFn: () => applyCoupon({ code: couponCode.trim() }),
    // .trim() removes any accidental leading/trailing spaces from the input

    onSuccess: (response) => {
      showSuccess(
        `Coupon applied! You saved ${formatPrice(response.data.discount_amount)}`,
      );
      setCouponCode("");
      // Clear the input field after successful application
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      // Refresh cart so the new discount and total are reflected immediately
    },

    onError: (error) => {
      // Try to get the specific error message from the API response
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Invalid or expired coupon code.";
      showError(message);
    },
  });

  // ─────────────────────────────────────────────
  // REMOVE COUPON MUTATION
  // Calls DELETE /api/v1/cart/remove-coupon/ to clear the active coupon
  // On success: refreshes cart so prices go back to non-discounted values
  // ─────────────────────────────────────────────
  const removeCouponMutation = useMutation({
    mutationFn: removeCoupon,

    onSuccess: () => {
      showSuccess("Coupon removed");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
    },

    onError: () => {
      showError("Failed to remove coupon. Please try again.");
    },
  });

  // Called when the coupon form is submitted
  // e.preventDefault() stops the browser from doing a full page reload on form submit
  // Guards against submitting an empty or whitespace-only coupon code
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    applyCouponMutation.mutate();
  };

  return (
    // sticky top-20 keeps the summary card visible as the user scrolls through cart items
    // rounded-2xl + border gives it a clean card appearance
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-5 sticky top-20">
      {/* ─── Card Heading ─── */}
      <h2 className="text-base font-bold text-gray-900">Order Summary</h2>

      {/* ─── Price Breakdown ─── */}
      <div className="flex flex-col gap-3">
        {/* Subtotal — sum of all item prices before discounts */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Subtotal</p>
          <p className="text-sm font-medium text-gray-800">
            {formatPrice(subtotal)}
          </p>
        </div>

        {/* Discount row — only shown when a coupon or discount is applied */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Discount</p>
            {/* Green color and minus sign visually communicates a saving */}
            <p className="text-sm font-medium text-success">
              -{formatPrice(discountAmount)}
            </p>
          </div>
        )}

        {/* Shipping — shows "Free" in green or the flat fee in grey */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Shipping</p>
          <p
            className={`text-sm font-medium ${shippingFree ? "text-success" : "text-gray-800"}`}
          >
            {shippingFree ? "Free" : formatPrice(shippingCost)}
          </p>
        </div>

        {/* Thin divider line before the total */}
        <div className="h-px bg-gray-100" />

        {/* Grand total — larger and bolder to stand out */}
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">Total</p>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(total + (shippingFree ? 0 : shippingCost))}
            {/* Adds shipping cost to total if not free */}
          </p>
        </div>
      </div>

      {/* ─── Coupon Section ─── */}
      <div className="flex flex-col gap-2">
        {/* Applied coupon badge — animates in when a coupon is active */}
        {/* AnimatePresence allows the exit animation when the coupon is removed */}
        <AnimatePresence>
          {appliedCoupon && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              // Starts invisible and collapsed
              animate={{ opacity: 1, height: "auto" }}
              // Expands and fades in when coupon is applied
              exit={{ opacity: 0, height: 0 }}
              // Collapses and fades out when coupon is removed
              className="flex items-center justify-between bg-success-light border border-success/20 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <AiOutlineTag className="w-3.5 h-3.5 text-success" />
                {/* Shows the applied coupon code in green */}
                <p className="text-xs font-semibold text-success">
                  {appliedCoupon.code} applied
                </p>
              </div>

              {/* X button to remove the active coupon */}
              <button
                onClick={() => removeCouponMutation.mutate()}
                disabled={removeCouponMutation.isPending}
                // Disabled while the remove API call is in progress
                className="text-success hover:text-green-700 transition-colors"
                aria-label="Remove coupon"
              >
                <AiOutlineClose className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon input form — only shown when no coupon is currently applied */}
        {!appliedCoupon && (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              // .toUpperCase() auto-capitalizes input since coupon codes are usually uppercase
              placeholder="Enter code"
              className="
                flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                placeholder:text-gray-400 text-gray-900 transition-all
              "
            />

            {/* Apply button — disabled while pending or if the input is empty */}
            <button
              type="submit"
              disabled={applyCouponMutation.isPending || !couponCode.trim()}
              className="
                px-4 py-2.5 border border-gray-200 rounded-xl
                text-sm font-semibold text-gray-700
                hover:border-gray-300 hover:bg-gray-50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shrink-0
              "
            >
              {/* Spinner replaces "Apply" text while the API call is in progress */}
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
      {/* whileTap gives a satisfying scale-down press effect when clicked */}
      <motion.button
        onClick={() => navigate(ROUTES.CHECKOUT)}
        whileTap={{ scale: 0.98 }}
        className="
          w-full flex items-center justify-center gap-2
          py-3.5 px-6 rounded-xl
          bg-primary text-white text-sm font-bold
          hover:bg-primary-dark active:scale-[0.98]
          transition-all duration-200
        "
      >
        Proceed to Checkout
        <AiOutlineArrowRight className="w-4 h-4" />
      </motion.button>

      {/* ─── Payment Method Icons ─── */}
      {/* Small pill badges showing accepted payment methods.
          JazzCash/Easypaisa removed — all card payments are now
          processed through Stripe (Test Mode). */}
      <div className="flex items-center justify-center gap-3">
        <div className="px-2 py-1 border border-gray-200 rounded-md">
          <p className="text-xs font-bold text-blue-600 italic">VISA</p>
        </div>
        <div className="px-2 py-1 border border-gray-200 rounded-md">
          <p className="text-xs font-bold text-red-500">MC</p>
        </div>
        <div className="px-2 py-1 border border-gray-200 rounded-md">
          <p className="text-xs font-bold text-[#635bff] italic">Stripe</p>
        </div>
      </div>

      {/* ─── Trust Badges ─── */}
      {/* Small icon + text rows that reassure the user before they check out */}
      {/* Separated from payment icons by a thin top border */}
      <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
        {TRUST_BADGES.map((badge) => (
          <div key={badge.label} className="flex items-center gap-2">
            {/* Icon rendered in green to reinforce positive/safe messaging */}
            <span className="text-success shrink-0">{badge.icon}</span>
            <p className="text-xs text-gray-400">{badge.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export so the Cart page can import and render this summary card on the right side
export default CartSummary;
