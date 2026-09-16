// ============================================================
// COMPLAINT CHAT LIVE-UPDATE HOOK
// ============================================================
// Opens a WebSocket connection for one complaint's message thread so
// new replies appear instantly, on both the customer's Complaint
// Detail page and the admin's Complaint Detail modal, without either
// side needing to refresh or poll.
//
// Sending still goes through the existing REST endpoint
// (postComplaintMessage) — this hook only handles the live receiving
// side, and reuses the same reconnect-with-backoff approach already
// established for the AI chat sockets (see useChatSocket.js), sized
// down since there's no typing indicator or streaming to manage here.

import { useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createComplaintWebSocket } from "../api/complaints.api";
import { QUERY_KEYS } from "../constants/queryKeys";

// Reconnect backoff — identical tuning to useChatSocket.js, so a
// dropped connection behaves the same way everywhere in the app:
// retries at 1s, 2s, 4s, 8s, 16s (capped), giving up after 5 attempts.
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 16000;
// A connection has to stay open this long before a future drop counts
// as a fresh problem rather than a continuation of the last one —
// prevents a connection that opens and immediately closes in a loop
// from resetting the backoff counter every single time.
const STABLE_CONNECTION_MS = 3000;

// complaintId — the complaint whose thread to listen on; the hook
// does nothing until this is a real value (e.g. while the complaint
// detail query is still loading).
const useComplaintSocket = (complaintId) => {
  const queryClient = useQueryClient();

  // Holds the live WebSocket instance across re-renders.
  const socketRef = useRef(null);
  // How many reconnect attempts have been made since the last
  // successful, stable connection.
  const reconnectAttemptsRef = useRef(0);
  // setTimeout id for a pending reconnect attempt, cancelled on
  // unmount or when complaintId changes before it fires.
  const reconnectTimerRef = useRef(null);
  // setTimeout id for the "this connection has proven itself stable"
  // check described above.
  const stableConnectionTimerRef = useRef(null);
  // Set when this hook intentionally closes the socket itself (e.g.
  // the complaint id changes, or the component unmounts) — tells the
  // onclose handler not to treat that as a drop worth reconnecting.
  const intentionalCloseRef = useRef(false);

  // --------------------------------------------------
  // FUNCTION: connect
  // --------------------------------------------------
  const connect = useCallback(() => {
    if (!complaintId) return;

    // The socket authenticates from this token as a query parameter —
    // there's no logged-in session without one, so there's nothing to
    // connect with yet.
    const token = localStorage.getItem("token");
    if (!token) return;

    intentionalCloseRef.current = false;

    const socket = createComplaintWebSocket(complaintId, token);
    socketRef.current = socket;

    socket.onopen = () => {
      if (stableConnectionTimerRef.current) {
        clearTimeout(stableConnectionTimerRef.current);
      }
      stableConnectionTimerRef.current = setTimeout(() => {
        reconnectAttemptsRef.current = 0;
      }, STABLE_CONNECTION_MS);
    };

    // --------------------------------------------------
    // EVENT: onmessage — a single new message object, in exactly the
    // same shape as one item from getComplaintMessages(): { id,
    // complaint, sender, sender_name, sender_role, message, created_at }
    // --------------------------------------------------
    socket.onmessage = (event) => {
      let incoming;
      try {
        incoming = JSON.parse(event.data);
      } catch {
        // Not valid JSON — nothing sensible to do with it.
        return;
      }
      if (!incoming?.id) return;

      queryClient.setQueryData(
        QUERY_KEYS.COMPLAINT_MESSAGES(complaintId),
        (previous) => {
          // The thread hasn't been fetched into the cache yet — the
          // initial GET request will include this message on its own
          // once it resolves, so there's nothing to append onto here.
          if (!previous) return previous;

          const payload = previous.data;
          const isPaginated = Array.isArray(payload?.results);
          const existingList = isPaginated
            ? payload.results
            : Array.isArray(payload)
              ? payload
              : null;
          if (!existingList) return previous;

          // De-duplicate — posting a reply over the REST endpoint also
          // broadcasts it to this same socket, so the sender's own
          // message can arrive here a second time on top of the
          // response their own POST request already gave them.
          if (existingList.some((msg) => msg.id === incoming.id)) {
            return previous;
          }

          const updatedList = [...existingList, incoming];

          return {
            ...previous,
            data: isPaginated
              ? { ...payload, results: updatedList }
              : updatedList,
          };
        },
      );
    };

    // --------------------------------------------------
    // EVENT: onclose
    // --------------------------------------------------
    socket.onclose = (event) => {
      if (stableConnectionTimerRef.current) {
        clearTimeout(stableConnectionTimerRef.current);
        stableConnectionTimerRef.current = null;
      }

      if (intentionalCloseRef.current) {
        return;
      }

      // 4401 — the access token was missing, invalid, or expired.
      // 4403 — this viewer isn't allowed to see this complaint (not
      // its owning customer, and not an admin).
      // Both fail identically on every retry, so there's no point
      // reconnecting automatically for either — the thread still
      // works normally via the REST endpoints either way, this only
      // costs the live-update convenience for the rest of the visit.
      if (event.code === 4401 || event.code === 4403) {
        return;
      }

      // Any other close reason is treated as a drop worth retrying.
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptsRef.current,
          MAX_RECONNECT_DELAY_MS,
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    // onclose fires right after onerror for a failed connection and
    // owns all of the actual reconnect behavior, so there's nothing
    // further to do here.
    socket.onerror = () => {};
  }, [complaintId, queryClient]);

  // --------------------------------------------------
  // EFFECT: connect when complaintId becomes available, clean up on
  // unmount or whenever it changes.
  // --------------------------------------------------
  useEffect(() => {
    if (!complaintId) return undefined;

    connect();

    return () => {
      intentionalCloseRef.current = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (stableConnectionTimerRef.current) {
        clearTimeout(stableConnectionTimerRef.current);
        stableConnectionTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    };
  }, [complaintId, connect]);
};

export default useComplaintSocket;
