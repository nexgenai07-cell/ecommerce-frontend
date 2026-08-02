import { useRef, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
// useDispatch -> lets us dispatch actions to the Redux store directly
// from inside WebSocket event handlers.

import { createChatWebSocket, createAdminChatWebSocket } from "../api/chat.api";
// The two functions that actually open a native browser WebSocket,
// one for the customer assistant and one for the admin assistant.

import {
  addMessage,
  startStreamingMessage,
  appendStreamChunk,
  finalizeStreamingMessage,
  setTyping,
  setConnectionStatus,
  setInitialSuggestions,
  incrementUnread,
} from "../store/slices/chatSlice";

import { showWarning, showError } from "../components/ui/Toast";
// Reusing the project's existing toast helpers instead of calling
// react-hot-toast directly, so styling stays consistent everywhere.

// ----------------------------
// RECONNECT TUNING CONSTANTS
// ----------------------------
// After a drop, the hook retries with exponential backoff: 1s, 2s,
// 4s, 8s, 16s (capped), giving up after MAX_RECONNECT_ATTEMPTS so a
// permanently-dead backend doesn't retry forever in the background.
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 16000;
// How long a connection has to stay open before we trust it enough to
// reset the backoff counter back to 0. Prevents a rapid open->close->
// open->close loop (backend crashing right after accept) from looking
// like a "clean connect" every single time.
const STABLE_CONNECTION_MS = 3000;

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
// Parameters:
// - sessionKey: the active conversation's session_key (hook does
//   nothing until this is a real value — you can't open a socket
//   before a session exists).
// - role: "customer" | "admin" — decides which WebSocket route/helper
//   function to use.
// - isOpen: whether the chat widget is currently visible on screen —
//   used only to decide whether an incoming AI message should bump
//   the unread badge (messages arriving while the widget is open
//   don't need an unread indicator, since the user is already looking
//   at them).
const useChatSocket = (sessionKey, role, isOpen) => {
  const dispatch = useDispatch();

  // Holds the live WebSocket instance across re-renders, without
  // triggering a re-render itself when it changes (a plain variable
  // would be recreated/lost on every render; useRef persists).
  const socketRef = useRef(null);

  // Tracks how many reconnect attempts have been made since the last
  // successful connection, used to calculate the next backoff delay
  // and to know when to stop retrying.
  const reconnectAttemptsRef = useRef(0);

  // Holds the setTimeout id for a pending reconnect attempt, so it
  // can be cancelled if the component unmounts or the session changes
  // before the timer fires.
  const reconnectTimerRef = useRef(null);

  // Holds the setTimeout id for the "this connection has proven itself
  // stable" check. We do NOT reset reconnectAttemptsRef the instant the
  // socket opens — if the backend is crashing right after accepting the
  // connection (e.g. an unhandled exception in the consumer, closing
  // with code 1011), the socket can open and close within milliseconds,
  // over and over. Resetting the counter on every open would mean the
  // 5-attempt limit is never reached and the widget reconnects forever
  // at the 1s base delay. Instead we only reset the counter once the
  // connection has stayed open for STABLE_CONNECTION_MS without closing.
  const stableConnectionTimerRef = useRef(null);

  // Tracks the temporary client-side id of the AI message currently
  // being streamed in (via "message_chunk" events), so subsequent
  // chunks are appended onto the correct message instead of starting
  // a new one each time.
  const streamingMessageIdRef = useRef(null);

  // Set to true only when the component intentionally closes the
  // socket (e.g. switching sessions, unmounting) — prevents the
  // onclose handler from treating a deliberate close as a dropped
  // connection and trying to reconnect it.
  const intentionalCloseRef = useRef(false);

  // Mirrors the latest "isOpen" value into a ref, so the onmessage
  // closure (created once when the socket opens) can always read the
  // CURRENT open/closed state instead of a stale value captured at
  // connection time.
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // --------------------------------------------------
  // FUNCTION: connect
  // --------------------------------------------------
  // Opens a brand new WebSocket connection for the current
  // sessionKey/role, and wires up every event handler it needs.
  // Wrapped in useCallback so the SAME function reference can be
  // reused by both the initial connection effect and the reconnect
  // timer below, without redefining it on every render.
  const connect = useCallback(() => {
    if (!sessionKey) return; // nothing to connect to yet

    intentionalCloseRef.current = false; // this is a real, wanted connection attempt
    dispatch(
      setConnectionStatus(
        reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting",
      ),
    );

    // Pick the correct WebSocket helper based on which assistant this is.
    const socket =
      role === "admin"
        ? createAdminChatWebSocket(sessionKey)
        : createChatWebSocket(sessionKey);

    socketRef.current = socket;

    // --------------------------------------------------
    // EVENT: onopen — connection successfully established
    // --------------------------------------------------
    socket.onopen = () => {
      dispatch(setConnectionStatus("connected"));

      // Don't trust this connection yet — only reset the backoff
      // counter after it has survived STABLE_CONNECTION_MS without
      // closing again. This is what actually fixes the infinite
      // reconnect loop: if the backend keeps closing the socket right
      // after accepting it (code 1011 server error), the counter now
      // keeps climbing through the backoff delays and eventually stops
      // at MAX_RECONNECT_ATTEMPTS, instead of resetting to 0 on every
      // brief open and retrying every 1s forever.
      if (stableConnectionTimerRef.current) {
        clearTimeout(stableConnectionTimerRef.current);
      }
      stableConnectionTimerRef.current = setTimeout(() => {
        reconnectAttemptsRef.current = 0;
      }, STABLE_CONNECTION_MS);
    };

    // --------------------------------------------------
    // EVENT: onmessage — every incoming event from the backend
    // arrives here, distinguished by its "type" field.
    // --------------------------------------------------
    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Malformed JSON from the server — nothing sensible to do
        // with it, so it's safely ignored rather than crashing the UI.
        return;
      }

      switch (data.type) {
        // ---- Sent once, immediately after the socket opens ----
        case "connected": {
          // The backend's context-aware initial quick-suggestion chips
          // (e.g. "Track order #1234") arrive here.
          dispatch(setInitialSuggestions(data.suggestions || []));
          break;
        }

        // ---- AI typing indicator on/off ----
        case "typing": {
          dispatch(setTyping(Boolean(data.status)));
          break;
        }

        // ---- A complete, non-streamed AI (or system) message ----
        case "message": {
          dispatch(setTyping(false));
          dispatch(
            addMessage({
              id: data.id ?? crypto.randomUUID(),
              // Falls back to a client-generated id only if the
              // backend didn't include one — real ids are needed for
              // the feedback (thumbs up/down) endpoint to work.
              sender: data.sender,
              text: data.message,
              metadata: data.metadata ?? null,
              suggestions: data.suggestions ?? [],
              proactive: Boolean(data.proactive),
              isStreaming: false,
              feedback: null,
              createdAt: new Date().toISOString(),
            }),
          );

          // Only count this as "unread" if the AI sent it (not an
          // echo of the user's own message) and the widget is
          // currently minimized/closed.
          if (data.sender === "ai" && !isOpenRef.current) {
            dispatch(incrementUnread());
          }
          break;
        }

        // ---- One piece of a streamed AI reply ----
        case "message_chunk": {
          dispatch(setTyping(false));
          // Start a new streaming message the moment the FIRST chunk
          // for this reply arrives.
          if (!streamingMessageIdRef.current) {
            const newId = crypto.randomUUID();
            streamingMessageIdRef.current = newId;
            dispatch(startStreamingMessage({ id: newId }));
          }

          // Append this chunk's text onto the in-progress message.
          dispatch(
            appendStreamChunk({
              id: streamingMessageIdRef.current,
              chunk: data.chunk ?? "",
            }),
          );

          // The final chunk carries the metadata/suggestions that
          // only ever arrive once the full reply is complete.
          if (data.done) {
            dispatch(
              finalizeStreamingMessage({
                id: streamingMessageIdRef.current,
                metadata: data.metadata ?? null,
                suggestions: data.suggestions ?? [],
              }),
            );

            if (!isOpenRef.current) {
              dispatch(incrementUnread());
            }

            // Clear the ref so the NEXT AI reply starts a fresh
            // streaming message instead of appending onto this one.
            streamingMessageIdRef.current = null;
          }
          break;
        }

        // ---- Something went wrong with the last message sent ----
        case "error": {
          dispatch(setTyping(false));
          if (data.code === "RATE_LIMITED") {
            // Matches the backend's server-side rate limiting spec —
            // the connection stays open, only this one message was
            // rejected, so just warn the user and let them retry.
            showWarning(
              data.message || "Too many messages — please wait a moment.",
            );
          } else {
            showError(
              data.message || "Something went wrong. Please try again.",
            );
          }
          break;
        }

        default:
          // Unknown event type — ignored safely rather than crashing,
          // so a future backend addition doesn't break the whole widget.
          break;
      }
    };

    // --------------------------------------------------
    // EVENT: onclose — connection ended, for any reason
    // --------------------------------------------------
    socket.onclose = (event) => {
      // This connection is gone, so its "has it stayed open long
      // enough to be trusted" timer is no longer relevant — cancel it
      // so a late-firing timer can't zero out the backoff counter for
      // a connection that already died.
      if (stableConnectionTimerRef.current) {
        clearTimeout(stableConnectionTimerRef.current);
        stableConnectionTimerRef.current = null;
      }

      // TEMPORARY DEBUG LOG — remove once the root cause is confirmed.
      // Open the browser Console tab and watch this print when the
      // chatbot disconnects — the "code" value tells us EXACTLY why
      // the server/proxy closed the connection (e.g. 1000 = normal,
      // 1006 = abnormal/dropped without a proper close frame,
      // 1011 = server error, 4401/4403/4404 = already-handled below).
      console.log(
        "[ChatSocket] WebSocket closed — code:",
        event.code,
        "reason:",
        event.reason || "(no reason given)",
        "wasClean:",
        event.wasClean,
      );

      // If this component deliberately closed the socket (e.g.
      // switching sessions), there's nothing more to do — no
      // reconnect should be attempted.
      if (intentionalCloseRef.current) {
        return;
      }

      // Close code 4401 — the backend's exact signal that the user's
      // login session/token expired mid-conversation (per the backend
      // spec). Distinct from 4403 below so the UI can show the right
      // message ("please log in again" vs "access denied").
      if (event.code === 4401) {
        dispatch(setConnectionStatus("expired"));
        showError("Your session has expired. Please log in again.");
        return; // do not attempt to reconnect — a new login is required first
      }

      // Close code 4403 — a non-admin tried to use the admin socket.
      if (event.code === 4403) {
        dispatch(setConnectionStatus("unauthorized"));
        showError("You don't have permission to use this assistant.");
        return; // reconnecting would fail identically every time
      }

      // Close code 4404 — the session was soft-deleted or never existed.
      if (event.code === 4404) {
        dispatch(setConnectionStatus("disconnected"));
        showError("This conversation is no longer available.");
        return;
      }

      // Any other close reason (network blip, server restart, proxy
      // recycling the connection, etc.) is treated as an unexpected
      // drop worth automatically retrying.
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        dispatch(setConnectionStatus("reconnecting"));

        // Exponential backoff: delay doubles each attempt, capped at
        // MAX_RECONNECT_DELAY_MS so retries don't end up minutes apart.
        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptsRef.current,
          MAX_RECONNECT_DELAY_MS,
        );

        reconnectAttemptsRef.current += 1;

        reconnectTimerRef.current = setTimeout(() => {
          connect(); // try again after the calculated delay
        }, delay);
      } else {
        // Exhausted every retry attempt — stop trying automatically
        // and let the UI show a manual "reconnecting failed" state.
        dispatch(setConnectionStatus("disconnected"));
        showError("Unable to reconnect to chat. Please refresh the page.");
      }
    };

    // --------------------------------------------------
    // EVENT: onerror — low-level socket error
    // --------------------------------------------------
    // onclose always fires shortly after onerror for a failed
    // connection, so the actual reconnect logic lives there — this
    // handler only needs to log for debugging purposes.
    socket.onerror = () => {
      // Intentionally quiet in the UI — the onclose handler above is
      // what drives all user-facing reconnect/error behavior, so this
      // avoids showing two error messages for the same failure.
    };
  }, [sessionKey, role, dispatch]);

  // --------------------------------------------------
  // EFFECT: open the connection when sessionKey/role become available,
  // and clean up (close the socket, cancel any pending reconnect
  // timer) whenever they change or the component unmounts.
  // --------------------------------------------------
  useEffect(() => {
    if (!sessionKey) return undefined;

    connect();

    return () => {
      intentionalCloseRef.current = true; // mark this as a deliberate close

      // Cancel any reconnect attempt that hasn't fired yet.
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (stableConnectionTimerRef.current) {
        clearTimeout(stableConnectionTimerRef.current);
        stableConnectionTimerRef.current = null;
      }

      // Close the actual socket connection if one is open.
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      reconnectAttemptsRef.current = 0;
      streamingMessageIdRef.current = null;
    };
  }, [sessionKey, role, connect]);

  // --------------------------------------------------
  // FUNCTION: sendMessage
  // --------------------------------------------------
  // The single function components call to send a message. Adds the
  // user's own message to the store immediately (so it appears
  // instantly without waiting on a round-trip), shows the typing
  // indicator, and sends the actual payload over the socket.
  // "attachment" is optional — only included when the user has
  // uploaded a file first via uploadChatFile() and has a file_id.
  const sendMessage = useCallback(
    (text, attachment = null) => {
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        showError("Not connected to chat. Please wait a moment and try again.");
        return;
      }

      // Show the user's own message immediately for instant feedback.
      dispatch(
        addMessage({
          id: crypto.randomUUID(),
          sender: "user",
          text,
          metadata: null,
          suggestions: [],
          proactive: false,
          isStreaming: false,
          feedback: null,
          createdAt: new Date().toISOString(),
        }),
      );

      dispatch(setTyping(true)); // show the 3-dot indicator while the AI composes a reply

      const payload = attachment
        ? { message: text, attachment }
        : { message: text };
      socketRef.current.send(JSON.stringify(payload));
    },
    [dispatch],
  );

  // Whatever this hook returns becomes available to the component
  // that calls it (ChatWidget.jsx) — just the one function needed to
  // actually send a message; all connection state lives in Redux and
  // is read separately via useChat().
  return { sendMessage };
};

export default useChatSocket;
