import Axios from "axios";

// 1. Initialize the base Axios configuration instance
export const axios = Axios.create({
    baseURL: "http://192.168.2.63:5000/",
    headers: { "Content-Type": "application/json" },
});

/**
 * 2. Unified Interceptor Setup
 * Merged function to bind your React context callbacks with request/response lifecycles.
 */
export const setupAxiosInterceptors = (onTokenRenewed, onSessionExpired) => {

    // Request Interceptor: Automatically injects active JWT Bearer tokens
    axios.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config; // Axios handles direct object returns natively
        },
        (error) => Promise.reject(error)
    );

    // Response Interceptor: Manages silent rolling token extensions and 401 session expirations
    axios.interceptors.response.use(
        (response) => {
            const renewedToken = response.headers['x-refresh-token'];
            if (renewedToken) {
                onTokenRenewed(renewedToken);
            }
            return response;
        },
        (error) => {
            // If the backend rejects the operation via authorization failure, trip the eviction modal
            if (error.response && error.response.status === 401) {
                onSessionExpired();
            }
            return Promise.reject(error);
        }
    );
};