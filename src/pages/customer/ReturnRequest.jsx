// Return Request Page — Main file
// 3-step form — Select Order, Select Items, Submit
// Real API — getMyOrders, getOrderDetail, requestReturn
// Step validation before proceeding
// ONE unified card holds the whole flow (stepper + step content + nav + policy note) —
// avoids the "everything is its own boxed card" look; only Previous Returns below gets its own card.

// Import "useState" hook from React to manage all the multi-step form's local state
import { useState } from "react";
// Import "useNavigate" for redirecting after success, and "Link" for the policy note's navigation link
import { useNavigate, Link } from "react-router-dom";
// Import "useQuery" for fetching order details, "useMutation" for submitting the return, and "useQueryClient" for cache invalidation
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Import "motion" and "AnimatePresence" from framer-motion to animate transitions between the 3 form steps
import { motion, AnimatePresence } from "framer-motion";
// Import a right-arrow icon (for Continue/Submit buttons) and an info-circle icon (for the policy note) from the "ai" icon set
import { AiOutlineArrowRight, AiOutlineInfoCircle } from "react-icons/ai";
// Import a circular "repeat/return" icon for the gradient page-header badge, from the "bs" (Bootstrap) icon set
import { BsArrowRepeat } from "react-icons/bs";
// Import a constants object that holds route path strings used for navigation after submission
import { ROUTES } from "../../constants/routes";
// Import a constants object that holds standardized react-query cache key generator functions
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API functions for fetching order details and submitting a return request
import { getOrderDetail, requestReturn } from "../../api/orders.api";
// Import toast notification helper functions for showing success and error messages (note: these get shadowed by local state below)
import { showSuccess, showError } from "../../components/ui/Toast";
// Import a layout wrapper component that applies consistent max-width/padding container styling
import Container from "../../components/layouts/Container";
// Import the reusable Button component so Back/Continue/Submit all use the project's shared button styles
import Button from "../../components/ui/Button";
// Import the 3-step progress stepper component
import ReturnStepper from "../../components/return-request/ReturnStepper";
// Import the step 1 component (select an order to return)
import SelectOrderStep from "../../components/return-request/SelectOrderStep";
// Import the step 2 component (select which items to return)
import SelectItemsStep from "../../components/return-request/SelectItemsStep";
// Import the step 3 component (reason, description)
import ReturnDetailsStep from "../../components/return-request/ReturnDetailsStep";
// Import a reusable success modal component shown after the return request is submitted
import SuccessModal from "../../components/ui/SuccessModal";
// Import the history table listing the customer's previous return requests — renders below the form
import PreviousReturns from "../../components/return-request/PreviousReturns";

