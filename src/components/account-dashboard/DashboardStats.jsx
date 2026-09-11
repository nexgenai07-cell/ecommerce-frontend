import { useNavigate } from "react-router-dom"; // useNavigate lets each card navigate to its detail page on click
import {
  AiOutlineShoppingCart, // Shopping cart icon for Total Orders
  AiOutlineHeart, // Heart icon for Wishlist Items
} from "react-icons/ai";
import { BsBoxSeam, BsArrowReturnLeft } from "react-icons/bs"; // Box icon for Total Spent, return arrow for Pending Returns
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a display currency string e.g. "$1,200.00"
import StatsCard from "../ui/StatsCard"; // Same compact stats chip used across the admin panel (Dashboard, Returns, Audit Logs, etc.) — brought here so the customer account dashboard matches that visual language instead of keeping its own separate card design.

// getStatsConfig — builds the 4-item stats array using live data passed in from the parent
// Defined as a function (not a static array) so values like orders.length and formatPrice(totalSpent) are computed fresh each render
const getStatsConfig = (orders, totalSpent, wishlistCount, pendingReturns) => [
  {
    title: "Total Orders",
    value: orders.length, // count of all orders the customer has ever placed
    icon: <AiOutlineShoppingCart />,
    iconBg: "bg-info-light", // token-based light blue background
    iconColor: "text-info", // token-based blue icon color
    route: ROUTES.ACCOUNT_ORDERS, // clicking navigates to the Order History page
  },
  {
    title: "Total Spent",
    value: formatPrice(totalSpent), // formatted sum of all completed order totals
    icon: <BsBoxSeam />,
    iconBg: "bg-primary-50", // brand-tinted background, matching the primary metric on the admin Dashboard
    iconColor: "text-primary",
    route: null, // no navigation — Total Spent is display-only
  },
  {
    title: "Wishlist Items",
    value: wishlistCount, // number of products currently saved to the wishlist
    icon: <AiOutlineHeart />,
    iconBg: "bg-danger-light", // token-based light red background
    iconColor: "text-danger",
    route: ROUTES.ACCOUNT_WISHLIST, // clicking navigates to the Wishlist page
  },
  {
    title: "Pending Returns",
    value: pendingReturns, // count of return requests still awaiting seller review
    icon: <BsArrowReturnLeft />,
    iconBg: "bg-warning-light", // token-based light amber background
    iconColor: "text-warning", // signals something needs attention
    route: ROUTES.ACCOUNT_RETURNS, // clicking navigates to the Returns page
    trend: pendingReturns > 0 ? "Needs attention" : "", // small badge, same pattern used on the admin Returns page's own "Pending Review" card
  },
];

// DashboardStats — builds the 4 stat objects and renders them as the same
// compact StatsCard chip used throughout the admin panel.
//
// Layout: a flex-wrap row instead of a fixed-column grid. StatsCard sizes
// itself to its own content (title + value), so forcing it into an even
// grid column leaves a large empty area beside each card on wider screens.
// A wrapping flex row lets every card keep its natural width, sit close to
// its neighbour, and drop to the next line on narrower viewports without
// any manual breakpoint tuning — the exact pattern already used for the
// KPI row on the admin Dashboard.
const DashboardStats = ({
  orders,
  totalSpent,
  wishlistCount,
  pendingReturns,
}) => {
  const navigate = useNavigate();

  // Build the 4 stat objects using the live data passed in from the dashboard page
  const stats = getStatsConfig(
    orders,
    totalSpent,
    wishlistCount,
    pendingReturns,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((stat) => (
        <StatsCard
          key={stat.title} // title is unique per card — safe to use as key
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          iconBg={stat.iconBg}
          iconColor={stat.iconColor}
          trend={stat.trend}
          onClick={stat.route ? () => navigate(stat.route) : null}
          // onClick is only passed when a route exists — Total Spent stays
          // a plain, non-interactive card, matching its old click-disabled
          // behavior.
        />
      ))}
    </div>
  );
};

export default DashboardStats; // Export so it can be composed into the Customer Account Dashboard page
