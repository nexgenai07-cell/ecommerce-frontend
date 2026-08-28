// Sits above the page content, to the right of AdminSidebar, on every
// admin page except AdminLogin. Provides:
// 1. A way to open/collapse the sidebar (mobile hamburger only)
// 2. Admin profile menu with a working logout (shared with AdminSidebar
//    via useAdminLogout)
// NOTE: the notification bell (API 71 / API 73) and all of its logic
// have been fully removed from this file per request — this header no
// longer fetches, displays, or marks notifications as read in any way.

import {
  AiOutlineMenu, // Hamburger / sidebar-toggle icon — used only on mobile now
  AiOutlineLogout, // Logout icon, shown inside the profile dropdown
  AiOutlineMail, // Small mail icon shown next to the admin's email in the dropdown header
} from "react-icons/ai";
// react-icons/ai — same icon family already used throughout AdminSidebar,
// kept consistent here so the sidebar and header don't look like they
// came from two different icon sets

import cn from "../../utils/cn";
import useAuth from "../../hooks/useAuth";
import useUI from "../../hooks/useUI";
import useAdminLogout from "../../hooks/useAdminLogout";
import Popover from "../ui/Popover";
import Avatar from "../ui/Avatar";
import ConfirmModal from "../ui/ConfirmModal"; // Reusable "Are you sure?" confirmation dialog, shown before logout actually runs
import Badge from "../ui/Badge";
// Spinner, showError, extractListData, formatDate, QUERY_KEYS, and the
// notifications API functions are NOT imported anymore — they were only
// ever used by the notification bell that has now been removed

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
          RIGHT SIDE — profile menu only (notification bell removed)
          ============================================ */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* ---------- ADMIN PROFILE MENU ---------- */}
          <Popover
            align="right"
            // Extra classes below OVERRIDE Popover's own default panel
            // styling (cn() uses twMerge internally, so the last
            // conflicting class always wins) — this is what makes the
            // dropdown look like a distinct, on-brand card instead of
            // Popover's plain default shell.
            panelClassName="w-62 rounded-2xl border-0 shadow-2xl ring-1 ring-black/5 p-0"
            trigger={
              // No chevron icon next to the avatar — the avatar itself
              // is the only trigger for the dropdown.
              <button
                className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-secondary transition-colors"
                aria-label="Admin menu"
              >
                <Avatar
                  src={user?.avatar}
                  name={user?.name}
                  size="sm"
                  className="ring-2 ring-primary-100" // faint emerald ring around the avatar so it visually reads as "clickable / branded"
                />
              </button>
            }
          >
            {({ close }) => (
              <>
                {/* Gradient profile header — uses the project's own
                  primary / primary-dark tokens (Tailwind v4 linear
                  gradient syntax) so the dropdown opens with an
                  attractive, on-brand banner instead of a plain white box */}
                <div className="px-4 py-5 bg-linear-to-br from-primary to-primary-dark flex items-center gap-3">
                  <Avatar
                    src={user?.avatar}
                    name={user?.name}
                    size="lg"
                    className="ring-4 ring-white/30" // soft white ring gives the avatar a "floating card" look against the emerald gradient
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.name || "Admin"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-primary-50/90 truncate mt-0.5">
                      <AiOutlineMail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{user?.email}</span>
                    </p>
                  </div>
                </div>

                {/* Role row — sits directly under the gradient header on
                  a plain surface background, so the emerald banner
                  above stays the clear visual focal point */}
                <div className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Role
                  </span>
                  <Badge
                    label={user?.role === "admin" ? "Super Admin" : user?.role}
                    variant="success"
                    size="sm"
                    rounded
                  />
                </div>

                {/* Logout — closes the popover, then runs the shared
                  logout handler (API call + Redux clear + toast + redirect) */}
                <button
                  onClick={() => {
                    close();
                    requestLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-danger hover:bg-danger-light transition-colors"
                >
                  <AiOutlineLogout className="w-4 h-4" />
                  Logout
                </button>
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
