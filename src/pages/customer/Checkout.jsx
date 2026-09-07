// React hooks — useState for local state, useEffect for side effects like redirect-on-load checks
import { useState, useEffect } from "react";
// React Router hooks — useNavigate to redirect programmatically, useSearchParams
// to read the "resume" query param used by the failed-payment retry flow
import { useNavigate, useSearchParams } from "react-router-dom";
// React Query hooks — useQuery to fetch data, useMutation to perform write operations, useQueryClient to manually manage cache
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// React Hook Form's main hook for managing form state, validation, and submission
import { useForm } from "react-hook-form";
// Resolver that connects Zod validation schemas with react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";
// Zod library used to define and validate the shape/rules of form data
import { z } from "zod";
import {
  EMAIL_REGEX,
  EMAIL_INVALID_MESSAGE,
} from "../../utils/emailValidation";
// Framer Motion's "motion" component used to animate sections sliding/fading in
import { motion, AnimatePresence } from "framer-motion";
// Stripe.js loader — dynamically loads Stripe using the publishable_key returned
// by our OWN backend (API 69), never hardcoded on the frontend
import { loadStripe } from "@stripe/stripe-js";
// Elements — the provider component that gives Stripe context (clientSecret,
// appearance, etc.) to PaymentElement/useStripe/useElements down the tree
import { Elements } from "@stripe/react-stripe-js";
// API function to fetch the current user's cart data, and to add items
// back to it — used by the Cancel Order flow below to restore the cart
// (per API_Documentation v3.0: Cancel Order / API 58 only restores
// product STOCK and processes a refund — it does NOT touch the
// customer's cart, so the frontend has to rebuild it manually)
import { getCart, addToCart } from "../../api/cart.api";
// API function to submit the checkout request and place the order, to
// fetch an existing order's details (needed for the resume-payment flow),
// and to cancel a pending order (used by the "Cancel Order" action below —
// same endpoint OrderDetail.jsx already uses for this)
import { checkout, getOrderDetail, cancelOrder } from "../../api/orders.api";
// API function to create a Stripe Payment Intent for an existing order (API 69)
import { createPaymentIntent } from "../../api/payments.api";
// Custom hook providing authentication state (isAuthenticated flag and logged-in user info)
import useAuth from "../../hooks/useAuth";
// Custom hook providing cart-related actions, here specifically used to clear cart from Redux store
import useCart from "../../hooks/useCart";
// Toast notification helpers to display success/error messages to the user
import { showSuccess, showError } from "../../components/ui/Toast";
// Confirmation dialog + its form controls — same components OrderDetail.jsx
// uses for its own "Cancel Order" modal, reused here for consistency
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
// Centralized route path constants (e.g. login, products, order detail pages)
import { ROUTES } from "../../constants/routes";
// Centralized React Query key constants used for caching/invalidating specific queries
import { QUERY_KEYS } from "../../constants/queryKeys";
// Layout wrapper component that applies consistent max-width/padding container styling
import Container from "../../components/layouts/Container";
// Stepper component showing progress through Cart > Checkout > Confirmation stages
import CheckoutStepper from "../../components/checkout/CheckoutStepper";
// Sub-component handling contact information fields (email, phone)
import ContactForm from "../../components/checkout/ContactForm";
// Sub-component handling delivery address fields (name, street, city, etc.)
import AddressForm from "../../components/checkout/AddressForm";
// Sub-component for selecting shipping method (standard/express)
import ShippingMethod from "../../components/checkout/ShippingMethod";
// Sub-component rendering the Stripe Payment Element + "Pay Now" button
import PaymentMethod from "../../components/checkout/PaymentMethod";
// Lets the customer pick Card (Stripe) vs QR Payment before placing the order
import PaymentMethodSelector from "../../components/checkout/PaymentMethodSelector";
// Shown instead of PaymentMethod once a QR order is placed — QR code + proof upload
import QrPaymentPanel from "../../components/checkout/QrPaymentPanel";
import { PAYMENT_METHOD } from "../../constants/statusTypes";
// Sub-component showing the order summary sidebar with cart items, totals, and place order button
import CheckoutOrderSummary from "../../components/checkout/CheckoutOrderSummary";
// Reusable empty state component shown when there's nothing to display (e.g. empty cart)
import EmptyState from "../../components/ui/EmptyState";
// Formats a raw number into a readable "Rs. X,XXX" string
import formatPrice from "../../utils/formatPrice";

