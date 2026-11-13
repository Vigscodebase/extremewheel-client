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

/*
 * ============================================================
 * AUTOMATIC TOKEN REFRESH / SESSION EXPIRY - TEMPORARILY DISABLED
 * ============================================================
 *
 * Keeping the original interceptor logic here for future use.
 *
 * This used to:
 *  1. Pick up a silently-renewed token from the x-refresh-token
 *     response header (sent by the server's sliding-session logic)
 *     and update the store + decoded user info.
 *  2. Flip sessionExpired to true on a 401 so the app could show the
 *     session-expired modal and log the user out.
 */

/*
axios.interceptors.response.use(
  (response) => {
    const renewedToken = response.headers["x-refresh-token"];

    if (renewedToken) {
      useAuthStore.getState().setToken(renewedToken);

      try {
        const { name, email, role } = jwtDecode(renewedToken);

        useAuthStore.getState().updateUser({
          name,
          email,
          role,
        });
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
      const errorMessage =
        error.response?.data?.message ||
        "An unexpected error occurred. Please try again.";

      window.dispatchEvent(
        new CustomEvent("api-error", {
          detail: errorMessage,
        })
      );
    }

    return Promise.reject(error);
  }
);
*/

// Sign-in / registration / password-reset calls report their own 401s.
const CREDENTIAL_CALL = /^\/auth\/(login|register|forgot-password|reset-password)(\/|\?|$)/;
const SESSION_ENDED_MESSAGE = "Your session has ended. Please sign in again.";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 403 means the server no longer allows something the screen still offers,
    // i.e. this browser's copy of the permissions is stale (PermissionProvider
    // listens and re-fetches, throttled). It changes nothing else about how the
    // error is handled below.
    if (error.response?.status === 403) window.dispatchEvent(new Event("permissions-stale"));

    // The API answers 401 to a request that DID carry a token only when that
    // session can no longer be used: the account was deleted, or its password,
    // email or role was changed (which signs out every device), or the token is
    // invalid. Carrying on would just show a wall of error dialogs on a dead
    // session, so end it: clearing it sends ProtectedRoute to /login.
    const sentAuthorization = error.response?.status === 401 && error.config?.headers?.Authorization;
    if (sentAuthorization && !CREDENTIAL_CALL.test(error.config?.url || "")) {
      const { token, clearSession } = useAuthStore.getState();
      // Only if that token is still the current one — a late response to a
      // request made before the person signed in again must not sign them out.
      if (token && sentAuthorization === `Bearer ${token}`) {
        clearSession();
        window.dispatchEvent(new CustomEvent("api-error", { detail: SESSION_ENDED_MESSAGE }));
      }
      return Promise.reject(error);
    }

    // A 401 on a request that was sent with no Authorization header just
    // means "there is no session yet" (e.g. a cold visit before the router
    // redirects to /login). That is not a failure worth a modal, so stay
    // quiet and let the auth flow redirect. /auth/* is excluded so the
    // login/register calls keep reporting their own errors.
    const isTokenlessUnauthorized =
      error.response?.status === 401 &&
      !error.config?.headers?.Authorization &&
      !error.config?.url?.startsWith("/auth/");

    // Requests cancelled on purpose (the person kept typing, so the previous
    // search / suggestion request was aborted) are not errors. `silentError`
    // marks background requests — list pages and type-ahead suggestions — whose
    // failure the page already shows inline (or recovers from by itself, e.g.
    // an expired page cursor), so they shouldn't also raise the global dialog.
    const isQuietFailure = Axios.isCancel(error) || error.config?.silentError === true;

    if (!isTokenlessUnauthorized && !isQuietFailure) {
      const errorMessage =
        error.response?.data?.message ||
        "An unexpected error occurred. Please try again.";

      window.dispatchEvent(
        new CustomEvent("api-error", {
          detail: errorMessage,
        })
      );
    }

    return Promise.reject(error);
  }
);

export default axios;
