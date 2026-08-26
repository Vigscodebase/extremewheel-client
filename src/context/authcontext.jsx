import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { jwtDecode } from "jwt-decode";
import { fetchMe, loginRequest, refreshTokenRequest, registerRequest } from "../api/authApi";
import useAuthStore from "../store/authStore";
import { SESSION_TIMEOUT_MS } from "../utils/constants";

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

  // NOTE: axios request/response interceptors (token injection, rolling
  // x-refresh-token renewal, 401 -> sessionExpired) are registered
  // synchronously at module load in utils/axiosInstance.js, not here.
  // They used to be wired up from a `useEffect` in this component, but
  // that runs *after* descendant components' own mount-time effects (React
  // fires effects bottom-up), so nested queries — e.g. PermissionProvider's
  // /permissions fetch, or Vehicle Notes' Make/Model/Type lookups on a hard
  // refresh — could fire before the interceptor existed and go out with no
  // Authorization header. See utils/axiosInstance.js for the full writeup.

  // --- Rolling session keep-alive ---
  // The server (middleware/auth.js: requireAuth) already renews a token
  // whenever ANY authenticated request arrives with less than
  // JWT_RENEW_THRESHOLD_SECONDS left on it, piggy-backing the fresh token on
  // the `x-refresh-token` response header — which the shared axios instance
  // already picks up transparently on every single response (see
  // utils/axiosInstance.js). That alone keeps an active user's session
  // alive for free on any real API call they happen to make late in their
  // token's life.
  //
  // The gap: someone can be genuinely using the app — reading a page,
  // filling out a long form — without triggering any API call for several
  // minutes. No request means no chance for the server to renew, and the
  // token quietly expires under them; the next request they DO make (e.g.
  // navigating away) then hits a flat 401 and force-expires their session
  // even though they were never idle. (This used to be "handled" by a
  // single precisely-timed setTimeout that fired one silent /auth/refresh
  // call ~60s before expiry with no retry — any one network hiccup, or the
  // browser throttling that timer in a backgrounded tab, meant a guaranteed
  // expiry 60 seconds later regardless of activity.)
  //
  // Fix: a small recurring heartbeat instead of a one-shot timer. While
  // authenticated and recently active, ping the authenticated /auth/refresh
  // endpoint through the shared axios instance every HEARTBEAT_MS. This
  // reuses the exact same rolling-renewal + interceptor logic as every
  // other request (no separate success/failure handling to get wrong), and
  // — critically — one missed beat is a non-event: the next beat a minute
  // later renews it instead of the session being gone for good.

  // --- Activity Tracker ---
  // Updates the lastActivity timestamp whenever the user interacts with the app
  useEffect(() => {
    // Throttle updates so we don't spam localStorage on every single pixel of scrolling
    let throttleTimer;

    const updateActivity = () => {
      if (throttleTimer) return;

      localStorage.setItem("lastActivity", Date.now().toString());

      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 2000); // Only write to localStorage at most once every 2 seconds
    };

    // Set initial activity on load
    updateActivity();

    // Listen for common interaction events
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, updateActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const HEARTBEAT_MS = 60 * 1000;

    const beat = async () => {
      const { token: currentToken, sessionExpired: expired } = useAuthStore.getState();
      if (!currentToken || expired) return;

      const lastActivity = parseInt(localStorage.getItem("lastActivity") || "0", 10);
      const isRecentlyActive = Date.now() - lastActivity < SESSION_TIMEOUT_MS;
      // Not recently active: leave it alone. Either the idle timer has
      // already (or will shortly) flip sessionExpired itself, or the
      // person simply isn't in a session that needs keeping alive.
      if (!isRecentlyActive) return;

      try {
        const data = await refreshTokenRequest();
        if (data?.token) {
          setToken(data.token);
          const { name, email, role } = jwtDecode(data.token);
          updateUser({ name, email, role });
        }
      } catch {
        // A failed beat isn't fatal — the next one retries in HEARTBEAT_MS.
        // If the token turns out to be genuinely invalid, axios's own
        // response interceptor already sets sessionExpired for us from
        // this very request; nothing extra to do here.
      }
    };

    const intervalId = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(intervalId);
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