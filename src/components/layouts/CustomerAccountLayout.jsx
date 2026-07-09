import { Outlet } from "react-router-dom"; // Outlet renders the matched child route component inside this layout
import { Suspense } from "react"; // Suspense lets us show a fallback UI while the child route is loading
import CustomerAccountSidebar from "./CustomerAccountSidebar"; // Left sidebar on desktop, bottom tab bar on mobile
import Container from "./Container"; // Reusable wrapper that applies consistent horizontal padding and max-width
import { Skeleton } from "../ui/Skeleton"; // Animated placeholder shown while the page content is loading

const CustomerAccountLayout = () => {
  return (
    // Root wrapper: light gray background for the account section
    // flex-1 so it stretches to fill the space CustomerLayout gives it
    // between the (parent) navbar and footer
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* ── Middle section ─────────────────────────────────────────────────────
          flex-1 makes this area grow and fill available space
          flex-row puts sidebar and main content side by side                  */}
      <div className="flex-1 flex">
        {/* ── Sidebar ──────────────────────────────────────────────────────────
            Visible as a left-side panel on desktop (md and above)
            On mobile it collapses and renders as a fixed bottom tab bar
            Controlled entirely inside CustomerAccountSidebar itself           */}
        <CustomerAccountSidebar />

        {/* ── Page content area ────────────────────────────────────────────────
            flex-1 lets it take up all remaining horizontal space beside the sidebar
            min-w-0 prevents flex children from overflowing their container
            pb-20 adds bottom padding on mobile so content isn't hidden behind
            the bottom tab bar; md:pb-0 removes that padding on desktop        */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {/* Suspense boundary: while the lazy-loaded child route chunk is being
              fetched, the fallback skeleton is shown instead of a blank screen */}
          <Suspense
            fallback={
              // Container keeps the skeleton aligned with the rest of the page layout
              <Container className="py-8">
                {/* Vertical stack of skeleton placeholders mimicking a page title + content block */}
                <div className="flex flex-col gap-4">
                  {/* Skeleton for the page heading — narrow and short like an h1 */}
                  <Skeleton className="w-48 h-8" />

                  {/* Skeleton for the main content card or table area */}
                  <Skeleton className="w-full h-64" />
                </div>
              </Container>
            }
          >
            {/* Outlet renders whichever child route is currently active,
                e.g. /account/orders, /account/profile, /account/settings    */}
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default CustomerAccountLayout; // Export so React Router can use this as a layout route element