// Main functional component for the Return Request page
const ReturnRequest = () => {
  // Hook used to programmatically navigate/redirect the user after the flow completes
  const navigate = useNavigate();
  // Get access to the react-query client instance so we can invalidate cached queries after a successful submission
  const queryClient = useQueryClient();

  // =============================================
  // MULTI-STEP FORM STATE
  // =============================================
  // State tracking which step (1, 2, or 3) is currently active
  const [currentStep, setCurrentStep] = useState(1);
  // State holding the selected order's order number (from step 1)
  const [selectedOrder, setSelectedOrder] = useState("");
  // State holding the array of selected item IDs to be returned (from step 2)
  const [selectedItems, setSelectedItems] = useState([]);
  // State holding the selected return reason (from step 3)
  const [reason, setReason] = useState("");
  // State holding the optional additional description text (from step 3)
  const [description, setDescription] = useState("");
  // State holding any validation error messages keyed by field name
  const [errors, setErrors] = useState({});
  // Local state controlling whether the success modal is visible (this shadows the imported "showSuccess" toast function within this component)
  const [showSuccess, setShowSuccess] = useState(false);

  // =============================================
  // ORDER DETAIL API — selected order ke items
  // API 44 — GET /api/v1/orders/{order_number}/
  // =============================================
  // Fetch the full order detail (including items) for whichever order was selected in step 1
  const { data: orderData } = useQuery({
    // Generate a unique cache key for this order's detail query based on the selected order number
    queryKey: QUERY_KEYS.ORDER_DETAIL(selectedOrder),
    // The actual function that performs the API call to fetch order details
    queryFn: () => getOrderDetail(selectedOrder),
    // Only run this query if an order has actually been selected
    enabled: !!selectedOrder,
    // Consider the cached data fresh for 5 minutes before refetching is allowed
    staleTime: 1000 * 60 * 5,
  });

  // Extract the order's items array from the fetched data, defaulting to an empty array if not available
  const orderItems = orderData?.data?.items || [];

  // =============================================
  // SUBMIT RETURN MUTATION
  // API 50 — POST /api/v1/orders/{order_number}/return/
  // =============================================
  // Set up a react-query mutation for submitting the final return request
  const returnMutation = useMutation({
    // The function that performs the actual API call, combining the reason and optional description into a single string
    mutationFn: () =>
      requestReturn(selectedOrder, {
        reason: `${reason}${description ? `. ${description}` : ""}`,
      }),

    // Callback executed when the mutation succeeds
    onSuccess: () => {
      // Open the success modal (using the local boolean state, not the imported toast function)
      setShowSuccess(true);
      // Mark the cached "RETURNS" query as stale so it refetches fresh data wherever it's used
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RETURNS });
      // Mark the cached "MY_ORDERS" query as stale too, since the order's return status may have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_ORDERS });
    },

    // Callback executed when the mutation fails
    onError: (error) => {
      // Show an error toast, using the server's error message if available, otherwise a generic fallback message
      showError(
        error?.response?.data?.message ||
          "Failed to submit return request. Please try again.",
      );
    },
  });

  // =============================================
  // ITEM TOGGLE
  // =============================================
  // Function that toggles a single item's selected state (add if not selected, remove if already selected)
  const handleItemToggle = (itemId) => {
    setSelectedItems((prev) =>
      // If the item is already in the selected list, remove it; otherwise add it to the list
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  // Select all items
  // Function that either selects every item or clears the selection, depending on current state
  const handleSelectAll = () => {
    // If every item is already selected, clear the selection entirely
    if (selectedItems.length === orderItems.length) {
      setSelectedItems([]);
    } else {
      // Otherwise, select every item by mapping each order item to its product id (or item id as fallback)
      setSelectedItems(orderItems.map((item) => item.product?.id || item.id));
    }
  };

  // =============================================
  // STEP VALIDATION
  // =============================================
  // Function that validates the current step's required fields before allowing the user to proceed
  const validateStep = (step) => {
    // Object to collect any new validation error messages
    const newErrors = {};

    // Validation rules specific to step 1 (order selection)
    if (step === 1) {
      // If no order has been selected, show an error and block progression
      if (!selectedOrder) {
        newErrors.order = "Please select an order";
        showError("Please select an order to continue");
        setErrors(newErrors);
        return false;
      }
    }

    // Validation rules specific to step 2 (item selection)
    if (step === 2) {
      // If no items have been selected, show an error and block progression
      if (selectedItems.length === 0) {
        showError("Please select at least one item to return");
        return false;
      }
    }

    // Validation rules specific to step 3 (return details)
    if (step === 3) {
      // If no reason has been selected, set a field-level error and block progression
      if (!reason) {
        newErrors.reason = "Please select a reason for return";
        setErrors(newErrors);
        return false;
      }
    }

    // If we reach here, the current step is valid — clear any existing errors and allow progression
    setErrors({});
    return true;
  };

  // Next step
  // Handler called when the user clicks "Continue" — validates the current step, then advances if valid
  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Move to the next step, capped at a maximum of step 3
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  // Previous step
  // Handler called when the user clicks "Back" — moves to the previous step, capped at a minimum of step 1
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Form submit
  // Handler called when the user clicks the final "Submit Return Request" button on step 3
  const handleSubmit = () => {
    // Validate step 3's fields before actually submitting the mutation
    if (validateStep(3)) {
      returnMutation.mutate();
    }
  };

  // Begin returning the JSX markup for this component
  return (
    // Wrap the entire page in a framer-motion div so it gently fades in on mount
    <motion.div
      // Starting animation state: fully transparent
      initial={{ opacity: 0 }}
      // Ending animation state: fully visible
      animate={{ opacity: 1 }}
      // Fade-in duration
      transition={{ duration: 0.3 }}
    >
      {/* Page container with vertical padding (smaller on mobile, larger on sm+ screens) */}
      <Container className="py-6 sm:py-8">
        {/* Outer vertical flex column holding all page sections, centered and capped at a max width, with gap between children */}
        <div className="flex flex-col gap-6 max-w-3xl mx-auto ">
          {/* Page heading row — plain, no card wrapper, sits directly on the page background */}
          {/* Row grouping a gradient icon badge with the title + subtitle stack */}
          <div className="flex items-center gap-3">
            {/* Gradient circular icon badge — the only "boxed" accent near the header, kept small and light */}
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              {/* Repeat/return icon, colored white so it pops against the gradient */}
              <BsArrowRepeat className="w-5 h-5 text-white" />
            </div>
            {/* Column holding the main title and a short supporting subtitle */}
            <div className="flex flex-col">
              {/* Main page title text */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Return Request
              </h1>
              {/* Short subtitle explaining the flow, in muted gray */}
              <p className="text-sm text-gray-400">
                Follow the 3 quick steps below to request a return.
              </p>
            </div>
          </div>

          {/* ── SINGLE UNIFIED FORM CARD ──────────────────────────────────────────
              Everything below (stepper, active step content, nav buttons, policy note)
              lives inside ONE elevated card, separated internally by thin dividers
              instead of being split into several separate boxed cards. */}
          <div className="relative bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            {/* Thin gradient accent strip across the very top of the unified card */}
            <div className="h-1 w-full bg-linear-to-r from-primary via-primary-light to-primary-dark" />

            {/* Inner padded content wrapper, vertical flex layout with generous gap */}
            <div className="p-5 sm:p-8 flex flex-col gap-6">
              {/* 3-step stepper — sits directly at the top of the unified card, no extra box around it */}
              <ReturnStepper currentStep={currentStep} />

              {/* Thin divider separating the stepper from the active step's content */}
              <div className="border-t border-gray-100" />

              {/* Step content with animation */}
              {/* Wrapper enabling exit/enter animations when switching between steps; "wait" mode ensures the old step fully exits before the new one enters */}
              <AnimatePresence mode="wait">
                {/* Animated container for whichever step is currently active */}
                <motion.div
                  // Use the current step number as the key so framer-motion treats each step as a distinct element to animate
                  key={currentStep}
                  // Initial animation state when a step enters: invisible and shifted 10px to the right
                  initial={{ opacity: 0, x: 10 }}
                  // Final animation state: fully visible and at its normal horizontal position
                  animate={{ opacity: 1, x: 0 }}
                  // Animation state when a step exits: fades out and shifts 10px to the left
                  exit={{ opacity: 0, x: -10 }}
                  // Animation duration of 0.2 seconds
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5"
                >
                  {/* Step 1 — Select Order */}
                  {/* Only render the SelectOrderStep component when currentStep is 1 */}
                  {currentStep === 1 && (
                    <SelectOrderStep
                      selectedOrder={selectedOrder}
                      onOrderSelect={(orderNum) => {
                        // Update the selected order number
                        setSelectedOrder(orderNum);
                        setSelectedItems([]); // Reset items when order changes
                      }}
                    />
                  )}

                  {/* Step 2 — Select Items */}
                  {/* Only render the SelectItemsStep component when currentStep is 2 */}
                  {currentStep === 2 && (
                    <SelectItemsStep
                      orderItems={orderItems}
                      selectedItems={selectedItems}
                      onItemToggle={handleItemToggle}
                      onSelectAll={handleSelectAll}
                    />
                  )}

                  {/* Step 3 — Return Details */}
                  {/* Only render the ReturnDetailsStep component when currentStep is 3 */}
                  {currentStep === 3 && (
                    <ReturnDetailsStep
                      reason={reason}
                      onReasonChange={setReason}
                      description={description}
                      onDescriptionChange={setDescription}
                      errors={errors}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Thin divider separating the step content from the navigation buttons */}
              <div className="border-t border-gray-100" />

              {/* Navigation buttons */}
              {/* Row placing the Back button on the left and the Continue/Submit button on the right, spaced apart */}
              <div className="flex items-center justify-between gap-3">
                {/* Back button — step 1 pe hide */}
                {/* Only show the "Back" button if we're past step 1; otherwise render an empty spacer div to keep the layout aligned */}
                {currentStep > 1 ? (
                  // Reusable Button component, "outline" variant so it reads as a secondary action next to the gradient primary button
                  <Button variant="outline" size="lg" onClick={handleBack}>
                    Back
                  </Button>
                ) : (
                  <div /> // Spacer
                )}

                {/* Next / Submit button */}
                {/* Show a "Continue" button while on steps 1-2, or a "Submit Return Request" button on the final step 3 */}
                {currentStep < 3 ? (
                  // "Continue" button that advances to the next step after validation
                  <Button
                    size="lg"
                    onClick={handleNext}
                    rightIcon={<AiOutlineArrowRight className="w-4 h-4" />}
                    // Gradient override on top of the Button's default "bg-primary" — creates the glowing brand gradient look
                    className="bg-linear-to-r from-primary to-primary-dark hover:brightness-110 shadow-lg shadow-primary/30"
                  >
                    Continue
                  </Button>
                ) : (
                  // Final submit button that triggers the return request mutation
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    // Disable the button while the mutation is in progress
                    isLoading={returnMutation.isPending}
                    rightIcon={<AiOutlineArrowRight className="w-4 h-4" />}
                    // Same gradient treatment as the Continue button, for visual consistency across steps
                    className="bg-linear-to-r from-primary to-primary-dark hover:brightness-110 shadow-lg shadow-primary/30"
                  >
                    Submit Return Request
                  </Button>
                )}
              </div>

              {/* Policy note — kept deliberately light: no border box, no background fill,
                  just a small accent icon and text so it reads as a footnote, not another card */}
              <div className="flex items-start gap-2 pt-1">
                {/* Info-circle icon, colored emerald, shrink-0 prevents shrinking */}
                <AiOutlineInfoCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {/* Policy explanation text, including a bolded "Policy Note:" label and a link to the full return policy page */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-700">
                    Policy Note:
                  </span>{" "}
                  Returns must be initiated within 30 days of delivery. Items
                  must be in original condition with tags. Final sale items are
                  not eligible for return. For more details, visit our{" "}
                  <Link
                    to="/terms"
                    className="text-primary font-medium hover:underline"
                  >
                    Return Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* ── Previous Returns history ────────────────────────────────────────────
              The ONE other card on this page — a genuinely separate section (a history
              table), so giving it its own card here is intentional, not repetitive.
              Renders nothing when the customer has no return history — no empty card shown.
              Shares QUERY_KEYS.RETURNS with the mutation above, so submitting a new
              return here refreshes this table automatically without a manual refetch. */}
          <PreviousReturns />
        </div>

        {/* Success modal */}
        {/* Modal shown after a successful return request submission, offering navigation options */}
        <SuccessModal
          // Controls whether the modal is visible, tied to local boolean state
          isOpen={showSuccess}
          // Callback for closing the modal via the default close action, then redirecting to the orders list
          onClose={() => {
            setShowSuccess(false);
            navigate(ROUTES.ACCOUNT_ORDERS);
          }}
          // Callback for the modal's primary action button, closing the modal and redirecting to the returns list instead
          onAction={() => {
            setShowSuccess(false);
            navigate(ROUTES.ACCOUNT_RETURNS);
          }}
          // Modal title text
          title="Return Request Submitted!"
          // Modal body message explaining what happens next
          message="Your return request has been received. We'll review it and get back to you within 2-3 business days."
          // Label text for the modal's action button
          actionLabel="View My Returns"
        />
      </Container>
    </motion.div>
  );
};

// Export this component as the default export so other files (like the router) can import and use it
export default ReturnRequest;
