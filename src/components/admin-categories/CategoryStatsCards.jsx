import { AiOutlineAppstore, AiOutlineTag } from "react-icons/ai";
// AiOutlineAppstore — icon for the "Total Categories" card
// AiOutlineTag       — icon for the "Categorized Products" card (tag = product labeling)

import StatsCard from "../ui/StatsCard";
// Shared KPI card component — carries its own fixed width/height, so it
// matches every other stats card in the admin panel automatically.

const CategoryStatsCards = ({
  totalCategories, // Real count — allCategories.length, passed from the parent page
  totalCategorizedProducts, // Real sum of every category's product_count, passed from the parent page
  isLoadingCounts, // True only while the categories list itself is still loading
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <StatsCard
        title="Total Categories"
        value={isLoadingCounts ? "—" : totalCategories}
        icon={<AiOutlineAppstore />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
      <StatsCard
        title="Categorized Products"
        value={isLoadingCounts ? "—" : totalCategorizedProducts}
        icon={<AiOutlineTag />}
        iconBg="bg-info-light"
        iconColor="text-info"
      />
    </div>
  );
};

export default CategoryStatsCards;
