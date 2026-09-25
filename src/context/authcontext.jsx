import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { jwtDecode } from "jwt-decode";
import {
  fetchMe,
  loginRequest,
  refreshTokenRequest,
  registerRequest,
} from "../api/authApi";
import useAuthStore from "../store/authStore";
import { SESSION_TIMEOUT_MS } from "../utils/constants";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
};

export const AuthProvider = ({ children }) => {
  const { token, user, sessionExpired } = useAuthStore(
    useShallow((s) => ({
      token: s.token,
      user: s.user,
      sessionExpired: s.sessionExpired,
    }))
  );

  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setToken = useAuthStore((s) => s.setToken);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSessionExpiredState = useAuthStore(
    (s) => s.setSessionExpired
  );

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

  /*
   * ============================================================
   * SESSION EXPIRY / ACTIVITY TRACKING - TEMPORARILY DISABLED
   * ============================================================
   *
   * Keeping the code here for future use.
   *
   * This was used to track user activity so the heartbeat could
   * determine whether the user was recently active.
   */

  /*
  useEffect(() => {
    let throttleTimer;

    const updateActivity = () => {
      if (throttleTimer) return;

      localStorage.setItem("lastActivity", Date.now().toString());

      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 2000);
    };

    updateActivity();

    const events = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) =>
      window.addEventListener(event, updateActivity)
    );

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, updateActivity)
      );

      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, []);
  */

  /*
   * ============================================================
   * SESSION REFRESH / HEARTBEAT - TEMPORARILY DISABLED
   * ============================================================
   *
   * Keeping the complete existing refresh logic commented out.
   *
   * This prevents automatic refreshTokenRequest() calls every
   * 60 seconds.
   */

  /*
  useEffect(() => {
    if (!token) return;

    const HEARTBEAT_MS = 60 * 1000;

    const beat = async () => {
      const {
        token: currentToken,
        sessionExpired: expired,
      } = useAuthStore.getState();

      if (!currentToken || expired) return;

      const lastActivity = parseInt(
        localStorage.getItem("lastActivity") || "0",
        10
      );

      const isRecentlyActive =
        Date.now() - lastActivity < SESSION_TIMEOUT_MS;

      if (!isRecentlyActive) return;

      try {
        const data = await refreshTokenRequest();

        if (data?.token) {
          setToken(data.token);

          const { name, email, role } = jwtDecode(data.token);

          updateUser({
            name,
            email,
            role,
          });
        }
      } catch {
        // A failed beat isn't fatal.
      }
    };

    const intervalId = setInterval(
      beat,
      HEARTBEAT_MS
    );

    return () => clearInterval(intervalId);
  }, [token, setToken, updateUser]);
  */

  /*
   * ============================================================
   * AUTH BOOTSTRAP - KEEP ENABLED
   * ============================================================
   */

  useEffect(() => {
    const bootstrap = async () => {
      const currentToken = useAuthStore.getState().token;

      if (!currentToken) {
        setInitializing(false);
        return;
      }

      try {
        const { name, email, role } = jwtDecode(currentToken);

        updateUser({
          name,
          email,
          role,
        });

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

      const {
        name,
        email: userEmail,
        role,
      } = jwtDecode(data.token);

      const userData = {
        name,
        email: userEmail,
        role,
      };

      setSession(data.token, userData);

      return userData;
    },
    [setSession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await registerRequest(payload);

      if (data.token) {
        const { name, email, role } = jwtDecode(
          data.token
        );

        const userData = {
          name,
          email,
          role,
        };

        setSession(data.token, userData);

        return userData;
      }

      return null;
    },
    [setSession]
  );

  const updateCurrentUser = useCallback(
    (partial) => updateUser(partial),
    [updateUser]
  );

  const value = {
    user,
    isAuthenticated: !!token && !!user,
    initializing,
    login,
    register,
    logout,

    /*
     * Keeping these available in case you re-enable the
     * session-expiry functionality later.
     */
    sessionExpired,
    acknowledgeSessionExpired,
    triggerSessionExpired: handleSessionExpired,

    updateCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;