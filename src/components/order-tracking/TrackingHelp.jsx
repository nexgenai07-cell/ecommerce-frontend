// Import useNavigate to let both buttons navigate programmatically on click
import { useNavigate } from "react-router-dom";
// Import a robot icon (for the AI chat button) and a headset icon (for the contact support button) from the "bs" (Bootstrap) icon set
import { BsRobot, BsHeadset } from "react-icons/bs";
// Import route path constants so both buttons navigate to real, existing pages
import { ROUTES } from "../../constants/routes";

// Main functional component that renders the "Need Help?" help/support section on the tracking page
const TrackingHelp = () => {
  const navigate = useNavigate(); // used by both buttons to navigate on click

  // Begin returning the JSX markup for this component
  return (
    // Outer white card container with rounded corners, light border, padding, and a vertical flex layout with gap between children
    // shadow-sm gives the card a gentle resting elevation, consistent with the rest of the account pages
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm">
      {/* Heading + description */}
      {/* Column container holding the heading and the description text with a small gap between them */}
      <div className="flex flex-col gap-1">
        {/* Section heading text */}
        <h3 className="text-base font-bold text-gray-900">Need Help?</h3>
        {/* Description paragraph explaining that AI and support are available 24/7 */}
        <p className="text-sm text-gray-400 leading-relaxed">
          Our AI assistant and support team are available 24/7 to help you with
          any questions regarding your delivery.
        </p>
      </div>
      {/* Action buttons */}
      {/* Row container holding both action buttons, centered vertically, with gap between them, and wrapping allowed on small screens */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Chat with AI — emerald — navigates to the homepage's real AI chat entry point */}
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="
            flex-1 flex items-center justify-center gap-2
            py-2.5 px-4 rounded-xl
            bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold
            shadow-sm shadow-primary/20
            hover:shadow-md hover:shadow-primary/30 hover:brightness-105 active:scale-[0.98]
            transition-all duration-150
            min-w-30
          "
        >
          {/* Robot icon shown inside the "Chat with AI" button */}
          <BsRobot className="w-4 h-4" />
          Chat with AI
        </button>
        {/* Contact Support — dark — navigates to the real Submit a Complaint page */}
        <button
          onClick={() => navigate(ROUTES.ACCOUNT_COMPLAINTS)}
          className="
            flex-1 flex items-center justify-center gap-2
            py-2.5 px-4 rounded-xl
            bg-gray-900 text-white text-sm font-semibold
            hover:bg-gray-700 active:scale-[0.98]
            transition-all duration-150
            min-w-30
          "
        >
          {/* Headset icon shown inside the "Contact Support" button */}
          <BsHeadset className="w-4 h-4" />
          Contact Support
        </button>
      </div>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default TrackingHelp;
