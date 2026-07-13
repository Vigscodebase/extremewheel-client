import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios, { setupAxiosInterceptors } from "../utils/axiosInstance";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const logoutBroadcastRef = useRef(false);

  const persistSession = useCallback((token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Logs the user out locally. `broadcast` false is used when we are already
  // reacting to another tab's logout, to avoid an infinite storage-event loop.
  const logout = useCallback(
    (broadcast = true) => {
      clearSession();
      if (broadcast) {
        // Bumping this key fires the `storage` event in every other open tab.
        localStorage.setItem("logout-broadcast", String(Date.now()));
      }
    },
    [clearSession]
  );

  const handleSessionExpired = useCallback(() => {
    setSessionExpired(true);
  }, []);

  const acknowledgeSessionExpired = useCallback(() => {
    setSessionExpired(false);
    logout();
  }, [logout]);

  useEffect(() => {
    setupAxiosInterceptors(
      (renewedToken) => localStorage.setItem("token", renewedToken),
      () => handleSessionExpired()
    );
  }, [handleSessionExpired]);

  // Verify the stored token against the backend on first load, and sync
  // logout across tabs of the same browser instantly via the storage event.
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("token");
      const cachedUser = localStorage.getItem("user");
      if (!token || !cachedUser) {
        setInitializing(false);
        return;
      }
      try {
        setUser(JSON.parse(cachedUser));
        const { data } = await axios.get("api/auth/me");
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch {
        clearSession();
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();

    const onStorage = (e) => {
      if (e.key === "logout-broadcast") {
        logoutBroadcastRef.current = true;
        clearSession();
      }
      if (e.key === "user" && e.newValue) {
        setUser(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearSession]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await axios.post("api/auth/login", { email, password });
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await axios.post("api/auth/register", payload);
      if (data.token) persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const updateCurrentUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
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
