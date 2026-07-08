// Customer-facing pages ka main layout wrapper component
// This wraps every page the customer sees — navbar, content, footer all together
import { Outlet, useLocation } from "react-router-dom";
// Outlet renders whichever child page/route is currently active
// useLocation tells us the current URL path
import { Suspense } from "react";
// Suspense shows a fallback UI while lazy-loaded components are still loading
import CustomerNavbar from "./CustomerNavbar";
// Top navigation bar shown on all customer pages
import Footer from "./Footer";
// Bottom footer shown on most customer pages
import Container from "./Container";
// A wrapper that centers and pads content with consistent max-width
import { Skeleton } from "../ui/Skeleton";
// Grey placeholder blocks shown while page content is loading

// List of routes where we do NOT want to show the footer
// Checkout page has its own minimal layout, so footer is hidden there
const CHECKOUT_ROUTES = ["/checkout"];

const CustomerLayout = () => {
  // Get the current URL location so we can check which page the user is on
  const location = useLocation();

  // Check if the current page is a checkout route
  // startsWith handles sub-routes too, like /checkout/payment or /checkout/confirm
  const isCheckoutRoute = CHECKOUT_ROUTES.some((route) =>
    location.pathname.startsWith(route),
  );

  return (
    // Outer wrapper — fills full screen height and stacks children vertically
    // bg-white keeps background clean and white across all pages
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar — always visible at the top on every customer page */}
      <CustomerNavbar />

      {/* Main content area — flex-1 makes it grow and fill remaining vertical space */}
      {/* w-full ensures it stretches across the full width of the screen */}
      <main className="flex-1 w-full">
        {/* Suspense catches lazy-loaded pages and shows a skeleton loader while they load */}
        <Suspense
          fallback={
            // This skeleton UI shows up while the actual page is being fetched/loaded
            <Container className="py-8">
              <div className="flex flex-col gap-4">
                {/* Short skeleton mimics a page title or heading placeholder */}
                <Skeleton className="w-48 h-8" />
                {/* Tall skeleton mimics a main content block like a product grid or form */}
                <Skeleton className="w-full h-64" />
              </div>
            </Container>
          }
        >
          {/* Outlet renders the actual child route component here — e.g. Home, ProductPage, etc. */}
          <Outlet />
        </Suspense>
      </main>

      {/* Footer is shown on all pages EXCEPT checkout */}
      {/* On checkout we keep the layout clean and distraction-free */}
      {!isCheckoutRoute && <Footer />}
    </div>
  );
};

// Export so React Router can use this as the layout wrapper in route config
export default CustomerLayout;
