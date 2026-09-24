import {
  AiOutlineMenu, // Hamburger / sidebar-toggle icon — used only on mobile now
  AiOutlineLogout, // Logout icon, shown inside the profile dropdown
  AiOutlineMail, // Small mail icon shown next to the admin's email in the dropdown header
  AiOutlineUser, // Icon for the new "Profile" link in the dropdown
} from "react-icons/ai";
// react-icons/ai — same icon family already used throughout AdminSidebar,
// kept consistent here so the sidebar and header don't look like they
// came from two different icon sets

import { Link } from "react-router-dom";
// Link — used by the new "Profile" dropdown item to navigate to
// ROUTES.ADMIN_PROFILE without a full page reload

import cn from "../../utils/cn";
import useAuth from "../../hooks/useAuth";
import useUI from "../../hooks/useUI";
import useAdminLogout from "../../hooks/useAdminLogout";
import { ROUTES } from "../../constants/routes";
import Popover from "../ui/Popover";
import Avatar from "../ui/Avatar";
import ConfirmModal from "../ui/ConfirmModal"; // Reusable "Are you sure?" confirmation dialog, shown before logout actually runs
import AdminNotificationBell from "../notifications/AdminNotificationBell";
// AdminNotificationBell — the admin's own notification bell + dropdown,
// reinstated here as a dedicated, self-contained component (real API
// data, unread badge, mark-as-read, mark-all-read, deep links, "View
// all" link to ROUTES.ADMIN_NOTIFICATIONS) rather than the inline bell
// that used to live directly in this file and was removed. Badge is no
// longer used here — the role now renders as a pill inside the
// gradient header itself (same treatment as the customer navbar's
// "Admin"/"Customer" pill), so the separate Badge-based role row is gone.

const TopHeader = () => {
  const { user } = useAuth();
  // Logged-in admin's info (name, email, role, avatar) for the profile menu

  const { sidebarOpen, handleToggleSidebar } = useUI();
  // Same Redux-backed sidebar state AdminSidebar itself uses — clicking
  // this button dispatches the exact same toggleSidebar action, so it
  // stays perfectly in sync with the sidebar's own toggle

  const { requestLogout, confirmModalProps } = useAdminLogout();
  // Shared logout handler — identical behavior to AdminSidebar's logout
  // button, since both now call this same hook instead of duplicating logic

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-sticky", // sticks to the top of the scrollable content column, layered above page content but below dropdowns/drawers/modals (z-sticky = 200, per tokens.css)
          "h-16 bg-surface shadow-2xl border-border", // fixed height bar, white background, thin bottom border — matches CustomerNavbar's surface language
          "flex items-center justify-between", // left group and right group pushed to opposite ends
          "px-4 md:px-6", // tighter padding on mobile, roomier on desktop — fully responsive
        )}
      >
        {/* ============================================
          LEFT SIDE — mobile sidebar toggle only
          ============================================ */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Mobile hamburger — only visible below the md breakpoint,
            since AdminSidebar's own desktop toggle already handles
            collapse/expand on larger screens. This is hidden on
            desktop/laptop screens (md and up). */}
          <button
            onClick={handleToggleSidebar}
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-surface-secondary transition-colors"
            aria-label="Open menu"
          >
            <AiOutlineMenu className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================
          RIGHT SIDE — notification bell + profile menu
          ============================================ */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* ---------- ADMIN NOTIFICATION BELL ---------- */}
          <AdminNotificationBell />

          {/* ---------- ADMIN PROFILE MENU ---------- */}
          <Popover
            align="right"
            // Extra classes below OVERRIDE Popover's own default panel
            // styling (cn() uses twMerge internally, so the last
            // conflicting class always wins) — this is what makes the
            // dropdown look like a distinct, on-brand card instead of
            // Popover's plain default shell. Widened to w-72 (from w-62)
            // to match the customer navbar's dropdown and give the
            // gradient header room to breathe; capped so it never runs
            // off-screen on narrow viewports.
            panelClassName="w-64 max-w-[calc(100vw-2rem)] rounded-xl border-0 shadow-2xl ring-1 ring-black/5 p-0 animate-dropdown-in"
            trigger={
              // No chevron icon next to the avatar — the avatar itself
              // is the only trigger for the dropdown.
              <button
                className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-secondary transition-colors"
                aria-label="Admin menu"
              >
                <Avatar
                  src={user?.profile_picture}
                  name={user?.name}
                  size="sm"
                  className="ring-2 ring-primary" // green ring around the avatar so it visually reads as "clickable / branded"
                />
              </button>
            }
          >
            {({ close }) => (
              <>
                {/* Gradient profile header — compacted: smaller padding,
                  a smaller avatar, and the role pill sits tighter under
                  the name/email instead of floating with a big gap. */}
                <div className="relative px-4 py-3.5 bg-linear-to-br from-primary via-primary to-primary-dark overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />
                  <div className="absolute -right-2 -bottom-8 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />
                  <div className="relative flex items-center gap-2.5">
                    <Avatar
                      src={user?.profile_picture}
                      name={user?.name}
                      size="md"
                      className="ring-2 ring-white/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.name || "Admin"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-primary-50/90 truncate">
                        <AiOutlineMail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{user?.email}</span>
                      </p>
                      <span className="relative inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] font-bold uppercase tracking-wider text-white">
                        {user?.role === "admin" ? "Super Admin" : user?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items — icon-in-a-box treatment matching the
                  customer navbar's account menu, tightened up (smaller
                  icon boxes, less vertical padding per row). */}
                <div className="py-1.5">
                  <Link
                    to={ROUTES.ADMIN_PROFILE}
                    onClick={close}
                    className="flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary transition-colors group"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                      <AiOutlineUser className="w-3.5 h-3.5" />
                    </span>
                    Profile
                  </Link>
                </div>

                {/* Logout — visually separated with a top border and its
                  own icon box, same pattern as the customer dropdown's
                  logout row, tightened to match. */}
                <div className="border-t border-border py-1.5">
                  <button
                    onClick={() => {
                      close();
                      requestLogout();
                    }}
                    className="flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg w-[calc(100%-0.75rem)] text-sm font-medium text-danger hover:bg-danger-light transition-colors group"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-danger-light text-danger group-hover:bg-danger group-hover:text-white transition-colors shrink-0">
                      <AiOutlineLogout className="w-3.5 h-3.5" />
                    </span>
                    Logout
                  </button>
                </div>
              </>
            )}
          </Popover>
        </div>
      </header>
      <ConfirmModal {...confirmModalProps} />
    </>
  );
};

export default TopHeader;
