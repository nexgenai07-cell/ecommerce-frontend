// Shared modal shell that provides the backdrop, header and close button
import Modal from "../ui/Modal";
// Formats an ISO date string for display
import formatDate from "../../utils/formatDate";

// Modal that shows every detail of one audit log entry.
// isOpen  — whether the modal is visible.
// onClose — called to hide the modal.
// log     — the audit log row to display, or null when none is selected.
const AuditLogDetailModal = ({ isOpen, onClose, log }) => {
  // Nothing to show until a log row has been chosen
  if (!log) return null;

  // user_name is the acting admin's readable name; log.user is just the
  // numeric user id, so this modal reads the same field the main table's
  // User column does (see AuditLogs.jsx).
  const userName = log.user_name || "System";

  // The name of the record the action was about. It is hidden when it is
  // identical to the customer name, because that value is already shown in
  // the Customer row below.
  const showEntityName =
    !!log.entity_name && log.entity_name !== log.customer_name;

  return (
    // Modal shell with a large width for the before/after panels
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Details"
      size="lg"
    >
      {/* Vertical stack: summary grid first, data comparison second */}
      <div className="flex flex-col gap-4">
        {/* Two-column grid of the log's summary fields */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* The admin who performed the action */}
          <div>
            <p className="text-xs text-gray-400">User</p>
            <p className="text-gray-900 font-medium">{userName}</p>
          </div>
          {/* The kind of action that was performed */}
          <div>
            <p className="text-xs text-gray-400">Action</p>
            <p className="text-gray-900 font-medium capitalize">{log.action}</p>
          </div>
          {/* The type and id of the record the action was about */}
          <div>
            <p className="text-xs text-gray-400">Entity</p>
            <p className="text-gray-900 font-medium">
              {log.entity} #{log.entity_id}
            </p>
          </div>
          {/* The name of the product, category or discount the row is about */}
          {showEntityName && (
            <div>
              <p className="text-xs text-gray-400">Entity Name</p>
              <p className="text-gray-900 font-medium">{log.entity_name}</p>
            </div>
          )}
          {/* The customer the action was about, when there is one */}
          {log.customer_name && (
            <div>
              <p className="text-xs text-gray-400">Customer</p>
              <p className="text-gray-900 font-medium">{log.customer_name}</p>
            </div>
          )}
          {/* The network address the action came from */}
          <div>
            <p className="text-xs text-gray-400">IP Address</p>
            <p className="text-gray-900 font-medium font-mono">
              {log.ip_address || "—"}
            </p>
          </div>
          {/* When the action happened, spanning both columns */}
          <div className="col-span-2">
            <p className="text-xs text-gray-400">Timestamp</p>
            <p className="text-gray-900 font-medium">
              {formatDate(log.created_at)}
            </p>
          </div>
        </div>

        {/* Before and after data, shown only when the log carries any */}
        {(log.old_data || log.new_data) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Data as it was before the action */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Before
              </p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto max-h-48">
                {log.old_data ? JSON.stringify(log.old_data, null, 2) : "—"}
              </pre>
            </div>
            {/* Data as it is after the action */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                After
              </p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto max-h-48">
                {log.new_data ? JSON.stringify(log.new_data, null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AuditLogDetailModal;
