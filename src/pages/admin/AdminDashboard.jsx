import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineDashboard,
  AiOutlineDollarCircle,
  AiOutlineShoppingCart,
  AiOutlineUser,
  AiOutlineClockCircle,
} from "react-icons/ai";

import { getDashboardSummary } from "../../api/analytics.api";
// getDashboardSummary — API 82: GET /api/v1/analytics/dashboard/
// returns { total_revenue, total_orders, total_customers, total_products,
//           revenue_growth, orders_growth, pending_orders,
//           low_stock_products, today_revenue, today_orders }

import { QUERY_KEYS } from "../../constants/queryKeys";
import formatPrice from "../../utils/formatPrice";
import PageHeader from "../../components/shared/PageHeader";
import StatsCard from "../../components/ui/StatsCard";
import RevenueChart from "../../components/admin-dashboard/RevenueChart";
import OrdersStatusChart from "../../components/admin-dashboard/OrdersStatusChart";
import RecentOrdersTable from "../../components/admin-dashboard/RecentOrdersTable";
import InventoryAlertsWidget from "../../components/admin-dashboard/InventoryAlertsWidget";
import TopSellingProducts from "../../components/admin-dashboard/TopSellingProducts";
import ActivityLogWidget from "../../components/admin-dashboard/ActivityLogWidget";

const AdminDashboard = () => {
  // --------------------------------------------------
  // DASHBOARD SUMMARY — API 82
  // Powers the 4 KPI cards at the top of the page.
  // Same query key AdminSidebar already uses for its badge counts —
  // TanStack Query recognizes this and reuses the SAME cached response
  // instead of firing a second network request for the same data.
  // --------------------------------------------------
  const { data: summaryResponse, isLoading: summaryLoading } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_SUMMARY,
    queryFn: getDashboardSummary,
    staleTime: 1000 * 60 * 2,
  });

  const summary = summaryResponse?.data || {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineDashboard />} title="Dashboard" />

      {/* ==========================================================
          ROW 1 — KPI Cards
          4 real metrics from API 82.
          ========================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* NOTE: "trend" / "trendLabel" props (the small "+12% vs last
            period" / "Urgent" text under the value) were intentionally
            removed from all 4 cards below, per Rimi's request — the
            StatsCard component itself still supports them (other pages
            like OrderStatsCards, RevenueStatsCards etc. still use them),
            we're just not passing them in on THIS dashboard anymore. */}
        <StatsCard
          title="Total Revenue"
          value={summaryLoading ? "—" : formatPrice(summary.total_revenue)}
          icon={<AiOutlineDollarCircle />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
        />

        <StatsCard
          title="Total Orders"
          value={summaryLoading ? "—" : summary.total_orders}
          icon={<AiOutlineShoppingCart />}
          iconBg="bg-info-light"
          iconColor="text-info"
        />

        <StatsCard
          title="Total Customers"
          value={summaryLoading ? "—" : summary.total_customers}
          icon={<AiOutlineUser />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          // No growth badge here — API 82 doesn't provide a customer
          // growth percentage, only the cumulative total (see flag notes)
        />

        <StatsCard
          title="Pending Orders"
          value={summaryLoading ? "—" : summary.pending_orders}
          icon={<AiOutlineClockCircle />}
          iconBg="bg-warning-light"
          iconColor="text-warning"
        />
      </div>

      {/* ==========================================================
          ROW 2 — Revenue chart (2/3) + Orders by Status donut (1/3)
          ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <OrdersStatusChart />
        </div>
      </div>

      {/* ==========================================================
          ROW 3 — Recent Orders (2/3) + Inventory Alerts (1/3)
          ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentOrdersTable />
        </div>
        <div>
          <InventoryAlertsWidget />
        </div>
      </div>

      {/* ==========================================================
          ROW 4 — Top Selling Products + System Activity Logs
          ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopSellingProducts />
        <ActivityLogWidget />
      </div>
    </div>
  );
};

export default AdminDashboard;
