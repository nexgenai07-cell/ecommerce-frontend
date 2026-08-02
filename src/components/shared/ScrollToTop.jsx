// ScrollToTop — resets the window scroll position to the very top of the page
// every time the user navigates to a different route (URL pathname).
// React Router does NOT do this automatically — by default, if a user scrolls
// down on Page A and then navigates to Page B, the browser keeps the same
// scroll position, so Page B can open in the middle instead of from the top.
// This component fixes that globally, for every route in the app, in one place.
// Renders no visible UI — it only runs a side effect (useEffect), so it is
// mounted once near the root of the app, alongside <Routes>, not inside a page.

import { useEffect } from "react";
// useEffect — runs a side effect after render; here it runs the scroll reset
//             every time the tracked value (the pathname) changes

import { useLocation } from "react-router-dom";
// useLocation — hook that returns the current URL's location object
//               location.pathname changes every time the route changes
//               (e.g. from "/products" to "/cart"), which is exactly what
//               we want to react to; location.search/hash changes (like
//               adding a ?page=2 query param or a #section anchor) do NOT
//               reset scroll, since those are usually in-page interactions
//               (filters, pagination, anchor links) where staying put is correct

const ScrollToTop = () => {
  // Read the current route's pathname (e.g. "/products", "/cart", "/admin/dashboard")
  const { pathname } = useLocation();

  // Runs every time pathname changes — i.e. every time the user navigates
  // to a genuinely different page (Link click, navigate(), redirect, etc.)
  useEffect(() => {
    // window.scrollTo instantly moves the scroll position to x:0, y:0
    // (the very top-left of the page) — instant (not smooth) is intentional
    // here, since a smooth animated scroll on every page load looks like a
    // lag/glitch to the user; industry-standard sites reset instantly so the
    // new page always visually starts fully at the top, immediately
    window.scrollTo(0, 0);
  }, [pathname]); // dependency array — effect re-runs only when pathname changes

  // This component renders nothing to the DOM — it exists purely to run the
  // effect above; returning null keeps React happy about needing a return value
  return null;
};

export default ScrollToTop;
// Default export — imported in App.jsx as: import ScrollToTop from "./components/shared/ScrollToTop"
