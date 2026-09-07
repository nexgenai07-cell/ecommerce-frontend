import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "../../api/admin.api";

import extractListData from "../../utils/extractListData";
import formatRelativeTime from "../../utils/formatRelativeTime";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";

// Maps the raw "entity" field to an accent color for the highlighted
// item name. Falls back gracefully for any entity not explicitly listed.
const getEntityAccent = (entity = "") => {
  const value = entity.toLowerCase();

  if (value.includes("order")) return "text-info";
  if (value.includes("ship") || value.includes("track")) return "text-warning";
  if (
    value.includes("auth") ||
    value.includes("login") ||
    value.includes("session")
  )
    return "text-danger";
  if (value.includes("product")) return "text-success";
  if (value.includes("categ") || value.includes("discount"))
    return "text-primary";
  return "text-primary";
};

// Consistent avatar background color per user, derived from a simple
// hash of their email so the same person always gets the same color.
const AVATAR_PALETTE = [
  "bg-rose-100 text-rose-600",
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-violet-100 text-violet-600",
  "bg-cyan-100 text-cyan-600",
];

const getAvatarStyle = (seed = "") => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const getInitials = (label = "") => {
  const namePart = label.includes("@") ? label.split("@")[0] : label;
  return namePart.slice(0, 2).toUpperCase() || "SY";
};

// Turns the raw log fields into what's shown on screen:
// - userLabel: bold display name (email prefix, capitalized)
// - action: the human-readable phrase from the backend, as-is
// - detail: the specific record affected, if the API gave one
const describeLog = (log) => {
  const emailPrefix = log.user_email ? log.user_email.split("@")[0] : "System";
  const userLabel = log.user_email
    ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    : "System";

  const action = log.action || "performed an action";

  const detail =
    log.new_data?.name ||
    log.old_data?.name ||
    (log.entity_id ? `#${log.entity_id}` : null);

  return { userLabel, action, detail };
};

const ActivityLogWidget = () => {
  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ["adminDashboard", "auditLogs"],
    queryFn: ({ signal }) => getAuditLogs(undefined, signal),
    staleTime: 1000 * 60 * 2,
  });

  const logs = extractListData(logsResponse).slice(0, 6);
  // Dashboard preview only — the full log lives on ROUTES.ADMIN_AUDIT_LOGS

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300
      "
    >
      <h2 className="text-base font-semibold text-gray-900">
        System Activity Logs
      </h2>

      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="No Activity Yet"
          description="Admin actions will be logged here as they happen."
        />
      ) : (
        <div className="flex flex-col">
          {logs.map((log, index) => {
            const { userLabel, action, detail } = describeLog(log);
            const accent = getEntityAccent(log.entity);
            const isLast = index === logs.length - 1;

            return (
              <div key={log.id} className="flex gap-3">
                {/* Avatar + connecting timeline line */}
                <div className="flex flex-col items-center">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ring-2 ring-white ${getAvatarStyle(
                      log.user_email || "system",
                    )}`}
                  >
                    {getInitials(log.user_email || "System")}
                  </span>
                  {!isLast && <span className="w-px flex-1 bg-gray-100 my-1" />}
                </div>

                <div className="pb-4 min-w-0">
                  <p className="text-sm leading-relaxed text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {userLabel}
                    </span>{" "}
                    {action}
                    {detail && (
                      <>
                        {" "}
                        <span className={`font-semibold ${accent}`}>
                          ({detail})
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeTime(log.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityLogWidget;
