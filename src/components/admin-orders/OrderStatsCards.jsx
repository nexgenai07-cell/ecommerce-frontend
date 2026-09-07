// ============================================================
// OrderStatsCards — ORDER MANAGEMENT SUB-COMPONENT
// ============================================================
// Source: API 85 Orders Analytics (GET /api/v1/analytics/orders/),
// which returns { total, by_status: [{ status, count }] } — every
// number on every card here comes directly from that one real
// response. No growth percentages are shown because no per-status
// growth/trend data exists anywhere in the documented API.

import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineShoppingCart,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineCar,
  AiOutlineInbox,
} from "react-icons/ai";

import { getOrdersAnalytics } from "../../api/analytics.api";
import { ORDER_STATUS } from "../../constants/statusTypes";
import StatsCard from "../ui/StatsCard";

const OrderStatsCards = () => {
  const { data: response, isLoading } = useQuery({
    queryKey: ["adminOrders", "statusBreakdown"],
    queryFn: ({ signal }) => getOrdersAnalytics({}, signal),
    staleTime: 1000 * 60 * 2,
  });

  const total = response?.data?.total ?? 0;
  const byStatus = response?.data?.by_status || [];

  const countFor = (statusKey) =>
    byStatus.find((item) => item.status === statusKey)?.count ?? 0;

  const cards = [
    {
      title: "Total Orders",
      value: total,
      icon: <AiOutlineShoppingCart />,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      title: "Pending",
      value: countFor(ORDER_STATUS.PENDING),
      icon: <AiOutlineClockCircle />,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
    },
    {
      title: "Confirmed",
      value: countFor(ORDER_STATUS.CONFIRMED),
      icon: <AiOutlineCheckCircle />,
      iconBg: "bg-info-light",
      iconColor: "text-info",
    },
    {
      title: "Shipped",
      value: countFor(ORDER_STATUS.SHIPPED),
      icon: <AiOutlineCar />,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      title: "Delivered",
      value: countFor(ORDER_STATUS.DELIVERED),
      icon: <AiOutlineInbox />,
      iconBg: "bg-success-light",
      iconColor: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <StatsCard
          key={card.title}
          title={card.title}
          value={isLoading ? "—" : card.value}
          icon={card.icon}
          iconBg={card.iconBg}
          iconColor={card.iconColor}
        />
      ))}
    </div>
  );
};

export default OrderStatsCards;