// =============================================
// ZOD VALIDATION SCHEMA
// Ab sirf Contact + Address + Shipping validate hote hain.
// Card/JazzCash/COD fields aur unki .refine() conditional validation
// poori tarah HATA DI GAYI HAI — payment ab Stripe Elements khud
// validate karta hai (apni PaymentElement UI ke andar).
// =============================================
const checkoutSchema = z.object({
  // Contact
  // Email field — must not be empty and must match a valid email format.
  // .trim() strips accidental leading/trailing spaces (very common from
  // copy-paste) before the format check runs.
  email: z
    .string()
    .trim()
    .min(1, "Email required")
    .regex(EMAIL_REGEX, EMAIL_INVALID_MESSAGE)
    .max(255, "Email is too long"),
  // Phone field — must not be empty and must match Pakistani phone number pattern (+92 or 0 followed by 10 digits)
  phone: z
    .string()
    .trim()
    .min(1, "Phone required")
    .regex(/^(\+92|0)[0-9]{10}$/, "Invalid Pakistani phone number"),

  // NOTE: the delivery address itself is intentionally NOT part of this
  // schema anymore. It used to be five raw text fields (fullName, street,
  // city, province, postalCode) typed directly into this form. Delivery
  // addresses now live in the customer's Address Book instead — the
  // customer picks one (or adds a new one inline) via AddressForm.jsx,
  // and the chosen address's id is tracked separately as
  // "selectedAddressId" state below, then validated on submit and sent
  // to the backend as "address_id".

  // Shipping
  // Shipping method — required, user must select one (standard/express)
  shippingMethod: z.string().min(1, "Please select a shipping method"),
});

// Shipping cost config
// Simple lookup object mapping shipping method ids to their respective cost in currency units.
// Flat rates — no free-shipping threshold. Whatever the customer selects
// here is the single source of truth for shipping cost everywhere else
// in the app (Cart page estimate, Checkout total, and the saved order).
const SHIPPING_COSTS = {
  standard: 299, // Standard delivery — flat Rs. 299, always (no free threshold)
  express: 999, // Express shipping costs 999
};

// =============================================
// CHECKOUT LOADING SKELETON
// =============================================
// Shown while the cart request (used to populate both the form defaults
// and the order summary sidebar) is still in flight. Previously this page
// had no loading placeholder at all: the moment a visitor landed here, the
// order summary rendered immediately with an empty item list and a Rs. 0
// total, then suddenly snapped to the real items and price once the cart
// request resolved — the exact "small skeleton, then everything jumps
// bigger" problem this skeleton exists to prevent.
//
// The page header (CheckoutStepper) never depends on the cart request, so
// it is reused here directly instead of being re-implemented as a
// placeholder — this guarantees it is pixel-identical to the real header
// in every state. Only the parts that actually depend on the cart data —
// the three form cards on the left and the order summary card on the
// right — are mocked, matching each real component's structure, spacing,
// and element sizes one-for-one.
const CheckoutSkeleton = () => (
  <div className="min-h-screen bg-gray-50 lg:px-20">
    {/* Stepper — identical to the real header, not a placeholder */}
    <div className="bg-white border-b border-gray-100 py-4">
      <Container>
        <CheckoutStepper currentStep={2} />
      </Container>
    </div>

    <Container className="py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ===== LEFT — Contact / Address / Shipping form cards ===== */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Contact Information — matches ContactForm.jsx: heading plus a
              2-column grid of labeled inputs on sm+ screens */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-28 bg-gray-100 rounded" />
                  {/* h-10.5: matches the real "py-2.5 text-sm" input height */}
                  <div className="h-10.5 w-full bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address — matches AddressForm.jsx: heading, two
              full-width fields, then a 3-column City/Province/Postal Code
              row, then the "save address" checkbox row */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5 animate-pulse">
            <div className="h-6 w-44 bg-gray-200 rounded" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-20 bg-gray-100 rounded" />
              <div className="h-10.5 w-full bg-gray-100 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-28 bg-gray-100 rounded" />
              <div className="h-10.5 w-full bg-gray-100 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-16 bg-gray-100 rounded" />
                  <div className="h-10.5 w-full bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 bg-gray-100 rounded" />
              <div className="h-3.5 w-56 bg-gray-100 rounded" />
            </div>
          </div>

          {/* Shipping Method — matches ShippingMethod.jsx: heading plus a
              2-column grid of the two option cards (real cards render at
              roughly 80px tall once icon, label, price, and estimate text
              are all accounted for) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 animate-pulse">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl border-2 border-gray-100 bg-gray-50"
                />
              ))}
            </div>
          </div>

          {/* Mobile "Continue to Payment" button — only rendered below the
              lg breakpoint, exactly like the real button it replaces */}
          <div className="lg:hidden h-12.5 w-full bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* ===== RIGHT — Order Summary sidebar ===== */}
        {/* hidden lg:block: matches the real sidebar, which is desktop-only */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-5 sticky top-6 animate-pulse">
            {/* Cart item rows — matches CheckoutOrderSummary.jsx's thumbnail
                + name/category/price stack */}
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
                    <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    <div className="h-3.5 w-16 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px bg-gray-100" />

            {/* Coupon input row */}
            <div className="flex gap-2">
              <div className="flex-1 h-10.5 bg-gray-100 rounded-xl" />
              <div className="w-16 h-10.5 bg-gray-100 rounded-xl shrink-0" />
            </div>

            {/* Price breakdown — Subtotal, Shipping, Tax, then the divider
                and final Total row */}
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                  <div className="h-4 w-14 bg-gray-100 rounded" />
                </div>
              ))}
              <div className="h-px bg-gray-100 my-1" />
              <div className="flex justify-between">
                <div className="h-5 w-12 bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Buyer Protection card */}
            <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl" />

            {/* Place Order button — h-12.5 matches the real "py-3.5" button */}
            <div className="w-full h-12.5 bg-gray-200 rounded-xl" />

            {/* Trust icons row */}
            <div className="flex items-center justify-center gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 bg-gray-100 rounded-full" />
                  <div className="h-3 w-10 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Container>
  </div>
);

