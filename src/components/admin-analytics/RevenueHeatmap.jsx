import { useQuery } from "@tanstack/react-query";
// useQuery -> TanStack Query hook, fetches + caches this heatmap's own data

import { getSalesReport } from "../../api/analytics.api";
// getSalesReport -> reused here (same API as the Sales page) to pull daily
// revenue over a wide 6-month window for the heatmap grid
import formatPrice from "../../utils/formatPrice";
// formatPrice -> turns a raw revenue number into "Rs 3,481,170" for tooltips
import Spinner from "../ui/Spinner";
// Spinner -> small loading spinner shown while the 6-month data loads

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// DAY_LABELS -> the row of weekday letters shown down the left side,
// in the same order the grid's rows (0=Sunday..6=Saturday) are built

const getSixMonthsAgoISO = () => {
  const now = new Date();
  // now -> today's real date
  return (
    new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      // subtracts 6 from the month number; JS Date automatically rolls the
      // year backward too if that goes negative (e.g. Jan -6 -> July last year)
      .toISOString()
      .slice(0, 10)
  );
  // .slice(0, 10) -> keeps just "YYYY-MM-DD" from the full ISO timestamp
};

const RevenueHeatmap = () => {
  const endDate = new Date().toISOString().slice(0, 10);
  // endDate -> today, in "YYYY-MM-DD" form
  const startDate = getSixMonthsAgoISO();
  // startDate -> exactly 6 calendar months before today

  const { data: response, isLoading } = useQuery({
    queryKey: ["salesReport", "heatmap", startDate, endDate],
    // queryKey -> unique cache key for this specific 6-month request
    queryFn: () =>
      getSalesReport({
        start_date: startDate,
        end_date: endDate,
        period: "daily",
        // period: "daily" -> one data point per calendar day
      }),
    staleTime: 1000 * 60 * 10,
    // staleTime -> keeps this data "fresh" for 10 minutes so switching
    // tabs/pages doesn't trigger a wasteful refetch of this heavy 6-month query
  });

  const points = response?.data?.data || [];
  // points -> the array of daily data points, [] while loading

  // Build a quick lookup: "YYYY-MM-DD" -> real revenue for that day
  const revenueByDate = {};
  points.forEach((point) => {
    revenueByDate[point.date] = Number(point.total_revenue) || 0;
    // stores each day's revenue keyed by its date string, so later we can
    // look up any day's revenue in O(1) instead of searching the array
  });

  const maxRevenue = Math.max(...Object.values(revenueByDate), 1);
  // maxRevenue -> the single highest-revenue day in the whole 6 months,
  // used below to scale every other day's color intensity relative to it;
  // the trailing ", 1" guards against dividing by zero if there's no data at all

  // Builds every calendar day between startDate and endDate, grouped
  // into weekly columns (7-row grid, one column per week) — the same
  // visual structure a GitHub-style contribution graph uses
  const allDays = [];
  const cursor = new Date(startDate);
  // cursor -> a moving date pointer, starts at startDate
  const end = new Date(endDate);
  // end -> the fixed final date to stop at
  while (cursor <= end) {
    allDays.push(new Date(cursor));
    // pushes a COPY of the current cursor date into the list
    cursor.setDate(cursor.getDate() + 1);
    // advances the cursor forward by exactly one day
  }

  // Pads the front so the FIRST day lines up under its correct
  // weekday column (e.g. if the range starts on a Wednesday, the
  // first 3 cells in that column stay empty)
  const firstDayOfWeek = allDays[0]?.getDay() ?? 0;
  // firstDayOfWeek -> 0 (Sunday) through 6 (Saturday) for the very first day
  const paddedDays = [...Array(firstDayOfWeek).fill(null), ...allDays];
  // paddedDays -> the real day list with `null` placeholders inserted at
  // the front so everything lines up correctly under the weekday labels

  const weekColumns = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weekColumns.push(paddedDays.slice(i, i + 7));
    // slices the padded list into chunks of exactly 7 days -> one array
    // per calendar week, which becomes one visual column in the grid
  }

  // Picks a background shade based on how this day's real revenue
  // compares to the single highest day in the whole range.
  // -----------------------------------------------------------------
  // FIX: "no data" used to return "bg-gray-50", a shade of gray so
  // pale it was nearly identical to the white card background behind
  // it — that's exactly why the boxes looked like they weren't
  // rendering at all. Bumped it one shade darker to "bg-gray-100",
  // and the "zero sales" case to "bg-gray-200", so there's always
  // visible contrast against the white card even before the border
  // fix below is added.
  // -----------------------------------------------------------------
  const getIntensityClass = (revenue) => {
    if (revenue === undefined) return "bg-gray-100";
    // no data at all for this day (not in the API response)
    if (revenue === 0) return "bg-gray-200";
    // day exists in the data but had zero revenue
    const ratio = revenue / maxRevenue;
    // ratio -> how this day's revenue compares to the best day (0 to 1)
    if (ratio < 0.25) return "bg-primary/20";
    // lightest emerald tint -> low-revenue day
    if (ratio < 0.5) return "bg-primary/45";
    if (ratio < 0.75) return "bg-primary/70";
    return "bg-primary";
    // full solid emerald -> this day is at or near the all-time high
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300"
      // shadow-[...] -> a soft resting shadow (same elevation used by
      // StatsCard) so this heatmap card visibly "lifts" off the page
      // background instead of sitting flat, with a slightly stronger
      // shadow on hover for a subtle interactive feel
    >
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Top Revenue Days
        </h2>
        <p className="text-xs text-gray-400">
          Daily revenue intensity over the last 6 months
        </p>
      </div>

      {isLoading ? (
        // while the 6-month request is in flight, show a centered spinner
        // instead of an empty/broken-looking grid
        <div className="py-12 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        // overflow-x-auto -> 26 weekly columns of a 6-month grid can
        // exceed a phone's screen width, so this lets the grid scroll
        // horizontally instead of squeezing the day cells unreadably small
        <div className="overflow-x-auto">
          <div className="flex gap-3">
            {/* Weekday labels down the left side */}
            <div className="flex flex-col gap-1 pt-4 shrink-0">
              {/* shrink-0 -> the label column never gets squeezed by the
                  wide scrollable grid next to it */}
              {DAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="h-3 text-[10px] text-gray-400 leading-3"
                  // h-3 -> exact same height as each day box, so labels
                  // line up perfectly with their matching row
                >
                  {label}
                </span>
              ))}
            </div>

            {/* One column per week */}
            <div className="flex gap-1">
              {weekColumns.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {/* flex-col -> stacks the 7 day boxes of this week
                      vertically, matching the weekday labels beside them */}
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      // padding placeholder (days before the range started) —
                      // rendered as a plain blank spacer with no border/fill,
                      // since it isn't a real calendar day
                      return <div key={dayIndex} className="w-3 h-3" />;
                    }
                    const dateKey = day.toISOString().slice(0, 10);
                    // dateKey -> this day's "YYYY-MM-DD" string, used to
                    // look up its revenue in the revenueByDate map
                    const revenue = revenueByDate[dateKey];
                    // revenue -> this specific day's real revenue value
                    // (undefined if the API had no entry for this date)
                    return (
                      <div
                        key={dayIndex}
                        title={`${dateKey}: ${revenue ? formatPrice(revenue) : "No sales"}`}
                        // title -> native browser tooltip on hover, showing
                        // the exact date and revenue (or "No sales")
                        className={`w-3 h-3 rounded-sm border border-gray-200 ${getIntensityClass(revenue)}`}
                        // ================================================
                        // FIX: added "border border-gray-200" here, applied
                        // to EVERY real day box regardless of its fill
                        // color. Previously a box with no fill contrast
                        // (the old bg-gray-50 case) was completely
                        // invisible against the white card. Now every box
                        // always has a visible light-gray outline, so the
                        // whole grid is guaranteed to be visible even on
                        // days with zero or missing data.
                        // ================================================
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[10px] text-gray-400">Less</span>
            {[
              "bg-gray-200",
              // updated to match the new "no data" gray used above
              "bg-primary/20",
              "bg-primary/45",
              "bg-primary/70",
              "bg-primary",
            ].map((cls) => (
              <span
                key={cls}
                className={`w-3 h-3 rounded-sm border border-gray-200 ${cls}`}
                // same border fix applied to the legend swatches so they
                // stay visually consistent with the actual grid boxes above
              />
            ))}
            <span className="text-[10px] text-gray-400">More</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueHeatmap;
// default export -> imported in RevenueReport.jsx as <RevenueHeatmap />
