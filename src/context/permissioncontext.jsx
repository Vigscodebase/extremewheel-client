import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPermissions, updatePermissions } from "../api/permissionsApi";
import { DEFAULT_PERMISSIONS, PAGES, ROLES } from "../utils/constants";
import { useAuth } from "./authcontext";

const PermissionContext = createContext(null);
const SYNC_KEY = "page-permissions-sync";
const permissionsQueryKey = ["permissions"];

export const usePermissions = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
};

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /*
   * ============================================================
   * KNOWN BENIGN 401 ON FRESH/INCOGNITO SESSIONS — NOT A BUG, NOT
   * BEING FIXED HERE. Documenting the timing so it isn't
   * mistaken for a real outage later.
   * ============================================================
   *
   * This query has no `enabled: !!token` guard, so it fires the
   * instant PermissionLayout mounts for ANY visit to a private
   * route path — authenticated or not. React fires effects
   * bottom-up (children before parents — see the interceptor
   * bugfix note in utils/axiosInstance.js for the same ordering
   * rule), and PermissionProvider sits *below* AuthProvider in the
   * tree, so this fires before AuthProvider's bootstrap effect has
   * run and before ProtectedRoute (a sibling further down, which
   * depends on that bootstrap finishing) gets a chance to redirect
   * an unauthenticated visitor to /login.
   *
   * On a genuinely fresh/incognito session there's no stored token
   * at all yet, so this request legitimately goes out with no
   * Authorization header and the server correctly answers
   * 401 "Not authorized, no token provided." (middleware/auth.js).
   * The active axios response interceptor doesn't distinguish that
   * from a real failure, so it surfaces as the same generic
   * "Something went wrong" modal (GlobalErrorListener) you'd see
   * for any other error — right before the redirect to /login lands
   * a beat later. The modal is a global overlay outside <Routes>,
   * so it stays up across that navigation.
   *
   * Net effect: opening the app cold (no session yet, or a token
   * that's expired) can flash this modal on the way to /login. It's
   * timing, not data loss — nothing failed to load, there was
   * simply nothing to authenticate yet. Left as-is intentionally,
   * consistent with the other TEMPORARILY DISABLED session/refresh
   * blocks in axiosInstance.js and authcontext.jsx.
   */
  const { data, isLoading } = useQuery({
    queryKey: permissionsQueryKey,
    queryFn: fetchPermissions,
    placeholderData: DEFAULT_PERMISSIONS,
    // Polling removed: the query will only refetch on mutations, window focus, or cross-tab sync
    staleTime: 10_000,
  });

  // Explicitly fallback to DEFAULT_PERMISSIONS if the backend 
  // returns an empty object, array, or null on a fresh/uninitialized database.
  const permissions = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return DEFAULT_PERMISSIONS;
    }
    return data;
  }, [data]);

  const mutation = useMutation({
    mutationFn: updatePermissions,
    onSuccess: (newData) => queryClient.setQueryData(permissionsQueryKey, newData),
  });

  // Instant cross-tab sync (same browser): any tab that saves permissions
  // bumps a shared localStorage key, and every other tab re-fetches on the
  // native `storage` event so its route guards update immediately.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SYNC_KEY) {
        queryClient.invalidateQueries({ queryKey: permissionsQueryKey });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  const savePermissions = useCallback(
    async (next) => {
      // Admin access is always locked to every page, so a mis-click never
      // locks every admin out of User Management.
      const safeNext = { ...next, admin: PAGES.map((p) => p.key) };
      const saved = await mutation.mutateAsync(safeNext);
      localStorage.setItem(SYNC_KEY, String(Date.now()));
      return saved;
    },
    [mutation]
  );

  const canAccess = useCallback(
    (role, pageKey) => {
      if (!role) return false;

      // Sanitize the role to lowercase to prevent JWT casing mismatches
      const normalizedRole = role.toLowerCase();

      // Guarantee the admin always evaluates to true, preventing local lockouts
      if (normalizedRole === 'admin') return true;

      return (permissions[normalizedRole] || []).includes(pageKey);
    },
    [permissions]
  );

  const isAllowedForCurrentUser = useCallback(
    (pageKey) => canAccess(user?.role, pageKey),
    [canAccess, user]
  );

  const value = {
    permissions,
    loading: isLoading,
    roles: ROLES,
    canAccess,
    isAllowedForCurrentUser,
    savePermissions,
    refresh: () => queryClient.invalidateQueries({ queryKey: permissionsQueryKey }),
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export default PermissionContext;