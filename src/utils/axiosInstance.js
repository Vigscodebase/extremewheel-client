import Axios from "axios";
import useAuthStore from "../store/authStore";

// Base URL comes from env in production; falls back to the LAN address used
// during development. Set VITE_API_BASE_URL in a .env file for deployment.
const baseURL = import.meta.env.VITE_API_BASE_URL;

export const axios = Axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// FIX: Track interceptor IDs so we can eject them. 
// Using a boolean flag blocked re-binding in React StrictMode, causing stale closures.
let reqInterceptorId = null;
let resInterceptorId = null;

/**
 * Binds request/response interceptors to the shared axios instance.
 * - Injects the Bearer token on every request.
 * - Picks up rolling token renewals from the `x-refresh-token` response header.
 * - Reports 401s upward so the app can force a clean logout instead of
 *   silently failing requests.
 */
export const setupAxiosInterceptors = (onTokenRenewed, onSessionExpired) => {
  // Eject previous interceptors to prevent duplicate stacking or stale closures
  if (reqInterceptorId !== null) axios.interceptors.request.eject(reqInterceptorId);
  if (resInterceptorId !== null) axios.interceptors.response.eject(resInterceptorId);

  reqInterceptorId = axios.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  resInterceptorId = axios.interceptors.response.use(
    (response) => {
      const renewedToken = response.headers["x-refresh-token"];
      if (renewedToken) {
        onTokenRenewed(renewedToken);
      }
      return response;
    },
    (error) => {
      if (error.response && error.response.status === 401) {
        onSessionExpired();
      } else {
        // For any error that ISN'T a 401, extract the Express message and trigger the global modal
        const errorMessage = error.response?.data?.message || "An unexpected error occurred. Please try again.";
        window.dispatchEvent(new CustomEvent("api-error", { detail: errorMessage }));
      }
      return Promise.reject(error);
    }
  );
};

export default axios;