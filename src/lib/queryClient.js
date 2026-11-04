import { QueryClient } from "@tanstack/react-query";
import useAuthStore from "../store/authStore";

// A 401 means "not authenticated" — retrying it just spams the API and
// delays the session-expired modal, so we skip retries for auth failures
// and keep a small retry budget for everything else (flaky network, cold
// Mongo connections on first boot, etc).
const shouldRetry = (failureCount, error) => {
  const status = error?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Signing out (or being signed out by the server) must not leave that person's
// data — customers, vehicle notes, saved comparisons — in memory for whoever
// signs in next on this browser.
useAuthStore.subscribe((state, prev) => {
  if (prev.token && !state.token) queryClient.clear();
});

export default queryClient;
