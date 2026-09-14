// ============================================================
// Breadcrumbs — SHARED, ROUTE-DRIVEN BREADCRUMB TRAIL
// ============================================================
// This single component is responsible for the breadcrumb trail on
// EVERY page in the project, both customer-facing and admin. It is
// mounted exactly twice, in exactly two places:
//   - components/layouts/CustomerLayout.jsx (covers every public
//     storefront page AND every /account/* page, since
//     CustomerAccountLayout is itself nested inside CustomerLayout)
//   - components/layouts/AdminLayout.jsx (covers every /admin/* page)
//
// It needs ZERO props and ZERO per-page wiring to appear — it figures
// out what to show purely from the current URL, matched against the
// route-to-trail map in constants/breadcrumbs.config.js. Adding a
// breadcrumb to a brand new page in the future is a one-line addition
// to that config file, not a new copy of this component's JSX.
//
// DYNAMIC DETAIL PAGES (a single product, a single order, ...) start
// out showing a sensible static fallback label (e.g. "Product
// Details") and upgrade themselves to the REAL title (e.g. the actual
// product name) the moment that page publishes it via the
// useBreadcrumb() hook — see hooks/useBreadcrumb.js for the two-line
// pattern any detail page uses to opt into this.

import { Link, useLocation, matchPath } from "react-router-dom";
// Link       — client-side navigation for every non-final crumb
// useLocation — reads the current URL so this component can react to
//               every route change without any props being passed in
// matchPath  — React Router's own utility for testing a URL against a
//              path pattern that may contain dynamic segments (":id"),
//              exactly the same matching engine <Route> itself uses

import { useEffect } from "react";

import { AiOutlineHome, AiOutlineRight } from "react-icons/ai";
// AiOutlineHome  — small icon prefixing the very first crumb, echoing
//                  the "Home"/"Dashboard" destination it links to

import { ROUTES } from "../../constants/routes";
import { BREADCRUMB_ROUTES } from "../../constants/breadcrumbs.config";
import useBreadcrumb from "../../hooks/useBreadcrumb";
import cn from "../../utils/cn";
import Container from "../layouts/Container";
// Container — the exact same max-width/side-padding wrapper every
// storefront page already uses. Applied here (customer side only) so
// the breadcrumb pill lines up perfectly with the page content below
// it, without CustomerLayout having to know or care whether a
// breadcrumb is actually showing on the current route.

// Root pages where a breadcrumb trail adds no real navigational value —
// the only crumb would be a single "Home"/"Dashboard" item pointing at
// the very page already on screen. Hidden here, matching the same
// convention most large storefronts and admin dashboards follow.
const HIDDEN_ROOT_PATHS = [ROUTES.HOME, ROUTES.ADMIN_DASHBOARD];

