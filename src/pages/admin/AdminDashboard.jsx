import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AiOutlineDashboard,
  AiOutlineDollarCircle,
  AiOutlineShoppingCart,
  AiOutlineUser,
  AiOutlineClockCircle,
  AiOutlineCreditCard,
  AiOutlineStar,
  AiOutlineRight,
  AiOutlineRise,
  AiOutlinePercentage,
  AiOutlineWallet,
} from "react-icons/ai";

import { getDashboardSummary } from "../../api/analytics.api";
// getDashboardSummary — returns the dashboard figures:
//   total_revenue, total_orders, total_customers, total_products,
//   revenue_growth, orders_growth, pending_orders, low_stock_products,
//   today_revenue, today_orders, pending_reviews, and the profit figures
//   total_cost, gross_profit, markup_percent, profit_margin_percent.

import { QUERY_KEYS } from "../../constants/queryKeys";
import { ROUTES } from "../../constants/routes";
import { ORDER_STATUS } from "../../constants/statusTypes";
import formatPrice from "../../utils/formatPrice";
import formatPercent from "../../utils/formatPercent";
import formatPriceOrDash from "../../utils/formatPriceOrDash";
import PageHeader from "../../components/shared/PageHeader";
import StatsCard from "../../components/ui/StatsCard";
import RevenueChart from "../../components/admin-dashboard/RevenueChart";
import OrdersStatusChart from "../../components/admin-dashboard/OrdersStatusChart";
import RecentOrdersTable from "../../components/admin-dashboard/RecentOrdersTable";
import InventoryAlertsWidget from "../../components/admin-dashboard/InventoryAlertsWidget";
import TopSellingProducts from "../../components/admin-dashboard/TopSellingProducts";
import ActivityLogWidget from "../../components/admin-dashboard/ActivityLogWidget";

