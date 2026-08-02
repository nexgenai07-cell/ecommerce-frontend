import {
  AiOutlineTag,
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlinePauseCircle,
} from "react-icons/ai";

import StatsCard from "../ui/StatsCard";

const DiscountStatsCards = ({
  totalCount,
  activeCount,
  expiredCount,
  inactiveCount,
}) => {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex-1 min-w-40 max-w-55">
        <StatsCard
          title="Total Discounts"
          value={totalCount}
          icon={<AiOutlineTag />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          compact
        />
      </div>
      <div className="flex-1 min-w-40 max-w-55">
        <StatsCard
          title="Active"
          value={activeCount}
          icon={<AiOutlineCheckCircle />}
          iconBg="bg-success-light"
          iconColor="text-success"
          compact
        />
      </div>
      <div className="flex-1 min-w-40 max-w-55">
        <StatsCard
          title="Expired"
          value={expiredCount}
          icon={<AiOutlineClockCircle />}
          iconBg="bg-danger-light"
          iconColor="text-danger"
          compact
        />
      </div>
      <div className="flex-1 min-w-40 max-w-55">
        <StatsCard
          title="Inactive"
          value={inactiveCount}
          icon={<AiOutlinePauseCircle />}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
          compact
        />
      </div>
    </div>
  );
};

export default DiscountStatsCards;
