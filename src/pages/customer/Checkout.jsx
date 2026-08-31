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
// Framer Motion's "motion" component used to animate sections sliding/fading in
import { motion, AnimatePresence } from "framer-motion";
// Stripe.js loader — dynamically loads Stripe using the publishable_key returned
// by our OWN backend (API 69), never hardcoded on the frontend
import { loadStripe } from "@stripe/stripe-js";
// Elements — the provider component that gives Stripe context (clientSecret,
// appearance, etc.) to PaymentElement/useStripe/useElements down the tree
import { Elements } from "@stripe/react-stripe-js";
// API function to fetch the current user's cart data from the backend
import { getCart } from "../../api/cart.api";
// API function to submit the checkout request and place the order, and to
// fetch an existing order's details (needed for the resume-payment flow)
import { checkout, getOrderDetail } from "../../api/orders.api";
// API function to create a Stripe Payment Intent for an existing order (API 69)
import { createPaymentIntent } from "../../api/payments.api";
// Custom hook providing authentication state (isAuthenticated flag and logged-in user info)
import useAuth from "../../hooks/useAuth";
// Custom hook providing cart-related actions, here specifically used to clear cart from Redux store
import useCart from "../../hooks/useCart";
// Toast notification helper to display error messages to the user
import { showError } from "../../components/ui/Toast";
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
    .email("Invalid email")
    .max(255, "Email is too long"),
  // Phone field — must not be empty and must match Pakistani phone number pattern (+92 or 0 followed by 10 digits)
  phone: z
    .string()
    .trim()
    .min(1, "Phone required")
    .regex(/^(\+92|0)[0-9]{10}$/, "Invalid Pakistani phone number"),

  // Address
  // Full name — required, and must be at least 3 characters long
  fullName: z
    .string()
    .trim()
    .min(1, "Full name required")
    .min(3, "Min 3 characters")
    .max(50, "Name must be less than 50 characters"),
  // Street address — required, with a sane minimum so a single character
  // can't pass as a "complete" address
  street: z
    .string()
    .trim()
    .min(1, "Street address required")
    .min(5, "Please enter a complete street address")
    .max(150, "Address is too long"),
  // City — required field
  city: z
    .string()
    .trim()
    .min(1, "City required")
    .max(60, "City name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "City name can only contain letters"),
  // Province — required field
  province: z.string().trim().min(1, "Province required"),
  // Postal code — required, numeric, and capped at a maximum of 10 characters
  postalCode: z
    .string()
    .trim()
    .min(1, "Postal code required")
    .max(10)
    .regex(/^\d+$/, "Postal code can only contain numbers"),
  // Optional checkbox to save this address for future use — not mandatory
  saveAddress: z.boolean().optional(),

  // Shipping
  // Shipping method — required, user must select one (standard/express)
  shippingMethod: z.string().min(1, "Please select a shipping method"),
});

// Shipping cost config
// Simple lookup object mapping shipping method ids to their respective cost in currency units
const SHIPPING_COSTS = {
  standard: 0, // Standard delivery is free
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
  // =============================================
  const [step, setStep] = useState("details");
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
    queryFn: getCart, // Function that performs the actual API call to fetch cart data
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
      fullName: user?.name || "",
      street: "",
      city: "",
      province: "",
      postalCode: "",
      saveAddress: false,
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
  const displayCart =
    step === "payment" && orderSnapshot ? orderSnapshot : cart;
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
    queryFn: () => getOrderDetail(resumeOrderNumber),
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
    // Function that transforms form data into the API's expected payload format and sends the request.
    // Per API 55 (Checkout) in the docs, the backend wants shipping_address,
    // city, postal_code, and phone as SEPARATE fields — not one combined
    // string. Sending everything squashed into shipping_address means the
    // backend never receives a `city` value, and shipping_address + city are
    // the two fields it 400s on if both are missing. That was the checkout
    // failure. coupon_code also isn't part of this endpoint's accepted
    // fields at all — the coupon is already applied to the cart earlier
    // (API 50), so it doesn't need to be resent here.
    mutationFn: (data) =>
      checkout({
        shipping_address: `${data.fullName}, ${data.street}`,
        city: data.city,
        postal_code: data.postalCode,
        phone: data.phone,
        save_address: !!data.saveAddress,
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

  // Form submit — Step 1 (details -> creates order + payment intent)
  const onSubmit = (data) => {
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
                    <AddressForm register={register} errors={errors} />
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
                    <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                      Pending Payment
                    </span>
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
    </div>
  );
};

// Exporting the Checkout component as the default export so it can be used as a page/route
export default Checkout;
