// Import the warning/alert icon component from the react-icons library (Ant Design icon set)
import { AiOutlineWarning } from "react-icons/ai";
// Import the Link component from react-router-dom to enable client-side navigation without a full page reload
import { Link } from "react-router-dom";
// Import the ROUTES object which holds all the predefined route paths used across the app
import { ROUTES } from "../../constants/routes";

// Define a functional component named ActiveComplaintBanner that receives a "complaint" object as a prop
const ActiveComplaintBanner = ({ complaint }) => {
  // Koi active complaint nahi toh render mat karo
  // If no complaint data is passed (i.e., complaint is null, undefined, or falsy), return null so nothing renders on the screen
  if (!complaint) return null;

  // Begin the JSX that will be returned and rendered by this component
  return (
    // Outer wrapper div: a flex container that arranges children in a row,
    // aligns items to the start on small screens and centers them on larger screens (sm and up),
    // justifies content with space between the two main sections, adds gap spacing between children,
    // applies padding, a light warning background color, a subtle warning-colored border, and rounded corners
    <div className="flex items-start sm:items-center justify-between gap-4 p-4 bg-warning-light border border-warning/20 rounded-xl">
      {/* Left — icon + message */}
      {/* Left section container: a flex row holding the warning icon and the text block, with gap spacing and items aligned to the top */}
      <div className="flex items-start gap-3">
        {/* Render the warning icon with a fixed width/height, warning color, prevent it from shrinking in the flex layout, and nudge it slightly down with top margin to align with text */}
        <AiOutlineWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        {/* Text container div wrapping the title and description paragraphs */}
        <div>
          {/* Bold, small-sized heading text shown in the warning color, acting as the title of the notice */}
          <p className="text-sm font-semibold text-warning">
            Active Status Notice
          </p>
          {/* Description paragraph with small text size, yellow-ish text color, slight top margin, and relaxed line height for readability */}
          <p className="text-sm text-yellow-700 mt-0.5 leading-relaxed">
            {/* Display the static part of the message followed by the dynamic order number from the complaint object; fallback to "N/A" if order is missing */}
            You have 1 open complaint regarding Order #
            {complaint.order || "N/A"}. Our team is currently reviewing your
            recent submission.
          </p>
        </div>
      </div>

      {/* View Status button */}
      {/* Navigation link styled as a button that takes the user to the account complaints page when clicked */}
      <Link
        // The destination route is pulled from the ROUTES constant (ACCOUNT_COMPLAINTS path)
        to={ROUTES.ACCOUNT_COMPLAINTS}
        className="
          shrink-0 px-4 py-2 text-sm font-semibold
          border border-warning/30 text-warning rounded-xl
          hover:bg-warning/10 transition-all
          whitespace-nowrap
        "
        // shrink-0: prevents the button from shrinking inside the flex container
        // px-4 py-2: horizontal and vertical padding for button size
        // text-sm font-semibold: small, bold text styling
        // border border-warning/30 text-warning rounded-xl: warning-colored border, text color, and rounded corners
        // hover:bg-warning/10 transition-all: light warning background on hover with smooth transition
        // whitespace-nowrap: prevents the button text from wrapping to a new line
      >
        {/* The visible label text on the button */}
        View Status
      </Link>
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default ActiveComplaintBanner;
