import { useQuery } from "@tanstack/react-query";
// useQuery — TanStack Query hook that fetches, caches, and
// re-fetches server data automatically

import { AiOutlineTeam, AiOutlineUserAdd } from "react-icons/ai";
// AiOutlineTeam — icon for the "Total Customers" card
// AiOutlineUserAdd — icon for the "New This Month" card

import { fetchAllCustomers } from "../../api/customers.api";
// fetchAllCustomers — loops through every page of the customers
// endpoint and returns one flat, complete array

import StatsCard from "../ui/StatsCard";
// StatsCard — shared KPI card component used across every admin page

const CustomerStatsCards = () => {
  // Single query fetches EVERY customer once, cached for 5 minutes —
  // both card numbers below are derived from this one source of truth
  const { data: allCustomers = [], isLoading } = useQuery({
    queryKey: ["adminCustomers", "statsAll"],
    queryFn: () => fetchAllCustomers({}),
    staleTime: 1000 * 60 * 5,
    // staleTime: 5 minutes — avoids re-fetching the entire customer
    // list on every render
  });

  // "Total Customers" — simply the length of the complete array
  const totalCount = allCustomers.length;

  // "New This Month" — counts customers whose created_at falls in the
  // CURRENT calendar month and year, checked entirely in JavaScript
  const now = new Date();
  // Captures "today" once, outside the loop, so every comparison
  // below uses the exact same reference point

  const newThisMonthCount = allCustomers.filter((customer) => {
    if (!customer.created_at) return false;
    // Defensive guard — skips any record missing created_at entirely

    const createdDate = new Date(customer.created_at);
    // Converts the ISO date string into an actual JS Date object

    return (
      createdDate.getFullYear() === now.getFullYear() &&
      createdDate.getMonth() === now.getMonth()
    );
    // True only when the customer joined in the same month AND year
    // as today
  }).length;

  return (
    // flex + flex-wrap instead of a stretching grid — each card now
    // takes only as much width as it needs (capped below), so they
    // sit compactly next to each other instead of filling the row
    <div className="flex flex-wrap gap-3">
      {/* Total Customers — the real, confirmed total */}
      <StatsCard
        title="Total Customers"
        // While the full list is still loading, show a subtle dash
        // instead of a flash of "0" that would look like a real value
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

      {/* New This Month — calculated client-side from real created_at values */}
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
