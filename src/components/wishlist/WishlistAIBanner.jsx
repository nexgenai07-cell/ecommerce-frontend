import { useNavigate } from "react-router-dom"; // useNavigate lets the button programmatically navigate on click
import { BsRobot } from "react-icons/bs"; // Robot icon used inside the brand icon box
import { AiOutlineArrowRight } from "react-icons/ai"; // Arrow icon that nudges forward on hover, signals "go to chat"
import { ROUTES } from "../../constants/routes"; // Centralized route path constants — avoids hardcoding URL strings

const WishlistAIBanner = () => {
  // navigate is used to send the customer to the homepage where the AI chat interface lives
  const navigate = useNavigate();

  return (
    // Banner wrapper — rounded gradient card, matches the brand treatment used
    // for the homepage Newsletter CTA so the "AI help" moment feels equally premium
    // relative + overflow-hidden lets the decorative blurred glow shapes sit
    // behind the content without spilling outside the rounded corners
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-dark via-primary to-emerald-500 px-5 sm:px-8 py-6 sm:py-7">
      {/* Decorative soft glow shapes — premium, lit-from-within feel
          pointer-events-none ensures they never block clicks on the content above */}
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content row — sits above the glow shapes via relative + z-10
          flex-col on mobile stacks the text block and button vertically
          sm:flex-row aligns them side by side with space between on larger screens */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        {/* ── Left side: icon + text ─────────────────────────────────────────────
            Robot icon in a frosted-glass box on the left, heading + description on the right */}
        <div className="flex items-center gap-4">
          {/* Brand icon box — frosted glass effect over the gradient background
              shrink-0 prevents it from compressing when the description text is long */}
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <BsRobot className="w-5 h-5 text-white" />{" "}
            {/* Robot icon in white to stand out against the gradient */}
          </div>

          {/* Text block — heading above, supporting description below, both in white/near-white */}
          <div>
            {/* Heading — short punchy question to prompt engagement */}
            <p className="text-sm sm:text-base font-semibold text-white">
              Need help choosing?
            </p>

            {/* Supporting description — explains what the AI will do for the customer */}
            <p className="text-sm text-white/75 mt-0.5">
              Our AI can analyze your wishlist and suggest the perfect item
              based on your preferences.
            </p>
          </div>
        </div>

        {/* ── Right side: Ask Zyron AI button ───────────────────────────────────────
            White pill button stands out clearly against the gradient background
            shrink-0 prevents the button from compressing alongside the description text
            whitespace-nowrap ensures the label never wraps onto two lines
            group + hover:translate-x on the arrow gives a subtle "go" nudge on hover */}
        <button
          onClick={() => navigate(ROUTES.HOME)} // navigates to the homepage where the Zyron AI chat is accessible
          className="
            group flex items-center gap-2 px-5 py-2.5
            bg-white text-primary-dark text-sm font-bold rounded-full
            shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-200
            shrink-0 whitespace-nowrap
          "
        >
          Ask Zyron AI
          <AiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default WishlistAIBanner; // Export so it can be composed into the Wishlist page
