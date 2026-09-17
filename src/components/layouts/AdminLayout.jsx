// ============================================================
// AdminLayout — SHELL FOR EVERY ADMIN PAGE
// ============================================================
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useDispatch } from "react-redux";
import { setSidebarOpen } from "../../store/slices/uiSlice";

import useUI from "../../hooks/useUI";
import cn from "../../utils/cn";
import AdminSidebar from "./AdminSidebar";
import TopHeader from "./TopHeader";
import Breadcrumbs from "../shared/Breadcrumbs";
// Breadcrumbs — the single shared, route-driven breadcrumb trail
// component (same one mounted on the customer side inside
// CustomerLayout.jsx). Mounted ONCE here, directly inside <main>, so
// it automatically appears above every /admin/* page's own content.
// It hides itself automatically — with zero leftover spacing — on the
// admin dashboard root and on any route outside its config, so it
// never needs to be added to individual admin pages.
import ChatWidget from "../chat-assistant/ChatWidget";
// The store-ops AI assistant floating widget — mounted here (as a
// sibling of <Outlet />) so it's present on every admin page.
// UPDATED: no longer takes a "role" prop — see CustomerLayout.jsx's
// comment above for why (role is now auto-detected in ChatProvider).
import ScrollToTopButton from "../shared/ScrollToTopButton";
// Floating "back to top" button — mounted here so it's present on
// every admin page too. Stacks directly above the ChatWidget icon
// and only becomes visible once the admin has scrolled down the page.

const AdminLayout = () => {
  const dispatch = useDispatch();
  const { sidebarOpen } = useUI();

  useEffect(() => {
    const isMobileViewport = window.innerWidth < 768;

    if (isMobileViewport) {
      dispatch(setSidebarOpen(false));
    }
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-surface-secondary">
      <AdminSidebar />

      <div
        className={cn(
          "flex flex-col min-h-screen",
          // flex flex-col min-h-screen: this column (TopHeader + main) now
          // stretches to at least the full viewport height, so "main" below
          // has real extra room to hand down to "flex-1" page content
          // instead of just shrink-wrapping to whatever the page needs.
          "transition-all duration-300 ease-in-out",
          "ml-0",
          sidebarOpen ? "md:ml-60" : "md:ml-16",
        )}
      >
        <TopHeader />

        <main className="p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
          {/* flex-1: grows to fill whatever height is left under TopHeader
              (at least down to the bottom of the viewport, more once the
              page's own content is taller than the screen)
              flex flex-col: makes this a flex column so the page rendered
              by <Outlet /> below can itself opt into "flex-1" and stretch
              all the way down — this is what lets a shared table's
              pagination footer sit pinned at the bottom of the screen
              instead of hugging right under the last row when there are
              only one or two rows. */}

          {/* Breadcrumb trail — sits above every admin page's own
              PageHeader/content. Renders nothing on the dashboard root
              or on routes without a breadcrumbs.config.js entry. */}
          <Breadcrumbs />

          <Outlet />
        </main>
      </div>

      {/* Store-ops AI assistant — floating icon on every admin page. */}
      <ChatWidget />

      {/* Floating "back to top" button — appears on scroll, stacks
          directly above the ChatWidget icon. */}
      <ScrollToTopButton />
    </div>
  );
};

export default AdminLayout;
