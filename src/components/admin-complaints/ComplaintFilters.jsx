import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  OptionRow,
} from "../shared/list-toolbar";

/**
 * ComplaintFilters
 *
 * The toolbar sitting above the complaints table: search box, a
 * "Filters" toggle, an "Export" button, and — once opened — the Status
 * and Priority dropdown chips.
 *
 * Built on the same shared list-toolbar pieces used by every other
 * admin list page. Status and Priority live in their own dropdown
 * chips here (rather than always-visible pill rows) so they match the
 * same pattern as every other dropdown filter in the admin panel.
 *
 * Props:
 * - statusTabs:      Array of { key, label } for the Status dropdown
 *                    (key: "" is the "All" option).
 * - activeStatus:    Currently selected status key.
 * - onStatusChange:  (key) => void.
 * - priorityTabs:    Array of { key, label } for the Priority dropdown.
 * - activePriority:  Currently selected priority key.
 * - onPriorityChange: (key) => void.
 * - search:          Search box value (Complaint ID / subject).
 * - onSearchChange:  (value) => void.
 * - onClearFilters:  () => void — resets status, priority, and search.
 * - hasActiveFilters: Whether the "Clear all" link should be shown.
 * - onExport:        Handler for the Export button.
 * - isExporting:     Loading state for the Export button.
 */
const ComplaintFilters = ({
  statusTabs,
  activeStatus,
  onStatusChange,
  priorityTabs,
  activePriority,
  onPriorityChange,
  search,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
  isExporting,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = [activeStatus, activePriority].filter(
    Boolean,
  ).length;

  const selectedStatus = statusTabs.find((tab) => tab.key === activeStatus);
  const selectedPriority = priorityTabs.find(
    (tab) => tab.key === activePriority,
  );

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by ID or subject..."
        activeFilterCount={activeFilterCount}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={() => setAreFiltersOpen((prev) => !prev)}
        onExport={onExport}
        isExporting={isExporting}
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
            label="Priority"
            valueLabel={
              selectedPriority ? selectedPriority.label : "select priority"
            }
            isActive={!!activePriority}
            onClear={() => onPriorityChange("")}
            panelClassName="w-44 max-w-[90vw] p-1.5"
          >
            {({ close }) => (
              <>
                {priorityTabs.map((tab) => (
                  <OptionRow
                    key={tab.key || "all"}
                    label={tab.label}
                    isSelected={activePriority === tab.key}
                    onClick={() => {
                      onPriorityChange(tab.key);
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

export default ComplaintFilters;
