import { createContext, useCallback, useContext, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPermissions, updatePermissions } from "../api/permissionsApi";
import { DEFAULT_PERMISSIONS, PAGES, PERMISSIONS_POLL_MS, ROLES } from "../utils/constants";
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

  // React Query owns fetching, caching, and cross-device polling. Backend
  // not reachable yet / endpoint not implemented -> keep serving the
  // default matrix (via placeholderData) so the UI stays usable.
  const { data: permissions = DEFAULT_PERMISSIONS, isLoading } = useQuery({
    queryKey: permissionsQueryKey,
    queryFn: fetchPermissions,
    placeholderData: DEFAULT_PERMISSIONS,
    refetchInterval: user ? PERMISSIONS_POLL_MS : false,
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: updatePermissions,
    onSuccess: (data) => queryClient.setQueryData(permissionsQueryKey, data),
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
      return (permissions[role] || []).includes(pageKey);
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
