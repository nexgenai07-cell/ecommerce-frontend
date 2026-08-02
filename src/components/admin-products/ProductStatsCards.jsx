import {
  AiOutlineAppstore,
  AiOutlineCloseCircle,
  AiOutlineWarning,
} from "react-icons/ai";

import StatsCard from "../ui/StatsCard";

const ProductStatsCards = ({
  totalCount = 0, // Real count of products matching the current view — passed from ProductList
  outOfStockCount = 0, // Real count of products where in_stock === false, computed by the parent from the actual fetched product list
  lowStockCount = 0, // Real count from the dedicated Low Stock endpoint (API 35), also computed once in the parent
  isLoading = false, // While the underlying product data is still loading, show a dash instead of a misleading "0"
}) => {
  const cards = [
    {
      key: "total",
      title: "Total Products",
      value: isLoading ? "—" : totalCount,
      icon: <AiOutlineAppstore />,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      key: "out_of_stock",
      title: "Out of Stock",
      value: isLoading ? "—" : outOfStockCount,
      icon: <AiOutlineCloseCircle />,
      iconBg: "bg-danger-light",
      iconColor: "text-danger",
    },
    {
      key: "low_stock",
      title: "Low Stock",
      value: isLoading ? "—" : lowStockCount,
      icon: <AiOutlineWarning />,
      iconBg: "bg-warning-light",
      iconColor: "text-warning",
      // Only shown once real data has loaded and there's actually something to flag
      trend: !isLoading && lowStockCount > 0 ? "Requires action" : "",
    },
  ];

  return (
    // flex-wrap (not a full-width grid) + a capped max-width per card below
    // is what stops these three cards from stretching edge-to-edge across
    // the page — they sit together as a compact row and wrap naturally on
    // narrow screens instead of each card ballooning to fill its column.
    <div className="flex flex-wrap gap-3">
      {cards.map((card) => (
        <StatsCard
          key={card.key}
          title={card.title}
          value={card.value}
          icon={card.icon}
          iconBg={card.iconBg}
          iconColor={card.iconColor}
          trend={card.trend}
          compact
          // compact=true switches StatsCard to its smaller padding/icon/
          // text sizing (see components/ui/StatsCard.jsx) — visibly
          // shorter cards than the full-size Dashboard KPI cards.
          className="flex-1 S max-w-57.5"
          // flex-1 + basis-[170px]: cards share available space evenly but
          // never shrink below a readable 170px
          // max-w-[230px]: hard ceiling so a wide viewport can't stretch
          // any single card into a huge empty-looking block
        />
      ))}
    </div>
  );
};

export default ProductStatsCards;
