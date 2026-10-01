// ============================================================
// FOOTER COMPONENT
// ============================================================
// Site-wide footer for the customer-facing pages.
//
// Structure:
//   1. Main columns: brand, quick links, categories and support.
//      Tablet and desktop spread them across the full content width,
//      so the first column sits on the left edge and the last column
//      sits on the right edge. Mobile shows them as collapsible
//      accordion sections.
//   2. Bottom bar: copyright notice and legal links.
//
// The background is an interactive gravity-star field. Categories are
// loaded from the backend, and icons come from "react-icons".

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  BsFacebook,
  BsInstagram,
  BsTwitterX,
  BsChevronDown,
  BsRobot,
  BsArrowUpRight,
} from "react-icons/bs";

import cn from "../../utils/cn";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData";
import useChat from "../../hooks/useChat";
import Container from "./Container";
import GravityStarsBackground from "../ui/GravityStarsBackground";

// Static navigation links shown in the "Quick Links" column.
const QUICK_LINKS = [
  { label: "Home", route: ROUTES.HOME },
  { label: "Products", route: ROUTES.PRODUCTS },
  { label: "Best Sellers", route: `${ROUTES.PRODUCTS}?sort=best` },
  { label: "New Arrivals", route: `${ROUTES.PRODUCTS}?sort=new` },
];

// Static legal and help links shown in the "Support" column.
const SUPPORT_LINKS = [
  { label: "Privacy Policy", route: "/privacy" },
  { label: "Terms of Service", route: "/terms" },
  { label: "Help Center", route: "/help" },
];

// Social profiles, shared by the desktop and mobile layouts.
const SOCIAL_LINKS = [
  { icon: BsFacebook, href: "https://facebook.com", label: "Facebook" },
  { icon: BsInstagram, href: "https://instagram.com", label: "Instagram" },
  { icon: BsTwitterX, href: "https://twitter.com", label: "Twitter/X" },
];

// Number of categories listed in the footer.
const MAX_FOOTER_CATEGORIES = 5;

// Link with an animated underline that expands on hover.
const FooterLink = ({ to, children }) => (
  <Link
    to={to}
    className="group relative w-fit text-xs text-primary-light transition-colors duration-200 hover:text-emerald-200"
  >
    {children}
    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
  </Link>
);

// Collapsible section used by the mobile layout. The title and the links
// are centered, and the arrow stays on the right edge of the header. The
// header toggles the content, and the height change is animated with a
// grid-row transition.
const AccordionSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        className="relative flex w-full items-center justify-center py-3 text-xs font-semibold uppercase tracking-wider text-white transition-transform active:scale-[0.99]"
      >
        {title}
        <BsChevronDown
          className={cn(
            "absolute right-0 h-3.5 w-3.5 text-gray-200 transition-transform duration-300",
            isOpen && "rotate-180 text-primary",
          )}
        />
      </button>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col items-center gap-2.5 pb-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder lines displayed while the categories are loading.
