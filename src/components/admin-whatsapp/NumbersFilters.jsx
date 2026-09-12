import { ListToolbarBar } from "../shared/list-toolbar";

/**
 * NumbersFilters
 *
 * The toolbar sitting above the WhatsApp numbers table: a search box
 * and an Export button. This page has nothing beyond a single search
 * field to filter by, so — same as ComplaintFilters — there is no
 * "Filters" dropdown toggle here.
 *
 * Built on the same shared ListToolbarBar used by every other admin
 * list page, so the search box and Export button match the rest of
 * the admin panel exactly.
 *
 * Props:
 * - search:         Search box value (name / phone number).
 * - onSearchChange: (value) => void.
 * - onExport:       Handler for the Export button.
 */
const NumbersFilters = ({ search, onSearchChange, onExport }) => (
  <ListToolbarBar
    searchValue={search}
    onSearchChange={onSearchChange}
    searchPlaceholder="Filter by name or number..."
    onExport={onExport}
  />
);

export default NumbersFilters;
