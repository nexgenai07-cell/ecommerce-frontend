import { useState } from "react"; // Controls the "show unchanged fields" toggle
import {
  AiOutlineArrowRight,
  AiOutlineClockCircle,
  AiOutlineDelete,
  AiOutlineDown,
  AiOutlineEdit,
  AiOutlineFileText,
  AiOutlineGlobal,
  AiOutlineInfoCircle,
  AiOutlinePlusCircle,
  AiOutlineSwap,
  AiOutlineTag,
  AiOutlineTeam,
  AiOutlineUp,
  AiOutlineUser,
} from "react-icons/ai"; // Same icon family used across the admin panel
// Shared modal shell that provides the backdrop, header and close button
import Modal from "../ui/Modal";
// Colored pill used for the action type
import Badge from "../ui/Badge";
import cn from "../../utils/cn";

// ------------------------------------------------------------
// ACTION STYLE — the backend sends specific actions such as
// "update_product" or "create_discount", so the look of the modal is
// decided by the action's prefix (create / update / delete).
// ------------------------------------------------------------
const ACTION_STYLES = {
  create: {
    icon: AiOutlinePlusCircle,
    badge: "success",
    iconBox: "bg-success-light text-success",
  },
  update: {
    icon: AiOutlineEdit,
    badge: "info",
    iconBox: "bg-info-light text-info",
  },
  delete: {
    icon: AiOutlineDelete,
    badge: "danger",
    iconBox: "bg-danger-light text-danger",
  },
};

// A stock adjustment is a kind of update, so it shares the update look
ACTION_STYLES.adjust = ACTION_STYLES.update;

// Neutral look for any action that is not create / update / adjust / delete
const DEFAULT_ACTION_STYLE = {
  icon: AiOutlineTag,
  badge: "gray",
  iconBox: "bg-gray-100 text-gray-600",
};

// Picks the style that matches the start of the action text
const getActionStyle = (action = "") => {
  const prefix = String(action).toLowerCase().split("_")[0];
  return ACTION_STYLES[prefix] || DEFAULT_ACTION_STYLE;
};

// "update_product" -> "Update product" (readable text for the header)
const humanize = (text = "") => {
  const spaced = String(text).replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

// Date AND time, because an audit trail needs to show when exactly an
// action happened (the table only shows the date).
const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

// Turns one stored value into text that fits in a table cell
const formatValue = (value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// True when the logged data is a plain { field: value } object
const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

// Name of the logged field that describes how a stock adjustment was made
// ({ delta, reason, note }). It is information about the action itself, not
// a product field with a before and an after value, so it is shown in its
// own section instead of the comparison table.
const ADJUSTMENT_KEY = "adjustment";

// Separates the adjustment details from the rest of a logged data object.
// Returns the remaining fields and the adjustment (or null when the entry
// has none).
const splitAdjustment = (data) => {
  if (!isPlainObject(data) || !isPlainObject(data[ADJUSTMENT_KEY])) {
    return { rest: data, adjustment: null };
  }
  return {
    rest: Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== ADJUSTMENT_KEY),
    ),
    adjustment: data[ADJUSTMENT_KEY],
  };
};

// Formats a stock change with an explicit sign, for example "+1,000" or
// "−1,000". Anything that is not a number is shown as plain text.
const formatDelta = (delta) => {
  const amount = Number(delta);
  if (delta === null || delta === undefined || Number.isNaN(amount)) {
    return formatValue(delta);
  }
  const formatted = Math.abs(amount).toLocaleString("en-US");
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `\u2212${formatted}`;
  return formatted;
};

// Small label + value tile used in the summary grid
const InfoTile = ({
  icon: Icon,
  label,
  value,
  mono = false,
  className,
  valueClassName,
}) => (
  <div
    className={cn(
      "flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3",
      className,
    )}
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-gray-100">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 break-words text-sm font-semibold text-gray-900",
          mono && "font-mono",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  </div>
);

