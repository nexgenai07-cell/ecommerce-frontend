import { useNavigate } from "react-router-dom"; // useNavigate lets StatCard programmatically navigate on click
import { motion } from "framer-motion"; // motion.div animates each card in with a staggered fade+slide
import {
  AiOutlineShoppingCart, // Shopping cart icon for Total Orders
  AiOutlineHeart, // Heart icon for Wishlist Items
} from "react-icons/ai";
import { BsBoxSeam, BsArrowReturnLeft } from "react-icons/bs"; // Box icon for Total Spent, return arrow for Pending Returns
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings
import formatPrice from "../../utils/formatPrice"; // Formats a raw number into a display currency string e.g. "$1,200.00"
import cn from "../../utils/cn"; // Utility that merges Tailwind class names conditionally without conflicts

// getStatsConfig — builds the 4-item stats array using live data passed in from the parent
// Defined as a function (not a static array) so values like orders.length and formatPrice(totalSpent) are computed fresh each render
const getStatsConfig = (orders, totalSpent, wishlistCount, pendingReturns) => [
  {
    label: "Total Orders",
    value: orders.length, // count of all orders the customer has ever placed
    icon: <AiOutlineShoppingCart className="w-6 h-6" />,
    iconBg: "bg-info-light", // token-based light blue background (was bg-blue-50)
    iconColor: "text-info", // token-based blue icon color (was text-blue-500)
    route: ROUTES.ACCOUNT_ORDERS, // clicking navigates to the Order History page
    hero: false, // regular white card treatment
  },
  {
    label: "Total Spent",
    value: formatPrice(totalSpent), // formatted sum of all completed order totals
    icon: <BsBoxSeam className="w-6 h-6" />,
    iconBg: "bg-white/15", // frosted-glass icon box — used only when hero is true, over the gradient fill
    iconColor: "text-white",
    route: null, // no navigation — Total Spent is display-only
    hero: true, // this is the single most important metric — gets the gradient "hero" treatment
  },
  {
    label: "Wishlist Items",
    value: wishlistCount, // number of products currently saved to the wishlist
    icon: <AiOutlineHeart className="w-6 h-6" />,
    iconBg: "bg-danger-light", // token-based light red background (was bg-red-50)
    iconColor: "text-danger", // token-based red icon color (was text-red-400)
    route: ROUTES.ACCOUNT_WISHLIST, // clicking navigates to the Wishlist page
    hero: false,
  },
  {
    label: "Pending Returns",
    value: pendingReturns, // count of return requests still awaiting seller review
    icon: <BsArrowReturnLeft className="w-6 h-6" />,
    iconBg: "bg-warning-light", // token-based light amber background (was bg-orange-50)
    iconColor: "text-warning", // token-based amber icon color (was text-orange-400) — signals something needs attention
    route: ROUTES.ACCOUNT_RETURNS, // clicking navigates to the Returns page
    hero: false,
  },
];

// StatCard — renders a single metric card
// Accepts the stat config object and its index (used for stagger animation delay)
const StatCard = ({ stat, index }) => {
  const navigate = useNavigate(); // used to navigate programmatically when the card is clicked

  return (
    // motion.div animates the card in on mount
    // initial — starts invisible and nudged 8px downward
    // animate — fades in and slides up to its natural position
    // delay is multiplied by index so each card cascades in after the previous one
    // onClick only navigates when a route is defined — Total Spent card does nothing on click
    // Resting shadow-sm + hover:shadow-xl + hover:-translate-y-1.5 gives every
    // card a genuine "raised off the page" feel, not just a flat bordered box
    // Hero card (Total Spent) gets a solid brand gradient fill instead of white,
    // making it visually the standout metric among the four
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      onClick={() => stat.route && navigate(stat.route)}
      className={cn(
        "rounded-2xl p-5 flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5",
        stat.hero
          ? "bg-linear-to-br from-primary to-primary-dark border border-transparent shadow-primary/20" // gradient hero card
          : "bg-white border border-gray-100 hover:border-transparent", // regular white card
        stat.route ? "cursor-pointer" : "", // cursor-pointer only applied when the card has a destination route
      )}
    >
      {/* Left side — metric label above, value below */}
      <div className="flex flex-col gap-1">
        {/* Metric label — small uppercase muted text, styled like a field label
            White/75 on the hero card for contrast against the gradient fill  */}
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            stat.hero ? "text-white/75" : "text-gray-400",
          )}
        >
          {stat.label}
        </p>

        {/* Metric value — large bold number or formatted price
            White text on the hero card for contrast against the gradient fill */}
        <p
          className={cn(
            "text-2xl font-bold",
            stat.hero ? "text-white" : "text-gray-900",
          )}
        >
          {stat.value}
        </p>
      </div>

      {/* Right side — colored icon box, background and icon color vary per stat
          Hero card uses a frosted-glass white/15 box instead of a tinted one */}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          stat.iconBg,
        )}
      >
        <span className={stat.iconColor}>{stat.icon}</span>{" "}
        {/* Icon inherits the stat-specific color */}
      </div>
    </motion.div>
  );
};

// DashboardStats — parent component that builds the stats array and renders the grid
const DashboardStats = ({
  orders,
  totalSpent,
  wishlistCount,
  pendingReturns,
}) => {
  // Build the 4 stat objects using the live data passed in from the dashboard page
  const stats = getStatsConfig(
    orders,
    totalSpent,
    wishlistCount,
    pendingReturns,
  );

  return (
    // 2-column grid on mobile, 4-column grid on lg+ screens
    // gap-4 gives consistent spacing between all cards
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label} // label is unique per card — safe to use as key
          stat={stat} // full config object for this metric
          index={index} // passed to StatCard to calculate the stagger animation delay
        />
      ))}
    </div>
  );
};

export default DashboardStats; // Export so it can be composed into the Customer Account Dashboard page
