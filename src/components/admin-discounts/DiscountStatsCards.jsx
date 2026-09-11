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
    <div className="flex flex-wrap gap-2">
      <StatsCard
        title="Total Discounts"
        value={totalCount}
        icon={<AiOutlineTag />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
      <StatsCard
        title="Active"
        value={activeCount}
        icon={<AiOutlineCheckCircle />}
        iconBg="bg-success-light"
        iconColor="text-success"
      />
      <StatsCard
        title="Expired"
        value={expiredCount}
        icon={<AiOutlineClockCircle />}
        iconBg="bg-danger-light"
        iconColor="text-danger"
      />
      <StatsCard
        title="Inactive"
        value={inactiveCount}
        icon={<AiOutlinePauseCircle />}
        iconBg="bg-gray-100"
        iconColor="text-gray-500"
      />
    </div>
  );
};

export default DiscountStatsCards;
