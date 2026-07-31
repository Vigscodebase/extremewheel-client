import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { jwtDecode } from "jwt-decode";
import { fetchMe, loginRequest, registerRequest } from "../api/authApi";
import useAuthStore from "../store/authStore";
import { setupAxiosInterceptors } from "../utils/axiosInstance";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const { token, user, sessionExpired } = useAuthStore(useShallow((s) => ({
    token: s.token,
    user: s.user,
    sessionExpired: s.sessionExpired
  })));

  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setToken = useAuthStore((s) => s.setToken);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSessionExpiredState = useAuthStore((s) => s.setSessionExpired);

  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const handleSessionExpired = useCallback(() => {
    setSessionExpiredState(true);
  }, [setSessionExpiredState]);

  const acknowledgeSessionExpired = useCallback(() => {
    setSessionExpiredState(false);
    logout();
  }, [logout, setSessionExpiredState]);

  useEffect(() => {
    setupAxiosInterceptors(
      (renewedToken) => {
        setToken(renewedToken);
        if (renewedToken) {
          const { name, email, role } = jwtDecode(renewedToken);
          updateUser({ name, email, role });
        }
      },
      () => handleSessionExpired()
    );
  }, [handleSessionExpired, setToken, updateUser]);

  // --- REVISED SILENT REFRESH LOGIC ---
  useEffect(() => {
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      if (!decoded || !decoded.exp) return;

      const expMs = decoded.exp * 1000;
      const timeUntilExpiry = expMs - Date.now();
      const refreshThreshold = 60 * 1000; // Trigger refresh 1 minute before expiry

      // We ONLY set a proactive timeout if the expiration is safely in the future.
      // We no longer forcefully call handleSessionExpired() if timeUntilExpiry <= 0.
      // If the token is expired (or the client clock is wildly out of sync), 
      // we just let the backend return a 401 on the next request to trigger the modal safely.
      if (timeUntilExpiry > refreshThreshold) {
        const timeoutId = setTimeout(async () => {
          const lastActivity = parseInt(localStorage.getItem("lastActivity") || "0", 10);
          const now = Date.now();
          const isRecentlyActive = (now - lastActivity) < 5 * 60 * 1000;

          if (isRecentlyActive && !useAuthStore.getState().sessionExpired) {
            try {
              const baseUrl = import.meta.env?.VITE_API_BASE_URL || "";
              const response = await fetch(`${baseUrl}/auth/refresh`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                }
              });

              if (response.ok) {
                const data = await response.json();
                setToken(data.token);
                const { name, email, role } = jwtDecode(data.token);
                updateUser({ name, email, role });
              }
            } catch (error) {
              console.error("Silent token refresh network error", error);
            }
          }
        }, timeUntilExpiry - refreshThreshold);

        return () => clearTimeout(timeoutId);
      }
    } catch (e) {
      console.error("Token decoding failed", e);
    }
  }, [token, setToken, updateUser]);

  useEffect(() => {
    const bootstrap = async () => {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        setInitializing(false);
        return;
      }
      try {
        const { name, email, role } = jwtDecode(currentToken);
        updateUser({ name, email, role });
        await fetchMe();
      } catch {
        clearSession();
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await loginRequest(email, password);
      const { name, email: userEmail, role } = jwtDecode(data.token);
      const userData = { name, email: userEmail, role };

      setSession(data.token, userData);
      return userData;
    },
    [setSession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await registerRequest(payload);
      if (data.token) {
        const { name, email, role } = jwtDecode(data.token);
        const userData = { name, email, role };

        setSession(data.token, userData);
        return userData;
      }
      return null;
    },
    [setSession]
  );

  const updateCurrentUser = useCallback((partial) => updateUser(partial), [updateUser]);

  const value = {
    user,
    isAuthenticated: !!token && !!user,
    initializing,
    login,
    register,
    logout,
    sessionExpired,
    acknowledgeSessionExpired,
    triggerSessionExpired: handleSessionExpired,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;