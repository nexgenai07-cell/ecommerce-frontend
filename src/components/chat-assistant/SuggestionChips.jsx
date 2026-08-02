// ============================================================
// SuggestionChips — QUICK-ACTION / FOLLOW-UP PILL BUTTONS
// ============================================================
// A reusable row of rounded pill buttons used in TWO places:
// 1. The initial greeting screen (context-aware chips from the
//    "connected" WebSocket event, e.g. "Track order #1234")
// 2. Underneath any individual AI reply (context-aware follow-up
//    chips from that specific message's "suggestions" field, e.g.
//    "Go to Cart", "Continue Shopping")
// Clicking a chip sends its exact label text as the user's next
// message — the backend generates the wording, so the frontend never
// needs to guess what a chip should say.

const SuggestionChips = ({ suggestions = [], onSelect }) => {
  // Renders nothing at all when there are no suggestions for this
  // context, so no empty row/gap appears in the layout.
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* flex-wrap lets chips wrap onto a new line on narrow screens
          instead of overflowing the widget width */}
      {suggestions.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className="px-3.5 py-2 rounded-full border border-gray-200 bg-white
            text-sm text-gray-700 font-medium
            hover:bg-primary-50 hover:border-primary hover:text-primary
            active:scale-95 transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default SuggestionChips;
