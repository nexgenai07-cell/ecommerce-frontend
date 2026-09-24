import { BsCheckCircleFill } from "react-icons/bs";
import OrderStatusBadge from "../shared/OrderStatusBadge";

// OrderStatusTimeline — renders an order's status_history as a vertical
// timeline, oldest entry first (the array itself already arrives sorted
// that way from the backend, so no re-sorting happens here). Shared
// between the customer Order Detail page and the admin Order Detail
// page, since both receive the exact same status_history shape on the
// same order object.
//
// history — array of { status, note, changed_at }. Renders nothing at
// all when empty/missing, so a caller can mount this unconditionally
// without its own empty-array check.
const OrderStatusTimeline = ({ history }) => {
  if (!history?.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-900">Order Timeline</h2>
      </div>

      <div className="px-5 py-4 flex flex-col">
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          // The most recent entry (last in the oldest-first array) is
          // drawn as the "current" step — filled dot, bold text — the
          // rest read as already-completed history.
          const isCurrent = isLast;

          return (
            <div
              key={`${entry.status}-${entry.changed_at}`}
              className="flex gap-3"
            >
              {/* Dot + connecting line */}
              <div className="flex flex-col items-center">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                    isCurrent ? "bg-primary" : "bg-gray-300"
                  }`}
                />
                {!isLast && <span className="w-px flex-1 bg-gray-100 my-0.5" />}
              </div>

              {/* Status + note + timestamp */}
              <div className={`flex-1 min-w-0 ${isLast ? "" : "pb-4"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <OrderStatusBadge status={entry.status} size="sm" />
                  {isCurrent && (
                    <BsCheckCircleFill className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                {entry.note && (
                  <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                )}
                {entry.changed_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(entry.changed_at).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatusTimeline;
