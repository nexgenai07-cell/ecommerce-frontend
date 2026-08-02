import { AiOutlineAppstore, AiOutlineTag } from "react-icons/ai";
// AiOutlineAppstore — icon for the "Total Categories" card
// AiOutlineTag       — icon for the "Categorized Products" card (tag = product labeling)

import StatsCard from "../ui/StatsCard";
// Shared KPI card component — already supports a `compact` prop that
// shrinks padding/icon/text sizing, used below to match the Products page

const CategoryStatsCards = ({
  totalCategories, // Real count — allCategories.length, passed from the parent page
  totalCategorizedProducts, // Real sum of every category's product_count, passed from the parent page
  isLoadingCounts, // True only while the categories list itself is still loading
}) => {
  return (
    // flex-wrap (not a stretched grid) is what keeps these cards from
    // ballooning to fill the full row width on wide screens — they sit
    // together as a compact summary row and wrap naturally on narrow
    // viewports, exactly like ProductStatsCards.jsx does.
    <div className="flex flex-wrap gap-3">
      <StatsCard
        title="Total Categories"
        value={isLoadingCounts ? "—" : totalCategories}
        icon={<AiOutlineAppstore />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
        compact
        // compact=true switches StatsCard to its smaller padding/icon/text
        // sizing (see components/ui/StatsCard.jsx) — this is what makes
        // the card visibly shorter, matching the Products page cards.
        className="flex-1 basis-42.5 max-w-57.5"
        // flex-1 + basis-[170px]: card shares available space evenly with
        // its sibling but never shrinks below a readable 170px
        // max-w-[230px]: hard ceiling so a wide viewport can't stretch
        // this single card into a huge, mostly-empty block
      />
      <StatsCard
        title="Categorized Products"
        value={isLoadingCounts ? "—" : totalCategorizedProducts}
        icon={<AiOutlineTag />}
        iconBg="bg-info-light"
        iconColor="text-info"
        compact
        // Same compact sizing as the card above, for a consistent row height
        className="flex-1 basis-42.5 max-w-57.5"
        // Same width rules as the card above — keeps both cards visually identical in size
      />
    </div>
  );
};

export default CategoryStatsCards;
