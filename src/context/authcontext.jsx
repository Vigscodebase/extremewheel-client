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
  // token/user live in the Zustand store (persisted + shared across tabs);
  // initializing/sessionExpired are transient UI-only flags for this mount.
  const { token, user } = useAuthStore(useShallow((s) => ({ token: s.token, user: s.user })));
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setToken = useAuthStore((s) => s.setToken);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [initializing, setInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    // Clearing the persisted store fires a native `storage` event in every
    // other open tab, so they log out too without any extra plumbing.
    clearSession();
  }, [clearSession]);

  const handleSessionExpired = useCallback(() => {
    setSessionExpired(true);
  }, []);

  const acknowledgeSessionExpired = useCallback(() => {
    setSessionExpired(false);
    logout();
  }, [logout]);

  useEffect(() => {
    setupAxiosInterceptors(
      (renewedToken) => {
        setToken(renewedToken);
        if (renewedToken) {
          // Destructure token to update user data seamlessly on token refresh
          const { name, email, role } = jwtDecode(renewedToken);
          updateUser({ name, email, role });
        }
      },
      () => handleSessionExpired()
    );
  }, [handleSessionExpired, setToken, updateUser]);

  // Verify the stored token against the backend on first load. Cross-tab
  // sync (logout in another tab, etc.) is handled natively by zustand's
  // persist middleware re-hydrating this store on the `storage` event.
  useEffect(() => {
    const bootstrap = async () => {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        setInitializing(false);
        return;
      }
      try {
        // Decode token directly to hydrate state immediately
        const { name, email, role } = jwtDecode(currentToken);
        updateUser({ name, email, role });

        // Still call fetchMe to verify token validity with backend
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
      // Destructure user details directly from the returned token
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
        // Destructure user details directly from the returned token
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