// ============================================================
// FOOTER COMPONENT
// This footer will be shown on the customer-facing side of the site.
// It has 3 stacked sections (layers):
//   1. Main columns (Brand / Quick Links / Categories / Support)
//   2. Trust badges (Secure Checkout, Free Delivery, etc.)
//   3. Bottom bar (copyright + legal links)
// On mobile, the main columns collapse into an accordion (expand/collapse).
// The "Categories" column data comes from a real backend API call.
// The whole layout is responsive (adjusts for mobile vs desktop).
// Icons are coming from the "react-icons" library.
// ============================================================

import { useState } from "react"; // React hook to store simple local state (accordion open/close)
import { Link } from "react-router-dom"; // Used instead of <a> for internal app navigation (no full page reload)
import { useQuery } from "@tanstack/react-query"; // Hook to fetch (GET) data from an API and cache it

// Icons used for social media, trust badges, accordion arrow, and AI chat button
import {
  BsFacebook,
  BsInstagram,
  BsTwitterX,
  BsShieldCheck,
  BsTruck,
  BsStar,
  BsHeadset,
  BsChevronDown,
  BsRobot,
  BsArrowUpRight,
} from "react-icons/bs";

import cn from "../../utils/cn"; // Small helper function to combine/merge CSS class names conditionally
import { ROUTES } from "../../constants/routes"; // Centralized list of app route paths (e.g. "/products")
import { QUERY_KEYS } from "../../constants/queryKeys"; // Centralized list of unique keys used to identify cached queries
import { getCategories } from "../../api/categories.api"; // Function that actually calls the backend API to get categories
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import Container from "./Container"; // Wrapper component that applies consistent max-width/padding to content

// =============================================
// QUICK LINKS — Static navigation links
// These are hardcoded (not from an API) and shown in the "Quick Links" column
// =============================================
const QUICK_LINKS = [
  { label: "Home", route: ROUTES.HOME }, // Link to homepage
  { label: "Products", route: ROUTES.PRODUCTS }, // Link to all products page
  { label: "Best Sellers", route: `${ROUTES.PRODUCTS}?sort=best` }, // Products page filtered/sorted by best sellers
  { label: "New Arrivals", route: `${ROUTES.PRODUCTS}?sort=new` }, // Products page filtered/sorted by newest items
];

// =============================================
// SUPPORT LINKS
// Static legal/help links shown in the "Support" column
// =============================================
const SUPPORT_LINKS = [
  { label: "Privacy Policy", route: "/privacy" },
  { label: "Terms of Service", route: "/terms" },
  { label: "Help Center", route: "/help" },
];

// =============================================
// TRUST BADGES
// Small icons + labels shown in Layer 2, meant to build customer trust
// (e.g. "Secure Checkout", "Free Delivery")
// =============================================
const TRUST_BADGES = [
  {
    icon: <BsShieldCheck className="w-5 h-5" />, // Shield icon = security
    label: "Secure Checkout",
  },
  {
    icon: <BsTruck className="w-5 h-5" />, // Truck icon = delivery
    label: "Free Delivery",
  },
  {
    icon: <BsStar className="w-5 h-5" />, // Star icon = quality
    label: "Quality Guaranteed",
  },
  {
    icon: <BsHeadset className="w-5 h-5" />, // Headset icon = customer support
    label: "24/7 Support",
  },
];

// Social links kept in one place so both desktop + mobile render from the same source
const SOCIAL_LINKS = [
  { icon: BsFacebook, href: "https://facebook.com", label: "Facebook" },
  { icon: BsInstagram, href: "https://instagram.com", label: "Instagram" },
  { icon: BsTwitterX, href: "https://twitter.com", label: "Twitter/X" },
];

// =============================================
// FOOTER LINK — small reusable component with an animated underline on hover
// =============================================
const FooterLink = ({ to, children }) => (
  <Link
    to={to}
    className="group relative w-fit text-sm text-gray-400 hover:text-white transition-colors duration-200"
  >
    {children}
    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
  </Link>
);

