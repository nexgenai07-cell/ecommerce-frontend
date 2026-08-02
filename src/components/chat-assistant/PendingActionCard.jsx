import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai";

import { confirmAdminAction, cancelAdminAction } from "../../api/chat.api";
import { showError } from "../ui/Toast";
import Spinner from "../ui/Spinner";
import cn from "../../utils/cn";

const PendingActionCard = ({ pendingAction }) => {
  // Tracks the LOCAL outcome once the admin taps a button — "confirmed"
  // or "cancelled" — so the buttons are replaced with a settled state
  // immediately, without waiting for the conversation to reload.
  const [resolution, setResolution] = useState(null);

  // Tracks whether the 5-minute confirmation window (expires_at, set
  // by the backend) has already passed — checked locally so the UI
  // can disable the buttons even before the admin tries clicking one.
  const [isExpired, setIsExpired] = useState(
    () => new Date(pendingAction.expires_at) <= new Date(),
  );

  // Schedules a one-off timer that flips isExpired to true at the
  // EXACT moment expires_at is reached, so the card updates itself
  // live even if the admin leaves it sitting on screen unconfirmed.
  useEffect(() => {
    if (isExpired) return undefined;
    const msRemaining = new Date(pendingAction.expires_at) - new Date();
    const timer = setTimeout(
      () => setIsExpired(true),
      Math.max(msRemaining, 0),
    );
    return () => clearTimeout(timer);
  }, [pendingAction.expires_at, isExpired]);

  const confirmMutation = useMutation({
    mutationFn: () => confirmAdminAction(pendingAction.action_id),
    onSuccess: () => setResolution("confirmed"),
    onError: (error) => {
      // 410 Gone is the backend's specific code for an expired
      // action_id — surfaced with the exact wording from the spec.
      if (error?.response?.status === 410) {
        setIsExpired(true);
        showError("This confirmation has expired. Please repeat the request.");
      } else {
        showError("Couldn't confirm this action. Please try again.");
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelAdminAction(pendingAction.action_id),
    onSuccess: () => setResolution("cancelled"),
    onError: () => showError("Couldn't cancel this action. Please try again."),
  });

  const isBusy = confirmMutation.isPending || cancelMutation.isPending;

  // --------------------------------------------------
  // SETTLED STATE — already confirmed or cancelled
  // --------------------------------------------------
  if (resolution) {
    return (
      <div
        className={cn(
          "mt-2 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 w-fit",
          resolution === "confirmed"
            ? "bg-success-light text-success"
            : "bg-gray-100 text-gray-500",
        )}
      >
        {resolution === "confirmed" ? (
          <AiOutlineCheck className="w-3.5 h-3.5" />
        ) : (
          <AiOutlineClose className="w-3.5 h-3.5" />
        )}
        {resolution === "confirmed" ? "Confirmed" : "Cancelled"}
      </div>
    );
  }

  return (
    <div className="mt-2 bg-white/10 rounded-lg p-3 w-full max-w-xs">
      {/* Preview fields — rendered generically from whatever keys the
          backend included in pending_action.preview, so this card
          works identically for every action_type (create_product,
          update_inventory, cancel_order, etc.) without needing a
          separate layout per type. */}
      <div className="flex flex-col gap-1.5 mb-3">
        {Object.entries(pendingAction.preview).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-white/60 capitalize">
              {key.replace(/_/g, " ")}
            </span>
            <span className="text-white font-semibold">{String(value)}</span>
          </div>
        ))}
      </div>

      {isExpired ? (
        <p className="text-xs text-white/60 italic">
          This confirmation has expired — please repeat the request.
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => confirmMutation.mutate()}
            disabled={isBusy}
            className="flex-1 bg-success text-white rounded-md py-1.5 text-xs font-semibold
              flex items-center justify-center gap-1 hover:opacity-90 transition-opacity
              disabled:opacity-50"
          >
            {confirmMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              <AiOutlineCheck className="w-3.5 h-3.5" />
            )}
            Confirm
          </button>
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            disabled={isBusy}
            className="flex-1 bg-transparent border border-white/30 text-white rounded-md py-1.5
              text-xs font-semibold flex items-center justify-center gap-1
              hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {cancelMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              <AiOutlineClose className="w-3.5 h-3.5" />
            )}
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingActionCard;
