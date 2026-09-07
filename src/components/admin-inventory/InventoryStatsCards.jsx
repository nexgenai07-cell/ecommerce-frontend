// ============================================================
// InventoryStatsCards — INVENTORY ALERTS SUB-COMPONENT
// ============================================================
// All 4 numbers here are REAL, cross-referenced from 2 real endpoints:
// - Products List (API 16) gives the true total catalog count
// - Inventory Alerts (API 74) gives exactly which products are
//   currently flagged as out-of-stock or low-stock, with their real
//   stock + threshold values
// "Healthy Stock" is computed by elimination: total products MINUS
// whatever Inventory Alerts flagged. No growth percentages are shown
// — there's no historical inventory-change tracking anywhere in the
// documented API to compare "vs last period" against.

import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineCloseCircle,
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineAppstore,
} from "react-icons/ai";

import { getInventoryAlerts } from "../../api/analytics.api";
import { getProducts } from "../../api/products.api";
import extractListData from "../../utils/extractListData";
import StatsCard from "../ui/StatsCard";

const InventoryStatsCards = () => {
  const { data: alertsResponse, isLoading: isAlertsLoading } = useQuery({
    queryKey: ["inventoryAlerts", "list"],
    queryFn: ({ signal }) => getInventoryAlerts(signal),
    staleTime: 1000 * 60 * 2,
  });

  const { data: productsResponse, isLoading: isProductsLoading } = useQuery({
    queryKey: ["inventoryAlerts", "totalProducts"],
    queryFn: ({ signal }) => getProducts({ page: 1 }, signal),
    staleTime: 1000 * 60 * 5,
  });

  const alerts = extractListData(alertsResponse);
  const outOfStockCount = alerts.filter(
    (item) => (item.available_stock ?? 0) === 0,
  ).length;
  const lowStockCount = alerts.filter(
    (item) => (item.available_stock ?? 0) > 0,
  ).length;
  // Every item Inventory Alerts returns is, by definition, EITHER out
  // of stock (0 available) or below its threshold (some available, but
  // still flagged) — splitting on available_stock === 0 cleanly
  // separates the two real categories

  const totalProducts = productsResponse?.data?.count ?? 0;
  const healthyStockCount = Math.max(
    totalProducts - outOfStockCount - lowStockCount,
    0,
  );

  const isLoading = isAlertsLoading || isProductsLoading;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Out of Stock"
        value={isLoading ? "—" : outOfStockCount}
        icon={<AiOutlineCloseCircle />}
        iconBg="bg-danger-light"
        iconColor="text-danger"
      />
      <StatsCard
        title="Low Stock"
        value={isLoading ? "—" : lowStockCount}
        icon={<AiOutlineWarning />}
        iconBg="bg-warning-light"
        iconColor="text-warning"
      />
      <StatsCard
        title="Healthy Stock"
        value={isLoading ? "—" : healthyStockCount}
        icon={<AiOutlineCheckCircle />}
        iconBg="bg-success-light"
        iconColor="text-success"
      />
      <StatsCard
        title="Total SKUs"
        value={isLoading ? "—" : totalProducts}
        icon={<AiOutlineAppstore />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
    </div>
  );
};

export default InventoryStatsCards;