// =============================================
// MOBILE ACCORDION SECTION
// Reusable component used only on mobile.
// Shows a clickable title bar; clicking it shows/hides the content below it.
// =============================================
const AccordionSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false); // tracks whether this section is expanded or collapsed

  return (
    <div className="border-b border-white/10">
      {/* Clickable header bar — clicking this toggles open/closed state */}
      <button
        onClick={() => setIsOpen(!isOpen)} // flips isOpen true <-> false on every click
        className="flex items-center justify-between w-full py-4 text-sm font-semibold text-white uppercase tracking-wider active:scale-[0.99] transition-transform"
      >
        {title /* section heading text, e.g. "Quick Links" */}
        <BsChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-300",
            isOpen && "rotate-180 text-primary", // rotates the arrow icon upside down when section is open
          )}
        />
      </button>

      {/* The actual links/content — animated height so it doesn't feel like it "pops" open */}
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5 flex flex-col gap-3">
            {
              children /* whatever links were passed in between <AccordionSection> tags */
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear(); // always shows the correct copyright year

  // =============================================
  // CATEGORIES API CALL
  // Fetches the list of product categories to display in the "Categories" footer column
  // =============================================
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES, // unique cache key so react-query knows how to cache/reuse this data
    queryFn: getCategories, // the actual function that hits the backend API
    staleTime: 1000 * 60 * 10, // data is considered "fresh" for 10 minutes before refetching
  });

  // Safely pull out the categories array; falls back to an empty array if data isn't loaded yet
  // API_Documentation_Final.pdf (API 11) documents this endpoint as a
  // flat array, but real responses show a DRF-paginated object — a
  // backend/docs contract mismatch. extractListData() safely handles
  // either shape.
  const categories = extractListData(categoriesData);

  return (
    <footer className="relative bg-[#0d1b2a] text-white overflow-hidden">
      {/* Decorative ambient glow — purely visual, sits behind everything */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-20 bg-primary/10 blur-[120px] rounded-full" />

      {/* Thin gradient hairline across the very top of the footer, signals "new section" */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-primary/40 to-transparent" />

      {/* =============================================
          LAYER 1 — MAIN FOOTER COLUMNS
          On desktop screens: shown as 4 side-by-side columns.
          On mobile screens: shown as a collapsible accordion list instead.
          ============================================= */}
      <div className="relative  border-white/10">
        <Container>
          <div className="pt-0 pb-0 md:pt-16 md:pb-8">
            {/* ===== DESKTOP VERSION — hidden on mobile, visible from "md" breakpoint up ===== */}
            <div className="hidden md:grid grid-cols-12 gap-10 lg:gap-14">
              {/* ---- Column 1: Brand info (logo, description, social icons) ---- */}
              <div className="col-span-4 flex flex-col gap-6">
                <Link
                  to={ROUTES.HOME}
                  className="inline-flex items-baseline gap-0.5 font-extrabold text-2xl tracking-tight text-white w-fit"
                >
                  ZYRON
                  <span className="text-primary text-2xl leading-none">.</span>
                </Link>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                  Precision-engineered for modern retail. Experience the future
                  of AI-powered SaaS commerce.
                </p>

                {/* Social media icon links */}
                <div className="flex items-center gap-3">
                  {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank" // opens in a new browser tab
                      rel="noopener noreferrer" // security best practice when using target="_blank"
                      aria-label={label} // accessibility label for screen readers
                      className="
                        w-9 h-9 rounded-lg bg-white/5 border border-white/10
                        flex items-center justify-center text-gray-400
                        hover:text-white hover:border-primary/50 hover:bg-primary/10
                        hover:-translate-y-0.5 transition-all duration-200
                      "
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* ---- Column 2: Quick Links (static list defined above) ---- */}
              <div className="col-span-2 flex flex-col gap-5">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                  Quick Links
                </h4>
                <div className="flex flex-col gap-3.5">
                  {QUICK_LINKS.map((link) => (
                    <FooterLink key={link.label} to={link.route}>
                      {link.label}
                    </FooterLink>
                  ))}
                </div>
              </div>

              {/* ---- Column 3: Categories — pulled live from the API, only first 5 shown ---- */}
              <div className="col-span-3 flex flex-col gap-5">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                  Categories
                </h4>
                <div className="flex flex-col gap-3.5">
                  {categories.length > 0 ? (
                    categories.slice(0, 5).map(
                      (
                        cat, // only show the first 5 categories from the API
                      ) => (
                        <FooterLink
                          key={cat.id}
                          to={`${ROUTES.PRODUCTS}?category_id=${cat.id}`} // links to products page filtered by this category
                        >
                          {cat.name}
                        </FooterLink>
                      ),
                    )
                  ) : (
                    // Lightweight skeleton so the column doesn't look broken while categories load
                    <div className="flex flex-col gap-3.5">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="h-3.5 w-24 rounded bg-white/5 animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ---- Column 4: Support links + phone number + AI chat button ---- */}
              <div className="col-span-3 flex flex-col gap-5">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                  Support
                </h4>
                <div className="flex flex-col gap-3.5">
                  {SUPPORT_LINKS.map((link) => (
                    <FooterLink key={link.label} to={link.route}>
                      {link.label}
                    </FooterLink>
                  ))}

                  {/* Clickable phone number — "tel:" link opens the phone dialer on mobile devices */}
                  <a
                    href="tel:+92300000000"
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 w-fit"
                  >
                    +1 (555) ZYRON-88
                  </a>
                </div>

                {/* Button to open the AI chat widget — logic not implemented yet (empty function) */}
                <button
                  onClick={() => {}} // TODO: this should open the AI chat widget when clicked
                  className="
                    group flex items-center gap-2 px-4 py-2.5 rounded-lg
                    bg-linear-to-r from-primary/15 to-primary/5 border border-primary/25
                    text-primary text-sm font-medium
                    hover:border-primary/50 hover:from-primary/25 hover:to-primary/10
                    hover:-translate-y-0.5 transition-all duration-200 w-fit
                  "
                >
                  <BsRobot className="w-4 h-4" />{" "}
                  {/* robot icon to represent AI */}
                  Chat with Zyron AI
                  <BsArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </button>
              </div>
            </div>

            {/* ===== MOBILE VERSION — visible only below "md" breakpoint, hidden on desktop ===== */}
            <div className="md:hidden flex flex-col">
              {/* Brand section on mobile — always visible (not part of the accordion) */}
              <div className="flex flex-col gap-5 pb-7 border-b border-white/10 mb-1">
                <Link
                  to={ROUTES.HOME}
                  className="inline-flex items-baseline gap-0.5 font-extrabold text-xl text-white w-fit"
                >
                  ZYRON
                  <span className="text-primary text-xl leading-none">.</span>
                </Link>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Precision-engineered for modern retail.
                </p>
                {/* Social icons — built dynamically by looping over the shared array */}
                <div className="flex items-center gap-3">
                  {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="
                        w-9 h-9 rounded-lg bg-white/5 border border-white/10
                        flex items-center justify-center text-gray-400
                        active:scale-95 active:text-white active:border-primary/50
                        transition-all duration-150
                      "
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links — collapsible accordion section */}
              <AccordionSection title="Quick Links">
                {QUICK_LINKS.map((link) => (
                  <FooterLink key={link.label} to={link.route}>
                    {link.label}
                  </FooterLink>
                ))}
              </AccordionSection>

              {/* Categories — collapsible accordion section, same API data as desktop column */}
              <AccordionSection title="Categories">
                {categories.length > 0 ? (
                  categories.slice(0, 5).map((cat) => (
                    <FooterLink
                      key={cat.id}
                      to={`${ROUTES.PRODUCTS}?category_id=${cat.id}`}
                    >
                      {cat.name}
                    </FooterLink>
                  ))
                ) : (
                  <div className="flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-3.5 w-24 rounded bg-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                )}
              </AccordionSection>

              {/* Support — collapsible accordion section, includes AI chat button too */}
              <AccordionSection title="Support">
                {SUPPORT_LINKS.map((link) => (
                  <FooterLink key={link.label} to={link.route}>
                    {link.label}
                  </FooterLink>
                ))}
                <a
                  href="tel:+92300000000"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 w-fit"
                >
                  +1 (555) ZYRON-88
                </a>
                <button
                  onClick={() => {}} // TODO: this should open the AI chat widget when clicked
                  className="
                    flex items-center gap-2 px-3.5 py-2 rounded-lg
                    bg-primary/10 border border-primary/25
                    text-primary text-sm font-medium mt-1 w-fit
                    active:scale-[0.98] transition-transform
                  "
                >
                  <BsRobot className="w-4 h-4" />
                  Chat with Zyron AI
                </button>
              </AccordionSection>
            </div>
          </div>
        </Container>
      </div>

      {/* =============================================
          LAYER 3 — BOTTOM BAR
          Final row: copyright notice on the left, legal links on the right.
          ============================================= */}
      <div className="relative">
        <Container>
          <div className="py-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            {/* Copyright notice — year is computed dynamically so it's always current */}
            <p className="text-xs text-gray-500 text-center sm:text-left">
              © {currentYear} Zyron Commerce. All rights reserved.
            </p>

            {/* Legal/bottom links */}
            <div className="flex items-center gap-5 sm:gap-6">
              <Link
                to="/privacy"
                className="text-xs text-gray-500 hover:text-gray-200 transition-colors duration-200"
              >
                Privacy
              </Link>
              <Link
                to="/payments"
                className="text-xs text-gray-500 hover:text-gray-200 transition-colors duration-200"
              >
                Payments
              </Link>
              <Link
                to="/terms"
                className="text-xs text-gray-500 hover:text-gray-200 transition-colors duration-200"
              >
                Terms
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
