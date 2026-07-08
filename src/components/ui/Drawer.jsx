// Reusable Drawer component — panel that slides in from the side of the screen
// Direction: right or left
// Sizes: sm, md, lg
// Will be used for mobile menu, cart drawer, and filter drawer
// Fully responsive

import { useEffect } from "react";
// useEffect — handles side effects: body scroll lock and ESC key listener

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Drawer = ({
  isOpen = false, // Controls whether the drawer is visible — driven from parent state
  onClose, // Called whenever the drawer should close (backdrop, ESC, or X button)
  title = "", // Optional heading text rendered in the drawer header
  children, // Content rendered inside the scrollable drawer body
  direction = "right", // Which side the drawer slides in from — "right" or "left"
  size = "md", // Controls the width of the drawer panel — sm, md, or lg
  showClose = true, // When true, renders the X close button in the header
  closeOnBackdrop = true, // When true, clicking the dark backdrop closes the drawer
  className = "", // Extra Tailwind classes applied to the drawer panel itself
}) => {
  // --- SIDE EFFECT: Body scroll lock ---
  // Prevents the page behind the drawer from scrolling while it is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Locks body scroll — stops background content from moving while drawer is active
    } else {
      document.body.style.overflow = "unset";
      // Restores normal scrolling when the drawer is closed
    }
    return () => {
      document.body.style.overflow = "unset";
      // Cleanup — restores scroll if the component unmounts while drawer is still open
    };
  }, [isOpen]);
  // Re-runs whenever isOpen changes — scroll state always matches drawer visibility

  // --- SIDE EFFECT: ESC key listener ---
  // Allows the user to close the drawer by pressing the Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
      // onClose?.() uses optional chaining — safely does nothing if onClose is not provided
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      // Attaches listener only when drawer is open — avoids unnecessary global listeners
    }
    return () => window.removeEventListener("keydown", handleEsc);
    // Cleanup — removes the listener when drawer closes or component unmounts
  }, [isOpen, onClose]);
  // Re-runs when isOpen or onClose changes — keeps the handler reference current

  // Early return — renders nothing to the DOM when the drawer is closed
  if (!isOpen) return null;
  // Avoids rendering the backdrop and panel when they are not needed

  // Each size maps to a Tailwind width class — md and lg use responsive widths
  const sizeClasses = {
    sm: "w-72", // 288px fixed — used for simple navigation or utility drawers
    md: "w-80 sm:w-96", // 320px on mobile, 384px on sm+ — used for cart and filter drawers
    lg: "w-full sm:w-[480px]", // Full width on mobile, 480px on sm+ — used for detail drawers
  };

  // Each direction pins the panel to the correct screen edge
  const directionClasses = {
    right: "right-0 top-0 h-full",
    // Pins the panel to the right edge, stretches full viewport height
    left: "left-0 top-0 h-full",
    // Pins the panel to the left edge, stretches full viewport height
  };

  return (
    // Backdrop container — fixed full-screen overlay above all page content
    <div className="fixed inset-0 z-drawer flex">
      {/* fixed inset-0: covers the entire viewport regardless of scroll position */}
      {/* z-drawer: custom z-index token ensures drawer sits above all other UI layers */}
      {/* flex: needed so the drawer panel can be absolutely positioned inside */}

      {/* Dark backdrop — click-capture layer that dims the background */}
      <div
        className="absolute inset-0"
        // absolute inset-0: fills the entire fixed container
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        // Semi-transparent black overlay — inline style for arbitrary rgba value
        onClick={closeOnBackdrop ? onClose : undefined}
        // Calls onClose when user clicks outside the drawer panel
        // When closeOnBackdrop is false, click does nothing — drawer stays open
      />

      {/* Drawer panel — the visible sliding sidebar */}
      <div
        className={cn(
          // Base classes — applied to every drawer instance
          "absolute bg-white shadow-xl flex flex-col",
          // absolute: positions the panel relative to the fixed backdrop container
          // bg-white: solid white background to cover the darkened backdrop
          // shadow-xl: strong left/right drop shadow lifts the panel off the backdrop
          // flex flex-col: stacks header and scrollable body vertically

          directionClasses[direction],
          // Pins the panel to the correct screen edge and stretches it full height

          sizeClasses[size],
          // Injects the correct width for the chosen size

          className,
          // Merges any extra classes passed from the parent component
        )}
      >
        {/* Drawer header — only rendered when title or close button is needed */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            {/* flex + items-center + justify-between: title on left, X button on right */}
            {/* px-5 py-4: consistent header padding */}
            {/* border-b border-gray-100: subtle line separates header from scrollable body */}
            {/* shrink-0: prevents the header from compressing when body content overflows */}

            {/* Drawer title — only rendered when title prop is a non-empty string */}
            {title && (
              <h3 className="text-base font-semibold text-gray-900">
                {title}
                {/* text-base + font-semibold + text-gray-900: consistent with Modal header style */}
              </h3>
            )}

            {/* Close button — only rendered when showClose prop is true */}
            {showClose && (
              <button
                onClick={onClose}
                // Calls onClose when the X button is clicked
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                // ml-auto: pushes button to far right even when no title is present
                // p-1.5: small padding for a comfortable click target around the icon
                // rounded-lg: rounded button consistent with the design system
                // text-gray-400 + hover:text-gray-600 + hover:bg-gray-100: subtle hover feedback
                // transition-colors: smooth color change on hover
              >
                {/* X icon — two diagonal crossing lines forming a close symbol */}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {/* w-4 h-4: 16px — small and unobtrusive in the header */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                    // Two diagonal paths that form an X shape when rendered together
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Drawer body — scrollable content area that fills remaining panel height */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* flex-1: expands to fill all vertical space not taken by the header */}
          {/* overflow-y-auto: enables vertical scrolling when content exceeds panel height */}
          {/* p-5: consistent padding around all body content */}
          {children}
          {/* Renders whatever JSX is passed as children from the parent component */}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
// Default export — imported anywhere as: import Drawer from "..."
