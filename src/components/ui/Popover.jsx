import { useState, useRef, useEffect } from "react";
// useState — tracks whether the popover panel is currently open
// useRef   — holds a reference to the outer wrapper DOM node, so we
//            can detect clicks that happen OUTSIDE of it
// useEffect — attaches/removes the document-level click and keydown
//             listeners only while the popover is actually open

import cn from "../../utils/cn";
// cn — merges Tailwind classes conditionally, resolving conflicts

const Popover = ({
  trigger, // The element that toggles the popover open/closed when clicked (a button, an avatar, an icon — anything)
  children, // The popover panel's content — either a React node, or a function receiving { close }
  align = "right", // Which edge of the trigger the panel's edge lines up with — "right" or "left"
  panelClassName = "", // Extra Tailwind classes for the panel itself (width, custom styling, etc.)
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Local state — this popover does NOT need to be controlled from
  // outside (no Redux entry for "which popover is open" the way
  // uiSlice tracks modals/drawers), since at most one popover panel
  // is relevant to any one trigger at a time and nothing else in the
  // app needs to know its state.

  const wrapperRef = useRef(null);
  // Points at the outer <div> below — used to check "did the click
  // that just happened land inside this popover, or outside it?"

  // --------------------------------------------------
  // CLOSE ON OUTSIDE CLICK + ESCAPE KEY
  // --------------------------------------------------
  useEffect(() => {
    // Skip attaching any listeners at all while the popover is closed —
    // no point listening for "clicks outside" something that isn't showing
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      // wrapperRef.current is the actual DOM node of our outer <div>.
      // .contains(event.target) checks whether the clicked element is
      // INSIDE that node (the trigger or the panel) or somewhere else
      // on the page entirely.
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      // Standard accessibility expectation — Escape should dismiss any
      // open floating panel, same as closing a Modal/Drawer
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    // mousedown (not click) is used deliberately — it fires BEFORE the
    // trigger's own onClick toggle would re-open it, avoiding a
    // flicker where the popover closes then immediately reopens
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    // Cleanup — remove both listeners the moment the popover closes OR
    // this component unmounts, so we never leak listeners onto
    // document that keep firing for a popover that no longer exists
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);
  // Re-runs whenever isOpen changes — attaches when it becomes true,
  // cleans up when it becomes false

  return (
    <div ref={wrapperRef} className="relative inline-block">
      {/* relative: this becomes the positioning anchor for the panel's
          "absolute" positioning below
          inline-block: doesn't force full width, sits naturally next
          to other header items like a bell icon or avatar */}

      {/* TRIGGER — whatever was passed in, wrapped in a click handler
          that flips the open state */}
      <div onClick={() => setIsOpen((prev) => !prev)}>{trigger}</div>

      {/* PANEL — only rendered in the DOM at all while open, so closed
          popovers cost nothing and can't be focused/read by screen
          readers when hidden */}
      {isOpen && (
        <div
          className={cn(
            // Base panel styling — matches the project's card/modal
            // language (surface background, border, shadow, rounded)
            "absolute top-full mt-2 z-dropdown", // positioned just below the trigger, layered above normal page content (z-dropdown = 100, per tokens.css)
            "bg-surface border border-border rounded-xl shadow-lg", // white card, subtle border, elevated shadow — same visual family as Modal.jsx
            "overflow-hidden", // clips inner content (e.g. hover backgrounds on menu rows) to the panel's rounded corners
            align === "right" ? "right-0" : "left-0", // "right" lines the panel's right edge up with the trigger's right edge (prevents it running off-screen for right-aligned triggers like a navbar), "left" does the mirror image
            panelClassName, // caller-supplied overrides — e.g. a fixed width like "w-80"
          )}
        >
          {/* Support BOTH plain node children and a function-as-children
              pattern. The function form receives a "close" callback so
              panel content (like a menu item) can close the popover
              itself after handling its own click — e.g. after marking
              a notification as read, or right before navigating away. */}
          {typeof children === "function"
            ? children({ close: () => setIsOpen(false) })
            : children}
        </div>
      )}
    </div>
  );
};

export default Popover;
