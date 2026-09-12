import { useState } from "react";
import {
  ListToolbarBar,
  FilterChipsRow,
  FilterChip,
  OptionRow,
} from "../shared/list-toolbar";

/**
 * AuditLogFilters
 *
 * The toolbar sitting above the audit log table: search box, a
 * "Filters" toggle, an "Export" button, and — once opened — the Entity
 * and User dropdown chips. Both dropdowns' option lists are dynamic,
 * derived from whichever log entries are currently loaded (there is no
 * dedicated "list all admins" or "list all entities" endpoint to build
 * them from instead).
 *
 * Built on the same shared list-toolbar pieces as every other admin
 * list page's filters component.
 *
 * Props:
 * - search:           Search box value (log ID / user).
 * - onSearchChange:   (value) => void.
 * - entityOptions:    Array of { value, label } for the Entity dropdown.
 * - entityFilter:     Current entity filter value ("" = all entities).
 * - onEntityChange:   (value) => void.
 * - userOptions:       Array of { value, label } for the User dropdown.
 * - userFilter:       Current user filter value ("" = all users).
 * - onUserChange:      (value) => void.
 * - onClearFilters:    () => void — resets every field to its default.
 * - hasActiveFilters:  Whether the "Clear all" link should be shown.
 * - onExport:          Handler for the Export button.
 */
const AuditLogFilters = ({
  search,
  onSearchChange,
  entityOptions,
  entityFilter,
  onEntityChange,
  userOptions,
  userFilter,
  onUserChange,
  onClearFilters,
  hasActiveFilters,
  onExport,
}) => {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const activeFilterCount = [entityFilter, userFilter].filter(Boolean).length;

  const selectedEntity = entityOptions.find(
    (opt) => opt.value === entityFilter,
  );
  const selectedUser = userOptions.find((opt) => opt.value === userFilter);

  return (
    <div className="relative">
      <ListToolbarBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Filter by ID or user..."
        activeFilterCount={activeFilterCount}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={() => setAreFiltersOpen((prev) => !prev)}
        onExport={onExport}
        exportLabel="Export Logs"
      />

      {areFiltersOpen && (
        <FilterChipsRow
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        >
          <FilterChip
            label="Entity"
            valueLabel={selectedEntity ? selectedEntity.label : "select entity"}
            isActive={!!entityFilter}
            onClear={() => onEntityChange("")}
            panelClassName="w-52 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
          >
            {({ close }) => (
              <>
                {entityOptions.map((opt) => (
                  <OptionRow
                    key={opt.value || "all-entities"}
                    label={opt.label}
                    isSelected={entityFilter === opt.value}
                    onClick={() => {
                      onEntityChange(opt.value);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </FilterChip>

          <FilterChip
            label="User"
            valueLabel={selectedUser ? selectedUser.label : "select user"}
            isActive={!!userFilter}
            onClear={() => onUserChange("")}
            panelClassName="w-52 max-w-[90vw] max-h-64 overflow-y-auto p-1.5"
          >
            {({ close }) => (
              <>
                {userOptions.map((opt) => (
                  <OptionRow
                    key={opt.value || "all-users"}
                    label={opt.label}
                    isSelected={userFilter === opt.value}
                    onClick={() => {
                      onUserChange(opt.value);
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

export default AuditLogFilters;
