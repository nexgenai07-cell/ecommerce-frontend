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
          "transition-all duration-300 ease-in-out",
          "ml-0",
          sidebarOpen ? "md:ml-60" : "md:ml-16",
        )}
      >
        <TopHeader />

        <main className="p-4 md:p-6 lg:p-8">
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
