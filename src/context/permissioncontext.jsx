import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyPermissions } from "../api/permissionsApi";
import { ancestorsOf } from "../utils/permissions";
import { useAuth } from "./authcontext";

const PermissionContext = createContext(null);
const SYNC_KEY = "page-permissions-sync";
const EMPTY = [];

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
 */
export const PermissionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Keyed by email so signing out and in as someone else never reuses the
  // previous person's grants. Only fetched once there is a session (a request
  // with no token would just 401 and flash an error modal on a cold visit).
  const queryKey = useMemo(() => ["permissions", "me", user?.email || null], [user?.email]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: fetchMyPermissions,
    enabled: isAuthenticated,
    staleTime: 10_000,
    // An admin can change this user's access at any time, so pick it up when
    // they come back to the tab instead of waiting for a reload.
    refetchOnWindowFocus: true,
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

  // Same-browser sync: User Management bumps this key after saving, and any
  // other open tab re-fetches on the native `storage` event.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SYNC_KEY) queryClient.invalidateQueries({ queryKey: ["permissions", "me"] });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  const notifyPermissionsChanged = useCallback(() => {
    localStorage.setItem(SYNC_KEY, String(Date.now()));
    queryClient.invalidateQueries({ queryKey: ["permissions", "me"] });
  }, [queryClient]);

  const value = {
    permissions,
    isAdmin,
    loading: isLoading,
    can,
    // Kept under its old name — the sidebar and ProtectedRoute use it for pages.
    isAllowedForCurrentUser: can,
    notifyPermissionsChanged,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["permissions", "me"] }),
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export default PermissionContext;
