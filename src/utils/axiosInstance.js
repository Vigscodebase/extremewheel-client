import Axios from "axios";

// Base URL comes from env in production; falls back to the LAN address used
// during development. Set VITE_API_BASE_URL in a .env file for deployment.
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://192.168.2.63:5000/";

export const axios = Axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

let interceptorsBound = false;

/**
 * Binds request/response interceptors to the shared axios instance.
 * - Injects the Bearer token on every request.
 * - Picks up rolling token renewals from the `x-refresh-token` response header.
 * - Reports 401s upward so the app can force a clean logout instead of
 *   silently failing requests.
 * Safe to call once; subsequent calls are ignored so React StrictMode's
 * double-invoke in dev doesn't register duplicate handlers.
 */
export const setupAxiosInterceptors = (onTokenRenewed, onSessionExpired) => {
  if (interceptorsBound) return;
  interceptorsBound = true;

  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
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
        onTokenRenewed(renewedToken);
      }
      return response;
    },
    (error) => {
      if (error.response && error.response.status === 401) {
        onSessionExpired();
      }
      return Promise.reject(error);
    }
  );
};

export default axios;
