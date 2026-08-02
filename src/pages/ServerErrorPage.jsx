// ============================================================
// ServerErrorPage — 500 ERROR PAGE
// ============================================================
// Rendered at the fixed "/500" route (see App.jsx SECTION 4). Unlike
// NotFoundPage, this is reached deliberately by a redirect — an Axios
// interceptor elsewhere in the app can send the browser here when a
// request comes back with a 500-level server error, so the person
// sees something more helpful than a blank crashed screen.
//
// "Try Again" performs a REAL full page reload (window.location.reload())
// rather than just re-rendering React state — a genuine server error
// often means stale JS chunks or a broken app state that a simple
// component re-render wouldn't actually fix.

import { Link } from "react-router-dom";
import {
  AiOutlineReload,
  AiOutlineHome,
  AiOutlineWarning,
} from "react-icons/ai";

import { ROUTES } from "../constants/routes";
import useAuth from "../hooks/useAuth";
import Button from "../components/ui/Button";

const ServerErrorPage = () => {
  const { isAuthenticated, role } = useAuth();

  const homeRoute =
    isAuthenticated && role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME;
  const homeLabel =
    isAuthenticated && role === "admin" ? "Back to Dashboard" : "Back to Home";

  const handleRetry = () => {
    window.location.reload();
    // A real, full browser reload — re-fetches everything from
    // scratch, which is the correct recovery action for a genuine
    // server-side failure (as opposed to a client-side routing issue,
    // which NotFoundPage's simpler "go back" is enough to fix)
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows — warm amber tones instead of
          emerald here, a deliberate small distinction from
          NotFoundPage's cooler palette, signaling "something actually
          went wrong" rather than "you took a wrong turn" */}
      <div className="absolute top-1/4 -left-24 w-72 h-72 bg-warning/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-72 h-72 bg-warning/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Icon badge instead of a numeral — a warning triangle inside
            a soft amber circle, matching the same icon-in-colored-box
            language used throughout the admin panel (e.g. StatsCard) */}
        <span className="w-20 h-20 rounded-2xl bg-warning-light flex items-center justify-center">
          <AiOutlineWarning className="w-10 h-10 text-warning" />
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Something Went Wrong
          </h1>
          <p className="text-sm text-gray-500 max-w-sm">
            Our server ran into an unexpected problem. This has already been
            logged — please try again in a moment.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            fullWidth
            leftIcon={<AiOutlineReload className="w-4 h-4" />}
            onClick={handleRetry}
          >
            Try Again
          </Button>

          <Link to={homeRoute} className="w-full sm:w-auto">
            <Button
              variant="secondary"
              fullWidth
              leftIcon={<AiOutlineHome className="w-4 h-4" />}
            >
              {homeLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
