// React hooks — useState for local state, useEffect for side effects like redirect-on-load checks
import { useState, useEffect } from "react";
// React Router hook to programmatically navigate/redirect the user to different routes
import { useNavigate } from "react-router-dom";
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
// API function to submit the checkout request and place the order
import { checkout } from "../../api/orders.api";
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

// Main Checkout page component
const Checkout = () => {
  // Hook to programmatically redirect the user to other routes
  const navigate = useNavigate();
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
      const { client_secret, publishable_key } = response.data;

      // Stripe.js ko is order ke liye initialize karo — publishable_key
      // HAMESHA is response se aati hai, kabhi frontend mein hardcode nahi
      // (yahi wo cheez hai jo test -> live switch ko sirf backend .env
      // change tak mehdood rakhti hai, frontend code ko touch nahi karna parta)
      setStripePromise(loadStripe(publishable_key));
      setClientSecret(client_secret);
      setStep("payment");
    },

    onError: () => {
      showError(
        "Failed to initialize payment. Please try placing your order again.",
      );
    },
  });

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
  // client-side. The order's FINAL "confirmed" status still comes from the
  // Stripe Webhook on the backend — this only moves the customer forward.
  const handlePaymentSuccess = () => {
    navigate(
      `${ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber)}?success=true`,
    );
  };

  // Combined loading flag for the Step 1 button (order creation + intent creation both run back-to-back)
  const isPlacingOrder =
    checkoutMutation.isPending || createIntentMutation.isPending;

  // Cart empty ho toh cart pe redirect — sirf details step par (agar order
  // already ban chuka hai to cart khali hona expected hai, payment step ko na todein)
  if (!cartLoading && cartItems.length === 0 && step === "details") {
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
                        returnUrl={`${window.location.origin}${ROUTES.ACCOUNT_ORDER_DETAIL.replace(":id", orderNumber)}?success=true`}
                        onSuccess={handlePaymentSuccess}
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
