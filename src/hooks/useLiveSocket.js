// ============================================================
// useLiveSocket
// ============================================================
// Owns the single store-wide WebSocket used for live updates.
//
// Responsibilities:
// - Opens the connection anonymously (public events only) or with the
//   current access token (public events + the user's own events).
// - Sends a keep-alive "ping" on a regular interval so proxies do not close
//   the idle connection, and ignores the plain-text "pong" reply.
// - Reconnects with exponential backoff after any network drop.
// - Reports an authentication failure (close code 4401) to the caller
//   instead of retrying with the same rejected token.
// - Reconnects automatically whenever the `token` argument changes
//   (login, logout, token refresh).
// - Tells the caller when the connection was re-established after a gap,
//   because events that happened while disconnected are never replayed.
//
// The hook is intentionally UI-agnostic: it only delivers parsed events
// through callbacks. What to do with each event lives in the event
// processor (utils/liveEvents.js) and the provider component.

import { useEffect, useRef } from "react";

// Path of the live updates endpoint on the backend host.
const LIVE_SOCKET_PATH = "/ws/live/";

// Idle proxies close silent WebSocket connections, so a ping is sent at
// this interval to keep the connection alive.
const PING_INTERVAL_MS = 25000;

// A connection that stays open for this long without being closed by the
// server is considered authenticated and healthy.
const STABLE_CONNECTION_MS = 5000;

// Exponential backoff window for reconnect attempts after a network drop.
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

// Close code the server uses when a token was sent but is invalid or expired.
const AUTH_FAILURE_CLOSE_CODE = 4401;

// Builds the ws:// or wss:// URL from the REST base URL so the socket always
// targets the same host and protocol security level as the API.
const buildLiveSocketUrl = (accessToken) => {
  const restBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const socketBaseUrl = restBaseUrl.replace(/^http/, "ws");
  const url = `${socketBaseUrl}${LIVE_SOCKET_PATH}`;

  return accessToken ? `${url}?token=${encodeURIComponent(accessToken)}` : url;
};

// The API client refreshes the access token in localStorage without touching
// the Redux store, so the stored value is the freshest one available when a
// (re)connection is made. The Redux token is only used as a fallback.
const resolveAccessToken = (storeToken) => {
  if (!storeToken) return null;

  try {
    return localStorage.getItem("token") || storeToken;
  } catch {
    return storeToken;
  }
};

/**
 * @param {object}   options
 * @param {?string}  options.token          Access token, or null for an anonymous connection.
 * @param {function} options.onEvent        Called with each parsed { event, data } message.
 * @param {function} options.onAuthExpired  Called when the server rejects the token (close code 4401).
 * @param {function} options.onReconnect    Called after the connection is re-established following a gap.
 * @param {function} options.onStable       Called once a connection has stayed open long enough to be trusted.
 */
const useLiveSocket = ({
  token,
  onEvent,
  onAuthExpired,
  onReconnect,
  onStable,
}) => {
  // Always call the latest callbacks without tearing the socket down when
  // the caller passes new function instances on re-render.
  const handlersRef = useRef({});

  // Set when the previous connection ended because of an authentication
  // failure, so the next successful connection refetches missed data.
  const refetchOnNextOpenRef = useRef(false);

  useEffect(() => {
    handlersRef.current = { onEvent, onAuthExpired, onReconnect, onStable };
  });

  useEffect(() => {
    let socket = null;
    let pingTimer = null;
    let stableTimer = null;
    let retryTimer = null;
    let retryCount = 0;
    let hasOpenedBefore = false;
    let isStopped = false;
    let isAwaitingAuthRecovery = false;

    const clearConnectionTimers = () => {
      clearInterval(pingTimer);
      clearTimeout(stableTimer);
      pingTimer = null;
      stableTimer = null;
    };

    function scheduleReconnect() {
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** retryCount,
        MAX_RECONNECT_DELAY_MS,
      );
      retryCount += 1;
      retryTimer = setTimeout(connect, delay);
    }

    function connect() {
      retryTimer = null;
      if (isStopped) return;

      let nextSocket;
      try {
        nextSocket = new WebSocket(
          buildLiveSocketUrl(resolveAccessToken(token)),
        );
      } catch (error) {
        console.error("Unable to open the live updates connection.", error);
        scheduleReconnect();
        return;
      }
      socket = nextSocket;

      nextSocket.onopen = () => {
        if (isStopped || socket !== nextSocket) return;

        clearConnectionTimers();

        pingTimer = setInterval(() => {
          if (nextSocket.readyState === WebSocket.OPEN) {
            nextSocket.send("ping");
          }
        }, PING_INTERVAL_MS);

        stableTimer = setTimeout(() => {
          handlersRef.current.onStable?.();
        }, STABLE_CONNECTION_MS);

        retryCount = 0;

        if (hasOpenedBefore || refetchOnNextOpenRef.current) {
          refetchOnNextOpenRef.current = false;
          handlersRef.current.onReconnect?.();
        }
        hasOpenedBefore = true;
      };

      nextSocket.onmessage = (messageEvent) => {
        if (typeof messageEvent.data !== "string") return;

        // The keep-alive reply is plain text and must not reach JSON.parse.
        if (messageEvent.data === "pong") return;

        try {
          const message = JSON.parse(messageEvent.data);
          if (message && typeof message.event === "string") {
            handlersRef.current.onEvent?.(message);
          }
        } catch (error) {
          console.error("Failed to process a live update message.", error);
        }
      };

      nextSocket.onclose = (closeEvent) => {
        if (socket !== nextSocket) return;

        clearConnectionTimers();
        if (isStopped) return;

        // A rejected token must never be retried in a loop. The caller
        // obtains a new token (or signs the user out), which changes the
        // `token` argument and starts a fresh connection.
        if (closeEvent.code === AUTH_FAILURE_CLOSE_CODE) {
          isAwaitingAuthRecovery = true;
          refetchOnNextOpenRef.current = true;
          handlersRef.current.onAuthExpired?.();
          return;
        }

        scheduleReconnect();
      };

      // Errors are always followed by a close event, which drives the retry.
      nextSocket.onerror = () => {};
    }

    // When the browser regains connectivity, skip the remaining backoff
    // delay and reconnect immediately.
    const handleOnline = () => {
      if (isStopped || isAwaitingAuthRecovery) return;

      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      clearTimeout(retryTimer);
      retryCount = 0;
      connect();
    };

    window.addEventListener("online", handleOnline);
    connect();

    return () => {
      isStopped = true;
      clearTimeout(retryTimer);
      clearConnectionTimers();
      window.removeEventListener("online", handleOnline);

      if (socket) {
        const closingSocket = socket;
        socket = null;

        closingSocket.onmessage = null;
        closingSocket.onclose = null;
        closingSocket.onerror = null;

        // Closing a socket that is still connecting raises a browser
        // warning, so the close is deferred until the handshake completes.
        if (closingSocket.readyState === WebSocket.CONNECTING) {
          closingSocket.onopen = () => closingSocket.close();
        } else {
          closingSocket.onopen = null;
          closingSocket.close();
        }
      }
    };
  }, [token]);
};

export default useLiveSocket;
