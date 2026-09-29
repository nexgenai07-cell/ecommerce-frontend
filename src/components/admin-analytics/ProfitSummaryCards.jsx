// ============================================================
// PROFIT SUMMARY CARDS
// ============================================================
// The four profit figures shown on the Sales, Revenue and Profit
// reports: Total Cost, Gross Profit, Markup % and Profit Margin %. It
// renders from the "summary" object of a report response, so the page
// that owns the request stays in charge of loading and filters.
//
// Definitions (all based on product sales, that is selling price times
// quantity):
//   Total Cost     = sum of purchase price x quantity (cost of goods sold)
//   Gross Profit   = revenue - Total Cost (also called total markup)
//   Markup %       = Gross Profit / Total Cost x 100 (profit against cost)
//   Profit Margin  = Gross Profit / revenue x 100 (profit against revenue)
//
// A percentage the server could not calculate arrives as null and is
// shown as an em dash. When some sold items have no cost price saved,
// they are left out of cost and profit, and a short note says so.
//
// Props:
//   summary   - the "summary" object of a report response (may be
//               undefined while loading)
//   isLoading - true while the report request is running

import {
  AiOutlineWallet,
  AiOutlineRise,
  AiOutlinePercentage,
  AiOutlineInfoCircle,
} from "react-icons/ai";

import formatPriceOrDash from "../../utils/formatPriceOrDash";
import formatPercent from "../../utils/formatPercent";
import StatsCard from "../ui/StatsCard";

const ProfitSummaryCards = ({ summary, isLoading = false }) => {
  const itemsMissingCost = Number(summary?.items_missing_cost) || 0;

  return (
    <>
      <StatsCard
        title="Total Cost"
        value={isLoading ? "—" : formatPriceOrDash(summary?.total_cost)}
        icon={<AiOutlineWallet />}
        iconBg="bg-gray-100"
        iconColor="text-gray-600"
      />
      <StatsCard
        title="Gross Profit"
        value={isLoading ? "—" : formatPriceOrDash(summary?.gross_profit)}
        icon={<AiOutlineRise />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
      <StatsCard
        title="Markup %"
        value={isLoading ? "—" : formatPercent(summary?.markup_percent)}
        icon={<AiOutlinePercentage />}
        iconBg="bg-info-light"
        iconColor="text-info"
      />
      <StatsCard
        title="Profit Margin %"
        value={isLoading ? "—" : formatPercent(summary?.profit_margin_percent)}
        icon={<AiOutlinePercentage />}
        iconBg="bg-success-light"
        iconColor="text-success"
      />

      {!isLoading && itemsMissingCost > 0 && (
        <p className="basis-full flex items-start gap-1.5 text-xs text-gray-500">
          <AiOutlineInfoCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
          <span>
            {itemsMissingCost} sold item{itemsMissingCost === 1 ? "" : "s"} have
            no cost price saved (or belong to a deleted product), so they are
            left out of cost and profit. Their revenue is still counted.
          </span>
        </p>
      )}
    </>
  );
};

export default ProfitSummaryCards;
