import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  OptionRow,
} from "../shared/list-toolbar";

const PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "tiktok", label: "TikTok" },
];

/**
 * PostFilters
 *
 * The toolbar sitting above the posts grid: search box, a "Filters"
 * toggle, and — once opened — the Status and Platform dropdown chips.
 * There is no Export button on this page.
 *
 * Built on the same shared list-toolbar pieces used by every other
 * admin list page. The Post Status filter lives in its own dropdown
 * chip here (rather than an always-visible pill row) so it matches the
 * same pattern as every other dropdown filter in the admin panel.
 *
 * Props:
 * - statusTabs:      Array of { key, label } for the Status dropdown
 *                    (key: "" is the "All" option).
 * - activeStatus:    Currently selected status key.
 * - onStatusChange:  (key) => void.
 * - search:          Search box value.
 * - onSearchChange:  (value) => void.
 * - platform:        Current platform filter value ("" = all platforms).
 * - onPlatformChange: (value) => void.
 * - onClearFilters:  () => void — resets every field to its default.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 */
const PostFilters = ({
  statusTabs,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = [activeStatus, platform].filter(Boolean).length;

  const selectedStatus = statusTabs.find((tab) => tab.key === activeStatus);
  const selectedPlatform = PLATFORM_OPTIONS.find(
    (opt) => opt.value === platform,
  );

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search posts..."
        activeFilterCount={activeFilterCount}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={() => setAreFiltersOpen((prev) => !prev)}
      />

      {areFiltersOpen && (
        <FilterChipsRow
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        >
          <FilterChip
            label="Status"
            valueLabel={selectedStatus ? selectedStatus.label : "select status"}
            isActive={!!activeStatus}
            onClear={() => onStatusChange("")}
            panelClassName="w-44 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {statusTabs.map((tab) => (
                  <OptionRow
                    key={tab.key || "all"}
                    label={tab.label}
                    isSelected={activeStatus === tab.key}
                    onClick={() => {
                      onStatusChange(tab.key);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="Platform"
            valueLabel={
              selectedPlatform ? selectedPlatform.label : "select platform"
            }
            isActive={!!platform}
            onClear={() => onPlatformChange("")}
            panelClassName="w-48 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                <OptionRow
                  label="All Platforms"
                  isSelected={!platform}
                  onClick={() => {
                    onPlatformChange("");
                    close();
                  }}
                />
                {PLATFORM_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    isSelected={platform === opt.value}
                    onClick={() => {
                      onPlatformChange(opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>
        </FilterChipsRow>
      )}
    </div>
  );
};

export default PostFilters;
