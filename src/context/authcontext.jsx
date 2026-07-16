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
  // 1. Pull the persisted sessionExpired flag directly from Zustand
  const { token, user, sessionExpired } = useAuthStore(useShallow((s) => ({
    token: s.token,
    user: s.user,
    sessionExpired: s.sessionExpired
  })));

  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setToken = useAuthStore((s) => s.setToken);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSessionExpiredState = useAuthStore((s) => s.setSessionExpired); // 2. Pull the setter

  const [initializing, setInitializing] = useState(true);
  // REMOVED: const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const handleSessionExpired = useCallback(() => {
    // 3. Update the global Zustand store instead of local state
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
    sessionExpired, // Now safely referencing Zustand's persistent state
    acknowledgeSessionExpired,
    triggerSessionExpired: handleSessionExpired,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;