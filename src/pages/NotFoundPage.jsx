// ============================================================
// NotFoundPage — 404 ERROR PAGE
// ============================================================
// Rendered by App.jsx's catch-all route (path="*") whenever the URL
// does not match a real page. The page is standalone: no navbar or
// sidebar surrounds it, matching how the error pages are kept outside
// CustomerLayout and AdminLayout.
//
// Destinations are role-aware. A signed-in admin is offered the admin
// dashboard and admin shortcuts; everyone else is offered the
// storefront, a product search and customer shortcuts.

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  AiOutlineAppstore,
  AiOutlineArrowLeft,
  AiOutlineDashboard,
  AiOutlineHeart,
  AiOutlineHome,
  AiOutlineRight,
  AiOutlineSearch,
  AiOutlineShopping,
  AiOutlineShoppingCart,
  AiOutlineUnorderedList,
} from "react-icons/ai";

import { ROUTES } from "../constants/routes";
import useAuth from "../hooks/useAuth";

// Shortcuts shown under the main actions
const ADMIN_SHORTCUTS = [
  { label: "Products", to: ROUTES.ADMIN_PRODUCTS, icon: AiOutlineAppstore },
  { label: "Orders", to: ROUTES.ADMIN_ORDERS, icon: AiOutlineUnorderedList },
];

const CUSTOMER_SHORTCUTS = [
  { label: "Shop", to: ROUTES.PRODUCTS, icon: AiOutlineShopping },
  { label: "Cart", to: ROUTES.CART, icon: AiOutlineShoppingCart },
  { label: "Wishlist", to: ROUTES.WISHLIST, icon: AiOutlineHeart },
];

// Parent variant: reveals its children one after another
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

// Child variant: fade in while sliding up slightly
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Shared classes for the two main call-to-action buttons. whitespace-nowrap
// keeps the label on a single line however narrow the button gets.
const ACTION_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-sm sm:text-base font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 w-full sm:w-auto";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = isAuthenticated && role === "admin";
  const homeRoute = isAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME;
  const homeLabel = isAdmin ? "Back to Dashboard" : "Back to Home";
  const HomeIcon = isAdmin ? AiOutlineDashboard : AiOutlineHome;
  const shortcuts = isAdmin ? ADMIN_SHORTCUTS : CUSTOMER_SHORTCUTS;

  // Returns to the previous page when there is one; a visitor who opened
  // the broken link directly has no history, so they go home instead.
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homeRoute);
    }
  };

  // Sends the typed term to the products page as its search filter
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const term = searchTerm.trim();
    navigate(
      term
        ? `${ROUTES.PRODUCTS}?search=${encodeURIComponent(term)}`
        : ROUTES.PRODUCTS,
    );
  };

  // Gentle looping motion for the decorative elements; disabled
  // entirely for visitors who asked to minimise motion.
  const floatAnimation = shouldReduceMotion
    ? undefined
    : { y: [0, -12, 0], rotate: [0, 4, 0] };
  const floatTransition = {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut",
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-linear-to-b from-white via-white to-primary-50/60 flex items-center justify-center px-4 py-10 sm:py-14">
      {/* Dotted grid that fades out towards the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(16,185,129,0.22) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
        }}
      />

      {/* Soft colour glows behind the content */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-primary/20 blur-3xl"
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-primary-light/25 blur-3xl"
        animate={shouldReduceMotion ? undefined : { scale: [1.1, 1, 1.1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Decorative floating badges, only on screens wide enough for them */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] top-[22%] hidden md:flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 text-primary"
        animate={floatAnimation}
        transition={floatTransition}
      >
        <AiOutlineShoppingCart className="h-7 w-7" />
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute right-[13%] top-[30%] hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 text-primary"
        animate={floatAnimation}
        transition={{ ...floatTransition, duration: 6.5, delay: 0.8 }}
      >
        <AiOutlineHeart className="h-6 w-6" />
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute right-[20%] bottom-[16%] hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 text-primary"
        animate={floatAnimation}
        transition={{ ...floatTransition, duration: 5.5, delay: 1.6 }}
      >
        <AiOutlineShopping className="h-6 w-6" />
      </motion.span>

      <motion.div
        className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6 sm:gap-7 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Large 404 numeral. Sizes use em units so the middle circle
            always scales together with the digits beside it. */}
        <motion.div
          variants={itemVariants}
          role="img"
          aria-label="Error 404"
          className="flex items-center justify-center gap-1 sm:gap-2 text-[4.5rem] leading-none font-bold sm:text-[6rem] md:text-[7.5rem]"
        >
          <span className="bg-linear-to-b from-gray-900 to-gray-600 bg-clip-text text-transparent">
            4
          </span>

          <span className="relative flex h-[0.7em] w-[0.7em] shrink-0 items-center justify-center">
            {/* Expanding rings around the circle */}
            {!shouldReduceMotion && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                <span
                  className="absolute -inset-[0.08em] rounded-full border-2 border-primary/20 animate-ping"
                  style={{ animationDuration: "2.6s" }}
                />
              </>
            )}
            <motion.span
              className="relative flex h-full w-full items-center justify-center rounded-full bg-linear-to-br from-primary-light via-primary to-primary-dark text-white shadow-xl shadow-primary/40"
              animate={shouldReduceMotion ? undefined : { rotate: [-8, 8, -8] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <AiOutlineSearch className="h-[0.34em] w-[0.34em]" />
            </motion.span>
          </span>

          <span className="bg-linear-to-b from-gray-900 to-gray-600 bg-clip-text text-transparent">
            4
          </span>
        </motion.div>

        {/* Title and explanation */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-2.5"
        >
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
            Page Not Found
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            The page you are looking for does not exist, may have been moved, or
            the URL might be mistyped.
          </p>

          {/* The address that could not be found */}
          <span
            title={location.pathname}
            className="mt-1 inline-block max-w-full truncate rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-xs text-gray-500 shadow-sm backdrop-blur-sm sm:text-sm"
          >
            {location.pathname}
          </span>
        </motion.div>

        {/* Product search, offered to shoppers only */}
        {!isAdmin && (
          <motion.form
            variants={itemVariants}
            onSubmit={handleSearchSubmit}
            role="search"
            className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-md transition-shadow focus-within:border-primary focus-within:shadow-lg focus-within:ring-2 focus-within:ring-primary/20"
          >
            <AiOutlineSearch className="ml-3 h-5 w-5 shrink-0 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for products instead"
              aria-label="Search for products"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-base"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 active:scale-95"
            >
              Search
            </button>
          </motion.form>
        )}

        {/* Main actions */}
        <motion.div
          variants={itemVariants}
          className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          <button
            type="button"
            onClick={handleGoBack}
            className={`${ACTION_BASE} border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 hover:shadow-md`}
          >
            <AiOutlineArrowLeft className="h-4 w-4 shrink-0" />
            Go Back
          </button>

          <Link
            to={homeRoute}
            className={`${ACTION_BASE} bg-linear-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:brightness-105`}
          >
            <HomeIcon className="h-4 w-4 shrink-0" />
            {homeLabel}
          </Link>
        </motion.div>

        {/* Shortcut chips */}
        <motion.nav
          variants={itemVariants}
          aria-label="Helpful links"
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Or jump to
          </span>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {shortcuts.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3.5 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:border-primary hover:bg-primary-50 hover:text-primary-dark"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <AiOutlineRight className="h-3 w-3 opacity-0 -ml-1 transition-all group-hover:ml-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </motion.nav>
      </motion.div>
    </main>
  );
};

export default NotFoundPage;