// Main Checkout page component
const Checkout = () => {
  // Hook to programmatically redirect the user to other routes
  const navigate = useNavigate();
  // Reading query params — specifically "resume", which the payment result
  // page sets when sending a customer back here after a failed payment
  // attempt on an order that already exists (see RESUME PAYMENT FLOW below)
  const [searchParams] = useSearchParams();
  const resumeOrderNumber = searchParams.get("resume");
  // Access to React Query's client instance for cache invalidation after mutations
  const queryClient = useQueryClient();
  // Destructuring authentication state and current logged-in user data from custom auth hook
  const { isAuthenticated, user } = useAuth();
  // Destructuring the clear-cart action from custom cart hook — the hook
  // exposes it as "handleClearCart" (see hooks/useCart.js), used to empty
  // the Redux cart state right after a successful checkout
  const { handleClearCart } = useCart();

  // =============================================
  // CHECKOUT STEP STATE
  // "details"  -> filling contact/address/shipping, order not created yet
  // "payment"  -> order created (pending_payment), Stripe Payment Element shown
  //               (only reached when paymentMethod === "stripe")
  // "qr"       -> order created (pending_payment), QR code + proof upload
  //               shown instead (only reached when paymentMethod === "qr")
  // =============================================
  const [step, setStep] = useState("details");
  // Which payment method the customer picked on the details step — sent
  // as "payment_method" on the Checkout request, and decides whether
  // "payment" (Stripe) or "qr" (QR) step is shown next.
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.STRIPE);
  // qr_image_url / payment_reference — only present in the Checkout
  // response when payment_method: "qr" was sent; passed straight into
  // QrPaymentPanel on the "qr" step.
  const [qrPaymentDetails, setQrPaymentDetails] = useState(null);
  // Which saved Address Book entry the customer has picked for this
  // order — sent to the backend as "address_id" on checkout. Kept as
  // its own piece of state rather than a react-hook-form field, since
  // it is chosen by clicking a card (AddressForm.jsx) rather than
  // typed into an input.
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  // Shown under the address picker if the customer tries to continue
  // to payment without having selected (or added) an address.
  const [addressError, setAddressError] = useState("");
  // The order created by the Checkout API — needed to build the redirect URL
  // and to display on the payment step
  const [orderNumber, setOrderNumber] = useState(null);
  // Stripe's client_secret for the PaymentIntent created for this order (API 69)
  const [clientSecret, setClientSecret] = useState(null);
  // A promise resolving to the Stripe instance, initialized with the
  // publishable_key returned by OUR backend — never hardcoded here
  const [stripePromise, setStripePromise] = useState(null);
  // BUGFIX (checkout page showing Rs. 0 during payment step): once the order
  // is placed, checkoutMutation clears the cart and invalidates the CART
  // query so it refetches as empty. But the Order Summary sidebar below
  // stays mounted through the payment step and was reading subtotal/
  // discount/coupon straight off that same live `cart` — so the instant the
  // cart came back empty, the sidebar collapsed to Rs. 0 while the customer
  // was still looking at the Stripe payment form. We snapshot the values
  // that actually matter right before the cart gets cleared, and use that
  // frozen snapshot instead of the live cart once we're on the payment step.
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  // =============================================
  // CANCEL ORDER (payment / qr steps)
  // Once the order is placed it sits as "pending_payment" while the
  // customer is on the "payment" (Stripe) or "qr" step — at that point
  // there was previously NO way to back out: going back just showed an
  // empty cart (it was already cleared when the order was created), with
  // no way to undo it. This lets the customer cancel that pending order
  // and sends them back to a normal Cart page instead of stranding them.
  // =============================================
  // showCancelModal controls whether the cancel confirmation dialog is visible
  const [showCancelModal, setShowCancelModal] = useState(false);
  // Optional reason picked from the dropdown — purely for the customer's
  // own context, exactly like the same dropdown on the Order Detail page.
  const [cancelReason, setCancelReason] = useState("");
  // Free-text field shown only when "other" is selected above.
  const [cancelReasonOther, setCancelReasonOther] = useState("");

  // Login check
  // Side effect that runs whenever isAuthenticated or navigate changes
  useEffect(() => {
    // If the user is not logged in, redirect them to the login page
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, {
        state: { from: { pathname: ROUTES.CHECKOUT } },
      });
      // Passes the current checkout path in state so login page can redirect back here after successful login
    }
  }, [isAuthenticated, navigate]);

  // =============================================
  // CART API
  // Checkout mein cart data chahiye — items, totals
  // =============================================
  // Fetching the user's current cart data using React Query
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: QUERY_KEYS.CART, // Cache key used to identify and later invalidate this specific query
    queryFn: ({ signal }) => getCart(signal), // Function that performs the actual API call to fetch cart data
    enabled: isAuthenticated, // Only run this query if the user is authenticated (prevents unnecessary calls for logged-out users)
    staleTime: 1000 * 60 * 2, // Data is considered "fresh" for 2 minutes before React Query refetches it again
  });

  // Extracting the actual cart object from the API response, falling back to null if not yet loaded
  const cart = cartData?.data || null;
  // Extracting the array of cart items, defaulting to an empty array if cart or items is missing
  const cartItems = cart?.items || [];

  // =============================================
  // REACT HOOK FORM
  // Pre-fill user data agar available ho
  // =============================================
  // Setting up react-hook-form with Zod validation and default field values
  const {
    register, // Function used to register input fields with the form (connects them to validation/state)
    handleSubmit, // Wraps the submit handler, runs validation before calling it
    watch, // Function to subscribe to and read live values of specific form fields
    setValue, // Function to manually update a form field's value programmatically
    formState: { errors }, // Object containing validation error messages for each field
  } = useForm({
    resolver: zodResolver(checkoutSchema), // Connects the Zod schema defined above as the validation logic for this form
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
      // Pre-filling form fields with existing user data where available, otherwise empty strings/defaults
      email: user?.email || "",
      phone: user?.phone || "",
      shippingMethod: "standard", // Default shipping method pre-selected as standard delivery
    },
  });

  // Watch shipping method for cost calculation
  // Continuously watching the "shippingMethod" field's current value so we can recalculate shipping cost reactively
  const watchedShipping = watch("shippingMethod");

  // Shipping cost
  // Looking up the cost for the currently selected shipping method; defaults to 0 if method not found in config
  const shippingCost = SHIPPING_COSTS[watchedShipping] || 0;
  // Converting cart subtotal to a float number, defaulting to 0 if missing
  const subtotal = parseFloat(cart?.subtotal || 0);
  // Converting cart discount amount to a float number, defaulting to 0 if missing
  const discount = parseFloat(cart?.discount_amount || 0);
  // Calculating the final total: subtotal minus discount plus shipping cost
  const total = subtotal - discount + shippingCost;

  // Once we're on the payment step, show the frozen orderSnapshot instead of
  // the live (now-cleared) cart, so the sidebar keeps reflecting what the
  // customer actually agreed to pay while Stripe collects payment.
  // Also applies to the "qr" step (Easypaisa/JazzCash) — that flow clears
  // the cart the exact same way right after the order is placed, so it
  // needs the same frozen snapshot instead of falling back to the (now
  // empty) live cart, which was showing Rs. 0 there.
  const displayCart =
    (step === "payment" || step === "qr") && orderSnapshot
      ? orderSnapshot
      : cart;
  const displaySubtotal = parseFloat(displayCart?.subtotal || 0);
  const displayDiscount = parseFloat(displayCart?.discount_amount || 0);
  const displayTotal = displaySubtotal - displayDiscount + shippingCost;

  // =============================================
  // STEP 1 — CREATE PAYMENT INTENT (API 69)
  // Runs immediately after Checkout (API 52) succeeds — this is what
  // actually switches the page into the "payment" step once it resolves.
  // =============================================
  const createIntentMutation = useMutation({
    mutationFn: (orderNum) => createPaymentIntent({ order_number: orderNum }),

    onSuccess: (response) => {
      // UPDATED (API 73) — if a coupon reduced the order to Rs. 0, the
      // backend confirms the order directly and never calls Stripe at
      // all. There is no client_secret in this case, so Stripe must be
      // skipped entirely here — attempting to render the Payment Element
      // with no client_secret would break the page. Go straight to the
      // same success screen a paid order would land on.
      if (response.data?.free_order) {
        navigate(
          `${ROUTES.PAYMENT_RESULT}?order=${response.data.order_number || orderNumber}&status=succeeded`,
        );
        return;
      }

      const { client_secret, publishable_key } = response.data;

      // Initialize Stripe.js for this order. publishable_key ALWAYS comes
      // from this response and is never hardcoded on the frontend — this
      // is what keeps a test -> live switch limited to a backend .env
      // change, with no frontend code changes required.
      setStripePromise(loadStripe(publishable_key));
      setClientSecret(client_secret);
      setStep("payment");

      // Also persist the publishable key for this browser tab. If the
      // customer's card requires 3D Secure, Stripe performs a full browser
      // navigation to returnUrl — that is a fresh page load, so this
      // component's state (including publishable_key) will not exist
      // anymore. The payment result page reads it back from here to
      // re-initialize Stripe.js and confirm the outcome directly with
      // Stripe, rather than trusting the URL alone.
      sessionStorage.setItem("stripe_publishable_key", publishable_key);
    },

    onError: (error) => {
      // NEW (API 73) — calling this again for an order that's already
      // paid now returns a 400 instead of a fresh PaymentIntent. Most
      // likely to happen on the resume-payment flow, if the customer
      // resumes an order that the Stripe webhook already confirmed as
      // paid in the background. Send them to their order instead of
      // showing a dead-end "failed to initialize" error.
      if (error?.response?.status === 400) {
        navigate(
          `${ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber || resumeOrderNumber)}`,
        );
        return;
      }

      showError(
        "Failed to initialize payment. Please try placing your order again.",
      );
    },
  });

  // =============================================
  // RESUME PAYMENT FLOW
  // Triggered when the customer is sent back here as
  // "/checkout?resume=ORD-2024-00001" after a failed payment attempt (see
  // PaymentResult.jsx). The order already exists with status
  // "pending_payment" — creating it again would leave the original order
  // stranded and produce a duplicate. Instead, this jumps straight to
  // requesting a new Payment Intent for that same order number and moves
  // the page directly into the payment step, skipping the details form
  // entirely.
  // =============================================
  useEffect(() => {
    if (!resumeOrderNumber) return;
    // Guards against re-triggering on re-renders once the resume attempt
    // is already under way or has already completed for this order.
    if (orderNumber || createIntentMutation.isPending) return;

    setOrderNumber(resumeOrderNumber);
    createIntentMutation.mutate(resumeOrderNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOrderNumber]);

  // The order summary sidebar reads its numbers from orderSnapshot (see
  // BUGFIX comment on that state above). On a normal first-time checkout,
  // that snapshot is built from the live cart right before it gets
  // cleared. On resume, the cart was already cleared when the order was
  // originally placed, so there is nothing live to snapshot from — the
  // order's own saved totals have to be fetched and reshaped into the
  // same structure instead, or the sidebar would show Rs. 0 throughout
  // the whole resumed payment step.
  const { data: resumeOrderData } = useQuery({
    queryKey: QUERY_KEYS.ORDER_DETAIL(resumeOrderNumber),
    queryFn: ({ signal }) => getOrderDetail(resumeOrderNumber, signal),
    enabled: !!resumeOrderNumber,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    const order = resumeOrderData?.data;
    if (!order) return;

    // Keep the shipping method in sync with what this order was actually
    // placed with — the form's own default ("standard") would otherwise
    // silently override it when computing shippingCost/displayTotal below.
    if (
      order.shipping_method &&
      SHIPPING_COSTS[order.shipping_method] !== undefined
    ) {
      setValue("shippingMethod", order.shipping_method);
    }

    // Order items come back shaped differently from cart items (flat
    // product_name/price fields instead of a nested product object), so
    // they are reshaped here to match what CheckoutOrderSummary expects.
    const reshapedItems = (order.items || []).map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        name: item.product_name,
        // API returns this as a flat "product_image" field on the order
        // item — "product" itself is just the numeric product id, not an
        // object, so it never has a primary_image to read.
        primary_image: item.product_image,
        price: item.price,
        category: item.product?.category,
      },
    }));

    setOrderSnapshot({
      items: reshapedItems,
      // total_amount = subtotal - discount + shipping_cost, so the
      // original subtotal is reconstructed by reversing that — same
      // relationship OrderItems.jsx relies on for the order detail page,
      // extended here to also back out shipping_cost.
      subtotal:
        parseFloat(order.total_amount || 0) +
        parseFloat(order.discount_amount || 0) -
        parseFloat(order.shipping_cost || 0),
      discount_amount: order.discount_amount,
      coupon: order.coupon,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOrderData]);

  // =============================================
  // CHECKOUT MUTATION (API 52)
  // POST /api/v1/orders/checkout/
  // Success pe cart clear hoti hai aur turant Payment Intent create hoti hai
  // (payment_method field ab is request mein bilkul nahi jaati)
  // =============================================
  // Mutation hook to handle the actual order placement API call
  const checkoutMutation = useMutation({
    // The delivery address is no longer sent as raw shipping_address/
    // city/postal_code fields — the backend now resolves it from the
    // Address Book instead: "address_id" tells it exactly which saved
    // address to ship to. If this were ever omitted, the backend falls
    // back to whichever saved address is currently marked as default,
    // but this app always sends it explicitly since AddressForm.jsx
    // requires a selection before the customer can reach this point.
    // coupon_code isn't part of this endpoint's accepted fields at all
    // — the coupon is already applied to the cart earlier (API 50), so
    // it doesn't need to be resent here.
    mutationFn: (data) =>
      checkout({
        address_id: selectedAddressId,
        payment_method: paymentMethod,
        // The shipping method the customer picked on this page (standard/
        // express) — without sending this, the backend was falling back
        // to its own default (free/standard) shipping regardless of what
        // was actually selected and shown in the on-screen total.
        shipping_method: data.shippingMethod,
        phone: data.phone,
        notes: "", // Empty notes field sent by default — no order notes feature implemented yet
      }),

    // Runs when the checkout API call succeeds — order now exists with status "pending_payment"
    onSuccess: (response) => {
      const newOrderNumber = response.data.order_number;
      setOrderNumber(newOrderNumber);

      // Freeze the order summary numbers NOW, before the cart gets cleared
      // and refetched below — see the orderSnapshot comment above.
      setOrderSnapshot({
        items: cartItems,
        subtotal: cart?.subtotal,
        discount_amount: cart?.discount_amount,
        coupon: cart?.coupon,
      });

      // Redux cart clear
      // Order create hote hi backend cart already clear kar chuka hai — Redux
      // side bhi turant clear kar dete hain taake UI turant sync ho jaye
      handleClearCart();
      // Cart query invalidate
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });

      if (paymentMethod === PAYMENT_METHOD.QR) {
        // QR orders never touch Stripe at all — qr_image_url and
        // payment_reference come straight back on this same checkout
        // response, so the customer can pay and upload proof right away.
        setQrPaymentDetails({
          qrImageUrl: response.data.qr_image_url,
          paymentReference: response.data.payment_reference,
        });
        setStep("qr");
        return;
      }

      // Turant Stripe Payment Intent create karo isi naye order ke liye
      createIntentMutation.mutate(newOrderNumber);
    },

    // Runs if the checkout API call fails
    onError: (error) => {
      // Extracting the most specific error message available from the API response, with fallbacks
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Failed to place order. Please try again.";
      // Displaying the error message to the user via toast notification
      showError(message);
    },
  });

  // =============================================
  // CANCEL ORDER MUTATION
  // Same cancelOrder() API call OrderDetail.jsx already uses (API 58).
  // Per API_Documentation v3.0: this endpoint restores the order's
  // deducted STOCK and refunds the payment if one was made — it does
  // NOT restore the customer's cart at all, so that has to be rebuilt
  // on the frontend right after.
  //
  // This is only reliably possible here because orderSnapshot (set in
  // checkoutMutation.onSuccess, BEFORE the cart was cleared) still holds
  // each item's real product.id, straight from the live cart response
  // (Get Cart / API 45 always includes it). Get Order Detail (API 57) —
  // used to rebuild orderSnapshot on the "resume" flow instead — does
  // NOT include a product id on its items, only product_name/product_image/
  // price/quantity, so items restored via THAT path can't be re-added to
  // the cart automatically; those are filtered out below rather than
  // silently sent with an undefined product_id.
  // =============================================
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const reason =
        cancelReason === "other" ? cancelReasonOther.trim() : cancelReason;
      await cancelOrder(orderNumber, reason ? { reason } : undefined);

      // Re-add whichever items we still have a real product id for.
      const restorableItems = (orderSnapshot?.items || []).filter(
        (item) => item?.product?.id,
      );
      await Promise.allSettled(
        restorableItems.map((item) =>
          addToCart({
            product_id: item.product.id,
            quantity: item.quantity,
          }),
        ),
      );

      // Report back whether every item that was in the order actually
      // had a product id to restore with, so onSuccess can tell the
      // customer honestly if anything couldn't be brought back.
      const totalItems = orderSnapshot?.items?.length || 0;
      return { fullyRestored: restorableItems.length === totalItems };
    },

    onSuccess: ({ fullyRestored }) => {
      showSuccess(
        fullyRestored
          ? "Order cancelled. Your cart is waiting for you."
          : "Order cancelled. Some items couldn't be restored to your cart automatically — you may need to re-add them.",
      );
      setShowCancelModal(false);

      // The items were just re-added above, but that happened outside
      // React Query's own cache — refetch so the Cart page shows them.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CART });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_ORDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_ORDERS_FULL });

      // Send the customer back to a normal Cart page rather than leaving
      // them on this now-dead checkout session.
      navigate(ROUTES.CART);
    },

    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to cancel order. Please try again.",
      );
    },
  });

  // Form submit — Step 1 (details -> creates order + payment intent).
  // react-hook-form's own validation only covers email/phone/shipping
  // method now — the delivery address is picked separately (see
  // selectedAddressId state), so it needs its own check here before
  // the order is actually placed.
  const onSubmit = (data) => {
    if (!selectedAddressId) {
      setAddressError("Please select or add a delivery address.");
      return;
    }
    setAddressError("");
    checkoutMutation.mutate(data);
  };

  // Called by PaymentMethod once stripe.confirmPayment() reports "succeeded"
  // client-side, without needing a redirect. The order's FINAL "confirmed"
  // status still comes from the Stripe webhook on the backend — this only
  // moves the customer forward, into the payment result page, which shows
  // a brief success confirmation before continuing on to the order itself.
  const handlePaymentSuccess = () => {
    navigate(`${ROUTES.PAYMENT_RESULT}?order=${orderNumber}&status=succeeded`);
  };

  // Called by PaymentMethod when stripe.confirmPayment() reports a failure
  // (e.g. card declined) without needing a redirect. Reason is Stripe's
  // own message, safe to display directly to the customer.
  const handlePaymentFailure = (reason) => {
    navigate(
      `${ROUTES.PAYMENT_RESULT}?order=${orderNumber}&status=failed&reason=${encodeURIComponent(reason)}`,
    );
  };

  // Destination Stripe redirects the browser to when a card requires an
  // extra authentication step (3D Secure) that can't be resolved inline.
  // Only the order number travels in the URL here — Stripe appends its own
  // payment_intent_client_secret and redirect_status params on top of
  // this, which the payment result page reads to determine the outcome.
  const stripeReturnUrl = `${window.location.origin}${ROUTES.PAYMENT_RESULT}?order=${orderNumber}`;

  // Combined loading flag for the Step 1 button (order creation + intent creation both run back-to-back)
  const isPlacingOrder =
    checkoutMutation.isPending || createIntentMutation.isPending;

  // While the cart is still being fetched, show the full-page skeleton
  // instead of letting the form and order summary render with empty/zero
  // values first and then jump to their real size the moment the request
  // resolves. This must be checked before the empty-cart redirect below,
  // since cartItems is still an empty array at this point regardless of
  // whether the cart is genuinely empty or simply hasn't loaded yet.
  if (cartLoading) {
    return <CheckoutSkeleton />;
  }

  // Resuming payment for an existing order — keep showing the skeleton
  // until the new Payment Intent comes back and flips step to "payment".
  // Without this, the details form (with empty fields, since there is no
  // cart to prefill from) would flash on screen for a moment first.
  if (resumeOrderNumber && step === "details") {
    return <CheckoutSkeleton />;
  }

  // Cart empty ho toh cart pe redirect — sirf details step par, aur sirf
  // jab hum resume flow mein na hoon. Resume flow mein order pehle hi ban
  // chuka hai, is liye cart ka khali hona expected hai — usay redirect ki
  // wajah nahi banana, chahay abhi "payment" step shuru bhi na hua ho.
  if (
    !cartLoading &&
    cartItems.length === 0 &&
    step === "details" &&
    !resumeOrderNumber
  ) {
    return (
      <Container className="py-16 px-12">
        <EmptyState
          variant="emptyCart" // Tells the EmptyState component which empty-state design/message to show (specific to empty cart)
          actionLabel="Start Shopping" // Text shown on the call-to-action button
          onAction={() => navigate(ROUTES.PRODUCTS)} // Clicking the button redirects user to the products listing page
        />
      </Container>
    );
  }

  return (
    // Full-page wrapper with light gray background and minimum full screen height
    <div className="min-h-screen bg-gray-50 lg:px-20">
      {/* Stepper — top */}
      <div className="bg-white border-b border-gray-100 py-4">
        <Container>
          <CheckoutStepper currentStep={2} />
        </Container>
      </div>

      {/* Main content container with vertical padding, slightly larger on small screens and up */}
      <Container className="py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ===== LEFT — Forms / Payment ===== */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {step === "details" ? (
                <motion.form
                  key="details-step"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5"
                >
                  {/* Contact Information */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ContactForm register={register} errors={errors} />
                  </motion.div>

                  {/* Delivery Address */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                  >
                    <AddressForm
                      selectedAddressId={selectedAddressId}
                      onSelectAddress={(id) => {
                        setSelectedAddressId(id);
                        setAddressError("");
                      }}
                      error={addressError}
                    />
                  </motion.div>

                  {/* Shipping Method */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <ShippingMethod
                      value={watchedShipping}
                      onChange={(val) => setValue("shippingMethod", val)}
                      error={errors?.shippingMethod?.message}
                    />
                  </motion.div>

                  {/* Payment Method — Card (Stripe) or QR */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.12 }}
                  >
                    <PaymentMethodSelector
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                    />
                  </motion.div>

                  {/* Mobile — Continue to Payment button */}
                  <div className="lg:hidden">
                    <button
                      type="submit"
                      disabled={isPlacingOrder}
                      className="
                        w-full py-3.5 px-6 rounded-xl
                        bg-primary text-white text-sm font-bold
                        hover:bg-primary-dark active:scale-[0.98]
                        disabled:opacity-60 disabled:cursor-not-allowed
                        transition-all
                      "
                    >
                      {isPlacingOrder ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      ) : (
                        `Continue to Payment — ${formatPrice(total)}`
                      )}
                    </button>
                  </div>
                </motion.form>
              ) : step === "qr" ? (
                <motion.div
                  key="qr-step"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-5"
                >
                  {/* Order created confirmation banner */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-gray-400">Order Number</p>
                      <p className="text-lg font-bold text-gray-900">
                        {orderNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        Pending Payment
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="text-sm font-semibold text-danger hover:text-red-600 transition-colors"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>

                  <QrPaymentPanel
                    orderNumber={orderNumber}
                    qrImageUrl={qrPaymentDetails?.qrImageUrl}
                    paymentReference={qrPaymentDetails?.paymentReference}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="payment-step"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-5"
                >
                  {/* Order created confirmation banner */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-gray-400">Order Number</p>
                      <p className="text-lg font-bold text-gray-900">
                        {orderNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        Pending Payment
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="text-sm font-semibold text-danger hover:text-red-600 transition-colors"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>

                  {/* Stripe Payment Element — only renders once we actually have a clientSecret */}
                  {stripePromise && clientSecret ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: { theme: "stripe" },
                      }}
                    >
                      <PaymentMethod
                        returnUrl={stripeReturnUrl}
                        onSuccess={handlePaymentSuccess}
                        onFailure={handlePaymentFailure}
                      />
                    </Elements>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== RIGHT — Order Summary ===== */}
          <div className="hidden lg:block lg:col-span-1">
            <CheckoutOrderSummary
              cart={displayCart}
              total={displayTotal}
              shippingCost={shippingCost}
              onPlaceOrder={handleSubmit(onSubmit)}
              isPlacingOrder={isPlacingOrder}
              showPlaceOrderButton={step === "details"}
              placeOrderLabel="Continue to Payment"
            />
          </div>
        </div>
      </Container>

      {/* ── Cancel order confirmation modal ─────────────────────────────────────
          Only reachable from the "payment"/"qr" steps (see Cancel Order button
          above) — mirrors the same confirmation dialog used on the Order
          Detail page. The reason dropdown is entirely optional. */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Order?"
        size="sm"
        closeOnBackdrop={!cancelMutation.isPending}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Are you sure you want to cancel order {orderNumber}? Your cart will
            be waiting for you afterwards, but this action cannot be undone.
          </p>

          <Select
            label="Reason (optional)"
            placeholder="Select a reason"
            options={[
              { value: "changed_mind", label: "Changed my mind" },
              {
                value: "better_price",
                label: "Found a better price elsewhere",
              },
              { value: "ordered_by_mistake", label: "Ordered by mistake" },
              {
                value: "payment_issue",
                label: "Having trouble paying",
              },
              { value: "other", label: "Other" },
            ]}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          {cancelReason === "other" && (
            <Textarea
              placeholder="Tell us a bit more (optional)"
              value={cancelReasonOther}
              onChange={(e) => setCancelReasonOther(e.target.value)}
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelMutation.isPending}
            >
              Keep Order
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelMutation.mutate()}
              isLoading={cancelMutation.isPending}
            >
              Yes, Cancel Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Exporting the Checkout component as the default export so it can be used as a page/route
export default Checkout;
