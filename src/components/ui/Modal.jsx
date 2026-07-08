// Reusable Modal component — popup dialog rendered above the page content
// Sizes: sm, md, lg, xl
// Closes when clicking outside the modal box
// Will be used for delete confirmations, success messages, and form popups
// Fully responsive

import { useEffect } from "react";
// useEffect — handles side effects: body scroll lock and ESC key listener

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Modal = ({
  isOpen = false, // Controls whether the modal is visible — driven from parent state
  onClose, // Function called whenever the modal should close (backdrop, ESC, or X button)
  title = "", // Optional heading text rendered in the modal header
  children, // Content rendered inside the modal body — passed from parent as JSX
  size = "md", // Controls the max-width of the modal box — sm, md, lg, or xl
  showClose = true, // When true, renders the X close button in the top-right corner
  closeOnBackdrop = true, // When true, clicking the dark backdrop outside the modal closes it
  className = "", // Extra Tailwind classes applied to the modal box itself
}) => {
  // --- SIDE EFFECT: Body scroll lock ---
  // Prevents the page behind the modal from scrolling while the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Locks the body scroll — stops background content from moving while modal is active
    } else {
      document.body.style.overflow = "unset";
      // Restores normal scroll when the modal is closed
    }
    return () => {
      document.body.style.overflow = "unset";
      // Cleanup function — restores scroll if the component unmounts while modal is still open
    };
  }, [isOpen]);
  // Re-runs whenever isOpen changes — ensures scroll state always matches modal visibility

  // --- SIDE EFFECT: ESC key listener ---
  // Allows the user to close the modal by pressing the Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
      // onClose?.() uses optional chaining — safely does nothing if onClose is not provided
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      // Attaches the ESC listener only when modal is open — avoids unnecessary global listeners
    }
    return () => window.removeEventListener("keydown", handleEsc);
    // Cleanup — removes the listener when modal closes or component unmounts
  }, [isOpen, onClose]);
  // Re-runs when isOpen or onClose changes — keeps the handler reference up to date

  // Early return — renders nothing to the DOM when the modal is closed
  if (!isOpen) return null;
  // Avoids rendering the backdrop and modal box when they are not needed

  // Each size maps to a Tailwind max-width class controlling the modal box width
  const sizeClasses = {
    sm: "max-w-sm", // 384px — used for simple yes/no confirmation dialogs
    md: "max-w-md", // 448px — used for small forms like login or address input
    lg: "max-w-lg", // 512px — used for detail views with more content
    xl: "max-w-xl", // 576px — used for large content like order summaries or galleries
  };

  return (
    // Backdrop — fixed full-screen dark overlay that sits above all page content
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      // fixed inset-0: covers the entire viewport regardless of scroll position
      // z-modal: custom z-index token ensures modal sits above all other UI layers
      // flex + items-center + justify-center: centers the modal box both horizontally and vertically
      // p-4: minimum edge padding so modal never touches the screen edges on small screens
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      // Semi-transparent black overlay — darkens the background to focus attention on the modal
      // Inline style used because Tailwind can't easily express arbitrary rgba values
    >
      {/* Invisible click-capture layer — covers the full backdrop to detect outside clicks */}
      <div
        className="absolute inset-0"
        // absolute inset-0: fills the entire backdrop div
        onClick={closeOnBackdrop ? onClose : undefined}
        // Calls onClose when user clicks outside the modal box
        // When closeOnBackdrop is false, click does nothing — modal stays open
      />

      {/* Modal box — the actual visible dialog container */}
      <div
        className={cn(
          // Base classes — applied to every modal instance
          "relative w-full bg-white rounded-xl shadow-xl",
          // relative: establishes stacking context so modal sits above the backdrop click layer
          // w-full: fills available width up to the max-width defined by sizeClasses
          // bg-white: solid white background to cover the darkened backdrop
          // rounded-xl: generously rounded corners for a modern dialog appearance
          // shadow-xl: strong drop shadow to lift the modal visually off the backdrop

          "animate-in fade-in slide-in-from-bottom-4 duration-200",
          // animate-in: triggers the entry animation when the modal mounts
          // fade-in: modal fades from transparent to fully visible
          // slide-in-from-bottom-4: modal slides up 16px from below for a natural feel
          // duration-200: fast 200ms animation — responsive without feeling abrupt

          sizeClasses[size],
          // Injects the correct max-width class for the chosen size

          className,
          // Merges any extra classes passed from the parent component
        )}
        onClick={(e) => e.stopPropagation()}
        // Stops click events inside the modal from bubbling up to the backdrop click layer
        // Without this, clicking anywhere inside the modal would also trigger onClose
      >
        {/* Modal header — only rendered when title or close button is needed */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            {/* flex + items-center + justify-between: places title on the left, X button on the right */}
            {/* p-5: consistent padding inside the header */}
            {/* border-b border-gray-100: subtle bottom border separates header from body content */}

            {/* Modal title — only rendered when title prop is a non-empty string */}
            {title && (
              <h3 className="text-base font-semibold text-gray-900">
                {title}
                {/* text-base: standard readable size for dialog headings */}
                {/* font-semibold: bold enough to clearly identify the modal purpose */}
                {/* text-gray-900: near-black for maximum contrast */}
              </h3>
            )}

            {/* Close button — only rendered when showClose prop is true */}
            {showClose && (
              <button
                onClick={onClose}
                // Calls the onClose handler when the X button is clicked
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                // ml-auto: pushes the button to the far right even when no title is present
                // p-1.5: small padding creates a comfortable click target around the icon
                // rounded-lg: rounded button matches the modal's rounded corner style
                // text-gray-400: muted icon color so it doesn't compete with the title
                // hover:text-gray-600 + hover:bg-gray-100: subtle hover feedback
                // transition-colors: smooth color change on hover
              >
                {/* X icon — drawn with two diagonal crossing lines */}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {/* w-4 h-4: 16px icon — small enough to be unobtrusive in the header */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                    // Two diagonal paths that form an X shape when combined
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Modal body — renders whatever JSX is passed as children from the parent */}
        <div className="p-5">
          {children}
          {/* p-5: consistent padding around the body content matching the header padding */}
        </div>
      </div>
    </div>
  );
};

export default Modal;
// Default export — imported anywhere as: import Modal from "..."
