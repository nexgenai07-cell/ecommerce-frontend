// Reusable SuccessModal component
// Shown after an important action completes successfully
// Features an animated checkmark icon for visual confirmation
// Will be used after order placement, password reset, and return request submission
// Fully responsive

import Modal from "./Modal";
// Modal component — provides the backdrop, box, scroll lock, and ESC key handling

import Button from "./Button";
// Button component — used for the optional action/continue button at the bottom

const SuccessModal = ({
  isOpen = false, // Controls whether the modal is visible — driven from parent state
  onClose, // Called when the modal should close — used as fallback for action button
  onAction, // Called when the action button is clicked — e.g. "Go to Orders"
  title = "Success!", // Heading text rendered below the checkmark circle
  message = "", // Optional descriptive text rendered below the title
  actionLabel = "Continue", // Label on the action button — overridable per use case
  showAction = true, // When false, hides the action button entirely
}) => {
  return (
    <Modal
      isOpen={isOpen}
      // Passes open state to Modal — controls backdrop and box visibility

      onClose={onClose}
      // Passes close handler to Modal — used by ESC key (X button is hidden below)

      size="sm"
      // Success modals are intentionally compact — icon, title, message, and one button

      showClose={false}
      // Hides the X close button — user must interact with the action button to proceed
      // This ensures the user acknowledges the success before dismissing
    >
      <div className="flex flex-col items-center gap-5 py-2">
        {/* flex-col: stacks checkmark, text block, and button vertically */}
        {/* items-center: horizontally centers all children */}
        {/* gap-5: consistent spacing between each section */}
        {/* py-2: small extra vertical padding inside the modal body */}

        {/* Checkmark icon container — circular green background with animated SVG */}
        <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
          {/* w-16 h-16: 64px circle — large enough to be visually prominent */}
          {/* rounded-full: perfect circle shape */}
          {/* bg-success-light: light green background from design tokens */}
          {/* flex + items-center + justify-center: centers the checkmark SVG inside the circle */}

          <svg
            className="w-8 h-8 text-success animate-in zoom-in duration-300"
            // w-8 h-8: 32px icon — half the size of the container for balanced proportions
            // text-success: inherits the green color from the design token via currentColor
            // animate-in zoom-in: checkmark scales up from zero when the modal opens
            // duration-300: 300ms animation — noticeable but not slow
            fill="none"
            // No fill — icon is drawn with stroke lines only
            stroke="currentColor"
            // Stroke inherits green color from text-success via currentColor
            viewBox="0 0 24 24"
            // Standard 24x24 coordinate system for the SVG paths
          >
            <path
              strokeLinecap="round" // Rounded line ends for a soft, friendly appearance
              strokeLinejoin="round" // Rounded corner joins consistent with strokeLinecap
              strokeWidth={2.5}
              // Slightly thicker than the default 2 — makes the checkmark bold and confident
              d="M5 13l4 4L19 7"
              // SVG path that draws a checkmark — short left stroke then long right stroke
            />
          </svg>
        </div>

        {/* Text block — title and optional message stacked and centered */}
        <div className="flex flex-col items-center gap-2 text-center">
          {/* flex-col: stacks title and message vertically */}
          {/* items-center + text-center: center-aligns both text elements */}
          {/* gap-2: tight spacing between title and message for a cohesive text block */}

          {/* Modal title — primary success heading */}
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
            {/* text-lg: larger than body text to establish clear visual hierarchy */}
            {/* font-semibold: bold enough to feel celebratory without being heavy */}
            {/* text-gray-900: near-black for maximum contrast */}
          </h3>

          {/* Optional message — only rendered when message prop is a non-empty string */}
          {message && (
            <p className="text-sm text-gray-500 leading-relaxed">
              {message}
              {/* text-sm: smaller than title — clearly secondary information */}
              {/* text-gray-500: muted gray so it doesn't compete with the title */}
              {/* leading-relaxed: increased line height for comfortable multi-line reading */}
            </p>
          )}
        </div>

        {/* Action button — only rendered when showAction prop is true */}
        {showAction && (
          <Button
            variant="primary"
            // Primary emerald style — positive and forward-moving action
            fullWidth
            // Stretches button to full modal width for a prominent, easy-to-tap target
            onClick={onAction || onClose}
            // Uses onAction if provided (e.g. navigate to orders page)
            // Falls back to onClose if no specific action is needed — just dismisses the modal
          >
            {actionLabel}
            {/* Renders the action button label — defaults to "Continue" */}
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default SuccessModal;
// Default export — imported anywhere as: import SuccessModal from "..."
