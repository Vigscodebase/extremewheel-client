// One WebSocket per browser tab, shared by everything that wants live pushes
// (permission changes, background Vehicle Note saves, ...).
//
//   const release = acquire();               // "I need the socket" (ref-counted)
//   const off = on("permissions-changed", fn) // listen for one message type
//   useRealtimeStore((s) => s.connected)      // is the socket up right now?
//
// What this module takes care of so callers don't have to:
//   - auth: trades the login for a one-time ticket on every (re)connect
//   - reconnect with exponential back-off + full jitter (no thundering herd
//     after a server restart)
//   - a watchdog: the server sends {type:"hb"} every 30 s; if nothing arrives
//     for 75 s the link is dead (browsers can't see TCP half-open) -> reconnect
//   - reconnect immediately when the network comes back / the tab becomes visible
//   - follows login / logout: a different token always means a fresh socket
//   - code 4401 (session revoked) is final: no reconnect loop on a dead account
//
// Messages are only ever "something happened" nudges. Real data is re-read over
// the authenticated HTTP API, so a spoofed or replayed message can't grant access.
import { create } from "zustand";
import useAuthStore from "../store/authStore";
import { fetchRealtimeTicket, realtimeSocketUrl } from "../api/realtimeApi";

export const useRealtimeStore = create(() => ({ connected: false }));
const setConnected = (connected) => {
  if (useRealtimeStore.getState().connected !== connected) useRealtimeStore.setState({ connected });
};

const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;
const WATCHDOG_MS = 75_000; // 2.5 x the server's 30 s heartbeat
const MIN_NUDGE_GAP_MS = 2_000;
const CLOSE_SESSION_REVOKED = 4401;

const handlers = new Map(); // message type -> Set<fn>
let holders = 0; // how many callers currently need the socket
let ws = null;
let opening = false;
let run = 0; // identifies the current "run"; async work from an older run bails out
let attempt = 0;
let retryTimer = null;
let watchdogTimer = null;
let lastMessageAt = 0;
let lastAttemptAt = 0;
let everConnected = false; // a later "ready" is then a RE-connect, so missed events must be re-read
let blocked = false; // after a revoked session: stay down until the token changes

/** Listen for one message type. Returns the function that stops listening. */
export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type)?.delete(fn);
}

function emit(type, msg) {
  handlers.get(type)?.forEach((fn) => {
    try {
      fn(msg);
    } catch (err) {
      // One listener's bug must not stop the others from hearing the message.
      console.error(`[realtime] listener for "${type}" failed`, err);
    }
  });
}

function detach(sock) {
  if (!sock) return;
  sock.onopen = sock.onmessage = sock.onerror = sock.onclose = null;
  try {
    sock.close();
  } catch {
    /* already closed */
  }
}

function teardown() {
  run += 1;
  opening = false;
  clearTimeout(retryTimer);
  clearTimeout(watchdogTimer);
  const sock = ws;
  ws = null;
  detach(sock);
  setConnected(false);
}

function scheduleRetry() {
  if (!holders || blocked) return;
  clearTimeout(retryTimer);
  const cap = Math.min(MAX_DELAY_MS, 1000 * 2 ** attempt);
  attempt += 1;
  // Full jitter: anywhere between the floor and the cap.
  const delay = MIN_DELAY_MS + Math.random() * Math.max(0, cap - MIN_DELAY_MS);
  retryTimer = setTimeout(open, delay);
}

// The socket is gone (closed by the server, the network, or the watchdog).
function lost(sock, code) {
  if (ws !== sock) return; // an old socket reporting in late
  ws = null;
  detach(sock);
  clearTimeout(watchdogTimer);
  setConnected(false);
  if (code === CLOSE_SESSION_REVOKED) {
    blocked = true;
    return;
  }
  scheduleRetry();
}

function armWatchdog(sock) {
  clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => lost(sock), WATCHDOG_MS);
}

async function open() {
  if (!holders || ws || opening || blocked || typeof WebSocket === "undefined") return;
  if (!useAuthStore.getState().token) return;

  const myRun = run;
  opening = true;
  lastAttemptAt = Date.now();
  try {
    const ticket = await fetchRealtimeTicket();
    if (myRun !== run || !holders) return; // torn down while we were waiting

    const sock = new WebSocket(realtimeSocketUrl(ticket));
    ws = sock;
    lastMessageAt = Date.now();
    armWatchdog(sock);

    sock.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      lastMessageAt = Date.now();
      armWatchdog(sock);
      if (msg?.type === "hb") return;
      if (msg?.type === "ready") {
        attempt = 0;
        const reconnect = everConnected;
        everConnected = true;
        setConnected(true);
        emit("ready", { reconnect });
        return;
      }
      if (msg?.type) emit(msg.type, msg);
    };
    sock.onclose = (e) => lost(sock, e?.code);
    sock.onerror = () => {
      try {
        sock.close();
      } catch {
        /* already closed */
      }
    };
  } catch {
    // Ticket refused (Redis down, rate limit, session ended...): the app keeps
    // working on slow polling; try again later.
    if (myRun === run) scheduleRetry();
  } finally {
    if (myRun === run) opening = false;
  }
}

/**
 * "Reconnect now" nudge for moments when waiting out the back-off is pointless:
 * the network just came back, or the person returned to the tab.
 */
function nudge() {
  if (!holders || blocked) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  if (ws) {
    // Looks connected: only believe it if we heard from the server recently
    // (a laptop that slept leaves a socket that is dead but still "open").
    if (Date.now() - lastMessageAt > WATCHDOG_MS) lost(ws);
    else return;
  }
  if (Date.now() - lastAttemptAt < MIN_NUDGE_GAP_MS) return;
  clearTimeout(retryTimer);
  open();
}

/** "I need the live socket." Ref-counted: it closes when the last caller releases. */
export function acquire() {
  holders += 1;
  if (holders === 1) {
    blocked = false;
    open();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) {
      teardown();
      attempt = 0;
      everConnected = false;
    }
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", nudge);
  document.addEventListener("visibilitychange", nudge);
}

// A different token means a different person (or none): never keep the previous
// person's socket, and start the new one from a clean slate.
let lastToken = useAuthStore.getState().token;
useAuthStore.subscribe((state) => {
  if (state.token === lastToken) return;
  lastToken = state.token;
  teardown();
  blocked = false;
  attempt = 0;
  everConnected = false;
  if (state.token) open();
});
