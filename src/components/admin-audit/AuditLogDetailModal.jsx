import Modal from "../ui/Modal";
import formatDate from "../../utils/formatDate";

const AuditLogDetailModal = ({ isOpen, onClose, log }) => {
  if (!log) return null;

  const userName =
    (typeof log.user === "object" ? log.user?.name : log.user) || "System";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Details"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">User</p>
            <p className="text-gray-900 font-medium">{userName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Action</p>
            <p className="text-gray-900 font-medium capitalize">{log.action}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Entity</p>
            <p className="text-gray-900 font-medium">
              {log.entity} #{log.entity_id}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">IP Address</p>
            <p className="text-gray-900 font-medium font-mono">
              {log.ip_address}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">Timestamp</p>
            <p className="text-gray-900 font-medium">
              {formatDate(log.created_at)}
            </p>
          </div>
        </div>

        {(log.old_data || log.new_data) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Before
              </p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto max-h-48">
                {log.old_data ? JSON.stringify(log.old_data, null, 2) : "—"}
              </pre>
            </div>
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
