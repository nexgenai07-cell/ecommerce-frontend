import { BsExclamationCircleFill } from "react-icons/bs";

// Every time an admin rejects a QR proof, the backend appends a
// status_history entry carrying a note in this exact shape ("QR payment
// proof rejected: <reason>"). There is no dedicated rejection-history
// field on the order, so each past attempt is recovered from the
// timeline itself, in the same chronological order it already arrives
// in. The check only looks for the word "rejected" (case-insensitive)
// so a note that departs slightly from the exact wording still
// surfaces here instead of silently disappearing from the list.
const isRejectionEntry = (entry) =>
  typeof entry?.note === "string" && /rejected/i.test(entry.note);

// Reads the admin-typed reason back out of a rejection note, stripping
// everything up to and including the last "rejected:" marker. Falls
// back to the raw note when that marker isn't present, so a
// differently worded note still renders something useful rather than
// an empty card.
const extractReason = (note) => {
  const marker = note.toLowerCase().lastIndexOf("rejected:");
  return marker === -1 ? note : note.slice(marker + "rejected:".length).trim();
};

// QrRejectionHistory — an "attempts used" counter plus one card per
// past QR proof rejection, each showing the admin's stated reason and
// the exact time it happened. Reused as-is between the customer Order
// Detail page and the admin Order Detail page, since both work from
// the same order.status_history array and the same qr_rejection_count
// field.
//
// history        — the order's status_history array: { status, note, changed_at }
// rejectionCount — payment.qr_rejection_count, the authoritative running total
// maxAttempts    — the fixed cap after which the order is auto-cancelled
const QrRejectionHistory = ({
  history,
  rejectionCount = 0,
  maxAttempts = 3,
}) => {
  const rejections = (history || []).filter(isRejectionEntry);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-700">
          Rejection Attempts
        </span>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
            rejectionCount >= maxAttempts
              ? "bg-danger-light text-danger"
              : rejectionCount > 0
                ? "bg-warning-light text-warning"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {rejectionCount}/{maxAttempts}
        </span>
      </div>

      {rejections.length > 0 && (
        <div className="flex flex-col gap-2">
          {rejections.map((entry, index) => (
            <div
              key={entry.changed_at || index}
              className="rounded-xl border border-danger-light bg-danger-light/40 px-3.5 py-3 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger shrink-0">
                  <BsExclamationCircleFill className="w-3 h-3 shrink-0" />
                  Attempt {index + 1}/{maxAttempts} rejected
                </span>
                {entry.changed_at && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(entry.changed_at).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 break-words">
                {extractReason(entry.note)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QrRejectionHistory;
