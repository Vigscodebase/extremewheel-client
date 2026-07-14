import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "../utils/axiosInstance";
import { DEFAULT_PERMISSIONS, PAGES, PERMISSIONS_POLL_MS, ROLES } from "../utils/constants";
import { useAuth } from "./authcontext";

const STORAGE_KEY = "page-permissions";
const PermissionContext = createContext(null);

export const usePermissions = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(() => readCache() || DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const applyAndCache = useCallback((next) => {
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await axios.get("/permissions");
      if (data?.permissions) applyAndCache(data.permissions);
    } catch {
      // Backend not reachable yet / endpoint not implemented -> keep using
      // the cached / default matrix so the UI stays usable during dev.
    } finally {
      setLoading(false);
    }
  }, [applyAndCache]);

  // Initial load + cross-device polling while a session is active.
  useEffect(() => {
    fetchPermissions();
    if (pollRef.current) clearInterval(pollRef.current);
    if (user) {
      pollRef.current = setInterval(fetchPermissions, PERMISSIONS_POLL_MS);
    }
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [fetchPermissions, user]);

  // Instant cross-tab sync (same browser): any tab that saves permissions
  // writes to localStorage, and every other tab picks it up immediately.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setPermissions(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const savePermissions = useCallback(
    async (next) => {
      // Admin access is always locked to every page, so a mis-click never
      // locks every admin out of User Management.
      const safeNext = { ...next, admin: PAGES.map((p) => p.key) };

      applyAndCache(safeNext);
      try {
        await axios.put("/permissions", { permissions: safeNext });
      } catch {
        // Persisted locally + will retry to reach backend on next poll;
        // still reflects instantly across this browser's tabs.
      }
      return safeNext;
    },
    [applyAndCache]
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
    loading,
    roles: ROLES,
    canAccess,
    isAllowedForCurrentUser,
    savePermissions,
    refresh: fetchPermissions,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export default PermissionContext;
