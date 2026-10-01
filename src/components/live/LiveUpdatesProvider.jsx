// ============================================================
// LiveUpdatesProvider
// ============================================================
// Mounted once at the root of the application (inside the Redux, TanStack
// Query and Router providers). It owns the single store-wide WebSocket and
// forwards every pushed event to the event processor, which keeps the query
// cache in sync so screens refresh without a page reload.
//
// What it handles:
// - One connection per browser tab, shared by every page.
// - Anonymous visitors receive public events (products, categories); signed
//   in users additionally receive their own events, and admins receive the
//   events of the stores they administer.
// - The connection is re-established automatically on login, logout and
//   token refresh, because the access token drives the hook.
// - When the server rejects an expired token the session is renewed with the
//   refresh token. If renewal fails the user is signed out and the socket
//   falls back to an anonymous connection.
// - New notifications, and new order / return / complaint alerts for
//   admins, are shown as clickable toasts.
//
// The provider renders no markup of its own; it only wraps its children.

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

import useAuth from "../../hooks/useAuth";
import useLiveSocket from "../../hooks/useLiveSocket";
import { createLiveEventProcessor } from "../../utils/liveEvents";
import resolveNotificationLink from "../../utils/resolveNotificationLink";
import resolveAdminNotificationLink from "../../utils/resolveAdminNotificationLink";
import { ROUTES } from "../../constants/routes";
import LiveToast from "./LiveToast";

// How long a live toast stays on screen.
const LIVE_TOAST_DURATION_MS = 6000;

// Consecutive authentication failures tolerated before the user is signed
// out. The counter resets as soon as a connection stays open.
const MAX_CONSECUTIVE_AUTH_FAILURES = 2;

// Builds the toast content for a new order, return request or complaint
// received by an admin's store.
const buildAdminAlert = (kind, data) => {
  switch (kind) {
    case "order":
      return {
        id: `live-alert-order-${data.order_number || data.id}`,
        title: "New order received",
        message: data.order_number
          ? `Order ${data.order_number} has just been placed.`
          : "A new order has just been placed.",
        link: data.order_number
          ? ROUTES.ADMIN_ORDER_DETAIL.replace(":id", data.order_number)
          : ROUTES.ADMIN_ORDERS,
      };

    case "return":
      return {
        id: `live-alert-return-${data.id}`,
        title: "New return request",
        message: data.order_number
          ? `A customer requested a return for order ${data.order_number}.`
          : "A customer requested a return.",
        link: ROUTES.ADMIN_RETURNS,
      };

    case "complaint":
      return {
        id: `live-alert-complaint-${data.id}`,
        title: "New complaint",
        message: `Complaint #${data.id} has just been opened.`,
        link: ROUTES.ADMIN_COMPLAINTS,
      };

    default:
      return null;
  }
};

// Shows a toast that opens the given page when it is clicked. When no link is
// available the toast is informational only.
const showLiveToast = ({ id, title, message, link, onNavigate }) => {
  toast.custom(
    (toastInstance) => (
      <LiveToast
        toastInstance={toastInstance}
        title={title}
        message={message}
        onClick={
          link
            ? () => {
                toast.dismiss(toastInstance.id);
                onNavigate(link);
              }
            : undefined
        }
        onDismiss={() => toast.dismiss(toastInstance.id)}
      />
    ),
    { id, duration: LIVE_TOAST_DURATION_MS },
  );
};

const LiveUpdatesProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { token, role, updateToken, logoutUser } = useAuth();

  // Latest values needed inside long-lived callbacks (event handlers and the
  // socket hook) without re-creating the event processor on every render.
  const latestRef = useRef({});

  useEffect(() => {
    latestRef.current = { role, navigate, token, updateToken, logoutUser };
  });

  const authFailureCountRef = useRef(0);
  const isRecoveringAuthRef = useRef(false);

  // The event processor lives in a ref and is created inside an effect, so
  // nothing that reads the latest values runs during render.
  const processorRef = useRef(null);

  useEffect(() => {
    const processor = createLiveEventProcessor({
      queryClient,

      onNotification: (notification) => {
        const { role: currentRole, navigate: goTo } = latestRef.current;

        const link =
          currentRole === "admin"
            ? resolveAdminNotificationLink(notification)
            : resolveNotificationLink(notification);

        showLiveToast({
          id: `live-notification-${notification.id}`,
          title: notification.title || "New notification",
          message: notification.message,
          link,
          onNavigate: goTo,
        });
      },

      onAdminAlert: (kind, data) => {
        const { role: currentRole, navigate: goTo } = latestRef.current;
        if (currentRole !== "admin") return;

        const alert = buildAdminAlert(kind, data);
        if (alert) showLiveToast({ ...alert, onNavigate: goTo });
      },
    });

    processorRef.current = processor;

    return () => {
      processor.dispose();
      processorRef.current = null;
    };
  }, [queryClient]);

  // Renews the session after the server rejected the access token. A new
  // token in the store restarts the socket automatically; if the session
  // cannot be renewed the user is signed out, which restarts the socket as
  // an anonymous connection.
  const recoverFromAuthFailure = async () => {
    if (isRecoveringAuthRef.current) return;
    isRecoveringAuthRef.current = true;

    const {
      token: storeToken,
      updateToken: saveToken,
      logoutUser: signOut,
    } = latestRef.current;

    try {
      authFailureCountRef.current += 1;

      const refreshToken = localStorage.getItem("refreshToken");

      if (
        authFailureCountRef.current > MAX_CONSECUTIVE_AUTH_FAILURES ||
        !refreshToken
      ) {
        signOut();
        return;
      }

      const restBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(
        /\/+$/,
        "",
      );

      // The raw axios client is used on purpose: the shared client would
      // route a failure through its own redirect logic.
      const response = await axios.post(
        `${restBaseUrl}/api/v1/auth/token/refresh/`,
        { refresh: refreshToken },
      );

      const newAccessToken = response?.data?.access;
      const storedToken = localStorage.getItem("token");

      // A missing token, or the very token that was just rejected, cannot
      // recover the session and would only cause a reconnect loop.
      if (
        !newAccessToken ||
        newAccessToken === storeToken ||
        newAccessToken === storedToken
      ) {
        signOut();
        return;
      }

      saveToken(newAccessToken);
    } catch {
      signOut();
    } finally {
      isRecoveringAuthRef.current = false;
    }
  };

  useLiveSocket({
    token: token || null,
    onEvent: (message) => processorRef.current?.handleEvent(message),
    onAuthExpired: recoverFromAuthFailure,
    onReconnect: () => processorRef.current?.refetchActiveQueries(),
    onStable: () => {
      authFailureCountRef.current = 0;
    },
  });

  return children;
};

export default LiveUpdatesProvider;
