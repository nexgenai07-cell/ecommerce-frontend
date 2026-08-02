import {
  AiOutlineFileText,
  AiOutlineExclamationCircle,
  AiOutlineSync,
  AiOutlineCheckCircle,
} from "react-icons/ai";

import StatsCard from "../ui/StatsCard";

const ComplaintStatsCards = ({
  totalCount, // Every complaint in the store, regardless of status
  openCount, // Complaints still awaiting a first look
  urgentOpenCount, // Subset of openCount where priority is "urgent"
  inProgressCount, // Complaints an admin is currently working on
  resolvedCount, // Complaints marked resolved
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Complaints"
        value={totalCount}
        icon={<AiOutlineFileText />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
      <StatsCard
        title="Open"
        value={openCount}
        icon={<AiOutlineExclamationCircle />}
        iconBg="bg-danger-light"
        iconColor="text-danger"
        trend={urgentOpenCount > 0 ? `${urgentOpenCount} Urgent` : ""}
      />
      <StatsCard
        title="In Review"
        value={inProgressCount}
        icon={<AiOutlineSync />}
        iconBg="bg-info-light"
        iconColor="text-info"
      />
      <StatsCard
        title="Resolved"
        value={resolvedCount}
        icon={<AiOutlineCheckCircle />}
        iconBg="bg-success-light"
        iconColor="text-success"
      />
    </div>
  );
};

export default ComplaintStatsCards;
