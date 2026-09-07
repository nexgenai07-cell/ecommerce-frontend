import { useQuery } from "@tanstack/react-query";
// useQuery — TanStack Query hook that fetches, caches, and
// re-fetches server data automatically

import { AiOutlineTeam, AiOutlineUserAdd } from "react-icons/ai";
// AiOutlineTeam — icon for the "Total Customers" card
// AiOutlineUserAdd — icon for the "New This Month" card

import { getCustomers } from "../../api/customers.api";
// getCustomers — real, confirmed server-side search/ordering/pagination.
// fetchAllCustomers no longer exists (removed once the backend's
// filtering/pagination was confirmed fixed) — this component now
// computes both stats without ever downloading the entire customer
// list, as explained below.

import extractListData from "../../utils/extractListData";

import StatsCard from "../ui/StatsCard";
// StatsCard — shared KPI card component used across every admin page

const CustomerStatsCards = () => {
  // --------------------------------------------------
  // TOTAL CUSTOMERS — one lightweight request that reads only the
  // real backend `count` field; the actual result rows aren't needed,
  // just the total. Accurate across the ENTIRE customer base, no
  // matter how large it grows.
  // --------------------------------------------------
  const { data: totalCountResponse, isLoading: isLoadingTotal } = useQuery({
    queryKey: ["adminCustomers", "statsTotal"],
    queryFn: ({ signal }) => getCustomers({ page: 1, page_size: 1 }, signal),
    staleTime: 1000 * 60 * 5,
  });
  const totalCount = totalCountResponse?.data?.count ?? 0;

  // --------------------------------------------------
  // NEW THIS MONTH — there's no confirmed backend date-range filter on
  // this endpoint (only search/ordering/page were confirmed), so this
  // can't be read directly from a single `count`. Instead of falling
  // back to downloading the entire customer base, this walks the list
  // newest-first (ordering=-created_at) and stops as soon as it finds
  // a customer OUTSIDE the current month — since the list is sorted
  // newest-first, every customer after that point is even older, so
  // there's no need to look further. This only ever fetches as many
  // pages as this month's actual new signups require, not the whole
  // customer base — bounded and scalable either way.
  // --------------------------------------------------
  const { data: newThisMonthCount = 0, isLoading: isLoadingNewThisMonth } =
    useQuery({
      queryKey: ["adminCustomers", "statsNewThisMonth"],
      queryFn: async ({ signal }) => {
        const now = new Date();
        let page = 1;
        let count = 0;

        // Loops until either a customer outside this month is found,
        // or the backend runs out of pages — whichever comes first
        while (true) {
          const response = await getCustomers({
            ordering: "-created_at",
            page,
            page_size: 50,
          }, signal);
          const results = extractListData(response);
          if (results.length === 0) break;

          let hitOlderCustomer = false;
          for (const customer of results) {
            if (!customer.created_at) continue;
            const createdDate = new Date(customer.created_at);
            const isThisMonth =
              createdDate.getFullYear() === now.getFullYear() &&
              createdDate.getMonth() === now.getMonth();

            if (isThisMonth) {
              count += 1;
            } else {
              // Sorted newest-first, so once we hit one customer
              // outside this month, every remaining customer (on this
              // page and every page after) is older too — safe to stop.
              hitOlderCustomer = true;
              break;
            }
          }

          if (hitOlderCustomer || !response?.data?.next) break;
          page += 1;
        }

        return count;
      },
      staleTime: 1000 * 60 * 5,
    });

  const isLoading = isLoadingTotal || isLoadingNewThisMonth;

  return (
    // flex + flex-wrap instead of a stretching grid — each card now
    // takes only as much width as it needs (capped below), so they
    // sit compactly next to each other instead of filling the row
    <div className="flex flex-wrap gap-3">
      {/* Total Customers — the real, confirmed total */}
      <StatsCard
        title="Total Customers"
        // While loading, show a subtle dash instead of a flash of "0"
        // that would look like a real value
        value={isLoading ? "—" : totalCount}
        icon={<AiOutlineTeam />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
        compact
        // compact=true — StatsCard's built-in smaller variant: tighter
        // padding (p-3.5 instead of p-5), smaller icon box (36px
        // instead of 48px), smaller value text (text-xl instead of
        // text-2xl) — this is what actually reduces the card's height

        // Fixed width cap instead of stretching to fill the grid
        // column — w-full on mobile (stacked), fixed 208px on sm+
        className="w-full sm:w-52 shadow-[0_8px_22px_-8px_rgba(16,24,40,0.18)] hover:shadow-[0_12px_26px_-8px_rgba(16,24,40,0.24)] hover:-translate-y-0.5"
      />

      {/* New This Month — real backend data, computed via the bounded
          newest-first walk explained above */}
      <StatsCard
        title="New This Month"
        value={isLoading ? "—" : newThisMonthCount}
        icon={<AiOutlineUserAdd />}
        iconBg="bg-info-light"
        iconColor="text-info"
        compact
        className="w-full sm:w-52 shadow-[0_8px_22px_-8px_rgba(16,24,40,0.18)] hover:shadow-[0_12px_26px_-8px_rgba(16,24,40,0.24)] hover:-translate-y-0.5"
      />
    </div>
  );
};

export default CustomerStatsCards;
// Default export — imported and used inside CustomerManagement.jsx
