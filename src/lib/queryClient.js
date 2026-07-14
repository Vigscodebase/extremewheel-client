import { QueryClient } from "@tanstack/react-query";

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

export default queryClient;
