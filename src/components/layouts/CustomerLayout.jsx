import { Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";
import CustomerNavbar from "./CustomerNavbar";
import Footer from "./Footer";
import Container from "./Container";
import { Skeleton } from "../ui/Skeleton";
import Breadcrumbs from "../shared/Breadcrumbs";
// Breadcrumbs — the single shared, route-driven breadcrumb trail
// component. Mounted here as a sibling of <Outlet /> so it appears
// above every public customer page. It manages its own Container
// width internally and hides itself automatically on the homepage
// and on any route outside its config.
import ChatWidget from "../chat-assistant/ChatWidget";
// The AI shopping assistant floating widget — mounted here (as a
// sibling of <Outlet />, not inside it) so it's present on every
// customer page. The assistant role is determined automatically
// inside ChatProvider (mounted once at the app root in App.jsx)
// based on who is actually logged in.
import ScrollToTopButton from "../shared/ScrollToTopButton";
// Floating "back to top" button — mounted here (as a sibling of
// <Outlet />) so it's present on every customer page. It stacks
// directly above ChatIcon in the bottom-right corner and only
// becomes visible once the user has scrolled down the page.

const NO_FOOTER_ROUTES = ["/checkout", "/account"];

const CustomerLayout = () => {
  const location = useLocation();

  const hideFooter = NO_FOOTER_ROUTES.some((route) =>
    location.pathname.startsWith(route),
  );

  // /account/* pages render their own Breadcrumbs inside
  // CustomerAccountLayout, next to the sidebar rather than above it.
  const hideBreadcrumb = location.pathname.startsWith("/account");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <CustomerNavbar />

      <main className="flex-1 w-full flex flex-col">
        {/* flex flex-col added alongside the existing flex-1: this turns
            "main" into a flex column so the page rendered by <Outlet />
            can itself use "flex-1" to stretch down to the bottom of the
            screen — needed so a shared table's pagination footer sits
            pinned at the true bottom of the page even when there's only
            one or two rows, instead of hugging right under them. */}
        {!hideBreadcrumb && <Breadcrumbs />}

        <Suspense
          fallback={
            <Container className="py-8">
              <div className="flex flex-col gap-4">
                <Skeleton className="w-48 h-8" />
                <Skeleton className="w-full h-64" />
              </div>
            </Container>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {!hideFooter && <Footer />}

      {/* AI shopping assistant — floating icon on every customer page,
          works for both guests and logged-in customers. */}
      <ChatWidget />

      {/* Floating "back to top" button — appears on scroll, stacks
          directly above the ChatWidget icon. */}
      <ScrollToTopButton />
    </div>
  );
};

export default CustomerLayout;
