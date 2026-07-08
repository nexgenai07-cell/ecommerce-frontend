// Import "motion" from framer-motion to enable simple entrance animations on timeline items
import { motion } from "framer-motion";
// Import the bell/clock-style icon shown in the honest empty state
import { BsClockHistory } from "react-icons/bs";
// Import a utility function "cn" used to conditionally join CSS class names together
import cn from "../../utils/cn";

// Main functional component that renders the order tracking timeline; receives "history" array (default empty) and "currentStatus" string as props
const TrackingTimeline = ({ history = [], currentStatus }) => {
  // History items ko reverse karo — latest pehle
  // Create a new reversed copy of the real API history array so the most
  // recent entry comes first. NOTHING is fabricated here — if this array
  // is empty, it stays empty; we no longer invent replacement entries.
  const sortedHistory = [...history].reverse();

  // Mark only the very first (latest) real history item as "active"
  const timelineItems = sortedHistory.map((h, index) => ({
    ...h,
    isActive: index === 0, // Latest item active
  }));

  return (
    // Outer white card container with rounded corners, light border, and padding
    // shadow-sm gives the card a gentle resting elevation
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* Section heading */}
      <h3 className="text-base font-bold text-gray-900 mb-5">
        Tracking Updates
      </h3>

      {/* ── Honest empty state ────────────────────────────────────────────────
          Shown when the real API genuinely hasn't recorded any status-change
          history yet for this order. Instead of fabricating fake events, this
          tells the customer plainly what's happening: their order IS at
          currentStatus (shown via the stepper above), detailed step-by-step
          history just isn't available from the backend yet.                  */}
      {timelineItems.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-8">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            <BsClockHistory className="w-5 h-5 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              No detailed history yet
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
              We don't have a step-by-step timeline for this order yet, but its
              current status is shown above.
            </p>
          </div>
        </div>
      ) : (
        // ── Real timeline list ────────────────────────────────────────────────
        // divide gap handled via padding on each row instead of a gap utility
        <div className="flex flex-col gap-0">
          {/* Loop through every real timeline item along with its index */}
          {timelineItems.map((item, index) => {
            // Determine if this is the first item in the list (i.e., the latest/most recent update)
            const isFirst = index === 0; // Latest item

            // Return the JSX for a single timeline row (dot/line + content)
            return (
              // Animated wrapper for one timeline entry, using framer-motion for a fade/slide-in effect
              <motion.div
                // Use the array index as the React key since items may not have unique IDs
                key={index}
                // Initial animation state: invisible and shifted 8px to the left
                initial={{ opacity: 0, x: -8 }}
                // Final animation state: fully visible and at its normal horizontal position
                animate={{ opacity: 1, x: 0 }}
                // Animation timing: 0.3s duration, staggered delay based on item index for a cascading effect
                transition={{ duration: 0.3, delay: index * 0.08 }}
                // Layout classes: horizontal flex row, items aligned to top, gap between dot and content, relative positioning
                className="flex items-start gap-4 relative"
              >
                {/* Left — dot + vertical line */}
                {/* Column container holding the status dot on top and a connecting vertical line below it, shrink-0 so it doesn't shrink in the flex row */}
                <div className="flex flex-col items-center shrink-0">
                  {/* Dot */}
                  {/* Small circular dot representing this timeline event */}
                  <div
                    className={cn(
                      // Base classes: small circle size, fully rounded, slight top margin, no shrinking, smooth transition
                      "w-3 h-3 rounded-full mt-1 shrink-0 transition-all",
                      // If this is the latest item, color it emerald with a subtle glow shadow; otherwise color it gray
                      isFirst
                        ? "bg-primary shadow-sm shadow-primary/30" // Latest — emerald
                        : "bg-gray-200", // Previous — gray
                    )}
                  />
                  {/* Vertical line — last item pe nahi */}
                  {/* Only render the connecting vertical line if this is NOT the last item in the list */}
                  {index < timelineItems.length - 1 && (
                    // Thin vertical line connecting this dot to the next one, with vertical margin and a minimum height
                    <div className="w-px flex-1 bg-gray-100 my-1 min-h-8" />
                  )}
                </div>

                {/* Right — content */}
                {/* Content column that grows to fill remaining space, with bottom padding and min-w-0 to prevent overflow issues */}
                <div className="flex-1 pb-5 min-w-0">
                  {/* Row that places the title/description on the left and the timestamp on the right, spaced apart */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Title + description */}
                    {/* Container for the title and optional description text, growing to fill available space */}
                    <div className="flex-1 min-w-0">
                      {/* Title/status text for this timeline entry */}
                      <p
                        className={cn(
                          // Base classes: small text size, tight line height
                          "text-sm leading-snug",
                          // If this is the latest item, make the text bold and dark; otherwise use medium weight and lighter gray
                          isFirst
                            ? "font-bold text-gray-900" // Latest — bold
                            : "font-medium text-gray-600", // Previous — normal
                        )}
                      >
                        {/* Show the item's title if present, otherwise fall back to showing its raw status value */}
                        {item.title || item.status}
                      </p>
                      {/* Only render the description paragraph if the item actually has a description */}
                      {item.description && (
                        // Smaller, lighter gray text for the description, with top margin and relaxed line spacing
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Timestamp — only rendered when the real API actually provided one */}
                    {item.timestamp && (
                      <p
                        className={cn(
                          // Base classes: small bold-ish text, prevents shrinking, no line wrapping
                          "text-xs font-medium shrink-0 whitespace-nowrap",
                          // If this is the latest item, color the timestamp emerald; otherwise use light gray
                          isFirst ? "text-primary" : "text-gray-400",
                        )}
                      >
                        {/* Format the real timestamp using the browser's locale date formatting (e.g., "Jan 5, 02:30 PM") */}
                        {new Date(item.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default TrackingTimeline;