const CategorySkeleton = ({ lines, gap }) => (
  <div className={cn("flex flex-col", gap)}>
    {Array.from({ length: lines }, (_, index) => (
      <div
        key={index}
        className="h-3.5 w-24 animate-pulse rounded bg-white/5"
      />
    ))}
  </div>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { handleOpenChat } = useChat();

  // Category list for the "Categories" column, cached for ten minutes.
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: ({ signal }) => getCategories(undefined, signal),
    staleTime: 1000 * 60 * 10,
  });

  // The endpoint may return either a plain array or a paginated object,
  // so the response is normalized to an array before use.
  const categories = extractListData(categoriesData);
  const visibleCategories = categories.slice(0, MAX_FOOTER_CATEGORIES);

  return (
    <footer className="relative overflow-hidden bg-black text-white">
      {/* Interactive gravity-star background, rendered behind all footer content */}
      <GravityStarsBackground
        starsCount={55}
        starsSize={3}
        starsOpacity={0.9}
        movementSpeed={0.5}
      />

      {/* Soft emerald glow along the top edge */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-20 w-150 max-w-full -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      {/* Gradient hairline that separates the footer from the page above */}
      <div className="relative z-10 h-px w-full bg-linear-to-r from-transparent via-primary/40 to-transparent" />

      {/* ==========================================================
          MAIN COLUMNS
          Mobile: accordion. Tablet: brand row above three columns.
          Desktop: four columns spread edge to edge with equal gaps.
          ========================================================== */}
      <div className="relative z-10">
        <Container>
          <div className="pb-2 pt-6 md:pb-4 md:pt-8">
            {/* ===== TABLET AND DESKTOP LAYOUT ===== */}
            <div className="hidden gap-x-8 gap-y-6 md:flex md:flex-wrap md:justify-between lg:flex-nowrap lg:gap-x-10">
              {/* Brand: logo, description and social links */}
              <div className="flex flex-col gap-4 md:basis-full md:flex-row md:items-center md:justify-between lg:basis-auto lg:flex-col lg:items-start lg:justify-start">
                <Link
                  to={ROUTES.HOME}
                  className="inline-flex w-fit items-baseline gap-0.5 text-lg font-extrabold tracking-tight text-white"
                >
                  ZYRON
                  <span className="text-lg leading-none text-primary">.</span>
                </Link>
                <p className="max-w-xs text-xs leading-relaxed text-gray-100">
                  Precision-engineered for modern retail. Experience the future
                  of AI-powered SaaS commerce.
                </p>

                <div className="flex items-center gap-3">
                  {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-white"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white">
                  Quick Links
                </h4>
                <div className="flex flex-col gap-2.5">
                  {QUICK_LINKS.map((link) => (
                    <FooterLink key={link.label} to={link.route}>
                      {link.label}
                    </FooterLink>
                  ))}
                </div>
              </div>

              {/* Categories loaded from the API */}
              <div className="flex min-w-36 flex-col gap-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white">
                  Categories
                </h4>
                <div className="flex flex-col gap-2.5">
                  {visibleCategories.length > 0 ? (
                    visibleCategories.map((category) => (
                      <FooterLink
                        key={category.id}
                        to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
                      >
                        {category.name}
                      </FooterLink>
                    ))
                  ) : (
                    <CategorySkeleton lines={4} gap="gap-2.5" />
                  )}
                </div>
              </div>

              {/* Support links, phone number and AI assistant shortcut */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white">
                  Support
                </h4>
                <div className="flex flex-col gap-2.5">
                  {SUPPORT_LINKS.map((link) => (
                    <FooterLink key={link.label} to={link.route}>
                      {link.label}
                    </FooterLink>
                  ))}

                  <a
                    href="tel:+92300000000"
                    className="w-fit text-xs text-primary-light transition-colors duration-200 hover:text-emerald-200"
                  >
                    +1 (555) ZYRON-88
                  </a>
                </div>

                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="group flex w-fit items-center gap-2 rounded-lg border border-primary/25 bg-linear-to-r from-primary/15 to-primary/5 px-4 py-2 text-xs font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:from-primary/25 hover:to-primary/10"
                >
                  <BsRobot className="h-3.5 w-3.5" />
                  Chat with Zyron AI
                  <BsArrowUpRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                </button>
              </div>
            </div>

            {/* ===== MOBILE LAYOUT ===== */}
            <div className="flex flex-col md:hidden">
              {/* Brand block stays visible and is not part of the accordion */}
              <div className="mb-1 flex flex-col items-center gap-3 border-b border-white/10 pb-4 text-center">
                <Link
                  to={ROUTES.HOME}
                  className="inline-flex w-fit items-baseline gap-0.5 text-base font-extrabold text-white"
                >
                  ZYRON
                  <span className="text-base leading-none text-primary">.</span>
                </Link>
                <p className="text-xs leading-relaxed text-gray-100">
                  Precision-engineered for modern retail.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-100 transition-all duration-150 active:scale-95 active:border-primary/50 active:text-white"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </div>

              <AccordionSection title="Quick Links">
                {QUICK_LINKS.map((link) => (
                  <FooterLink key={link.label} to={link.route}>
                    {link.label}
                  </FooterLink>
                ))}
              </AccordionSection>

              <AccordionSection title="Categories">
                {visibleCategories.length > 0 ? (
                  visibleCategories.map((category) => (
                    <FooterLink
                      key={category.id}
                      to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
                    >
                      {category.name}
                    </FooterLink>
                  ))
                ) : (
                  <CategorySkeleton lines={3} gap="gap-3" />
                )}
              </AccordionSection>

              <AccordionSection title="Support">
                {SUPPORT_LINKS.map((link) => (
                  <FooterLink key={link.label} to={link.route}>
                    {link.label}
                  </FooterLink>
                ))}
                <a
                  href="tel:+92300000000"
                  className="w-fit text-xs text-primary-light transition-colors duration-200 hover:text-emerald-200"
                >
                  +1 (555) ZYRON-88
                </a>
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="mt-1 flex w-fit items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-white transition-transform active:scale-[0.98]"
                >
                  <BsRobot className="h-3.5 w-3.5" />
                  Chat with Zyron AI
                </button>
              </AccordionSection>
            </div>
          </div>
        </Container>
      </div>

      {/* ==========================================================
          BOTTOM BAR
          Copyright notice and legal links. On small screens the
          links appear first and the notice is stacked below them.
          ========================================================== */}
      <div className="relative z-10">
        <Container>
          <div className="flex flex-col-reverse items-center justify-between gap-2 py-3 sm:flex-row sm:gap-4">
            <p className="text-center text-[11px] text-gray-200 sm:text-left">
              © {currentYear} Zyron Commerce. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-6">
              <Link
                to="/privacy"
                className="text-[11px] text-primary-light transition-colors duration-200 hover:text-emerald-200"
              >
                Privacy
              </Link>
              <Link
                to="/payments"
                className="text-[11px] text-primary-light transition-colors duration-200 hover:text-emerald-200"
              >
                Payments
              </Link>
              <Link
                to="/terms"
                className="text-[11px] text-primary-light transition-colors duration-200 hover:text-emerald-200"
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
