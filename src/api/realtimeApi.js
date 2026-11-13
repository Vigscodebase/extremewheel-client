import axios from "../utils/axiosInstance";

// One-time, 30-second ticket for the WebSocket. A browser can't send an
// Authorization header on a WebSocket, so the normal login is traded for this
// instead of putting the long-lived JWT in the ws:// URL.
// `silentError`: a refused ticket (Redis down, rate limit) is not worth a dialog -
// the app simply falls back to slow polling until the socket is back.
export const fetchRealtimeTicket = () =>
  axios.post("/realtime/ticket", {}, { silentError: true }).then((r) => r.data.ticket);

// Where the WebSocket lives: next to the API (same host / same prefix as the
// axios baseURL, with /ws on the end). If the API sits behind a proxy that
// serves WebSockets somewhere else, set VITE_WS_URL (e.g. wss://api.example.com/ws).
export function realtimeSocketUrl(ticket) {
  const override = import.meta.env?.VITE_WS_URL;
  const url = new URL(override || axios.defaults?.baseURL || "/", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (!override) url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("ticket", ticket);
  return url.toString();
}