const Breadcrumbs = () => {
  const location = useLocation();
  const { dynamicLabel, handleClearLabel } = useBreadcrumb();

  // ------------------------------------------------------------
  // Reset the dynamic label on every route change.
  // ------------------------------------------------------------
  // Without this, navigating from, say, one product's detail page
  // straight to another product's detail page would briefly show the
  // PREVIOUS product's name as the breadcrumb while the new product is
  // still loading. Clearing it here — keyed on the pathname — means
  // every dynamic page always starts from the static fallback label
  // until its own data arrives and calls handleSetLabel() again.
  useEffect(() => {
    handleClearLabel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Root pages (storefront home, admin dashboard) never show a trail.
  if (HIDDEN_ROOT_PATHS.includes(location.pathname)) return null;

  // ------------------------------------------------------------
  // Find the config entry whose pattern matches the current URL.
  // ------------------------------------------------------------
  // `end: true` requires a full match (same behaviour as how these
  // exact same pattern strings are matched by <Route path="..."> in
  // App.jsx), so "/admin/products/add" can never accidentally match
  // the "/admin/products" entry, for example.
  const matchedEntry = BREADCRUMB_ROUTES.find((entry) =>
    matchPath({ path: entry.pattern, end: true }, location.pathname),
  );

  // A route with no config entry (shouldn't normally happen, but keeps
  // this component 100% safe against future pages that haven't been
  // added to breadcrumbs.config.js yet) simply renders nothing rather
  // than showing a broken or misleading trail.
  if (!matchedEntry) return null;

  const isAdminSide = location.pathname.startsWith("/admin");

  // The root crumb is always first and always links back to the
  // relevant "home base" for whichever side of the app we're on.
  const rootCrumb = isAdminSide
    ? { label: "Dashboard", path: ROUTES.ADMIN_DASHBOARD }
    : { label: "Home", path: ROUTES.HOME };

  // Build the final list of crumbs to render: the root crumb, followed
  // by this route's configured trail, with any `dynamic: true` crumb's
  // label swapped for the real published title once one exists.
  const crumbs = [
    rootCrumb,
    ...matchedEntry.trail.map((crumb) =>
      crumb.dynamic && dynamicLabel ? { ...crumb, label: dynamicLabel } : crumb,
    ),
  ];

  // ------------------------------------------------------------
  // SEO: BreadcrumbList structured data (customer side only)
  // ------------------------------------------------------------
  // Publishing this JSON-LD block lets search engines render the
  // breadcrumb trail directly in the search result snippet instead of
  // the raw URL — a standard, low-cost SEO practice for storefronts.
  // Skipped entirely on the admin side, which is never meant to be
  // publicly indexed in the first place.
  const structuredData = !isAdminSide
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.label,
          item: `${window.location.origin}${crumb.path || location.pathname}`,
        })),
      }
    : null;

  // The breadcrumb pill markup itself — identical on both sides of the
  // app, only the surrounding wrapper (below) differs, since the
  // customer side needs the shared Container's max-width/side-padding
  // and the admin side already sits inside AdminLayout's own padded
  // <main>.
  const breadcrumbPill = (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 text-sm flex-wrap w-fit max-w-full rounded-full px-4 py-2 border",
        isAdminSide
          ? "bg-white border-gray-200 shadow-sm text-gray-400"
          : "bg-gray-50 border-gray-100 text-gray-400",
      )}
    >
      <ol className="flex items-center gap-1.5 flex-wrap min-w-0">
        {crumbs.map((crumb, index) => {
          const isFirst = index === 0;
          const isLast = index === crumbs.length - 1;
          // A crumb is clickable when it has a path AND it isn't the
          // final (current page) crumb — the current page never links
          // to itself.
          const isClickable = Boolean(crumb.path) && !isLast;

          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              {isFirst && <AiOutlineHome className="w-3.5 h-3.5 shrink-0" />}

              {isClickable ? (
                <Link
                  to={crumb.path}
                  className="font-medium hover:text-primary transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate",
                    isLast ? "text-gray-700 font-semibold" : "font-medium",
                  )}
                >
                  {crumb.label}
                </span>
              )}

              {!isLast && (
                <AiOutlineRight className="w-3 h-3 shrink-0 text-gray-300" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );

  // Structured data island — invisible, read only by search engine
  // crawlers, never rendered as visible page content.
  const structuredDataScript = structuredData && (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );

  // ------------------------------------------------------------
  // Admin side — AdminLayout's <main> already provides consistent
  // page padding, so this only needs its own bottom margin to
  // separate it from the page's own PageHeader/content below.
  // ------------------------------------------------------------
  if (isAdminSide) {
    return (
      <div className="w-full mb-4 md:mb-6">
        {breadcrumbPill}
        {structuredDataScript}
      </div>
    );
  }

  // ------------------------------------------------------------
  // Customer side — wrapped in the same Container every storefront
  // page uses, so the pill's left edge lines up exactly with the page
  // heading/content rendered just below it.
  // ------------------------------------------------------------
  return (
    <Container className="pt-4 sm:pt-6">
      {breadcrumbPill}
      {structuredDataScript}
    </Container>
  );
};

export default Breadcrumbs;
