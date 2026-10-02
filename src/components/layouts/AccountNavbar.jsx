import {
  AiOutlineArrowLeft,
  AiOutlineLogout,
  AiOutlineMail,
  AiOutlineShopping,
  AiOutlineUser,
} from "react-icons/ai";
// react-icons/ai — same icon family used throughout CustomerAccountSidebar
// and the admin panel's TopHeader, kept consistent here

import { Link } from "react-router-dom";

import cn from "../../utils/cn";
import useAuth from "../../hooks/useAuth";
import useCustomerLogout from "../../hooks/useCustomerLogout";
import { ROUTES } from "../../constants/routes";
import Popover from "../ui/Popover";
import Avatar from "../ui/Avatar";
import ConfirmModal from "../ui/ConfirmModal"; // Reusable "Are you sure?" confirmation dialog, shown before logout actually runs
import CustomerNotificationBell from "../notifications/CustomerNotificationBell";
// CustomerNotificationBell — the customer's own notification bell +
// dropdown (real API data, unread badge, mark-as-read, mark-all-read,
// deep links, "View all" link to ROUTES.ACCOUNT_NOTIFICATIONS), built
// as a self-contained component the same way the admin panel's
// AdminNotificationBell already is.

// Menu items shown inside the avatar dropdown — same three destinations
// the public site navbar's own account dropdown already links to, so a
// customer sees the exact same options whichever navbar they're on.
const ACCOUNT_MENU_ITEMS = [
  {
    icon: AiOutlineUser,
    label: "My Profile",
    to: ROUTES.ACCOUNT_DASHBOARD,
  },
  {
    icon: AiOutlineShopping,
    label: "My Orders",
    to: ROUTES.ACCOUNT_ORDERS,
  },
];

const AccountNavbar = () => {
  const { user } = useAuth();
  // Logged-in customer's info (name, email, avatar) for the profile menu

  const { requestLogout, confirmModalProps } = useCustomerLogout();
  // Shared logout handler — identical behavior to every other logout
  // trigger in the app, since they all now call this same hook instead
  // of duplicating the sequence.

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-sticky", // sticks to the top of the scroll container, layered above page content but below dropdowns/drawers/modals
          "h-14 bg-surface shadow-2xl border-border", // fixed height bar, white background — matches the admin TopHeader's surface language exactly
          "flex items-center justify-between", // "Back to Home" button on the left, bell and avatar on the right
          "px-4 md:px-6", // tighter padding on mobile, roomier on desktop — fully responsive
        )}
      >
        {/* ============================================
          LEFT SIDE — "Back to Home" button. Gray pill with a
          react-icons arrow; on small screens only the icon shows
          (aria-label keeps it accessible), from sm up the text
          label appears next to it.
          ============================================ */}
        <Link
          to={ROUTES.HOME}
          aria-label="Back to Home"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 hover:text-gray-800 transition-colors shrink-0"
        >
          <AiOutlineArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Back to Home</span>
        </Link>

        {/* ============================================
          RIGHT SIDE — notification bell + profile menu
          ============================================ */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* ---------- NOTIFICATION BELL ---------- */}
          <CustomerNotificationBell />

          {/* ---------- PROFILE MENU ---------- */}
          <Popover
            align="right"
            // Extra classes below OVERRIDE Popover's own default panel
            // styling (cn() uses twMerge internally, so the last
            // conflicting class always wins) — this is what makes the
            // dropdown look like a distinct, on-brand card instead of
            // Popover's plain default shell, matching the admin
            // TopHeader's profile dropdown exactly.
            panelClassName="w-64 max-w-[calc(100vw-2rem)] rounded-xl border-0 shadow-2xl ring-1 ring-black/5 p-0 animate-dropdown-in"
            trigger={
              // No chevron icon next to the avatar — the avatar itself
              // is the only trigger for the dropdown.
              <button
                className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-secondary transition-colors"
                aria-label="Account menu"
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
                {/* Gradient profile header — same compact treatment as
                    the admin TopHeader's dropdown, with a "Customer"
                    role pill instead of an admin role. */}
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
                        {user?.name || "Account"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-primary-50/90 truncate">
                        <AiOutlineMail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{user?.email}</span>
                      </p>
                      <span className="relative inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] font-bold uppercase tracking-wider text-white">
                        Customer
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items — icon-in-a-box treatment matching the
                    admin TopHeader's dropdown. */}
                <div className="py-1.5">
                  {ACCOUNT_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={close}
                      className="flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary transition-colors group"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                        <item.icon className="w-3.5 h-3.5" />
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>

                {/* Logout — visually separated with a top border and its
                    own icon box, same pattern as the admin dropdown's
                    logout row. */}
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

export default AccountNavbar;
