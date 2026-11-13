import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyPermissions } from "../api/permissionsApi";
import { acquire, on, useRealtimeStore } from "../realtime/realtimeClient";
import useAuthStore from "../store/authStore";
import { ancestorsOf } from "../utils/permissions";
import { useAuth } from "./authcontext";

const PermissionContext = createContext(null);
const EMPTY = [];

const PERMISSIONS_KEY = ["permissions", "me"];
// With the live socket up, the server tells us the moment access changes, so a
// cached answer stays good for a long time. Window focus after this long is
// only a safety net.
const STALE_MS = 5 * 60_000;
// Polling is ONLY the fallback while the socket is down (Redis outage, a proxy
// that blocks WebSockets...). It stops the moment the socket is back.
const FALLBACK_POLL_MS = 3 * 60_000;
const SESSION_ENDED_MESSAGE = "Your session has ended. Please sign in again.";

export const usePermissions = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
};

/**
 * The signed-in user's own permissions (page + element keys), as granted to
 * their email address by an admin. There is no role matrix any more.
 *
 * `can(key)` is what every route, sidebar item, dashboard tile and button asks.
 * It is only a UI convenience — the server re-checks every request — so it
 * fails closed: until the list has loaded (or if it fails to load) nothing is
 * allowed, and ProtectedRoute shows a loader rather than a flash of content.
 *
 * Staying current WITHOUT polling:
 *   1. Push    The server sends "permissions-changed" over the shared WebSocket
 *              when an admin edits this user's access; we re-fetch once.
 *   2. Catch-up Every WebSocket RE-connect re-fetches (events sent while we were
 *              offline are gone), and so does a "resync" from the server.
 *   3. Self-heal Any 403 from the API means the UI is out of date -> re-fetch.
 *   4. Backstop Window focus once the data is 5 minutes old; and slow polling,
 *              but only while the socket is down.
 * "session-revoked" (account deleted, password / email / role changed) signs the
 * person out immediately.
 */
export const PermissionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const connected = useRealtimeStore((s) => s.connected);

  // Keyed by email so signing out and in as someone else never reuses the
  // previous person's grants. Only fetched once there is a session (a request
  // with no token would just 401 and flash an error modal on a cold visit).
  const queryKey = useMemo(() => [...PERMISSIONS_KEY, user?.email || null], [user?.email]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: fetchMyPermissions,
    enabled: isAuthenticated,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true, // only fires when the data is stale (see STALE_MS)
    refetchInterval: connected ? false : FALLBACK_POLL_MS,
    refetchIntervalInBackground: false,
  });

  const isAdmin = !!data?.isAdmin;
  const permissions = data?.permissions ?? EMPTY;
  const granted = useMemo(() => new Set(permissions), [permissions]);

  const can = useCallback(
    (key) => {
      if (!key) return false;
      if (isAdmin) return true; // the master account always has everything
      return granted.has(key) && ancestorsOf(key).every((a) => granted.has(a));
    },
    [isAdmin, granted]
  );

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
    [queryClient]
  );

  // Live updates over the shared WebSocket.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const release = acquire();

    const endSession = () => {
      useAuthStore.getState().clearSession(); // ProtectedRoute then sends them to /login
      window.dispatchEvent(new CustomEvent("api-error", { detail: SESSION_ENDED_MESSAGE }));
    };

    // The API answered 403: the screen is showing something the server no longer
    // allows. Throttled so a burst of failing calls causes one re-fetch.
    let lastStale = 0;
    const onStale = () => {
      const now = Date.now();
      if (now - lastStale < 5_000) return;
      lastStale = now;
      refresh();
    };

    const offs = [
      on("permissions-changed", refresh),
      on("resync", refresh),
      on("ready", (msg) => {
        if (msg?.reconnect) refresh(); // anything pushed while we were offline is lost
      }),
      on("session-revoked", endSession),
    ];
    window.addEventListener("permissions-stale", onStale);

    return () => {
      offs.forEach((off) => off());
      window.removeEventListener("permissions-stale", onStale);
      release();
    };
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      permissions,
      isAdmin,
      loading: isLoading,
      can,
      // Kept under its old name — the sidebar and ProtectedRoute use it for pages.
      isAllowedForCurrentUser: can,
      // User Management still calls this after saving. Other tabs / devices of the
      // affected user are now told by the server, so locally it is just a refetch.
      notifyPermissionsChanged: refresh,
      refresh,
    }),
    [permissions, isAdmin, isLoading, can, refresh]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export default PermissionContext;
