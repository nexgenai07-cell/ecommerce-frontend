// ============================================================
// LiveToast
// ============================================================
// Card rendered inside a react-hot-toast toast for events pushed by the
// live updates socket (new notifications and new order / return / complaint
// alerts for admins).
//
// When an onClick handler is provided the whole card becomes a button, so
// the user can jump straight to the related order, return or complaint.
// Without a handler it is a plain, non-interactive message.

import { AiOutlineBell, AiOutlineClose } from "react-icons/ai";

// Props:
// toastInstance -> the toast object supplied by react-hot-toast's toast.custom();
//                  its `visible` flag drives the enter and exit transition
// title         -> short bold heading of the message
// message       -> supporting text, clamped to two lines
// customerName  -> optional name of the customer the event is about, shown
//                  on its own line below the message (admin notifications)
// onClick       -> optional handler that opens the related page
// onDismiss     -> closes the toast when the close button is pressed
const LiveToast = ({
  toastInstance,
  title,
  message,
  customerName,
  onClick,
  onDismiss,
}) => {
  const isInteractive = typeof onClick === "function";

  // Shared by the interactive and the plain layout so both render the same
  // text content.
  const content = (
    <>
      <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
      {message && (
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{message}</p>
      )}
      {customerName && (
        <p className="mt-0.5 truncate text-xs font-medium text-gray-600">
          Customer: {customerName}
        </p>
      )}
    </>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        pointer-events-auto flex w-full max-w-sm items-start gap-3
        rounded-xl border border-gray-100 bg-white p-3 shadow-lg
        transition-all duration-200
        ${
          toastInstance.visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0"
        }
      `}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <AiOutlineBell className="h-4 w-4" />
      </span>

      {isInteractive ? (
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          {content}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{content}</div>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-500"
      >
        <AiOutlineClose className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default LiveToast;
