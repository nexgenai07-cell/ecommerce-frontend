// ============================================================
// NotFoundPage — 404 ERROR PAGE
// ============================================================
// Rendered by App.jsx's catch-all route (path="*") whenever the URL
// doesn't match anything real. No layout wrapper surrounds this page
// (no navbar/sidebar) — it's fully standalone, matching how the
// error-pages section of App.jsx is deliberately kept outside
// CustomerLayout/AdminLayout.
//
// The "where should this button send you" logic uses REAL auth state
// (via useAuth) rather than always pointing to the same generic
// homepage — a logged-in admin gets sent back to their dashboard, a
// logged-in or anonymous customer gets sent to the storefront home.

import { Link, useNavigate } from "react-router-dom";
import { AiOutlineArrowLeft, AiOutlineHome } from "react-icons/ai";

import { ROUTES } from "../constants/routes";
import useAuth from "../hooks/useAuth";
import Button from "../components/ui/Button";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  // Real, role-aware destination — not a hardcoded single link
  const homeRoute =
    isAuthenticated && role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME;
  const homeLabel =
    isAuthenticated && role === "admin" ? "Back to Dashboard" : "Back to Home";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows — pure CSS, matches the same
          soft emerald blur treatment used on AdminLogin's branding
          panel, kept subtle here since this is a light-background page */}
      <div className="absolute top-1/4 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Large "404" numeral — the primary visual anchor of the page */}
        <div className="flex items-center gap-2">
          <span className="text-7xl sm:text-8xl font-bold text-gray-900 leading-none">
            4
          </span>
          {/* The middle "0" rendered as a filled emerald circle instead
              of plain text — a small on-brand visual touch tying the
              numeral back to the app's primary color */}
          <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-3xl sm:text-4xl font-bold text-white">0</span>
          </span>
          <span className="text-7xl sm:text-8xl font-bold text-gray-900 leading-none">
            4
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Page Not Found
          </h1>
          <p className="text-sm text-gray-500 max-w-sm">
            The page you're looking for doesn't exist, may have been moved, or
            the URL might be mistyped.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            fullWidth
            leftIcon={<AiOutlineArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
            // navigate(-1) — real browser-history "go back", not a
            // fixed destination, so it correctly returns wherever the
            // person actually came from
          >
            Go Back
          </Button>

          <Link to={homeRoute} className="w-full sm:w-auto">
            <Button
              variant="primary"
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

export default NotFoundPage;
