// Reusable ConfirmModal component
// Asks for user confirmation before destructive actions like delete or cancel
// Shows "Are you sure?" with Confirm and Cancel buttons
// Built on top of the Modal component — not a standalone modal
// Fully responsive

import Modal from "./Modal";
// Modal component — provides the backdrop, box, header, close button, and scroll lock

import Button from "./Button";
// Button component — used for both the Cancel and Confirm action buttons

const ConfirmModal = ({
  isOpen = false, // Controls whether the modal is visible — driven from parent state
  onClose, // Called when user clicks Cancel, X button, or backdrop
  onConfirm, // Called when user clicks the Confirm button — triggers the destructive action
  title = "Are you sure?", // Modal header text — overridable for different action contexts
  message = "This action cannot be undone.", // Body warning text — describes the consequence of confirming
  confirmLabel = "Confirm", // Text on the confirm button — e.g. "Delete", "Cancel Order"
  cancelLabel = "Cancel", // Text on the cancel button — usually kept as "Cancel"
  variant = "danger", // Visual style of the confirm button — "danger" for destructive, "primary" for safe
  isLoading = false, // When true, shows spinner on confirm button and locks the modal open
}) => {
  return (
    <Modal
      isOpen={isOpen}
      // Passes open state down to Modal — controls backdrop and box visibility

      onClose={onClose}
      // Passes close handler to Modal — used by the X button and ESC key

      title={title}
      // Passes the heading text to Modal's built-in header section

      size="sm"
      // Confirmation dialogs are intentionally small — they only need a message and two buttons

      closeOnBackdrop={!isLoading}
      // When loading: disables backdrop click to prevent accidental dismissal mid-operation
      // When not loading: allows clicking outside the modal to cancel as expected
    >
      <div className="flex flex-col gap-5">
        {/* flex-col stacks the message and button row vertically */}
        {/* gap-5 gives comfortable spacing between the warning text and the action buttons */}

        {/* Warning message — explains what will happen if the user confirms */}
        <p className="text-sm text-gray-600 leading-relaxed">
          {message}
          {/* text-sm: readable but subordinate to the modal title */}
          {/* text-gray-600: muted gray — informational tone, not alarming on its own */}
          {/* leading-relaxed: increased line height for comfortable multi-line reading */}
        </p>

        {/* Action buttons row — Cancel on the left, Confirm on the right */}
        <div className="flex items-center justify-end gap-3">
          {/* justify-end: aligns both buttons to the right side of the modal */}
          {/* gap-3: consistent spacing between Cancel and Confirm buttons */}

          {/* Cancel button — dismisses the modal without taking any action */}
          <Button
            variant="secondary"
            // Secondary style — visually less prominent than the confirm button
            onClick={onClose}
            // Calls onClose to dismiss the modal — no destructive action performed
            disabled={isLoading}
            // Disabled during loading — prevents closing while the confirm action is processing
          >
            {cancelLabel}
            {/* Renders the cancel button label — defaults to "Cancel" */}
          </Button>

          {/* Confirm button — triggers the destructive or primary action */}
          <Button
            variant={variant}
            // Uses the variant prop — "danger" (red) for destructive, "primary" (emerald) for safe actions
            onClick={onConfirm}
            // Calls onConfirm to execute the actual action (e.g. delete, cancel order)
            isLoading={isLoading}
            // Shows spinner inside the button and disables it while the API call is in progress
          >
            {confirmLabel}
            {/* Renders the confirm button label — defaults to "Confirm" */}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
// Default export — imported anywhere as: import ConfirmModal from "..."