const AdminDashboard = () => {
  const navigate = useNavigate();
  // navigate — used by the KPI cards below so each one takes the admin
  // straight to the relevant management page instead of being purely
  // informational.

  // --------------------------------------------------
  // DASHBOARD SUMMARY
  // Powers the KPI cards, the profit cards and the "reviews awaiting
  // approval" banner. The server caches this response for five minutes,
  // so a change can take a little while to show up here.
  // --------------------------------------------------
  const { data: summaryResponse, isLoading: summaryLoading } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_SUMMARY,
    queryFn: ({ signal }) => getDashboardSummary(signal),
    staleTime: 1000 * 60 * 2,
  });

  const summary = summaryResponse?.data || {};

  // averageOrderValue — derived from the same two numbers already present
  // in the summary response (total_revenue, total_orders), so this card
  // needs no separate request. Guarded against a zero-order store to
  // avoid dividing by zero.
  const averageOrderValue = summary.total_orders
    ? summary.total_revenue / summary.total_orders
    : 0;

  // Number of customer reviews waiting for approval. The banner below is
  // only rendered when there is at least one.
  const pendingReviews = Number(summary.pending_reviews) || 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineDashboard />} title="Dashboard" />

      {/* ==========================================================
          Reviews awaiting approval — only shown when at least one
          review is pending. It opens the moderation page on its
          Pending tab.
          ========================================================== */}
      {!summaryLoading && pendingReviews > 0 && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.ADMIN_REVIEWS)}
          className="flex items-center gap-3 w-full text-left rounded-xl border border-warning/30 bg-warning-light px-4 py-3 hover:shadow-md transition-shadow"
        >
          <span className="w-8 h-8 rounded-lg bg-white text-warning flex items-center justify-center shrink-0">
            <AiOutlineStar className="w-4.5 h-4.5" />
          </span>
          <span className="flex-1 text-sm font-medium text-gray-800">
            {pendingReviews} review{pendingReviews === 1 ? "" : "s"} awaiting
            approval
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
            Review now
            <AiOutlineRight className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {/* ==========================================================
          ROW 1 — KPI Cards
          ========================================================== */}
      <div className="flex flex-wrap gap-2">
        {/* The small trend text under each value is intentionally not
            passed to these cards. StatsCard still supports it, and other
            pages (for example the order and revenue stats) use it. */}
        <StatsCard
          title="Total Revenue"
          value={summaryLoading ? "—" : formatPrice(summary.total_revenue)}
          icon={<AiOutlineDollarCircle />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          onClick={() => navigate(ROUTES.ADMIN_ANALYTICS_REVENUE)}
          // Takes the admin to the Revenue Report page for a detailed
          // breakdown of the total revenue figure shown on this card.
        />

        <StatsCard
          title="Total Orders"
          value={summaryLoading ? "—" : summary.total_orders}
          icon={<AiOutlineShoppingCart />}
          iconBg="bg-info-light"
          iconColor="text-info"
          onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
          // Takes the admin to the full Order Management list.
        />

        <StatsCard
          title="Total Customers"
          value={summaryLoading ? "—" : summary.total_customers}
          icon={<AiOutlineUser />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          // No growth badge here: the summary provides only the cumulative
          // customer total, not a customer growth percentage.
          onClick={() => navigate(ROUTES.ADMIN_CUSTOMERS)}
          // Takes the admin to the Customer Management list.
        />

        <StatsCard
          title="Pending Orders"
          value={summaryLoading ? "—" : summary.pending_orders}
          icon={<AiOutlineClockCircle />}
          iconBg="bg-warning-light"
          iconColor="text-warning"
          onClick={() =>
            navigate(`${ROUTES.ADMIN_ORDERS}?status=${ORDER_STATUS.PENDING}`)
          }
          // Takes the admin to Order Management with the "Pending" status
          // tab pre-selected via a query parameter, so they land directly
          // on the filtered list instead of the unfiltered "All" view.
        />

        <StatsCard
          title="Average Order Value"
          value={summaryLoading ? "—" : formatPrice(averageOrderValue)}
          icon={<AiOutlineCreditCard />}
          iconBg="bg-info-light"
          iconColor="text-info"
          onClick={() => navigate(ROUTES.ADMIN_ANALYTICS_REVENUE)}
          // Same destination as Total Revenue — both figures come from
          // the same revenue report page.
        />
      </div>

      {/* ==========================================================
          ROW 2 — Profit cards. Every figure is calculated from product
          sales only (selling price multiplied by quantity) over the same
          orders that count as revenue. A percentage the server cannot
          calculate arrives as null and is shown as an em dash.
          ========================================================== */}
      <div className="flex flex-wrap gap-2">
        <StatsCard
          title="Total Cost"
          value={summaryLoading ? "—" : formatPriceOrDash(summary.total_cost)}
          icon={<AiOutlineWallet />}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
          onClick={() => navigate(ROUTES.ADMIN_ANALYTICS_PROFIT)}
        />

        <StatsCard
          title="Gross Profit"
          value={summaryLoading ? "—" : formatPriceOrDash(summary.gross_profit)}
          icon={<AiOutlineRise />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          onClick={() => navigate(ROUTES.ADMIN_ANALYTICS_PROFIT)}
        />

        <StatsCard
          title="Markup %"
          value={summaryLoading ? "—" : formatPercent(summary.markup_percent)}
          icon={<AiOutlinePercentage />}
          iconBg="bg-info-light"
          iconColor="text-info"
          onClick={() => navigate(ROUTES.ADMIN_ANALYTICS_PROFIT)}
        />

        <StatsCard
          title="Profit Margin %"
          value={
            summaryLoading ? "—" : formatPercent(summary.profit_margin_percent)
          }
          icon={<AiOutlinePercentage />}
          iconBg="bg-primary-50"
          iconColor="text-primary"
          onClick={() => navigate(ROUTES.ADMIN_ANALYTICS_PROFIT)}
        />
      </div>

      {/* ==========================================================
          ROW 3 — Revenue chart (2/3) + Orders by Status donut (1/3)
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
          ROW 4 — Recent Orders (2/3) + Inventory Alerts (1/3)
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
          ROW 5 — Top Selling Products + System Activity Logs
          ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopSellingProducts />
        <ActivityLogWidget />
      </div>
    </div>
  );
};

export default AdminDashboard;
