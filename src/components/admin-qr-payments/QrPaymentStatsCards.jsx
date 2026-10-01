import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineQrcode,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineRollback,
  AiOutlineWarning,
  AiOutlineHourglass,
  AiOutlineCalendar,
  AiOutlineDollarCircle,
} from "react-icons/ai";

import { getQrPaymentStats } from "../../api/payments.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import formatPrice from "../../utils/formatPrice";
import StatsCard from "../ui/StatsCard";

/**
 * QrPaymentStatsCards
 *
 * The stat cards at the top of the QR Payments page. Every number comes
 * straight from the QR payments stats endpoint.
 *
 * The counts follow the selected date range only (the day each proof was
 * submitted). The page's status, search and amount filters deliberately do
 * not change them, so the cards always show the overall picture for the
 * period. "Awaiting Proof" is a live count that ignores the dates.
 *
 * Props:
 * - startDate / endDate: Optional "yyyy-mm-dd" bounds for the period.
 */
const QrPaymentStatsCards = ({ startDate = "", endDate = "" }) => {
  const { data: response, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.QR_PAYMENTS, "stats", { startDate, endDate }],
    queryFn: ({ signal }) =>
      getQrPaymentStats(
        {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
        signal,
      ),
    staleTime: 1000 * 60 * 2,
  });

  const stats = response?.data;

  // Amounts arrive as decimal strings, so they are converted before
  // formatting. A missing value renders as a dash rather than a
  // misleading zero.
  const formatAmount = (value) =>
    value === undefined || value === null
      ? "—"
      : formatPrice(parseFloat(value));

  const cards = [
    {
      key: "total",
      title: "Total QR Payments",
      value: stats?.total,
      icon: <AiOutlineQrcode />,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      key: "pending_review",
      title: "Pending Review",
      value: stats?.pending_review,
      icon: <AiOutlineClockCircle />,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
      trend: stats?.pending_review > 0 ? "Requires action" : "",
    },
    {
      key: "approved",
      title: "Approved",
      value: stats?.approved,
      icon: <AiOutlineCheckCircle />,
      iconBg: "bg-success-light",
      iconColor: "text-success",
    },
    {
      key: "rejected",
      title: "Rejected",
      value: stats?.rejected,
      icon: <AiOutlineCloseCircle />,
      iconBg: "bg-danger-light",
      iconColor: "text-danger",
    },
    {
      key: "refunded",
      title: "Refunded",
      value: stats?.refunded,
      icon: <AiOutlineRollback />,
      iconBg: "bg-info-light",
      iconColor: "text-info",
    },
    {
      key: "duplicate_warnings",
      title: "Duplicate Warnings",
      value: stats?.duplicate_warnings,
      icon: <AiOutlineWarning />,
      iconBg: "bg-danger-light",
      iconColor: "text-danger",
    },
    {
      key: "awaiting_proof",
      title: "Awaiting Proof",
      value: stats?.awaiting_proof,
      icon: <AiOutlineHourglass />,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
    },
    {
      key: "submitted_today",
      title: "Submitted Today",
      value: stats?.submitted_today,
      icon: <AiOutlineCalendar />,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      key: "approved_amount",
      title: "Approved Amount",
      value: formatAmount(stats?.approved_amount),
      icon: <AiOutlineDollarCircle />,
      iconBg: "bg-success-light",
      iconColor: "text-success",
    },
    {
      key: "pending_amount",
      title: "Pending Amount",
      value: formatAmount(stats?.pending_amount),
      icon: <AiOutlineDollarCircle />,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((card) => (
        <StatsCard
          key={card.key}
          title={card.title}
          value={isLoading ? "—" : (card.value ?? "—")}
          icon={card.icon}
          iconBg={card.iconBg}
          iconColor={card.iconColor}
          trend={card.trend}
        />
      ))}
    </div>
  );
};

export default QrPaymentStatsCards;
