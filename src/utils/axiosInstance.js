import Axios from "axios";
import { jwtDecode } from "jwt-decode";
import useAuthStore from "../store/authStore";

// Base URL comes from env in production; falls back to the LAN address used
// during development. Set VITE_API_BASE_URL in a .env file for deployment.
const baseURL = import.meta.env.VITE_API_BASE_URL;

export const axios = Axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// BUGFIX: interceptors used to be registered from a `useEffect` inside
// AuthProvider. That effect only runs *after* the whole tree commits, and
// React fires effects bottom-up (children before parents) — so any
// descendant that kicks off a request during its own mount (e.g. a
// React Query hook like `useVehicleLookupMakes` or `usePermissions`,
// several of which fire on the very first render of a protected route)
// could — and reliably did, on a hard refresh — dispatch its request
// before this interceptor existed. Axios snapshots the interceptor list at
// call time, not at response time, so that first request went out with no
// Authorization header and came back 401 "Not authorized, no token
// provided." Because the query client's retry policy skips retries on 4xx
// responses (see lib/queryClient.js), that failure never self-healed —
// leaving things like the Vehicle Notes Make/Model/Type dropdowns
// permanently empty for that page load, and the /permissions call visibly
// failing in the Network tab.
//
// Fix: bind the interceptors here, synchronously, at module load — before
// any component (and therefore before any query) has a chance to mount —
// instead of waiting for a React effect. Reading/writing auth state via
// `useAuthStore.getState()` means this has no dependency on React's
// lifecycle at all.
axios.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => {
    const renewedToken = response.headers["x-refresh-token"];
    if (renewedToken) {
      useAuthStore.getState().setToken(renewedToken);
      try {
        const { name, email, role } = jwtDecode(renewedToken);
        useAuthStore.getState().updateUser({ name, email, role });
      } catch {
        // Malformed renewed token: keep the old user info rather than crash.
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().setSessionExpired(true);
    } else {
      // For any error that ISN'T a 401, extract the Express message and trigger the global modal
      const errorMessage = error.response?.data?.message || "An unexpected error occurred. Please try again.";
      window.dispatchEvent(new CustomEvent("api-error", { detail: errorMessage }));
    }
    return Promise.reject(error);
  }
);

export default axios;