// Modal that shows every detail of one audit log entry.
// isOpen  — whether the modal is visible.
// onClose — called to hide the modal.
// log     — the audit log row to display, or null when none is selected.
const AuditLogDetailModal = ({ isOpen, onClose, log }) => {
  // Whether the fields that did NOT change are listed as well
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Nothing to show until a log row has been chosen
  if (!log) return null;

  // user_name is the acting admin's readable name; log.user is just the
  // numeric user id, so this modal reads the same field the main table's
  // User column does (see AuditLogs.jsx).
  const userName = log.user_name || "System";

  // The name of the record the action was about. It is hidden when it is
  // identical to the customer name, because that value is already shown in
  // the Customer tile below.
  const showEntityName =
    !!log.entity_name && log.entity_name !== log.customer_name;

  const actionStyle = getActionStyle(log.action);
  const ActionIcon = actionStyle.icon;

  // ----------------------------------------------------------
  // BEFORE / AFTER — compared field by field so the admin sees
  // what actually changed instead of two walls of JSON.
  // ----------------------------------------------------------
  const hasData = !!(log.old_data || log.new_data);

  // Stock adjustment details are shown in their own section, so they are
  // taken out of the data that is compared field by field.
  const { rest: oldData, adjustment: oldAdjustment } = splitAdjustment(
    log.old_data,
  );
  const { rest: newData, adjustment: newAdjustment } = splitAdjustment(
    log.new_data,
  );
  const adjustment = newAdjustment || oldAdjustment;

  const canCompare =
    hasData &&
    (!oldData || isPlainObject(oldData)) &&
    (!newData || isPlainObject(newData));

  const fields = canCompare
    ? Array.from(
        new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]),
      ).map((key) => {
        const before = oldData?.[key];
        const after = newData?.[key];
        return {
          key,
          before,
          after,
          changed: JSON.stringify(before) !== JSON.stringify(after),
        };
      })
    : [];

  const changedCount = fields.filter((field) => field.changed).length;
  const unchangedCount = fields.length - changedCount;
  // When nothing changed, the unchanged fields are shown straight away so
  // the section is never empty.
  const visibleFields =
    showUnchanged || changedCount === 0
      ? fields
      : fields.filter((field) => field.changed);

  return (
    // Modal shell with a large width for the before/after comparison
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Details"
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* ── Summary header: what happened, to what, and when ── */}
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              actionStyle.iconBox,
            )}
          >
            <ActionIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={log.action} variant={actionStyle.badge} rounded />
            </div>
            <h4 className="mt-1.5 break-words text-lg font-bold text-gray-900">
              {humanize(log.entity)} #{log.entity_id}
              {showEntityName && (
                <span className="font-semibold text-gray-500">
                  {" "}
                  — {log.entity_name}
                </span>
              )}
            </h4>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              <AiOutlineClockCircle className="h-4 w-4 shrink-0" />
              {formatDateTime(log.created_at)}
            </p>
          </div>
        </div>

        {/* ── Summary tiles ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoTile
            icon={AiOutlineUser}
            label="Performed by"
            value={userName}
          />
          <InfoTile
            icon={AiOutlineGlobal}
            label="IP Address"
            value={log.ip_address || "—"}
            mono
          />
          {log.customer_name && (
            <InfoTile
              icon={AiOutlineTeam}
              label="Customer"
              value={log.customer_name}
              className="sm:col-span-2"
            />
          )}
        </div>

        {/* ── What changed ── */}
        {hasData && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-sm font-semibold text-gray-900">
                Data changes
              </h5>
              {canCompare && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    changedCount > 0
                      ? "bg-primary-50 text-primary"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  {changedCount > 0
                    ? `${changedCount} ${changedCount === 1 ? "field" : "fields"} changed`
                    : "No field changes"}
                </span>
              )}
            </div>

            {canCompare ? (
              <>
                {changedCount === 0 && (
                  <p className="text-xs text-gray-500">
                    None of the tracked fields were different before and after
                    this action. The saved values are listed below.
                  </p>
                )}

                <div className="overflow-hidden rounded-xl border border-gray-100">
                  {/* Column headings — hidden on phones, where each row
                      labels its own before / after values */}
                  <div className="hidden grid-cols-[1fr_1.4fr_1.4fr] gap-3 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
                    <span>Field</span>
                    <span>Before</span>
                    <span>After</span>
                  </div>

                  <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                    {visibleFields.map((field) => (
                      <div
                        key={field.key}
                        className={cn(
                          "grid grid-cols-1 gap-1 px-4 py-2.5 text-sm sm:grid-cols-[1fr_1.4fr_1.4fr] sm:items-center sm:gap-3",
                          field.changed ? "bg-white" : "bg-gray-50/40",
                        )}
                      >
                        <span className="font-medium text-gray-700">
                          {humanize(field.key)}
                        </span>
                        <span
                          className={cn(
                            "break-words",
                            field.changed
                              ? "rounded-md bg-danger-light/60 px-2 py-0.5 text-danger"
                              : "text-gray-500",
                          )}
                        >
                          <span className="mr-1 text-xs font-semibold uppercase text-gray-400 sm:hidden">
                            Before:
                          </span>
                          <span
                            className={cn(
                              field.changed &&
                                "line-through decoration-danger/40",
                            )}
                          >
                            {formatValue(field.before)}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1.5 break-words",
                            field.changed
                              ? "font-semibold text-success"
                              : "text-gray-500",
                          )}
                        >
                          {field.changed && (
                            <AiOutlineArrowRight className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
                          )}
                          <span className="mr-1 text-xs font-semibold uppercase text-gray-400 sm:hidden">
                            After:
                          </span>
                          {formatValue(field.after)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lets the admin reveal the fields that did not change */}
                {changedCount > 0 && unchangedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUnchanged((prev) => !prev)}
                    className="flex items-center gap-1.5 self-start text-xs font-semibold text-primary transition-colors hover:text-primary-dark"
                  >
                    {showUnchanged ? (
                      <AiOutlineUp className="h-3.5 w-3.5" />
                    ) : (
                      <AiOutlineDown className="h-3.5 w-3.5" />
                    )}
                    {showUnchanged
                      ? "Hide unchanged fields"
                      : `Show ${unchangedCount} unchanged ${
                          unchangedCount === 1 ? "field" : "fields"
                        }`}
                  </button>
                )}
              </>
            ) : (
              // Data that is not a simple { field: value } object is shown
              // as raw JSON, exactly as before.
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: "Before", data: log.old_data },
                  { label: "After", data: log.new_data },
                ].map(({ label, data }) => (
                  <div key={label}>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                      {label}
                    </p>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                      {data ? JSON.stringify(data, null, 2) : "—"}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── How the stock was adjusted ── */}
        {adjustment && (
          <div className="flex flex-col gap-3">
            <h5 className="text-sm font-semibold text-gray-900">
              Stock adjustment
            </h5>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoTile
                icon={AiOutlineSwap}
                label="Quantity change"
                value={formatDelta(adjustment.delta)}
                valueClassName={
                  Number(adjustment.delta) > 0
                    ? "text-success"
                    : Number(adjustment.delta) < 0
                      ? "text-danger"
                      : undefined
                }
              />
              <InfoTile
                icon={AiOutlineInfoCircle}
                label="Reason"
                value={adjustment.reason ? humanize(adjustment.reason) : "—"}
              />
              {adjustment.note && (
                <InfoTile
                  icon={AiOutlineFileText}
                  label="Note"
                  value={adjustment.note}
                  className="sm:col-span-2"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AuditLogDetailModal;
