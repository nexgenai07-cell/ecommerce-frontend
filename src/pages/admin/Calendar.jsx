import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineLeft, AiOutlineRight, AiOutlinePlus } from "react-icons/ai";

import { getPostsCalendar } from "../../api/social.api";
// getPostsCalendar — API 83: only documents a `month` param. Day/Week
// view toggles from the design were removed — no finer-grained
// endpoint exists to power them.

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import Button from "../../components/ui/Button";
import CalendarDaySidebar from "../../components/admin-social/CalendarDaySidebar";

const PLATFORM_FILTERS = [
  { key: "", label: "All" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter" },
];

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const Calendar = () => {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const [platformFilter, setPlatformFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthParam = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: response, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_CALENDAR.concat(monthParam),
    queryFn: () => getPostsCalendar({ month: monthParam }),
  });

  const allPosts = extractListData(response);

  // Platform filter applied CLIENT-SIDE — a month's worth of posts is
  // a small, already-fetched dataset, so filtering here is both
  // simpler and more reliable than guessing an undocumented server param
  const posts = platformFilter
    ? allPosts.filter((post) => post.platform === platformFilter)
    : allPosts;

  // Build the calendar grid — every day cell for this month, aligned
  // to a Monday-start week (matching the design)
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // JS getDay() is Sunday=0..Saturday=6 — converting to a Monday-start
  // index (Monday=0..Sunday=6) so the grid lines up with WEEKDAY_LABELS
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;

  const calendarCells = [];
  for (let i = 0; i < startWeekday; i++) {
    calendarCells.push(null); // blank leading cells
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(year, month, day));
  }

  const getPostsForDate = (date) => {
    if (!date) return [];
    const dateKey = date.toISOString().slice(0, 10);
    return posts.filter((post) => post.scheduled_at?.startsWith(dateKey));
  };

  const selectedDayPosts = getPostsForDate(selectedDate);
  const isToday = (date) =>
    date && date.toDateString() === new Date().toDateString();
  const isSelected = (date) =>
    date && date.toDateString() === selectedDate.toDateString();

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Content Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50"
          >
            <AiOutlineLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-900 w-32 text-center">
            {viewDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50"
          >
            <AiOutlineRight className="w-4 h-4" />
          </button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={() => navigate(ROUTES.ADMIN_SOCIAL_CREATE_POST)}
          >
            Create Post
          </Button>
        </div>
      </div>

      {/* Platform filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {PLATFORM_FILTERS.map((filter) => (
          <button
            key={filter.key || "all"}
            onClick={() => setPlatformFilter(filter.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
              platformFilter === filter.key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar grid */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="p-2 text-center text-xs font-semibold text-gray-400"
              >
                {label}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <span className="text-sm text-gray-400">Loading...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarCells.map((date, index) => {
                const dayPosts = getPostsForDate(date);
                return (
                  <button
                    key={index}
                    onClick={() => date && setSelectedDate(date)}
                    disabled={!date}
                    className={`min-h-24 border-b border-r border-gray-50 p-2 text-left align-top flex flex-col gap-1 transition-colors ${
                      !date
                        ? "bg-gray-50/30 cursor-default"
                        : "hover:bg-gray-50"
                    } ${isSelected(date) ? "ring-2 ring-primary ring-inset" : ""} ${
                      isToday(date) ? "bg-primary-50" : ""
                    }`}
                  >
                    {date && (
                      <>
                        <span
                          className={`text-xs font-medium ${
                            isToday(date) ? "text-primary" : "text-gray-600"
                          }`}
                        >
                          {date.getDate()}
                          {isToday(date) && (
                            <span className="ml-1 text-[9px] uppercase text-primary">
                              Today
                            </span>
                          )}
                        </span>
                        {dayPosts.slice(0, 2).map((post) => (
                          <span
                            key={post.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 truncate"
                          >
                            {post.caption?.slice(0, 20)}
                          </span>
                        ))}
                        {dayPosts.length > 2 && (
                          <span className="text-[10px] text-gray-400">
                            +{dayPosts.length - 2} more
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <CalendarDaySidebar
          selectedDate={selectedDate}
          postsForDay={selectedDayPosts}
        />
      </div>
    </div>
  );
};

export default Calendar;
